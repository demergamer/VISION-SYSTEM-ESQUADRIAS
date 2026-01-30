import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Segurança básica
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 1. Buscar pedidos que estão devendo (Aberto ou Parcial)
    // Nota: Filtra primeiro no banco para não trazer tudo
    const pedidos = await base44.asServiceRole.entities.Pedido.filter({
      status: { $in: ['aberto', 'parcial'] }
    });

    // 2. Filtrar apenas os que são "sujeira" (entre 0.01 e 0.10 centavos)
    const pedidosResiduos = pedidos.filter(p => {
      const saldo = p.saldo_restante || (p.valor_pedido - (p.total_pago || 0));
      return saldo > 0 && saldo <= 0.10;
    });

    if (pedidosResiduos.length === 0) {
      return Response.json({ success: true, pedidos_limpos: 0, detalhes: [] });
    }

    const hoje = new Date().toISOString().split('T')[0];
    const dataHoraLog = new Date().toLocaleDateString('pt-BR');

    // 3. Processamento Paralelo (Executa tudo de uma vez para ser rápido)
    const updatePromises = pedidosResiduos.map(pedido => {
      const saldoResidual = pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0));
      const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoResidual);

      return base44.asServiceRole.entities.Pedido.update(pedido.id, {
        status: 'pago',
        saldo_restante: 0,
        // Adiciona o resíduo ao total pago para fechar a conta visualmente
        total_pago: (pedido.total_pago || 0) + saldoResidual, 
        data_pagamento: hoje,
        // Mantém data de comissão original se tiver, senão usa hoje
        data_referencia_comissao: pedido.data_referencia_comissao || hoje,
        // Loga no histórico
        outras_informacoes: (pedido.outras_informacoes || '') + `\n[${dataHoraLog}] Baixa automática de resíduo: ${valorFormatado}`
      });
    });

    await Promise.all(updatePromises);

    return Response.json({ 
      success: true,
      pedidos_limpos: pedidosResiduos.length,
      ids_processados: pedidosResiduos.map(p => p.id)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});