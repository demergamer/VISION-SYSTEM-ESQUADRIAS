import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Corrige o campo data de um usuário específico via serviço interno
// Garante que 'codigo' esteja no nível raiz do objeto data
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const adminUser = await base44.auth.me();

        if (adminUser?.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { user_id, codigo, role } = await req.json();

        if (!user_id || !codigo || !role) {
            return Response.json({ error: 'user_id, codigo e role são obrigatórios' }, { status: 400 });
        }

        // Busca o usuário atual para preservar campos importantes
        const usuarios = await base44.asServiceRole.entities.User.filter({ id: user_id });
        if (!usuarios || usuarios.length === 0) {
            return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        const u = usuarios[0];
        const d = u.data || {};

        // Monta o data limpo com codigo no nível raiz
        const dataLimpo = {
            role: role,
            codigo: codigo,
            avatar_url: d.avatar_url || d?.data?.avatar_url || '',
            preferred_name: d.preferred_name || d?.data?.preferred_name || '',
            phone: d.phone || d?.data?.phone || '',
            security_pin_hash: d.security_pin_hash || d?.data?.security_pin_hash || '',
            pin_recovery_code: d.pin_recovery_code || d?.data?.pin_recovery_code || '',
            pin_recovery_expires: d.pin_recovery_expires || d?.data?.pin_recovery_expires || '',
        };

        // Primeiro zera os campos sujos individualmente
        // depois define o data correto em duas passagens para forçar sobrescrita
        await base44.asServiceRole.entities.User.update(user_id, {
            role: role,
            data: {
                role: role,
                codigo: codigo,
                avatar_url: dataLimpo.avatar_url,
                preferred_name: dataLimpo.preferred_name,
                phone: dataLimpo.phone,
                security_pin_hash: dataLimpo.security_pin_hash,
                pin_recovery_code: dataLimpo.pin_recovery_code,
                pin_recovery_expires: dataLimpo.pin_recovery_expires,
                // Zera campos sujos explicitamente com null
                'data': null,
                'data.role': null,
                'data.codigo': null,
            },
        });

        return Response.json({ 
            success: true, 
            user_id,
            email: u.email,
            data_salvo: dataLimpo
        });
    } catch (error) {
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});