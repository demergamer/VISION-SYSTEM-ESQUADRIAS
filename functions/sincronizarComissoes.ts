import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * POST /sincronizarComissoes  — SSE Stream
 *
 * Retorna um stream text/event-stream com eventos de progresso.
 * Eventos: { fase, progresso, total, processados, criados, atualizados, ignorados, erros, mensagem }
 *
 * Fases: "iniciando" → "processando" → "concluido" | "erro"
 * Acesso: somente admin
 */

const BATCH_SIZE  = 50;
const DELAY_BATCH = 200;
const DELAY_ITEM  = 50;

Deno.serve(async (req) => {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const base44 = createClientFromRequest(req);
  const user   = await base44.auth.me();
  if (!user)              return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden'    }, { status: 403 });

  // ── Configurar SSE Stream ──────────────────────────────────────────────────
  const { readable, writable } = new TransformStream();
  const writer  = writable.getWriter();
  const encoder = new TextEncoder();

  const emit = async (payload) => {
    const line = `data: ${JSON.stringify(payload)}\n\n`;
    await writer.write(encoder.encode(line));
  };

  // Dispara processamento em background (não bloqueia o Response)
  processarEmBackground(base44, emit, writer).catch(async (err) => {
    console.error('Erro crítico SSE:', err);
    await emit({ fase: 'erro', mensagem: err.message, progresso: 0 }).catch(() => {});
    await writer.close().catch(() => {});
  });

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no', // desativa buffer em proxies nginx
    },
  });
});

// ─── PROCESSAMENTO PRINCIPAL (BACKGROUND) ────────────────────────────────────
async function processarEmBackground(base44, emit, writer) {
  const resultado = { criados: 0, atualizados: 0, ignorados: 0, erros: [] };

  try {
    // ── FASE 1: Coleta de candidatos (DELTA) ─────────────────────────────────
    await emit({ fase: 'iniciando', progresso: 0, mensagem: 'Aplicando filtro Delta...' });

    const [pedidosPagos, todasEntries] = await Promise.all([
      base44.asServiceRole.entities.Pedido.filter({ status: 'pago' }),
      base44.asServiceRole.entities.CommissionEntry.list(),
    ]);

    // Mapa O(1) pedido_id → entry
    const entryPorPedido = new Map();
    for (const e of todasEntries) {
      entryPorPedido.set(String(e.pedido_id), e);
    }

    // ── FILTRO DELTA: só processa o que nunca foi sincronizado OU foi alterado
    //    depois da última sincronização (updated_date > comissao_last_sync).
    const candidatos = pedidosPagos.filter(p => {
      // Descarta pedidos cujo entry de comissão já está fechado
      const entry = entryPorPedido.get(String(p.id));
      if (entry?.status === 'fechado')               return false;
      // Descarta pedidos sem valor pago ou com saldo em aberto
      if (parseFloat(p.saldo_restante ?? 0) > 0.01) return false;
      if (parseFloat(p.total_pago     ?? 0) <= 0)   return false;

      // ── REGRA DELTA ──────────────────────────────────────────────────────
      // 1) Nunca foi sincronizado → inclui sempre
      if (!p.comissao_last_sync) return true;
      // 2) Foi alterado após a última sync → inclui
      const lastSync   = new Date(p.comissao_last_sync).getTime();
      const lastUpdate = new Date(p.updated_date || 0).getTime();
      return lastUpdate > lastSync;
    });

    const total = candidatos.length;
    console.log(`📋 Candidatos: ${total} de ${pedidosCandidatos.length} pedidos pagos`);

    await emit({ fase: 'iniciando', progresso: 0, total, mensagem: `${total} pedido(s) para processar.` });

    if (total === 0) {
      await emit({ fase: 'concluido', progresso: 100, total: 0, ...resultado, mensagem: 'Nada a sincronizar.' });
      await writer.close();
      return;
    }

    // ── Cache de meses fechados (evita N queries por pedido) ─────────────────
    const mesesFechadosCache = new Map();
    const hoje = new Date().toISOString().split('T')[0];

    const resolverCompetencia = (dataPagamento) => {
      const mesAno = String(dataPagamento).substring(0, 7);
      if (!mesesFechadosCache.has(mesAno)) {
        const doMes   = todasEntries.filter(e => e.mes_competencia === mesAno);
        const fechado = doMes.length > 0 && doMes.every(e => e.status === 'fechado');
        mesesFechadosCache.set(mesAno, fechado);
      }
      if (mesesFechadosCache.get(mesAno)) {
        return { dataCompetencia: hoje, mesCompetencia: hoje.substring(0, 7), movimentado: true, mesOrigem: mesAno };
      }
      return { dataCompetencia: `${mesAno}-01`, mesCompetencia: mesAno, movimentado: false, mesOrigem: mesAno };
    };

    // ── FASE 2: Processamento em batches com SSE ──────────────────────────────
    let processados = 0;

    for (let offset = 0; offset < total; offset += BATCH_SIZE) {
      const batch     = candidatos.slice(offset, offset + BATCH_SIZE);
      const loteNum   = Math.floor(offset / BATCH_SIZE) + 1;

      for (const pedido of batch) {
        await processarPedido(pedido, entryPorPedido, resolverCompetencia, base44, resultado);
        processados++;
        await sleep(DELAY_ITEM);
      }

      const progresso = Math.round((processados / total) * 100);
      await emit({
        fase:       'processando',
        progresso,
        total,
        processados,
        lote:       loteNum,
        criados:    resultado.criados,
        atualizados: resultado.atualizados,
        ignorados:  resultado.ignorados,
        erros:      resultado.erros.length,
        mensagem:   `Lote ${loteNum} concluído — ${processados} de ${total} pedidos`,
      });

      if (offset + BATCH_SIZE < total) await sleep(DELAY_BATCH);
    }

    // ── FASE 3: Conclusão ─────────────────────────────────────────────────────
    console.log(`✅ Sincronização concluída:`, resultado);
    await emit({
      fase:        'concluido',
      progresso:   100,
      total,
      processados,
      criados:     resultado.criados,
      atualizados: resultado.atualizados,
      ignorados:   resultado.ignorados,
      erros:       resultado.erros.length,
      mensagem:    `Concluído! ${resultado.criados} criadas, ${resultado.atualizados} atualizadas.`,
    });

  } catch (err) {
    console.error('Erro no processamento SSE:', err);
    await emit({ fase: 'erro', mensagem: err.message, progresso: 0 });
  } finally {
    await writer.close().catch(() => {});
  }
}

// ─── PROCESSAR UM PEDIDO ──────────────────────────────────────────────────────
async function processarPedido(pedido, entryPorPedido, resolverCompetencia, base44, resultado) {
  try {
    const valorBase     = parseFloat(pedido.total_pago) || 0;
    const percentual    = parseFloat(pedido.porcentagem_comissao) || 5;
    const valorComissao = parseFloat(((valorBase * percentual) / 100).toFixed(2));
    const dataPagStr    = String(pedido.data_pagamento || new Date().toISOString()).split('T')[0];
    const { dataCompetencia, mesCompetencia, movimentado, mesOrigem } = resolverCompetencia(dataPagStr);
    const entryExistente = entryPorPedido.get(String(pedido.id));

    if (!entryExistente) {
      const nova = await base44.asServiceRole.entities.CommissionEntry.create({
        pedido_id:            String(pedido.id),
        pedido_numero:        pedido.numero_pedido,
        representante_id:     pedido.representante_codigo,
        representante_codigo: pedido.representante_codigo,
        representante_nome:   pedido.representante_nome,
        cliente_nome:         pedido.cliente_nome,
        valor_base:           valorBase,
        percentual,
        valor_comissao:       valorComissao,
        data_pagamento_real:  dataPagStr,
        data_competencia:     dataCompetencia,
        mes_competencia:      mesCompetencia,
        status:               'aberto',
        observacao:           movimentado
          ? `Sincronização automática. Mês original (${mesOrigem}) fechado.`
          : 'Sincronização automática',
        movimentacoes: movimentado ? [{
          data: new Date().toISOString(), mes_origem: mesOrigem,
          mes_destino: mesCompetencia, usuario: 'sistema',
          motivo: 'Mês de pagamento fechado na sincronização'
        }] : [],
      });
      await base44.asServiceRole.entities.Pedido.update(pedido.id, { comissao_entry_id: nova.id });
      resultado.criados++;

    } else if (entryExistente.status === 'aberto') {
      const foiMovida = entryExistente.mes_competencia !== mesOrigem;
      await base44.asServiceRole.entities.CommissionEntry.update(entryExistente.id, {
        valor_base: valorBase, percentual, valor_comissao: valorComissao,
        ...(foiMovida ? {} : { data_competencia: dataCompetencia, mes_competencia: mesCompetencia }),
        observacao: (entryExistente.observacao || '') + ' | Recalculado na sincronização.',
      });
      resultado.atualizados++;
    } else {
      resultado.ignorados++;
    }

  } catch (err) {
    console.error(`❌ Pedido ${pedido.numero_pedido}: ${err.message}`);
    resultado.erros.push({ pedido_id: pedido.id, numero: pedido.numero_pedido, erro: err.message });
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));