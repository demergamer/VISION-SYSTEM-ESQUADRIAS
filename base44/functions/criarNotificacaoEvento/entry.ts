import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Cria notificações para todos os admins sobre um evento do sistema
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const {
      tipo,
      titulo,
      mensagem,
      entidade_referencia,
      entidade_id,
      link,
      prioridade = 'media',
      apenas_admins = true,
      destinatario_email = null, // se definido, envia só para este email
    } = await req.json();

    if (!tipo || !titulo || !mensagem) {
      return Response.json({ error: 'tipo, titulo e mensagem são obrigatórios' }, { status: 400 });
    }

    const usuarios = await base44.asServiceRole.entities.User.list();

    let destinatarios = usuarios;
    if (destinatario_email) {
      destinatarios = usuarios.filter(u => u.email === destinatario_email);
    } else if (apenas_admins) {
      destinatarios = usuarios.filter(u => u.role === 'admin');
    }

    const criadas = await Promise.all(
      destinatarios.map(u =>
        base44.asServiceRole.entities.Notificacao.create({
          tipo,
          titulo,
          mensagem,
          destinatario_email: u.email,
          destinatario_role: u.role || 'admin',
          entidade_referencia: entidade_referencia || null,
          entidade_id: entidade_id || null,
          link: link || null,
          prioridade,
          lida: false,
        })
      )
    );

    return Response.json({ success: true, count: criadas.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});