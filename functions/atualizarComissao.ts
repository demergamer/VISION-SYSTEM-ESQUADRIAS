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
        // ─────────────────────────────────────────────────────────────
        if (action === 'transferir') {
            const { entry_id, pedido_id, novo_representante_codigo, mover_todos } = body;

            if (!novo_representante_codigo) return Response.json({ error: 'Falta novo_representante_codigo' }, { status: 400 });

            try {
                // 1. Busca Dados
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

                const clienteNome = pedidoAlvo.cliente_nome;
                const clienteCodigo = pedidoAlvo.cliente_codigo;

                // 2. Determina Pedidos a mover
                let pedidosParaMover = new Set();
                if (mover_todos && clienteNome) {
                    todosPedidos.filter(p => p.cliente_nome === clienteNome && !p.comissao_paga)
                                .forEach(p => pedidosParaMover.add(p));
                } else {
                    pedidosParaMover.add(pedidoAlvo);
                }

                const pedidosIds = Array.from(pedidosParaMover).map(p => String(p.id));
                const fechamentosAfetados = new Set();

                // 3. Atualiza Pedidos e coleta fechamentos afetados
                await Promise.all(Array.from(pedidosParaMover).map(async (p) => {
                    if (p.comissao_fechamento_id) fechamentosAfetados.add(String(p.comissao_fechamento_id));
                    await base44.asServiceRole.entities.Pedido.update(p.id, {
                        representante_codigo: repDestino.codigo,
                        representante_nome:   repDestino.nome,
                        comissao_fechamento_id: null,
                    });
                }));

                // 4. Atualiza Cliente
                const clienteAlvo = todosClientes.find(c =>
                    (clienteCodigo && String(c.codigo) === String(clienteCodigo)) ||
                    (!clienteCodigo && c.nome === clienteNome)
                );
                if (clienteAlvo) {
                    await base44.asServiceRole.entities.Cliente.update(clienteAlvo.id, {
                        representante_codigo: repDestino.codigo,
                        representante_nome:   repDestino.nome,
                    });
                }

                // 5. FAXINA: Varre todos os FechamentoComissao abertos,
                //    remove os pedidos movidos do JSON pedidos_detalhes e recalcula totais
                let fechamentosAtualizados = 0;
                const todosParaVerificar = new Set([...fechamentosAfetados]);
                // Inclui todos os rascunhos abertos como segurança (cobre vínculos perdidos)
                todosFechamentos.filter(f => f.status === 'aberto').forEach(f => todosParaVerificar.add(String(f.id)));

                await Promise.all(Array.from(todosParaVerificar).map(async (fId) => {
                    const fechamento = todosFechamentos.find(f => String(f.id) === fId);
                    if (!fechamento) return;

                    const detalhesAtuais = Array.isArray(fechamento.pedidos_detalhes) ? fechamento.pedidos_detalhes : [];
                    const contemPedidoMovido = detalhesAtuais.some(d => pedidosIds.includes(String(d.pedido_id)));
                    if (!contemPedidoMovido) return;

                    // Remove os pedidos transferidos do JSON
                    const novaListaDetalhes = detalhesAtuais.filter(d => !pedidosIds.includes(String(d.pedido_id)));

                    // Recalcula totais baseado no JSON limpo
                    const novoTotalVendas    = novaListaDetalhes.reduce((acc, d) => acc + (Number(d.valor_pedido)  || 0), 0);
                    const novoTotalComissoes = novaListaDetalhes.reduce((acc, d) => acc + (Number(d.valor_comissao) || 0), 0);
                    const vales  = Number(fechamento.vales_adiantamentos) || 0;
                    const outros = Number(fechamento.outros_descontos)    || 0;

                    await base44.asServiceRole.entities.FechamentoComissao.update(fId, {
                        pedidos_detalhes:      novaListaDetalhes,
                        total_vendas:          parseFloat(novoTotalVendas.toFixed(2)),
                        total_comissoes_bruto: parseFloat(novoTotalComissoes.toFixed(2)),
                        valor_liquido:         parseFloat((novoTotalComissoes - vales - outros).toFixed(2)),
                    });
                    fechamentosAtualizados++;
                }));

                return Response.json({
                    ok: true,
                    mensagem: `Transferência concluída. Pedido removido do rascunho anterior e carteira atualizada.`,
                    fechamentos_atualizados: fechamentosAtualizados,
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