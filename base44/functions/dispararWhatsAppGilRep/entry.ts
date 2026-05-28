import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
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

async function enviar(url, key, inst, numero, texto) {
  const resp = await fetch(`${url}/message/sendText/${inst}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify({ number: numero, text: texto }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.json();
}

// Gera até 3 partes de URL do Google Maps com até 10 paradas cada
function gerarUrlsMaps(paradas) {
  const LOTE = 9;
  const urls = [];
  for (let i = 0; i < paradas.length; i += LOTE) {
    const lote = paradas.slice(i, i + LOTE);
    const waypoints = lote.slice(0, -1).map(p => encodeURIComponent(p)).join('/');
    const destino = encodeURIComponent(lote[lote.length - 1]);
    const origem = encodeURIComponent(lote[0]);
    if (lote.length === 1) {
      urls.push(`https://www.google.com/maps/search/?api=1&query=${origem}`);
    } else {
      urls.push(`https://www.google.com/maps/dir/${origem}/${waypoints}/${destino}`);
    }
  }
  return urls;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { rota_id, destino } = body; // destino: 'gil' | 'representantes'

    if (!rota_id) return Response.json({ error: 'rota_id obrigatório' }, { status: 400 });
    if (!destino) return Response.json({ error: 'destino obrigatório (gil | representantes)' }, { status: 400 });

    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE');

    const rotas = await base44.asServiceRole.entities.RotaCobranca.filter({ id: rota_id });
    const rota = rotas?.[0];
    if (!rota) return Response.json({ error: 'Rota não encontrada' }, { status: 404 });

    const itensAtivos = (rota.dados_cobranca || []).filter(c => !c.recusado);

    // ── DESTINO: GIL ──────────────────────────────────────────────────
    if (destino === 'gil') {
      const numeroGil = '5511981264504';

      const cidades = [...new Set(itensAtivos.map(i => i.cliente_cidade).filter(Boolean))].join(', ');

      const listaClientes = itensAtivos
        .map(c => {
          const total = formatCurrency(c.total_cliente);
          const pedidos = (c.pedidos || []).map(p => `    ▪ Pedido ${p.numero_pedido}: ${formatCurrency(p.valor_saldo)}`).join('\n');
          return `👤 *${c.cliente_nome}* (${c.cliente_cidade || '—'}) — ${total}\n${pedidos}`;
        })
        .join('\n\n');

      const totalGeral = itensAtivos.reduce((s, c) => s + (c.total_cliente || 0), 0);

      // Gerar links Maps com endereços válidos
      const paradas = itensAtivos
        .filter(c => c.cliente_endereco_completo || c.cliente_cidade)
        .map(c => c.cliente_endereco_completo || `${c.cliente_cidade}, SP, Brasil`);
      const mapsUrls = gerarUrlsMaps(paradas);
      const linksTexto = mapsUrls.length
        ? mapsUrls.map((url, i) => `Parte ${i + 1}: ${url}`).join('\n')
        : '—';

      const texto =
        `Olá *Gil*! 🛵\n\n` +
        `Sua rota do dia *${formatDate(rota.data_rota)}* está pronta!\n\n` +
        `🏙️ *Cidades:* ${cidades || '—'}\n\n` +
        `💰 *Total a cobrar:* ${formatCurrency(totalGeral)}\n\n` +
        `👥 *Clientes (${itensAtivos.length}):*\n\n${listaClientes || '—'}\n\n` +
        `🗺️ *Links do Maps:*\n${linksTexto}\n\n` +
        `_Sistema J&C Esquadrias_`;

      await enviar(EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE, numeroGil, texto);
      return Response.json({ success: true, destino: 'gil', numero: numeroGil });
    }

    // ── DESTINO: REPRESENTANTES ───────────────────────────────────────
    if (destino === 'representantes') {
      // Buscar representantes para pegar telefone
      const representantes = await base44.asServiceRole.entities.Representante.list('nome', 300);
      const repMap = {};
      representantes.forEach(r => { repMap[r.codigo] = r; });

      const porRep = {};
      itensAtivos.forEach(item => {
        const repCod = item.representante_codigo || '__SEM_REP__';
        if (!porRep[repCod]) {
          const repDB = repMap[item.representante_codigo];
          porRep[repCod] = {
            nome: item.representante_nome || repCod,
            telefone: repDB?.telefone || '',
            clientes: [],
          };
        }
        porRep[repCod].clientes.push(item);
      });

      const resultados = [];
      for (const [repCod, rep] of Object.entries(porRep)) {
        if (repCod === '__SEM_REP__') {
          resultados.push({ rep: 'Sem Representante', status: 'pulado', motivo: 'sem código' });
          continue;
        }

        const numero = limparNumero(rep.telefone);
        if (!isValido(numero)) {
          resultados.push({ rep: rep.nome, status: 'erro', motivo: `Telefone inválido: "${rep.telefone}"` });
          continue;
        }

        const listaClientes = rep.clientes
          .map(c => `▪ ${c.cliente_nome}${c.cliente_cidade ? ` (${c.cliente_cidade})` : ''} — ${formatCurrency(c.total_cliente)}`)
          .join('\n');

        const totalRep = rep.clientes.reduce((s, c) => s + (c.total_cliente || 0), 0);

        const texto =
          `Olá *${rep.nome}*! 👋\n\n` +
          `O cobrador *Gil* fará a rota de cobrança no dia *${formatDate(rota.data_rota)}*.\n\n` +
          `Os seus clientes que serão visitados são:\n${listaClientes}\n\n` +
          `💰 *Total: ${formatCurrency(totalRep)}*\n\n` +
          `_Equipe J&C Esquadrias_`;

        try {
          await enviar(EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE, numero, texto);
          resultados.push({ rep: rep.nome, status: 'ok', numero });
          await new Promise(r => setTimeout(r, 500));
        } catch (e) {
          resultados.push({ rep: rep.nome, status: 'erro', motivo: e.message });
        }
      }

      const enviados = resultados.filter(r => r.status === 'ok').length;
      return Response.json({ success: true, destino: 'representantes', enviados, resultados });
    }

    return Response.json({ error: 'destino inválido' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});