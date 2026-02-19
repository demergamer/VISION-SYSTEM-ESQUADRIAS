import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * POST /atualizarComissao
 *
 * Suporta duas actions:
 *
 * 1) action: "atualizar_base"
 *    Atualiza valor_base e/ou percentual de uma CommissionEntry,
 *    recalculando valor_comissao no backend.
 *    Payload: { action, entry_id, valor_base?, percentual? }
 *
 * 2) action: "transferir"
 *    Move uma CommissionEntry (e o Pedido original) para outro representante.
 *    Payload: { action, entry_id, pedido_id, novo_representante_codigo }
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }
        if (user.role !== 'admin') {
            return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
        }

        const body = await req.json();
        const { action } = body;

        // ─────────────────────────────────────────────────────────────
        // ACTION 1: Atualizar Base de Cálculo e/ou Percentual
        // ─────────────────────────────────────────────────────────────
        if (action === 'atualizar_base') {
            const { entry_id, valor_base, percentual } = body;

            if (!entry_id) {
                return Response.json({ error: 'entry_id é obrigatório' }, { status: 400 });
            }

            // Busca a entrada atual para herdar valores não enviados
            const entry = await base44.asServiceRole.entities.CommissionEntry.get(entry_id);
            if (!entry) {
                return Response.json({ error: 'CommissionEntry não encontrada' }, { status: 404 });
            }

            if (entry.status === 'fechado') {
                return Response.json({ error: 'Não é possível alterar uma comissão já fechada' }, { status: 409 });
            }

            const novaBase = valor_base !== undefined ? parseFloat(valor_base) : parseFloat(entry.valor_base);
            const novoPct  = percentual  !== undefined ? parseFloat(percentual)  : parseFloat(entry.percentual);

            if (isNaN(novaBase) || isNaN(novoPct)) {
                return Response.json({ error: 'valor_base e percentual devem ser números válidos' }, { status: 400 });
            }

            // Recalcula comissão no backend
            const novaComissao = parseFloat(((novaBase * novoPct) / 100).toFixed(2));

            const atualizado = await base44.asServiceRole.entities.CommissionEntry.update(entry_id, {
                valor_base:      novaBase,
                percentual:      novoPct,
                valor_comissao:  novaComissao,
            });

            return Response.json({
                ok: true,
                entry: atualizado,
                recalculo: { valor_base: novaBase, percentual: novoPct, valor_comissao: novaComissao }
            });
        }

        // ─────────────────────────────────────────────────────────────
        // ACTION 2: Transferir para outro Representante
        // ─────────────────────────────────────────────────────────────
        if (action === 'transferir') {
            const { entry_id, pedido_id, novo_representante_codigo } = body;

            if (!novo_representante_codigo) {
                return Response.json({ error: 'novo_representante_codigo é obrigatório' }, { status: 400 });
            }
            if (!entry_id && !pedido_id) {
                return Response.json({ error: 'entry_id ou pedido_id é obrigatório' }, { status: 400 });
            }

            // Busca o representante destino
            const todosReps = await base44.asServiceRole.entities.Representante.list();
            const repDestino = todosReps.find(r => String(r.codigo) === String(novo_representante_codigo));
            if (!repDestino) {
                return Response.json({ error: 'Representante destino não encontrado' }, { status: 404 });
            }
            if (repDestino.bloqueado) {
                return Response.json({ error: 'Representante destino está bloqueado' }, { status: 409 });
            }

            const resultados = { entry: null, pedido: null };

            // 2A. Atualiza CommissionEntry (se fornecida)
            if (entry_id) {
                const entry = await base44.asServiceRole.entities.CommissionEntry.get(entry_id);
                if (!entry) {
                    return Response.json({ error: 'CommissionEntry não encontrada' }, { status: 404 });
                }
                if (entry.status === 'fechado') {
                    return Response.json({ error: 'Não é possível transferir uma comissão já fechada' }, { status: 409 });
                }

                resultados.entry = await base44.asServiceRole.entities.CommissionEntry.update(entry_id, {
                    representante_id:       repDestino.id || repDestino.codigo,
                    representante_codigo:   repDestino.codigo,
                    representante_nome:     repDestino.nome,
                });
            }

            // 2B. Atualiza o Pedido original para consistência (se fornecido ou via entry)
            const pedidoAlvoId = pedido_id || (entry_id ? resultados.entry?.pedido_id : null);
            if (pedidoAlvoId) {
                resultados.pedido = await base44.asServiceRole.entities.Pedido.update(pedidoAlvoId, {
                    representante_codigo:    repDestino.codigo,
                    representante_nome:      repDestino.nome,
                    comissao_fechamento_id:  null,
                    comissao_paga:           false,
                    comissao_mes_ano_pago:   null,
                });
            }

            return Response.json({
                ok: true,
                representante_destino: { codigo: repDestino.codigo, nome: repDestino.nome },
                resultados
            });
        }

        // ─────────────────────────────────────────────────────────────
        // ACTION desconhecida
        // ─────────────────────────────────────────────────────────────
        return Response.json(
            { error: `Action desconhecida: "${action}". Use "atualizar_base" ou "transferir".` },
            { status: 400 }
        );

    } catch (error) {
        console.error('[atualizarComissao] Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});