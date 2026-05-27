import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { rota_id } = await req.json();
    if (!rota_id) return Response.json({ error: 'rota_id obrigatório' }, { status: 400 });

    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE');

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

    const resultados = [];
    const dadosAtualizados = [...(rota.dados_cobranca || [])];

    for (let i = 0; i < dadosAtualizados.length; i++) {
      const cliente = dadosAtualizados[i];
      const numero = (cliente.cliente_telefone || '').replace(/\D/g, '');
      const numeroFormatado = numero.startsWith('55') ? numero : `55${numero}`;

      if (!numeroFormatado || numeroFormatado.length < 12) {
        dadosAtualizados[i] = { ...cliente, whatsapp_enviado: false, whatsapp_erro: 'Número inválido' };
        resultados.push({ cliente: cliente.cliente_nome, status: 'erro', erro: 'Número inválido' });
        continue;
      }

      const linhasPedidos = (cliente.pedidos || [])
        .map(p => `▪ Pedido #${p.numero_pedido} — ${formatCurrency(p.valor_saldo)}`)
        .join('\n');

      const texto =
        `Olá, *${cliente.cliente_nome}*! Tudo bem? 😊\n\n` +
        `O nosso cobrador *Gil* estará na sua região no dia *${formatDate(rota.data_rota)}*. ` +
        `Podemos confirmar a visita dele para o acerto das pendências?\n\n` +
        `*📋 Resumo das Pendências:*\n${linhasPedidos || '▪ Consulte nosso financeiro'}\n\n` +
        `*💰 Total a Acertar: ${formatCurrency(cliente.total_cliente)}*\n\n` +
        `Aguardamos confirmação. Obrigado! 🙏\n_Equipe J&C Esquadrias_`;

      try {
        const resp = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
          body: JSON.stringify({ number: numeroFormatado, text: texto }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        dadosAtualizados[i] = { ...cliente, whatsapp_enviado: true, whatsapp_erro: null };
        resultados.push({ cliente: cliente.cliente_nome, status: 'ok', numero: numeroFormatado });
      } catch (e) {
        dadosAtualizados[i] = { ...cliente, whatsapp_enviado: false, whatsapp_erro: e.message };
        resultados.push({ cliente: cliente.cliente_nome, status: 'erro', erro: e.message });
      }

      // Aguarda 1s entre envios para não sobrecarregar a API
      await new Promise(r => setTimeout(r, 1000));
    }

    await base44.asServiceRole.entities.RotaCobranca.update(rota_id, {
      whatsapp_disparado: true,
      dados_cobranca: dadosAtualizados,
    });

    const enviados = resultados.filter(r => r.status === 'ok').length;
    const erros = resultados.filter(r => r.status === 'erro').length;

    return Response.json({ success: true, enviados, erros, resultados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});