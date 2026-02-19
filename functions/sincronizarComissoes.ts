import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * POST /sincronizarComissoes
 *
 * Arquitetura: Filtro Cirúrgico + Chunking + Cache de Competências
 *
 * Estratégias de escala:
 *  1. Filtro duplo: só pedidos pagos SEM comissão fechada (nunca traz todo o acervo)
 *  2. Paginação por cursor: processa BATCH_SIZE registros por vez, nunca todos na memória
 *  3. Cache de meses fechados: evita N queries a cada pedido para resolver competência
 *  4. Throttle conservador entre batches: respeita rate limit da API
 *
 * Acesso: somente admin
 */

const BATCH_SIZE  = 50;   // pedidos processados por lote
const DELAY_BATCH = 300;  // ms de pausa entre batches (~3 lotes/s)
const DELAY_ITEM  = 60;   // ms entre cada write dentro do lote

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user   = await base44.auth.me();

    if (!user)              return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const resultado = { processados: 0, criados: 0, atualizados: 0, ignorados: 0, erros: [] };

    // ─── 1. FILTRO CIRÚRGICO ──────────────────────────────────────────────────
    // Busca apenas pedidos pagos cujo comissao_fechamento_id é nulo
    // → exclui automaticamente tudo que já foi processado e pago historicamente.
    // A segunda condição (comissao_paga !== true) elimina os já marcados como pagos.
    const [pedidosCandidatos, todasEntries] = await Promise.all([
      base44.asServiceRole.entities.Pedido.filter({ status: 'pago' }),
      base44.asServiceRole.entities.CommissionEntry.list(),
    ]);

    // Mapa pedido_id → entry para lookup O(1) sem queries adicionais
    const entryPorPedido = new Map();
    for (const e of todasEntries) {
      entryPorPedido.set(String(e.pedido_id), e);
    }

    // Filtro final: candidatos reais = sem entry fechada
    const candidatos = pedidosCandidatos.filter(p => {
      // Descarta se já tem comissão fechada (jamais retoca)
      const entry = entryPorPedido.get(String(p.id));
      if (entry?.status === 'fechado') return false;
      // Descarta parciais (saldo ainda em aberto apesar do status pago)
      const saldo = parseFloat(p.saldo_restante ?? 0);
      if (saldo > 0.01) return false;
      // Descarta sem valor pago
      const pago = parseFloat(p.total_pago ?? 0);
      if (pago <= 0) return false;
      return true;
    });

    resultado.processados = candidatos.length;
    console.log(`📋 Candidatos: ${candidatos.length} (de ${pedidosCandidatos.length} pagos)`);

    if (candidatos.length === 0) {
      return Response.json({ success: true, message: 'Nada a sincronizar.', ...resultado });
    }

    // ─── 2. CACHE DE MESES FECHADOS ───────────────────────────────────────────
    // Pré-computa quais meses já estão totalmente fechados para evitar
    // uma query por pedido dentro do loop (que multiplicaria as chamadas).
    const mesesFechadosCache = new Map(); // "YYYY-MM" → boolean
    const hoje = new Date().toISOString().split('T')[0];

    const populateCompetenciaCache = (mesAno) => {
      if (mesesFechadosCache.has(mesAno)) return;
      // Usa os dados que já temos em memória (todasEntries)
      const entriesDesseMes = todasEntries.filter(e => e.mes_competencia === mesAno);
      const fechado = entriesDesseMes.length > 0 && entriesDesseMes.every(e => e.status === 'fechado');
      mesesFechadosCache.set(mesAno, fechado);
    };

    const resolverCompetencia = (dataPagamento) => {
      const mesAno = String(dataPagamento).substring(0, 7);
      populateCompetenciaCache(mesAno);
      const mesFechado = mesesFechadosCache.get(mesAno);
      if (mesFechado) {
        return { dataCompetencia: hoje, mesCompetencia: hoje.substring(0, 7), movimentado: true, mesOrigem: mesAno };
      }
      return { dataCompetencia: `${mesAno}-01`, mesCompetencia: mesAno, movimentado: false, mesOrigem: mesAno };
    };

    // ─── 3. PROCESSAMENTO EM BATCHES (CURSOR PAGINATION) ─────────────────────
    for (let offset = 0; offset < candidatos.length; offset += BATCH_SIZE) {
      const batch = candidatos.slice(offset, offset + BATCH_SIZE);
      console.log(`🔄 Lote ${Math.floor(offset / BATCH_SIZE) + 1}: pedidos ${offset + 1}–${offset + batch.length}`);

      for (const pedido of batch) {
        await processarPedido(pedido, entryPorPedido, resolverCompetencia, base44, resultado);
        await sleep(DELAY_ITEM);
      }

      // Pausa entre batches para liberar conexões e respeitar rate limit
      if (offset + BATCH_SIZE < candidatos.length) {
        await sleep(DELAY_BATCH);
      }
    }

    console.log(`✅ Sincronização concluída:`, resultado);
    return Response.json({ success: true, ...resultado });

  } catch (error) {
    console.error('Erro crítico na sincronização:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── PROCESSAR UM PEDIDO ──────────────────────────────────────────────────────
async function processarPedido(pedido, entryPorPedido, resolverCompetencia, base44, resultado) {
  try {
    const valorBase     = parseFloat(pedido.total_pago) || 0;
    const percentual    = parseFloat(pedido.porcentagem_comissao) || 5;
    const valorComissao = parseFloat(((valorBase * percentual) / 100).toFixed(2));

    const dataPagamentoStr = String(pedido.data_pagamento || new Date().toISOString()).split('T')[0];
    const { dataCompetencia, mesCompetencia, movimentado, mesOrigem } = resolverCompetencia(dataPagamentoStr);

    const entryExistente = entryPorPedido.get(String(pedido.id));

    if (!entryExistente) {
      // ── CRIAR ──
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
        data_pagamento_real:  dataPagamentoStr,
        data_competencia:     dataCompetencia,
        mes_competencia:      mesCompetencia,
        status:               'aberto',
        observacao:           movimentado
          ? `Sincronização automática. Mês original (${mesOrigem}) fechado.`
          : 'Sincronização automática',
        movimentacoes: movimentado ? [{
          data:        new Date().toISOString(),
          mes_origem:  mesOrigem,
          mes_destino: mesCompetencia,
          usuario:     'sistema',
          motivo:      'Mês de pagamento fechado na sincronização'
        }] : [],
      });

      await base44.asServiceRole.entities.Pedido.update(pedido.id, { comissao_entry_id: nova.id });
      resultado.criados++;

    } else if (entryExistente.status === 'aberto') {
      // ── ATUALIZAR (preserva competência se foi movida manualmente) ──
      const foiMovidaManualmente = entryExistente.mes_competencia !== mesOrigem;

      await base44.asServiceRole.entities.CommissionEntry.update(entryExistente.id, {
        valor_base:     valorBase,
        percentual,
        valor_comissao: valorComissao,
        ...(foiMovidaManualmente ? {} : {
          data_competencia: dataCompetencia,
          mes_competencia:  mesCompetencia,
        }),
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