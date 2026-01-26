import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Buscar pedidos com saldos irrisórios (0.01 a 0.10)
    const pedidos = await base44.asServiceRole.entities.Pedido.filter({
      status: { $in: ['aberto', 'parcial'] }
    });

    const pedidosResiduos = pedidos.filter(p => {
      const saldo = p.saldo_restante || (p.valor_pedido - (p.total_pago || 0));
      return saldo > 0 && saldo <= 0.10;
    });

    const pedidosProcessados = [];
    const hoje = new Date().toISOString().split('T')[0];

    for (const pedido of pedidosResiduos) {
      const saldoResidual = pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0));
      
      await base44.asServiceRole.entities.Pedido.update(pedido.id, {
        status: 'pago',
        saldo_restante: 0,
        data_pagamento: hoje,
        data_referencia_comissao: hoje,
        outras_informacoes: (pedido.outras_informacoes || '') + `\n[${new Date().toLocaleDateString('pt-BR')}] Baixa automática de resíduo: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoResidual)}`
      });

      pedidosProcessados.push({
        numero_pedido: pedido.numero_pedido,
        cliente_nome: pedido.cliente_nome,
        valor_residuo: saldoResidual
      });
    }

    return Response.json({ 
      success: true,
      pedidos_limpos: pedidosProcessados.length,
      detalhes: pedidosProcessados
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});