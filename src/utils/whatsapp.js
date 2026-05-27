/**
 * Utilitário de WhatsApp — J&C One Vision
 */

export function limparNumeroWhatsApp(numeroOriginal) {
  if (!numeroOriginal) return null;
  const digits = numeroOriginal.replace(/\D/g, '');
  if (!digits) return null;
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export function gerarTextoCobranca(clienteDados, dataRota) {
  const dataFormatada = (() => {
    if (!dataRota) return 'em breve';
    const [y, m, d] = dataRota.split('-');
    return `${d}/${m}/${y}`;
  })();

  const formatCurrency = (val) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const linhasPedidos = (clienteDados.pedidos || [])
    .map(p => `▪ Pedido #${p.numero_pedido} — ${formatCurrency(p.valor_saldo)}`)
    .join('\n');

  return (
    `Olá, *${clienteDados.cliente_nome}*! Tudo bem? 😊\n\n` +
    `O nosso cobrador *Gil* estará na sua região no dia *${dataFormatada}*. ` +
    `Podemos confirmar a visita dele para o acerto das pendências?\n\n` +
    `*📋 Resumo das Pendências:*\n${linhasPedidos || '▪ Consulte nosso financeiro'}\n\n` +
    `*💰 Total a Acertar: ${formatCurrency(clienteDados.total_cliente)}*\n\n` +
    `Aguardamos confirmação. Obrigado! 🙏\n_Equipe J&C Esquadrias_`
  );
}

export async function dispararWhatsAppCliente(clienteDados, dataRota) {
  const EVOLUTION_API_URL = import.meta.env.VITE_EVOLUTION_API_URL;
  const EVOLUTION_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;
  const EVOLUTION_INSTANCE = import.meta.env.VITE_EVOLUTION_INSTANCE;

  const numero = limparNumeroWhatsApp(clienteDados.cliente_telefone);
  if (!numero) throw new Error(`Número inválido para ${clienteDados.cliente_nome}`);

  const texto = gerarTextoCobranca(clienteDados, dataRota);

  const response = await fetch(
    `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
      body: JSON.stringify({ number: numero, text: texto }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Erro HTTP ${response.status}`);
  }

  return await response.json();
}