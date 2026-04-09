import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { pedidos } = await req.json();
    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      return Response.json({ error: 'Payload inválido: pedidos deve ser um array não vazio.' }, { status: 400 });
    }

    const hoje = new Date().toISOString().split('T')[0];

    // Buscar todos os pedidos existentes de uma vez (1 query)
    const todos = await base44.asServiceRole.entities.Pedido.list('-created_date', 5000);
    const existentesMap = new Map(
      todos.map(p => [String(p.numero_pedido).replace(/\./g, ''), p])
    );

    const sanitizarItens = (itens) => {
      if (!Array.isArray(itens)) return [];
      return itens
        .filter(item => item && typeof item === 'object')
        .map(item => {
          const qtd = parseFloat(item.quantidade);
          const val = parseFloat(item.valor_unitario);
          return {
            codigo_peca: String(item.codigo_peca || 'S/C').trim().substring(0, 50),
            descricao_peca: String(item.descricao_peca || 'Produto sem descrição').trim().substring(0, 200),
            quantidade: (!isNaN(qtd) && qtd > 0) ? qtd : 1,
            valor_unitario: (!isNaN(val) && val >= 0) ? val : 0,
          };
        });
    };

    const novos = [];
    const atualizacoes = []; // { id, itens, observacao }

    for (const p of pedidos) {
      const numLimpo = String(p.numero_pedido || '').replace(/\./g, '').trim();
      if (!numLimpo) continue;

      const existente = existentesMap.get(numLimpo);
      const itens = sanitizarItens(p.itens_pedido);

      if (existente) {
        // ─── REGRA CRÍTICA: só atualiza pedidos em 'emproducao' ───────────────
        if (existente.status !== 'emproducao') {
          continue; // status diferente — ignora silenciosamente
        }
        // Atualiza APENAS itens_pedido e observacao — nunca toca status/cliente
        atualizacoes.push({
          id: existente.id,
          itens_pedido: itens,
          observacao: String(p.observacao || '').trim() || existente.observacao || '',
        });
      } else {
        novos.push({
          numero_pedido: p.numero_pedido,
          cliente_codigo: String(p.cliente_codigo || '').trim(),
          cliente_nome: String(p.cliente_nome || 'Cliente Desconhecido').trim(),
          cliente_regiao: String(p.cliente_regiao || '').trim(),
          representante_codigo: String(p.representante_codigo || '').trim(),
          representante_nome: String(p.representante_nome || '').trim(),
          porcentagem_comissao: (typeof p.porcentagem_comissao === 'number' && !isNaN(p.porcentagem_comissao)) ? p.porcentagem_comissao : 5,
          cliente_pendente: !!p.cliente_pendente,
          data_importado: hoje,
          status: 'emproducao',
          itens_pedido: itens,
          observacao: String(p.observacao || '').trim(),
          valor_pedido: 0,
          total_pago: 0,
          saldo_restante: 0,
          confirmado_entrega: false,
        });
      }
    }

    // Criar novos em bulk (1 request)
    if (novos.length > 0) {
      await base44.asServiceRole.entities.Pedido.bulkCreate(novos);
    }

    // Atualizar existentes em paralelo (Promise.all)
    if (atualizacoes.length > 0) {
      await Promise.all(
        atualizacoes.map(a =>
          base44.asServiceRole.entities.Pedido.update(a.id, {
            itens_pedido: a.itens_pedido,
            observacao: a.observacao,
          })
        )
      );
    }

    return Response.json({
      success: true,
      criados: novos.length,
      atualizados: atualizacoes.length,
    });
  } catch (error) {
    console.error('[importarProducaoTransaction] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});