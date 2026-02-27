import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const existentes = await base44.entities.Presenca.filter({ email: user.email });

        if (existentes.length > 0) {
            await base44.entities.Presenca.update(existentes[0].id, {
                status: 'offline',
                ultimo_ping: new Date().toISOString()
            });
        }

        return Response.json({ ok: true, status: 'offline' });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});