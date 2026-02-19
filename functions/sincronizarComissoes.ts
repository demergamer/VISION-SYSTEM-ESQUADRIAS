import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * POST /sincronizarComissoes
 *
 * Sincroniza pedidos pagos → CommissionEntry.
 * Usa lógica Delta: processa apenas pedidos novos ou alterados desde a última sync.
 * Acesso: somente admin.
 */

const BATCH_SIZE = 50;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user   = await base44.auth.me();
  if (!user)                 return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden'    }, { status: 403 });

  const resultado = { criados: 0, atualizados: 0, ignorados: 0, erros: 0, total: 0 };

  const [pedidosPagos, todasEntries] = await Promise.all([
    base44.asServiceRole.entities.Pedido.filter({ status: 'pago' }),
    base44.asServiceRole.entities.CommissionEntry.list(),
  ]);

  // Mapa O(1): pedido_id → entry
  const entryPorPedido = new Map();
  for (const e of todasEntries) entryPorPedido.set(String(e.pedido_id), e);

  // Cache de meses fechados (evita N iterações por pedido)
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

  // Filtro Delta: apenas pedidos nunca sincronizados ou alterados após última sync
  const candidatos = pedidosPagos.filter(p => {
    const entry = entryPorPedido.get(String(p.id));
    if (entry?.status === 'fechado')               return false;
    if (parseFloat(p.saldo_restante ?? 0) > 0.01) return false;
    if (parseFloat(p.total_pago     ?? 0) <= 0)   return false;
    if (!p.comissao_last_sync)                     return true;
    return new Date(p.updated_date || 0) > new Date(p.comissao_last_sync);
  });

  resultado.total = candidatos.length;
  console.log(`[sincronizarComissoes] Delta: ${resultado.total} de ${pedidosPagos.length} pedidos`);

  // Processa em batches
  for (let i = 0; i < candidatos.length; i += BATCH_SIZE) {
    const batch = candidatos.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(p => processarPedido(p, entryPorPedido, resolverCompetencia, base44, resultado))
    );
  }

  console.log(`[sincronizarComissoes] Concluído:`, resultado);
  return Response.json({ success: true, resultado });
});

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
        observacao: movimentado
          ? `Sync automática. Mês original (${mesOrigem}) fechado.`
          : 'Sync automática',
        movimentacoes: movimentado ? [{
          data: agora, mes_origem: mesOrigem,
          mes_destino: mesCompetencia, usuario: 'sistema',
          motivo: 'Mês fechado na sync'
        }] : [],
      });
      await base44.asServiceRole.entities.Pedido.update(pedido.id, {
        comissao_entry_id:  nova.id,
        comissao_last_sync: agora,
      });
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
    console.error(`[sincronizarComissoes] Pedido ${pedido.numero_pedido}: ${err.message}`);
    resultado.erros++;
  }
}