import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Buscar PORTs com itens não vinculados
    const ports = await base44.asServiceRole.entities.Port.list();
    const portsComPendencias = ports.filter(port => 
      port.itens_port?.some(item => !item.vinculado)
    );

    let vinculacoes = 0;
    let portsAtualizados = 0;

    for (const port of portsComPendencias) {
      let portModificado = false;
      const novosItens = [];

      for (const item of port.itens_port) {
        if (item.vinculado) {
          novosItens.push(item);
          continue;
        }

        // Tentar encontrar pedido real com este número
        const pedidosReais = await base44.asServiceRole.entities.Pedido.filter({
          numero_pedido: item.numero_pedido_manual,
          cliente_codigo: port.cliente_codigo
        });

        if (pedidosReais.length > 0) {
          const pedidoReal = pedidosReais[0];
          novosItens.push({
            ...item,
            pedido_real_id: pedidoReal.id,
            vinculado: true
          });
          vinculacoes++;
          portModificado = true;
        } else {
          novosItens.push(item);
        }
      }

      if (portModificado) {
        const todosVinculados = novosItens.every(i => i.vinculado);
        
        await base44.asServiceRole.entities.Port.update(port.id, {
          itens_port: novosItens,
          status: todosVinculados && port.status === 'aguardando_vinculo' ? 'em_separacao' : port.status
        });
        
        portsAtualizados++;
      }
    }

    return Response.json({ 
      success: true, 
      ports_verificados: portsComPendencias.length,
      ports_atualizados: portsAtualizados,
      vinculacoes_realizadas: vinculacoes
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});