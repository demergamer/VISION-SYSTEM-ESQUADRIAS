import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { rota_id, cliente_codigo, cliente_nome, numero_corrigido, texto_mensagem } = await req.json();
    if (!rota_id || !numero_corrigido) {
      return Response.json({ error: 'Parâmetros obrigatórios: rota_id, numero_corrigido' }, { status: 400 });
    }

    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE');

    // Garantir número limpo (só dígitos, com DDI 55)
    const digits = numero_corrigido.replace(/\D/g, '');
    const numero = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;

    // Buscar a rota para montar a mensagem se não foi passada pronta
    let texto = texto_mensagem;
    if (!texto) {
      const rotas = await base44.asServiceRole.entities.RotaCobranca.filter({ id: rota_id });
      const rota = rotas?.[0];
      if (!rota) return Response.json({ error: 'Rota não encontrada' }, { status: 404 });

      const formatCurrency = (val) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
      const formatDate = (dateStr) => {
        if (!dateStr) return 'em breve';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
      };

      // Suporta tanto formato novo (itens_rota) quanto legado (dados_cobranca)
      let cliente = null;

      // Formato novo: buscar pedidos/cheques do cliente na rota
      if (rota.itens_rota?.length > 0 && cliente_codigo) {
        const itensDoCliente = rota.itens_rota.filter(i => i.cliente_codigo === cliente_codigo);
        if (itensDoCliente.length > 0) {
          // Buscar dados dos pedidos
          const idsPedidos = itensDoCliente.filter(i => i.tipo === 'pedido').map(i => i.item_id);
          const idsCheques = itensDoCliente.filter(i => i.tipo === 'cheque').map(i => i.item_id);
          
          const pedidos = idsPedidos.length
            ? await base44.asServiceRole.entities.Pedido.filter({ id: { '$in': idsPedidos } }, '', 100)
            : [];
          const cheques = idsCheques.length
            ? await base44.asServiceRole.entities.Cheque.filter({ id: { '$in': idsCheques } }, '', 100)
            : [];

          // Buscar dados do cliente
          const clientesDB = await base44.asServiceRole.entities.Cliente.filter({ codigo: cliente_codigo });
          const clienteDB = clientesDB?.[0] || {};

          const itensMsg = [
            ...pedidos.map(p => `▪ Pedido #${p.numero_pedido} — ${formatCurrency(p.saldo_restante ?? p.valor_pedido ?? 0)}`),
            ...cheques.map(c => `▪ Cheque ${c.numero_cheque} — ${formatCurrency((c.valor || 0) - (c.valor_pago || 0))}`),
          ].join('\n');

          const totalCliente = [
            ...pedidos.map(p => p.saldo_restante ?? p.valor_pedido ?? 0),
            ...cheques.map(c => (c.valor || 0) - (c.valor_pago || 0)),
          ].reduce((s, v) => s + v, 0);

          const nomeCliente = clienteDB.nome || cliente_nome || 'Cliente';
          texto = `Olá *${nomeCliente}*! 😊\n\nRepresentando *${nomeCliente}*.\nCobrador *Gil* na região em *${formatDate(rota.data_rota)}*.\n\n*📋 Pendências:*\n${itensMsg || '▪ Consulte nosso financeiro'}\n\n*💰 Total: ${formatCurrency(totalCliente)}*\n\nAguardamos! 🙏\n_J&C Esquadrias_`;
        }
      }

      // Fallback para formato legado (dados_cobranca)
      if (!texto && rota.dados_cobranca?.length > 0) {
        cliente = (rota.dados_cobranca || []).find(c =>
          c.cliente_codigo === cliente_codigo || c.cliente_nome === cliente_nome
        );
        if (cliente) {
          const linhasPedidos = (cliente.pedidos || [])
            .map(p => `▪ Pedido #${p.numero_pedido} — ${formatCurrency(p.valor_saldo)}`)
            .join('\n');
          texto = `Olá *${cliente.cliente_nome}*! 😊\n\nRepresentando *${cliente.cliente_nome}*.\nCobrador *Gil* na região em *${formatDate(rota.data_rota)}*.\n\n*📋 Pendências:*\n${linhasPedidos || '▪ Consulte nosso financeiro'}\n\n*💰 Total: ${formatCurrency(cliente.total_cliente)}*\n\nAguardamos! 🙏\n_J&C Esquadrias_`;
        }
      }

      if (!texto) {
        return Response.json({ error: 'Cliente não encontrado na rota' }, { status: 404 });
      }
    }

    const resp = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
      body: JSON.stringify({ number: numero, text: texto }),
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      return Response.json({ success: false, error: errBody.message || `HTTP ${resp.status}` }, { status: 200 });
    }

    return Response.json({ success: true, numero, cliente_nome: cliente_nome || cliente_codigo });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});