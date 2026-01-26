import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Buscar todos os PORTs ativos
    const ports = await base44.asServiceRole.entities.Port.filter({
      status: { $in: ['aguardando_separacao', 'em_separacao', 'aguardando_liquidacao'] }
    });

    let atualizados = 0;

    for (const port of ports) {
      // Buscar pedidos vinculados
      const pedidos = await base44.asServiceRole.entities.Pedido.filter({
        id: { $in: port.pedidos_ids }
      });

      if (pedidos.length === 0) continue;

      let novoStatus = port.status;

      // Lógica de atualização de status
      const temAguardando = pedidos.some(p => p.status === 'aguardando');
      const todosAbertosOuPagos = pedidos.every(p => ['aberto', 'parcial', 'pago'].includes(p.status));

      if (port.status === 'aguardando_separacao' && temAguardando) {
        novoStatus = 'em_separacao';
      } else if (port.status === 'em_separacao' && todosAbertosOuPagos) {
        novoStatus = 'aguardando_liquidacao';
      }

      // Atualizar se mudou
      if (novoStatus !== port.status) {
        await base44.asServiceRole.entities.Port.update(port.id, { status: novoStatus });
        atualizados++;
      }
    }

    return Response.json({ 
      success: true, 
      ports_verificados: ports.length,
      ports_atualizados: atualizados
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});