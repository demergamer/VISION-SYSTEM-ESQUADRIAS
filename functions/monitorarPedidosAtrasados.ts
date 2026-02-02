import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Service role para operações administrativas
    const pedidos = await base44.asServiceRole.entities.Pedido.list();
    const hoje = new Date();
    const limiteAtraso = 7; // 7 dias

    const pedidosAtrasados = pedidos.filter(p => {
      if (p.status === 'pago' || p.status === 'cancelado') return false;
      if (!p.data_entrega) return false;
      
      const dataEntrega = new Date(p.data_entrega);
      const diasAtraso = Math.floor((hoje - dataEntrega) / (1000 * 60 * 60 * 24));
      
      return diasAtraso >= limiteAtraso;
    });

    const usuarios = await base44.asServiceRole.entities.User.list();
    const admins = usuarios.filter(u => u.role === 'admin');

    // Buscar todas as notificações UMA VEZ (otimização crítica)
    const notificacoesExistentes = await base44.asServiceRole.entities.Notificacao.list();
    const limite24h = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);

    let notificacoesCriadas = 0;

    for (const pedido of pedidosAtrasados) {
      const dataEntrega = new Date(pedido.data_entrega);
      const diasAtraso = Math.floor((hoje - dataEntrega) / (1000 * 60 * 60 * 24));

      // Notificar cada admin
      for (const admin of admins) {
        // Verificar se já existe notificação recente sobre este pedido (filtro em memória)
        const jaNotificado = notificacoesExistentes.some(n => 
          n.entidade_id === pedido.id && 
          n.destinatario_email === admin.email &&
          n.tipo === 'pedido_atrasado' &&
          new Date(n.created_date) > limite24h
        );

        if (!jaNotificado) {
          await base44.asServiceRole.entities.Notificacao.create({
            tipo: 'pedido_atrasado',
            titulo: `⚠️ Pedido Atrasado #${pedido.numero_pedido}`,
            mensagem: `Cliente ${pedido.cliente_nome} com ${diasAtraso} dias de atraso. Saldo: R$ ${pedido.saldo_restante?.toFixed(2) || '0.00'}`,
            destinatario_email: admin.email,
            destinatario_role: 'admin',
            entidade_referencia: 'Pedido',
            entidade_id: pedido.id,
            link: '/Pedidos?busca=' + pedido.numero_pedido,
            prioridade: diasAtraso >= 15 ? 'alta' : 'media',
            lida: false
          });
          notificacoesCriadas++;
        }
      }
    }

    return Response.json({ 
      success: true, 
      pedidosAtrasados: pedidosAtrasados.length,
      notificacoesCriadas 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});