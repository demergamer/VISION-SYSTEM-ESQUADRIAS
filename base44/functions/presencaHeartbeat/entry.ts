import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const plataforma = body.plataforma || 'web';
        const agora = new Date().toISOString();

        // Verifica se já existe um registo de presença para este utilizador
        const existentes = await base44.entities.Presenca.filter({ email: user.email });

        if (existentes.length > 0) {
            await base44.entities.Presenca.update(existentes[0].id, {
                status: 'online',
                ultimo_ping: agora,
                plataforma
            });
        } else {
            await base44.entities.Presenca.create({
                email: user.email,
                nome: user.full_name || user.email.split('@')[0],
                foto_url: user.avatar_url || '',
                status: 'online',
                ultimo_ping: agora,
                plataforma
            });
        }

        return Response.json({ ok: true, status: 'online', timestamp: agora });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});