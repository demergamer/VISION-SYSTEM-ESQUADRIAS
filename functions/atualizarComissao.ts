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
            const { entry_id, pedido_id, novo_representante_codigo, mover_todos } = body;

            if (!novo_representante_codigo) {
                return Response.json({ error: 'novo_representante_codigo é obrigatório' }, { status: 400 });
            }
            if (!entry_id && !pedido_id) {
                return Response.json({ error: 'entry_id ou pedido_id é obrigatório' }, { status: 400 });
            }

            // ── Busca dados em paralelo ──────────────────────────────
            const [todosReps, todosPedidos, todasEntries] = await Promise.all([
                base44.asServiceRole.entities.Representante.list(),
                base44.asServiceRole.entities.Pedido.list(),
                base44.asServiceRole.entities.CommissionEntry.list(),
            ]);

            // Valida representante destino
            const repDestino = todosReps.find(r => String(r.codigo) === String(novo_representante_codigo));
            if (!repDestino) {
                return Response.json({ error: 'Representante destino não encontrado' }, { status: 404 });
            }
            if (repDestino.bloqueado) {
                return Response.json({ error: 'Representante destino está bloqueado' }, { status: 409 });
            }

            // Resolve o pedido alvo (para descobrir o cliente)
            const pedidoAlvoId = pedido_id || entry_id;  // entry_id é o pedido_id no contexto do frontend quando sem entry
            const pedidoAlvo = todosPedidos.find(p => String(p.id) === String(pedidoAlvoId));

            // Se entry_id foi enviado, valida
            let entryAlvo = null;
            if (entry_id) {
                entryAlvo = todasEntries.find(e => String(e.id) === String(entry_id));
                if (!entryAlvo) {
                    // entry_id pode ser na verdade um pedido_id (sem CommissionEntry criada ainda)
                    // Não bloqueia, apenas segue com pedido_id
                } else if (entryAlvo.status === 'fechado') {
                    return Response.json({ error: 'Não é possível transferir uma comissão já fechada' }, { status: 409 });
                }
            }

            // ── Descobre o cliente vinculado ─────────────────────────
            const clienteNome = pedidoAlvo?.cliente_nome || entryAlvo?.cliente_nome;
            const clienteCodigo = pedidoAlvo?.cliente_codigo || null;

            // ── Busca clientes ────────────────────────────────────────
            const todosClientes = await base44.asServiceRole.entities.Cliente.list();
            const clienteAlvo = todosClientes.find(c =>
                (clienteCodigo && String(c.codigo) === String(clienteCodigo)) ||
                (!clienteCodigo && c.nome === clienteNome)
            );

            const dadosRepDestino = {
                representante_codigo: repDestino.codigo,
                representante_nome:   repDestino.nome,
            };

            // ── Todas as operações em paralelo (melhor esforço de atomicidade) ──
            const operacoes = [];
            const stats = { cliente_atualizado: false, pedidos_movidos: 0, entries_movidas: 0 };

            // REGRA 1: Atualiza o cadastro do cliente (SEMPRE)
            if (clienteAlvo) {
                operacoes.push(
                    base44.asServiceRole.entities.Cliente.update(clienteAlvo.id, dadosRepDestino)
                        .then(() => { stats.cliente_atualizado = true; })
                );
            }

            if (!mover_todos) {
                // REGRA 2A: Apenas o pedido/entry específico
                if (entryAlvo) {
                    operacoes.push(
                        base44.asServiceRole.entities.CommissionEntry.update(entryAlvo.id, dadosRepDestino)
                            .then(() => { stats.entries_movidas++; })
                    );
                }

                const idParaMover = pedido_id || entryAlvo?.pedido_id;
                if (idParaMover) {
                    operacoes.push(
                        base44.asServiceRole.entities.Pedido.update(idParaMover, {
                            ...dadosRepDestino,
                            comissao_fechamento_id: null,
                            comissao_paga:          false,
                            comissao_mes_ano_pago:  null,
                        }).then(() => { stats.pedidos_movidos++; })
                    );
                }
            } else {
                // REGRA 2B: Transferência em massa — todas as entries ABERTAS do cliente
                const entriesDoCliente = todasEntries.filter(e =>
                    e.status === 'aberto' &&
                    (
                        (clienteCodigo && String(e.cliente_nome) === clienteNome) ||
                        e.cliente_nome === clienteNome
                    )
                );

                const pedidoIdsParaMover = new Set();

                for (const e of entriesDoCliente) {
                    operacoes.push(
                        base44.asServiceRole.entities.CommissionEntry.update(e.id, dadosRepDestino)
                            .then(() => { stats.entries_movidas++; })
                    );
                    if (e.pedido_id) pedidoIdsParaMover.add(String(e.pedido_id));
                }

                // Pedidos abertos/aguardando do cliente sem CommissionEntry ainda
                const pedidosSemEntry = todosPedidos.filter(p =>
                    p.cliente_nome === clienteNome &&
                    ['aberto', 'aguardando', 'parcial'].includes(p.status) &&
                    !p.comissao_paga
                );
                for (const p of pedidosSemEntry) {
                    pedidoIdsParaMover.add(String(p.id));
                }

                for (const pid of pedidoIdsParaMover) {
                    operacoes.push(
                        base44.asServiceRole.entities.Pedido.update(pid, {
                            ...dadosRepDestino,
                            comissao_fechamento_id: null,
                            comissao_paga:          false,
                            comissao_mes_ano_pago:  null,
                        }).then(() => { stats.pedidos_movidos++; })
                    );
                }
            }

            await Promise.all(operacoes);

            return Response.json({
                ok: true,
                representante_destino: { codigo: repDestino.codigo, nome: repDestino.nome },
                stats,
                mensagem: `Transferência concluída. ${stats.pedidos_movidos} pedido(s) e ${stats.entries_movidas} comissão(ões) movidas. Cliente atualizado: ${stats.cliente_atualizado ? 'sim' : 'não encontrado'}.`
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