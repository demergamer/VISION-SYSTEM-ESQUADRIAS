import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { user_id, codigo, role } = await req.json();

        if (!user_id || !codigo) {
            return Response.json({ error: 'user_id e codigo são obrigatórios' }, { status: 400 });
        }

        // Busca o usuário atual
        const usuarios = await base44.asServiceRole.entities.User.filter({ id: user_id });
        if (!usuarios || usuarios.length === 0) {
            return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        const usuarioAtual = usuarios[0];
        // Constrói novo data limpo (sem campos aninhados ou dot-notation acidentais)
        const novoData = {
            role: role || 'representante',
            avatar_url: usuarioAtual.data?.avatar_url || '',
            preferred_name: usuarioAtual.data?.preferred_name || '',
            phone: usuarioAtual.data?.phone || '',
            security_pin_hash: usuarioAtual.data?.security_pin_hash || '',
            pin_recovery_code: usuarioAtual.data?.pin_recovery_code || '',
            pin_recovery_expires: usuarioAtual.data?.pin_recovery_expires || '',
            codigo: codigo,
        };

        await base44.asServiceRole.entities.User.update(user_id, {
            role: role || 'representante',
            data: novoData,
        });

        return Response.json({ success: true, message: `Usuário atualizado: role=${role || 'representante'}, codigo=${codigo}` });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});