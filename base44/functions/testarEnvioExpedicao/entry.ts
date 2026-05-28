import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function enviar(url, key, inst, numero, texto) {
  const resp = await fetch(`${url}/message/sendText/${inst}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify({ number: numero, text: texto }),
  });
  const body = await resp.json();
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${JSON.stringify(body)}`);
  return body;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE');

    const numeroExpedicao = '5511994933003';
    const texto = `*\`J&C Vision | Teste\`*\n\nOlá! Este é um teste de envio para a Expedição.\n\n_Sistema J&C Esquadrias_`;

    const resultado = await enviar(EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE, numeroExpedicao, texto);

    return Response.json({ success: true, numero: numeroExpedicao, resultado });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});