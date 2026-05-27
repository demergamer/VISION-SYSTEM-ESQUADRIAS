import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { rota_id, cliente_nome, numero_corrigido } = await req.json();
    if (!rota_id || !cliente_nome || !numero_corrigido) {
      return Response.json({ error: 'Parâmetros obrigatórios: rota_id, cliente_nome, numero_corrigido' }, { status: 400 });
    }

    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE');

    // Buscar a rota
    const rotas = await base44.asServiceRole.entities.RotaCobranca.filter({ id: rota_id });
    const rota = rotas?.[0];
    if (!rota) return Response.json({ error: 'Rota não encontrada' }, { status: 404 });

    const cliente = (rota.dados_cobranca || []).find(c => c.cliente_nome === cliente_nome);
    if (!cliente) return Response.json({ error: 'Cliente não encontrado na rota' }, { status: 404 });

    const formatCurrency = (val) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    const formatDate = (dateStr) => {
      if (!dateStr) return 'em breve';
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    };

    // Garantir número limpo (só dígitos, com DDI 55)
    const digits = numero_corrigido.replace(/\D/g, '');
    const numero = digits.startsWith('55') ? digits : `55${digits}`;

    const linhasPedidos = (cliente.pedidos || [])
      .map(p => `▪ Pedido #${p.numero_pedido} — ${formatCurrency(p.valor_saldo)}`)
      .join('\n');

    const texto =
      `Olá, *${cliente.cliente_nome}*! 😊\n\n` +
      `O nosso cobrador *Gil* estará na sua região no dia *${formatDate(rota.data_rota)}*.\n\n` +
      `*📋 Pendências:*\n${linhasPedidos || '▪ Consulte nosso financeiro'}\n\n` +
      `*💰 Total: ${formatCurrency(cliente.total_cliente)}*\n\n` +
      `Aguardamos confirmação! 🙏\n_Equipe J&C Esquadrias_`;

    const resp = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
      body: JSON.stringify({ number: numero, text: texto }),
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      return Response.json({ success: false, error: errBody.message || `HTTP ${resp.status}` }, { status: 200 });
    }

    // Atualizar o cliente na rota com status enviado
    const dadosAtualizados = (rota.dados_cobranca || []).map(c =>
      c.cliente_nome === cliente_nome
        ? { ...c, whatsapp_enviado: true, whatsapp_erro: null, cliente_telefone: numero }
        : c
    );

    await base44.asServiceRole.entities.RotaCobranca.update(rota_id, {
      whatsapp_disparado: true,
      dados_cobranca: dadosAtualizados,
    });

    return Response.json({ success: true, numero, cliente_nome });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});