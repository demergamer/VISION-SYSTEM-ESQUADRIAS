import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 1. Buscar pedidos que estão "devendo" visualmente
    const pedidos = await base44.asServiceRole.entities.Pedido.filter({
      status: { $in: ['aberto', 'parcial'] }
    });

    // 2. Filtrar pedidos que devem ser baixados
    const pedidosParaBaixar = pedidos.filter(p => {
      const valorTotal = p.valor_pedido || 0;
      const totalPago = p.total_pago || 0;
      const saldoReal = valorTotal - totalPago;
      const saldoSistema = p.saldo_restante !== undefined ? p.saldo_restante : saldoReal;

      // REGRA 1: Resíduo de centavos (0.01 até 0.10)
      const isResiduo = saldoSistema > 0 && saldoSistema <= 0.10;

      // REGRA 2: Já pagou tudo (ou pagou a mais), mas status continua aberto
      const isPagoTotalmente = totalPago >= valorTotal;

      return isResiduo || isPagoTotalmente;
    });

    if (pedidosParaBaixar.length === 0) {
      return Response.json({ success: true, pedidos_limpos: 0, detalhes: [] });
    }

    const hoje = new Date().toISOString().split('T')[0];
    const dataHoraLog = new Date().toLocaleDateString('pt-BR');

    // 3. Atualizar
    const updatePromises = pedidosParaBaixar.map(pedido => {
      const saldoResidual = pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0));
      const motivo = saldoResidual <= 0.10 && saldoResidual > 0 ? "resíduo" : "conferência total";
      
      return base44.asServiceRole.entities.Pedido.update(pedido.id, {
        status: 'pago',
        saldo_restante: 0,
        // Se for resíduo, soma no pago para fechar a conta. Se for total, mantém.
        total_pago: motivo === 'resíduo' ? (pedido.total_pago + saldoResidual) : pedido.total_pago,
        data_pagamento: hoje,
        data_referencia_comissao: pedido.data_referencia_comissao || hoje,
        outras_informacoes: (pedido.outras_informacoes || '') + `\n[${dataHoraLog}] Baixa automática (${motivo}) - Varredura Sistema`
      });
    });

    await Promise.all(updatePromises);

    return Response.json({ 
      success: true,
      pedidos_limpos: pedidosParaBaixar.length,
      ids_processados: pedidosParaBaixar.map(p => p.id)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});