/**
 * POST /executarSyncWorker  — Background Worker
 *
 * Recebe { job_id } e executa a sincronização Delta completa.
 * Ao final, atualiza o SyncJob e cria uma Notificacao para o solicitante.
 * Acesso: somente admin (chamado internamente pelo despacharSincronizacao).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BATCH_SIZE = 50;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user   = await base44.auth.me();
  if (!user)                 return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden'    }, { status: 403 });

  const { job_id } = await req.json().catch(() => ({}));
  if (!job_id) return Response.json({ error: 'job_id obrigatório' }, { status: 400 });

  // Marca job como "processando"
  await base44.asServiceRole.entities.SyncJob.update(job_id, {
    status:      'processando',
    iniciado_em: new Date().toISOString(),
  });

  const resultado = { criados: 0, atualizados: 0, ignorados: 0, erros: 0, total: 0 };

  try {
    // ── Carrega dados ─────────────────────────────────────────────────────
    const [pedidosPagos, todasEntries] = await Promise.all([
      base44.asServiceRole.entities.Pedido.filter({ status: 'pago' }),
      base44.asServiceRole.entities.CommissionEntry.list(),
    ]);

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

    // ── Filtro Delta ──────────────────────────────────────────────────────
    const candidatos = pedidosPagos.filter(p => {
      const entry = entryPorPedido.get(String(p.id));
      if (entry?.status === 'fechado')               return false;
      if (parseFloat(p.saldo_restante ?? 0) > 0.01) return false;
      if (parseFloat(p.total_pago     ?? 0) <= 0)   return false;
      if (!p.comissao_last_sync)                     return true;
      return new Date(p.updated_date || 0) > new Date(p.comissao_last_sync);
    });

    resultado.total = candidatos.length;
    console.log(`[SyncWorker] Delta: ${resultado.total} de ${pedidosPagos.length} pedidos`);

    // ── Processa em batches ───────────────────────────────────────────────
    for (let i = 0; i < candidatos.length; i += BATCH_SIZE) {
      const batch = candidatos.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(p => processarPedido(p, entryPorPedido, resolverCompetencia, base44, resultado)));
    }

    // ── Finaliza job ──────────────────────────────────────────────────────
    const concluido_em = new Date().toISOString();
    await base44.asServiceRole.entities.SyncJob.update(job_id, {
      status:       'concluido',
      concluido_em,
      resultado:    { ...resultado },
    });

    // ── Notificação de conclusão ──────────────────────────────────────────
    const job = await base44.asServiceRole.entities.SyncJob.get(job_id).catch(() => null);
    const destinatario = job?.solicitado_por || user.email;

    await base44.asServiceRole.entities.Notificacao.create({
      tipo:                'sincronizacao_comissoes',
      titulo:              '✅ Sincronização de Comissões Concluída',
      mensagem:            `${resultado.criados} criadas · ${resultado.atualizados} atualizadas · ${resultado.ignorados} ignoradas · ${resultado.erros} erros (${resultado.total} pedidos delta processados).`,
      destinatario_email:  destinatario,
      destinatario_role:   'admin',
      lida:                false,
      prioridade:          resultado.erros > 0 ? 'alta' : 'media',
      link:                '/Comissoes',
    });

    return Response.json({ success: true, resultado });

  } catch (err) {
    console.error('[SyncWorker] Erro crítico:', err.message);
    await base44.asServiceRole.entities.SyncJob.update(job_id, {
      status:         'erro',
      concluido_em:   new Date().toISOString(),
      erro_mensagem:  err.message,
    }).catch(() => {});

    // Notifica o erro também
    const job = await base44.asServiceRole.entities.SyncJob.get(job_id).catch(() => null);
    await base44.asServiceRole.entities.Notificacao.create({
      tipo:               'sincronizacao_comissoes',
      titulo:             '❌ Erro na Sincronização de Comissões',
      mensagem:           err.message || 'Falha desconhecida no worker.',
      destinatario_email: job?.solicitado_por || user.email,
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
    console.error(`[SyncWorker] Pedido ${pedido.numero_pedido}: ${err.message}`);
    resultado.erros++;
  }
}