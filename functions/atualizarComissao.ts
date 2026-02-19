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
        // ACTION 2: Transferir para outro Representante (3 PASSOS CIRÚRGICOS)
        // ─────────────────────────────────────────────────────────────
        if (action === 'transferir') {
            const { entry_id, pedido_id, novo_representante_codigo, mover_todos } = body;

            if (!novo_representante_codigo) {
                return Response.json({ error: 'novo_representante_codigo é obrigatório' }, { status: 400 });
            }

            try {
                // Busca dados base
                const [todosReps, todosPedidos, todosFechamentos, todosClientes] = await Promise.all([
                    base44.asServiceRole.entities.Representante.list(),
                    base44.asServiceRole.entities.Pedido.list(),
                    base44.asServiceRole.entities.FechamentoComissao.list(),
                    base44.asServiceRole.entities.Cliente.list(),
                ]);

                const repDestino = todosReps.find(r => String(r.codigo) === String(novo_representante_codigo));
                if (!repDestino) return Response.json({ error: 'Representante destino não encontrado' }, { status: 404 });

                const idBusca = pedido_id || entry_id;
                const pedidoAlvo = todosPedidos.find(p => String(p.id) === String(idBusca));
                if (!pedidoAlvo) return Response.json({ error: 'Pedido alvo não encontrado' }, { status: 404 });

                // Determina quais pedidos serão movidos
                let pedidosParaMover = [];
                if (mover_todos && pedidoAlvo.cliente_nome) {
                    pedidosParaMover = todosPedidos.filter(p => p.cliente_nome === pedidoAlvo.cliente_nome && !p.comissao_paga);
                } else {
                    pedidosParaMover = [pedidoAlvo];
                }

                // Helper: recalcula e salva um FechamentoComissao com nova lista
                const salvarFechamento = async (fechamento, novaLista) => {
                    const totalVendas    = novaLista.reduce((acc, d) => acc + (Number(d.valor_pedido)  || 0), 0);
                    const totalComissoes = novaLista.reduce((acc, d) => acc + (Number(d.valor_comissao) || 0), 0);
                    const vales  = Number(fechamento.vales_adiantamentos) || 0;
                    const outros = Number(fechamento.outros_descontos)    || 0;
                    await base44.asServiceRole.entities.FechamentoComissao.update(fechamento.id, {
                        pedidos_detalhes:      novaLista,
                        total_vendas:          parseFloat(totalVendas.toFixed(2)),
                        total_comissoes_bruto: parseFloat(totalComissoes.toFixed(2)),
                        valor_liquido:         parseFloat((totalComissoes - vales - outros).toFixed(2)),
                    });
                };

                // Helper: busca ou cria FechamentoComissao de destino para um mes_ano
                const envelopeDestinoCache = {};
                const resolverDestinoEnvelope = async (mesAno) => {
                    if (envelopeDestinoCache[mesAno]) return envelopeDestinoCache[mesAno];
                    let fDest = todosFechamentos.find(f =>
                        String(f.representante_codigo) === String(repDestino.codigo) &&
                        f.mes_ano === mesAno &&
                        f.status === 'aberto'
                    );
                    if (!fDest) {
                        fDest = await base44.asServiceRole.entities.FechamentoComissao.create({
                            mes_ano:               mesAno,
                            representante_codigo:  repDestino.codigo,
                            representante_nome:    repDestino.nome,
                            representante_chave_pix: repDestino.chave_pix || '',
                            status:                'aberto',
                            pedidos_detalhes:      [],
                            total_vendas:          0,
                            total_comissoes_bruto: 0,
                            vales_adiantamentos:   0,
                            outros_descontos:      0,
                            valor_liquido:         0,
                        });
                        todosFechamentos.push(fDest); // Adiciona ao cache local para reuso
                    }
                    envelopeDestinoCache[mesAno] = fDest;
                    return fDest;
                };

                // ── PASSO 1: Atualiza Pedido(s) e Cliente ──────────────
                await Promise.all(pedidosParaMover.map(p =>
                    base44.asServiceRole.entities.Pedido.update(p.id, {
                        representante_codigo: repDestino.codigo,
                        representante_nome:   repDestino.nome,
                    })
                ));

                const clienteAlvo = todosClientes.find(c => c.nome === pedidoAlvo.cliente_nome);
                if (clienteAlvo) {
                    await base44.asServiceRole.entities.Cliente.update(clienteAlvo.id, {
                        representante_codigo: repDestino.codigo,
                        representante_nome:   repDestino.nome,
                    });
                }

                // ── PASSO 2 + 3: Para cada pedido, extrai da origem e injeta no destino ──
                // Agrupa pedidos por representante_codigo de origem (dono antigo)
                for (const pedido of pedidosParaMover) {
                    const repOrigem = pedido.representante_codigo;

                    // Descobre o mes_ano para este pedido (usa data_referencia_comissao ou data_pagamento)
                    const dataRef = pedido.data_referencia_comissao || pedido.data_pagamento;
                    const mesAno  = dataRef ? String(dataRef).substring(0, 7) : null;
                    if (!mesAno) continue; // Pedido sem data de referência não tem envelope

                    // Passo 2: Busca fechamento de ORIGEM e extrai o pedido do JSON
                    const fOrigem = todosFechamentos.find(f =>
                        String(f.representante_codigo) === String(repOrigem) &&
                        f.mes_ano === mesAno &&
                        f.status === 'aberto'
                    );

                    let pedidoExtraido = null;
                    if (fOrigem && Array.isArray(fOrigem.pedidos_detalhes)) {
                        pedidoExtraido = fOrigem.pedidos_detalhes.find(d => String(d.pedido_id) === String(pedido.id));
                        const listaOrigem = fOrigem.pedidos_detalhes.filter(d => String(d.pedido_id) !== String(pedido.id));
                        // Atualiza fechamento de origem com lista reduzida
                        await salvarFechamento(fOrigem, listaOrigem);
                        // Atualiza cache local para evitar re-leitura
                        fOrigem.pedidos_detalhes = listaOrigem;
                    }

                    // Passo 3: Busca/cria fechamento de DESTINO e insere o pedido extraído
                    const fDestino = await resolverDestinoEnvelope(mesAno);
                    const listaDestino = Array.isArray(fDestino.pedidos_detalhes) ? [...fDestino.pedidos_detalhes] : [];

                    // Monta o objeto a inserir (usa o extraído ou reconstrói do pedido)
                    const percentual     = Number(pedido.porcentagem_comissao) || 5;
                    const valorBase      = Number(pedido.total_pago) || Number(pedido.valor_pedido) || 0;
                    const valorComissao  = parseFloat(((valorBase * percentual) / 100).toFixed(2));

                    const itemDestino = pedidoExtraido
                        ? { ...pedidoExtraido }
                        : {
                            pedido_id:          String(pedido.id),
                            numero_pedido:      pedido.numero_pedido,
                            cliente_nome:       pedido.cliente_nome,
                            data_pagamento:     pedido.data_pagamento,
                            valor_pedido:       valorBase,
                            percentual_comissao: percentual,
                            valor_comissao:     valorComissao,
                          };

                    listaDestino.push(itemDestino);
                    await salvarFechamento(fDestino, listaDestino);
                    // Atualiza cache local
                    fDestino.pedidos_detalhes = listaDestino;
                }

                return Response.json({
                    ok: true,
                    mensagem: `Transferência concluída: ${pedidosParaMover.length} pedido(s) movidos do rascunho de origem para o destino.`,
                });

            } catch (error) {
                console.error('[atualizarComissao] Erro na transferência:', error);
                return Response.json({ error: 'Erro interno: ' + error.message }, { status: 500 });
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