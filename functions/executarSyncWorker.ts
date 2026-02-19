/**
 * POST /executarSyncWorker  — Background Worker
 *
 * Recebe { job_id } via req.json() e executa a sincronização Delta completa.
 * Chamado internamente via base44.asServiceRole.functions.invoke — SEM sessão de usuário.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BATCH_SIZE = 50;

Deno.serve(async (req) => {
  // Leitura do payload — PRIMEIRO passo, antes de qualquer outra coisa
  let job_id = null;
  try {
    const body = await req.json();
    job_id = body?.job_id || null;
    console.log('[SyncWorker] 🚀 WORKER INICIADO. Payload recebido:', body);
  } catch (parseErr) {
    console.error('[SyncWorker] ❌ Falha ao ler JSON do body:', parseErr.message);
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }

  if (!job_id) {
    console.error('[SyncWorker] ❌ job_id ausente no payload');
    return Response.json({ error: 'job_id obrigatório' }, { status: 400 });
  }

  // Cria client — chamada interna não tem sessão de usuário, usar sempre asServiceRole
  const base44 = createClientFromRequest(req);
  const resultado = { criados: 0, atualizados: 0, ignorados: 0, erros: 0, total: 0 };

  // Marca job como "processando" IMEDIATAMENTE — fora do try/catch principal
  try {
    await base44.asServiceRole.entities.SyncJob.update(job_id, {
      status:      'processando',
      iniciado_em: new Date().toISOString(),
    });
    console.log(`[SyncWorker] ✅ Job ${job_id} marcado como processando`);
  } catch (initErr) {
    console.error(`[SyncWorker] ❌ Falha ao marcar job como processando:`, initErr.message);
    return Response.json({ error: 'Falha ao iniciar job: ' + initErr.message }, { status: 500 });
  }

  // ── BLOCO PRINCIPAL ──────────────────────────────────────────────────────────
  try {
    // Carrega dados
    console.log('[SyncWorker] 📥 Carregando pedidos e entries...');
    const [pedidosPagos, todasEntries] = await Promise.all([
      base44.asServiceRole.entities.Pedido.filter({ status: 'pago' }),
      base44.asServiceRole.entities.CommissionEntry.list(),
    ]);
    console.log(`[SyncWorker] 📦 ${pedidosPagos.length} pedidos pagos | ${todasEntries.length} entries existentes`);

    // Mapa O(1) pedido_id → entry
    const entryPorPedido = new Map();
    for (const e of todasEntries) entryPorPedido.set(String(e.pedido_id), e);

    // Cache de meses fechados
    const mesesFechadosCache = new Map();
    const hoje = new Date().toISOString().split('T')[0];

    const resolverCompetencia = (dataPagamento) => {
      const mesAno = String(dataPagamento).substring(0, 7);
      if (!mesesFechadosCache.has(mesAno)) {
        const doMes   = todasEntries.filter(e => e.mes_competencia === mesAno);
        const fechado = doMes.length > 0 && doMes.every(e => e.status === 'fechado');
        mesesFechadosCache.set(mesAno, fechado);
      }
      return mesesFechadosCache.get(mesAno)
        ? { dataCompetencia: hoje, mesCompetencia: hoje.substring(0, 7), movimentado: true,  mesOrigem: mesAno }
        : { dataCompetencia: `${mesAno}-01`, mesCompetencia: mesAno,     movimentado: false, mesOrigem: mesAno };
    };

    // Filtro Delta
    const candidatos = pedidosPagos.filter(p => {
      const entry = entryPorPedido.get(String(p.id));
      if (entry?.status === 'fechado')               return false;
      if (parseFloat(p.saldo_restante ?? 0) > 0.01) return false;
      if (parseFloat(p.total_pago     ?? 0) <= 0)   return false;
      if (!p.comissao_last_sync)                     return true;
      return new Date(p.updated_date || 0) > new Date(p.comissao_last_sync);
    });

    resultado.total = candidatos.length;
    console.log(`[SyncWorker] 🔍 Delta: ${resultado.total} de ${pedidosPagos.length} pedidos para processar`);

    // Processa em batches
    for (let i = 0; i < candidatos.length; i += BATCH_SIZE) {
      const batch = candidatos.slice(i, i + BATCH_SIZE);
      console.log(`[SyncWorker] ⚙️  Batch ${Math.floor(i / BATCH_SIZE) + 1} — ${batch.length} itens`);
      await Promise.all(
        batch.map(p => processarPedido(p, entryPorPedido, resolverCompetencia, base44, resultado))
      );
    }

    // Finaliza job
    await base44.asServiceRole.entities.SyncJob.update(job_id, {
      status:       'concluido',
      concluido_em: new Date().toISOString(),
      resultado:    { ...resultado },
    });
    console.log(`[SyncWorker] ✅ Job ${job_id} CONCLUÍDO:`, resultado);

    // Notificação de conclusão
    const jobData = await base44.asServiceRole.entities.SyncJob.get(job_id).catch(() => null);
    const destinatario = jobData?.solicitado_por || 'admin';

    await base44.asServiceRole.entities.Notificacao.create({
      tipo:               'sincronizacao_comissoes',
      titulo:             '✅ Sincronização de Comissões Concluída',
      mensagem:           `${resultado.criados} criadas · ${resultado.atualizados} atualizadas · ${resultado.ignorados} ignoradas · ${resultado.erros} erros (${resultado.total} pedidos processados).`,
      destinatario_email: destinatario,
      destinatario_role:  'admin',
      lida:               false,
      prioridade:         resultado.erros > 0 ? 'alta' : 'media',
      link:               '/Comissoes',
    }).catch(e => console.error('[SyncWorker] Falha ao criar notificação de conclusão:', e.message));

    return Response.json({ success: true, resultado });

  } catch (err) {
    // ── CATCH GLOBAL — nunca deixa o job em limbo ────────────────────────────
    console.error(`[SyncWorker] ❌ ERRO FATAL NO JOB ${job_id}:`, err.message);
    console.error('[SyncWorker] Stack:', err.stack);

    await base44.asServiceRole.entities.SyncJob.update(job_id, {
      status:        'erro',
      concluido_em:  new Date().toISOString(),
      erro_mensagem: err.message || 'Erro desconhecido',
    }).catch(e => console.error('[SyncWorker] Falha ao marcar job como erro:', e.message));

    const jobData = await base44.asServiceRole.entities.SyncJob.get(job_id).catch(() => null);
    await base44.asServiceRole.entities.Notificacao.create({
      tipo:               'sincronizacao_comissoes',
      titulo:             '❌ Erro na Sincronização de Comissões',
      mensagem:           err.message || 'Falha desconhecida no worker.',
      destinatario_email: jobData?.solicitado_por || 'admin',
      destinatario_role:  'admin',
      lida:               false,
      prioridade:         'alta',
      link:               '/Comissoes',
    }).catch(() => {});

    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});

// ─── Processar um pedido individual ──────────────────────────────────────────
async function processarPedido(pedido, entryPorPedido, resolverCompetencia, base44, resultado) {
  try {
    const valorBase     = parseFloat(pedido.total_pago) || 0;
    const percentual    = parseFloat(pedido.porcentagem_comissao) || 5;
    const valorComissao = parseFloat(((valorBase * percentual) / 100).toFixed(2));
    const dataPagStr    = String(pedido.data_pagamento || new Date().toISOString()).split('T')[0];
    const { dataCompetencia, mesCompetencia, movimentado, mesOrigem } = resolverCompetencia(dataPagStr);
    const entryExistente = entryPorPedido.get(String(pedido.id));
    const agora = new Date().toISOString();

    if (!entryExistente) {
      const nova = await base44.asServiceRole.entities.CommissionEntry.create({
        pedido_id: String(pedido.id), pedido_numero: pedido.numero_pedido,
        representante_id: pedido.representante_codigo, representante_codigo: pedido.representante_codigo,
        representante_nome: pedido.representante_nome, cliente_nome: pedido.cliente_nome,
        valor_base: valorBase, percentual, valor_comissao: valorComissao,
        data_pagamento_real: dataPagStr, data_competencia: dataCompetencia,
        mes_competencia: mesCompetencia, status: 'aberto',
        observacao: movimentado ? `Sync automática. Mês original (${mesOrigem}) fechado.` : 'Sync automática',
        movimentacoes: movimentado ? [{ data: agora, mes_origem: mesOrigem, mes_destino: mesCompetencia, usuario: 'sistema', motivo: 'Mês fechado na sync' }] : [],
      });
      await base44.asServiceRole.entities.Pedido.update(pedido.id, { comissao_entry_id: nova.id, comissao_last_sync: agora });
      resultado.criados++;

    } else if (entryExistente.status === 'aberto') {
      const foiMovida = entryExistente.mes_competencia !== mesOrigem;
      await base44.asServiceRole.entities.CommissionEntry.update(entryExistente.id, {
        valor_base: valorBase, percentual, valor_comissao: valorComissao,
        ...(foiMovida ? {} : { data_competencia: dataCompetencia, mes_competencia: mesCompetencia }),
      });
      await base44.asServiceRole.entities.Pedido.update(pedido.id, { comissao_last_sync: agora });
      resultado.atualizados++;

    } else {
      await base44.asServiceRole.entities.Pedido.update(pedido.id, { comissao_last_sync: agora });
      resultado.ignorados++;
    }
  } catch (err) {
    console.error(`[SyncWorker] ❌ Pedido ${pedido.numero_pedido}: ${err.message}`);
    resultado.erros++;
  }
}