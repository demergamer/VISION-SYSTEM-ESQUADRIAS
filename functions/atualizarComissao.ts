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
        // ACTION 2: Transferir para outro Representante (CORREÇÃO JSON)
        // Fluxo:
        //  1. Resolve entry alvo + representante destino
        //  2. Identifica/cria FechamentoComissao de destino (mesmo mes_ano)
        //  3. Move CommissionEntry(s) → novo fechamento_id + novo representante
        //  4. Move Pedido(s) → novo representante + limpa vínculos de fechamento antigo
        //  5. Atualiza cadastro do Cliente
        //  6. Recalcula totais do fechamento antigo e do novo
        // ─────────────────────────────────────────────────────────────
        if (action === 'transferir') {
            const { entry_id, pedido_id, novo_representante_codigo, mover_todos } = body;

            if (!novo_representante_codigo) {
                return Response.json({ error: 'novo_representante_codigo é obrigatório' }, { status: 400 });
            }
            if (!entry_id && !pedido_id) {
                return Response.json({ error: 'entry_id ou pedido_id é obrigatório' }, { status: 400 });
            }

            try {
                // ── 1. Busca dados base em paralelo ───────────────────
                const [todosReps, todosPedidos, todasEntries, todosFechamentos, todosClientes] = await Promise.all([
                    base44.asServiceRole.entities.Representante.list(),
                    base44.asServiceRole.entities.Pedido.list(),
                    base44.asServiceRole.entities.CommissionEntry.list(),
                    base44.asServiceRole.entities.FechamentoComissao.list(),
                    base44.asServiceRole.entities.Cliente.list(),
                ]);

                // Valida representante destino
                const repDestino = todosReps.find(r => String(r.codigo) === String(novo_representante_codigo));
                if (!repDestino) return Response.json({ error: 'Representante destino não encontrado' }, { status: 404 });
                if (repDestino.bloqueado) return Response.json({ error: 'Representante destino está bloqueado' }, { status: 409 });

                // Resolve entry alvo principal (entry_id pode ser id da entry ou id do pedido)
                let entryAlvo = entry_id ? todasEntries.find(e => String(e.id) === String(entry_id)) : null;

                // Resolve pedido alvo
                const pedidoAlvoId = entryAlvo?.pedido_id || pedido_id || entry_id;
                const pedidoAlvo   = todosPedidos.find(p => String(p.id) === String(pedidoAlvoId));

                if (!entryAlvo && !pedidoAlvo) {
                    return Response.json({ error: 'Entry ou Pedido alvo não encontrado' }, { status: 404 });
                }
                if (entryAlvo?.status === 'fechado') {
                    return Response.json({ error: 'Não é possível transferir uma comissão já fechada' }, { status: 409 });
                }

                // Dados do representante destino (usados em todas as atualizações)
                const dadosRep = {
                    representante_codigo: repDestino.codigo,
                    representante_nome:   repDestino.nome,
                };

                // ── 2. Determina quais entries mover ──────────────────
                const clienteNome   = entryAlvo?.cliente_nome || pedidoAlvo?.cliente_nome || '';
                const clienteCodigo = pedidoAlvo?.cliente_codigo || null;

                let entriesToMove = [];
                if (mover_todos) {
                    // Todas as entries abertas do mesmo cliente
                    entriesToMove = todasEntries.filter(e =>
                        e.status === 'aberto' && e.cliente_nome === clienteNome
                    );
                } else {
                    if (entryAlvo) entriesToMove = [entryAlvo];
                }

                // IDs dos fechamentos de origem afetados (para recálculo posterior)
                const fechamentosOrigem = new Set(
                    entriesToMove.map(e => e.fechamento_id).filter(Boolean)
                );

                // ── 3. Agrupa entries por mes_ano para resolver/criar envelopes destino ──
                const envelopeDestinoCache = new Map(); // mes_ano → id do FechamentoComissao destino

                const resolverEnvelopeDestino = async (mesAno) => {
                    if (envelopeDestinoCache.has(mesAno)) return envelopeDestinoCache.get(mesAno);

                    const existente = todosFechamentos.find(f =>
                        f.representante_codigo === String(repDestino.codigo) &&
                        f.mes_ano === mesAno &&
                        f.status === 'aberto'
                    );

                    let envelopeId;
                    if (existente) {
                        envelopeId = existente.id;
                    } else {
                        const novo = await base44.asServiceRole.entities.FechamentoComissao.create({
                            mes_ano:               mesAno,
                            representante_codigo:  repDestino.codigo,
                            representante_nome:    repDestino.nome,
                            representante_chave_pix: repDestino.chave_pix || '',
                            status:                'aberto',
                            total_vendas:          0,
                            total_comissoes_bruto: 0,
                            vales_adiantamentos:   0,
                            outros_descontos:      0,
                            valor_liquido:         0,
                            pedidos_detalhes:      [],
                        });
                        envelopeId = novo.id;
                    }
                    envelopeDestinoCache.set(mesAno, envelopeId);
                    return envelopeId;
                };

                // ── 4. Move CommissionEntries → novo representante + novo envelope ──
                const stats = { entries_movidas: 0, pedidos_movidos: 0, cliente_atualizado: false };

                await Promise.all(entriesToMove.map(async (e) => {
                    const mesAno = e.mes_competencia || String(e.data_competencia || '').substring(0, 7);
                    const novoEnvelopeId = await resolverEnvelopeDestino(mesAno);
                    await base44.asServiceRole.entities.CommissionEntry.update(e.id, {
                        ...dadosRep,
                        representante_id: repDestino.id || repDestino.codigo,
                        fechamento_id:    novoEnvelopeId,
                    });
                    stats.entries_movidas++;
                }));

                // ── 5. Move Pedidos vinculados ────────────────────────
                const pedidoIdsParaMover = new Set(entriesToMove.map(e => String(e.pedido_id)).filter(Boolean));

                if (mover_todos) {
                    // Também pedidos abertos/parciais do cliente sem entry
                    todosPedidos
                        .filter(p => p.cliente_nome === clienteNome && ['aberto', 'aguardando', 'parcial'].includes(p.status) && !p.comissao_paga)
                        .forEach(p => pedidoIdsParaMover.add(String(p.id)));
                } else if (pedidoAlvo) {
                    pedidoIdsParaMover.add(String(pedidoAlvo.id));
                }

                await Promise.all([...pedidoIdsParaMover].map(async (pid) => {
                    await base44.asServiceRole.entities.Pedido.update(pid, {
                        ...dadosRep,
                        comissao_fechamento_id: null,
                        comissao_paga:          false,
                        comissao_mes_ano_pago:  null,
                    });
                    stats.pedidos_movidos++;
                }));

                // ── 6. Atualiza cadastro do Cliente ───────────────────
                const clienteAlvo = todosClientes.find(c =>
                    (clienteCodigo && String(c.codigo) === String(clienteCodigo)) ||
                    (!clienteCodigo && c.nome === clienteNome)
                );
                if (clienteAlvo) {
                    await base44.asServiceRole.entities.Cliente.update(clienteAlvo.id, dadosRep);
                    stats.cliente_atualizado = true;
                }

                // ── 7. Recalcula totais de TODOS os fechamentos afetados ──
                // Recarrega entries atualizadas para somar corretamente
                const entriesAtualizadas = await base44.asServiceRole.entities.CommissionEntry.list();

                const recalcularFechamento = async (fechamentoId) => {
                    if (!fechamentoId) return;
                    const itens = entriesAtualizadas.filter(e => String(e.fechamento_id) === String(fechamentoId));
                    const totalVendas    = itens.reduce((s, e) => s + (parseFloat(e.valor_base)     || 0), 0);
                    const totalComissoes = itens.reduce((s, e) => s + (parseFloat(e.valor_comissao) || 0), 0);
                    const fech = todosFechamentos.find(f => String(f.id) === String(fechamentoId));
                    const vales   = parseFloat(fech?.vales_adiantamentos || 0);
                    const outros  = parseFloat(fech?.outros_descontos     || 0);
                    await base44.asServiceRole.entities.FechamentoComissao.update(fechamentoId, {
                        total_vendas:          parseFloat(totalVendas.toFixed(2)),
                        total_comissoes_bruto: parseFloat(totalComissoes.toFixed(2)),
                        valor_liquido:         parseFloat((totalComissoes - vales - outros).toFixed(2)),
                    });
                };

                // Recalcula origens + destinos
                const todosParaRecalcular = new Set([
                    ...fechamentosOrigem,
                    ...envelopeDestinoCache.values(),
                ]);
                await Promise.all([...todosParaRecalcular].map(id => recalcularFechamento(id)));

                return Response.json({
                    ok: true,
                    representante_destino: { codigo: repDestino.codigo, nome: repDestino.nome },
                    stats,
                    fechamentos_recalculados: todosParaRecalcular.size,
                    mensagem: `Transferência concluída. ${stats.entries_movidas} comissão(ões) e ${stats.pedidos_movidos} pedido(s) movidos. Totais recalculados.`,
                });

            } catch (transferError) {
                console.error('[atualizarComissao] Erro na transferência:', transferError);
                return Response.json({ error: 'Erro interno: ' + transferError.message }, { status: 500 });
            }
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