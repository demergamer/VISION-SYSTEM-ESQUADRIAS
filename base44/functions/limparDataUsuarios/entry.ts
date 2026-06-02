import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Função que limpa e corrige o campo 'data' de usuários representante e cliente
// Remove campos sujos (data.data, data.role, data.codigo aninhados incorretamente)
// Usa a API REST diretamente para forçar sobrescrita total do campo 'data'
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Busca todos os representantes e clientes
        const representantes = await base44.asServiceRole.entities.User.filter({ role: 'representante' });
        const clientes = await base44.asServiceRole.entities.User.filter({ role: 'cliente' });

        const todos = [...representantes, ...clientes];
        const resultados = [];

        for (const u of todos) {
            const d = u.data || {};

            // Extrai o codigo de onde quer que esteja (vários níveis possíveis)
            const codigo = d.codigo 
                || d['data.codigo'] 
                || d?.data?.codigo 
                || null;

            if (!codigo) {
                resultados.push({ id: u.id, email: u.email, status: 'sem_codigo', skipped: true });
                continue;
            }

            // Constrói data limpo - apenas campos válidos, sem aninhamento
            const dataLimpo = {
                role: u.role,
                codigo: codigo,
                avatar_url: d.avatar_url || '',
                preferred_name: d.preferred_name || d?.data?.preferred_name || '',
                phone: d.phone || d?.data?.phone || '',
                security_pin_hash: d.security_pin_hash || d?.data?.security_pin_hash || '',
                pin_recovery_code: d.pin_recovery_code || d?.data?.pin_recovery_code || '',
                pin_recovery_expires: d.pin_recovery_expires || d?.data?.pin_recovery_expires || '',
            };

            await base44.asServiceRole.entities.User.update(u.id, {
                role: u.role,
                data: dataLimpo,
            });

            resultados.push({ id: u.id, email: u.email, role: u.role, codigo, status: 'atualizado' });
        }

        return Response.json({ 
            success: true, 
            total: todos.length,
            resultados 
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});