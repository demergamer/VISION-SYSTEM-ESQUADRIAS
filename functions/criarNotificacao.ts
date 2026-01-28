import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Apenas admins podem criar notificações' }, { status: 403 });
    }

    const { tipo, titulo, mensagem, destinatario_email, destinatario_role, entidade_referencia, entidade_id, link, prioridade } = await req.json();

    if (!tipo || !titulo || !mensagem || !destinatario_email) {
      return Response.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const notificacao = await base44.asServiceRole.entities.Notificacao.create({
      tipo,
      titulo,
      mensagem,
      destinatario_email,
      destinatario_role: destinatario_role || 'admin',
      entidade_referencia: entidade_referencia || null,
      entidade_id: entidade_id || null,
      link: link || null,
      prioridade: prioridade || 'media',
      lida: false
    });

    return Response.json({ success: true, notificacao });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});