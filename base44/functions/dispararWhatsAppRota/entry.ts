// Backend mantido para uso via automações/agendamentos
// O disparo principal agora ocorre no frontend (DetalhesRotaModal) para feedback em tempo real
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

    const limparNumero = (n) => {
      if (!n) return '';
      const digits = n.replace(/\D/g, '');
      return digits.startsWith('55') ? digits : `55${digits}`;
    };

    const isValido = (n) => {
      const d = n.replace(/\D/g, '');
      return d.length >= 12 && d.length <= 15;
    };

    const resultados = [];
    const dadosAtualizados = [...(rota.dados_cobranca || [])];

    for (let i = 0; i < dadosAtualizados.length; i++) {
      const cliente = dadosAtualizados[i];
      const numeros = (cliente.todos_telefones?.length ? cliente.todos_telefones : [cliente.cliente_telefone])
        .map(limparNumero)
        .filter(n => n && isValido(n));

      if (!numeros.length) {
        dadosAtualizados[i] = { ...cliente, whatsapp_enviado: false, whatsapp_erro: 'Número inválido' };
        resultados.push({ cliente: cliente.cliente_nome, status: 'erro', erro: 'Número inválido' });
        continue;
      }

      const linhasPedidos = (cliente.pedidos || [])
        .map(p => `▪ Pedido #${p.numero_pedido} — ${formatCurrency(p.valor_saldo)}`)
        .join('\n');

      const texto =
        `Olá, *${cliente.cliente_nome}*! 😊\n\n` +
        `O nosso cobrador *Gil* estará na sua região no dia *${formatDate(rota.data_rota)}*.\n\n` +
        `*📋 Pendências:*\n${linhasPedidos || '▪ Consulte nosso financeiro'}\n\n` +
        `*💰 Total: ${formatCurrency(cliente.total_cliente)}*\n\n` +
        `Aguardamos confirmação! 🙏\n_Equipe J&C Esquadrias_`;

      let enviou = false;
      for (const numero of numeros) {
        try {
          const resp = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify({ number: numero, text: texto }),
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          dadosAtualizados[i] = { ...cliente, whatsapp_enviado: true, whatsapp_erro: null };
          resultados.push({ cliente: cliente.cliente_nome, status: 'ok', numero });
          enviou = true;
          break;
        } catch (e) { /* tenta próximo */ }
      }

      if (!enviou) {
        dadosAtualizados[i] = { ...cliente, whatsapp_enviado: false, whatsapp_erro: 'Falha no envio' };
        resultados.push({ cliente: cliente.cliente_nome, status: 'erro', erro: 'Falha em todos os números' });
      }

      await new Promise(r => setTimeout(r, 800));
    }

    await base44.asServiceRole.entities.RotaCobranca.update(rota_id, {
      whatsapp_disparado: dadosAtualizados.some(c => c.whatsapp_enviado),
      dados_cobranca: dadosAtualizados,
    });

    const enviados = resultados.filter(r => r.status === 'ok').length;
    const erros = resultados.filter(r => r.status === 'erro').length;
    return Response.json({ success: true, enviados, erros, resultados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});