import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { liquidacao_id } = await req.json();

    if (!liquidacao_id) {
      return Response.json({ error: 'liquidacao_id obrigatório' }, { status: 400 });
    }

    const liquidacao = await base44.asServiceRole.entities.LiquidacaoPendente.get(liquidacao_id);
    const usuarios = await base44.asServiceRole.entities.User.list();
    const admins = usuarios.filter(u => u.role === 'admin');

    for (const admin of admins) {
      await base44.asServiceRole.entities.Notificacao.create({
        tipo: 'liquidacao_pendente',
        titulo: '🔔 Nova Liquidação Pendente',
        mensagem: `${liquidacao.cliente_nome} solicitou liquidação de ${liquidacao.pedidos_ids.length} pedido(s). Valor: R$ ${liquidacao.valor_final_proposto?.toFixed(2)}`,
        destinatario_email: admin.email,
        destinatario_role: 'admin',
        entidade_referencia: 'LiquidacaoPendente',
        entidade_id: liquidacao.id,
        link: '/Pedidos',
        prioridade: 'alta',
        lida: false
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});