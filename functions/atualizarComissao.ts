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
        // ACTION 2: Transferir para outro Representante (LIMPEZA DE SNAPSHOT)
        // ─────────────────────────────────────────────────────────────
        if (action === 'transferir') {
            const { entry_id, pedido_id, novo_representante_codigo, mover_todos } = body;

            if (!novo_representante_codigo) {
                return Response.json({ error: 'novo_representante_codigo é obrigatório' }, { status: 400 });
            }

            try {
                // 1. Busca todos os dados necessários
                const [todosReps, todosPedidos, todasEntries, todosFechamentos, todosClientes] = await Promise.all([
                    base44.asServiceRole.entities.Representante.list(),
                    base44.asServiceRole.entities.Pedido.list(),
                    base44.asServiceRole.entities.CommissionEntry.list(),
                    base44.asServiceRole.entities.FechamentoComissao.list(),
                    base44.asServiceRole.entities.Cliente.list(),
                ]);

                const repDestino = todosReps.find(r => String(r.codigo) === String(novo_representante_codigo));
                if (!repDestino) return Response.json({ error: 'Representante destino não encontrado' }, { status: 404 });

                // Identifica o pedido principal
                const idBusca = pedido_id || entry_id;
                const pedidoAlvo = todosPedidos.find(p => String(p.id) === String(idBusca));
                if (!pedidoAlvo) return Response.json({ error: 'Pedido alvo não encontrado' }, { status: 404 });

                // 2. Determina quais pedidos serão movidos
                let pedidosParaMover = [];
                if (mover_todos && pedidoAlvo.cliente_nome) {
                    pedidosParaMover = todosPedidos.filter(p => p.cliente_nome === pedidoAlvo.cliente_nome && !p.comissao_paga);
                } else {
                    pedidosParaMover = [pedidoAlvo];
                }
                const idsPedidosMovidos = pedidosParaMover.map(p => String(p.id));

                // 3. Atualiza os Pedidos (Desvincula do envelope antigo e troca dono)
                await Promise.all(pedidosParaMover.map(p =>
                    base44.asServiceRole.entities.Pedido.update(p.id, {
                        representante_codigo: repDestino.codigo,
                        representante_nome: repDestino.nome,
                        comissao_fechamento_id: null,
                        comissao_mes_ano_pago: null
                    })
                ));

                // 4. Atualiza o Cliente na base
                const clienteAlvo = todosClientes.find(c => c.nome === pedidoAlvo.cliente_nome);
                if (clienteAlvo) {
                    await base44.asServiceRole.entities.Cliente.update(clienteAlvo.id, {
                        representante_codigo: repDestino.codigo,
                        representante_nome: repDestino.nome
                    });
                }

                // 5. Atualiza as CommissionEntries atreladas (se houver)
                const entriesParaMover = todasEntries.filter(e => idsPedidosMovidos.includes(String(e.pedido_id)) && e.status !== 'fechado');
                await Promise.all(entriesParaMover.map(e =>
                    base44.asServiceRole.entities.CommissionEntry.update(e.id, {
                        representante_id: repDestino.codigo,
                        representante_codigo: repDestino.codigo,
                        representante_nome: repDestino.nome,
                        fechamento_id: null
                    })
                ));

                // 6. A FAXINA DO SNAPSHOT (O CORAÇÃO DA CORREÇÃO)
                // Varre todos os Fechamentos em 'aberto' para limpar o JSON (pedidos_detalhes)
                const fechamentosAbertos = todosFechamentos.filter(f => f.status === 'aberto');

                await Promise.all(fechamentosAbertos.map(async f => {
                    if (!f.pedidos_detalhes || !Array.isArray(f.pedidos_detalhes)) return;

                    const snapshotContemPedidoMovido = f.pedidos_detalhes.some(d => idsPedidosMovidos.includes(String(d.pedido_id)));

                    if (snapshotContemPedidoMovido) {
                        const novaListaDetalhes = f.pedidos_detalhes.filter(d => !idsPedidosMovidos.includes(String(d.pedido_id)));

                        const novoTotalVendas = novaListaDetalhes.reduce((acc, d) => acc + (Number(d.valor_pedido) || 0), 0);
                        const novoTotalComissoes = novaListaDetalhes.reduce((acc, d) => acc + (Number(d.valor_comissao) || 0), 0);
                        const vales = Number(f.vales_adiantamentos) || 0;
                        const outros = Number(f.outros_descontos) || 0;

                        await base44.asServiceRole.entities.FechamentoComissao.update(f.id, {
                            pedidos_detalhes: novaListaDetalhes,
                            total_vendas: parseFloat(novoTotalVendas.toFixed(2)),
                            total_comissoes_bruto: parseFloat(novoTotalComissoes.toFixed(2)),
                            valor_liquido: parseFloat((novoTotalComissoes - vales - outros).toFixed(2))
                        });
                    }
                }));

                return Response.json({
                    ok: true,
                    mensagem: `Transferência concluída com sucesso. Pedidos removidos do rascunho anterior.`
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