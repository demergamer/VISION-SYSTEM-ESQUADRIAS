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

// Endereço completo da fábrica (já encoded para compor a URL diretamente)
const FABRICA_ENCODED = 'J%26C+Esquadrias+de+Alum%C3%ADnio+-+Av.+Mir%C3%B3+At%C3%ADlio+Peduzi,+500+-+Tanque+Caio,+Ribeir%C3%A3o+Pires+-+SP,+09436-500,+Brasil';

// Extrai o melhor ponto de localização de um item: coordenadas > endereço completo > cidade
function itemParaWaypoint(item) {
  if (item.cliente_latitude && item.cliente_longitude) {
    return `${item.cliente_latitude},${item.cliente_longitude}`;
  }
  if (item.cliente_endereco_completo?.trim()) {
    return item.cliente_endereco_completo.trim();
  }
  if (item.cliente_cidade) {
    return `${item.cliente_cidade}, ${item.cliente_estado || 'SP'}, Brasil`;
  }
  return null;
}

// Gera URLs do Google Maps priorizando coordenadas, com até 9 paradas por lote
function gerarUrlsMaps(itens) {
  const LOTE = 9;
  const waypoints = itens.map(itemParaWaypoint).filter(Boolean);
  if (waypoints.length === 0) return [];

  const urls = [];
  for (let i = 0; i < waypoints.length; i += LOTE) {
    const lote = waypoints.slice(i, i + LOTE);
    const origemEncoded = i === 0 ? FABRICA_ENCODED : encodeURIComponent(waypoints[i - 1]);
    const destinosEncoded = lote.map(p => encodeURIComponent(p)).join('/');
    urls.push(`https://www.google.com/maps/dir/${origemEncoded}/${destinosEncoded}`);
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
    const { rota_id, destino, apenas_rep_nome } = body; // destino: 'gil' | 'representantes', apenas_rep_nome: filtra 1 rep

    if (!rota_id) return Response.json({ error: 'rota_id obrigatório' }, { status: 400 });
    if (!destino) return Response.json({ error: 'destino obrigatório (gil | representantes)' }, { status: 400 });

    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE');

    const rotas = await base44.asServiceRole.entities.RotaCobranca.filter({ id: rota_id });
    const rota = rotas?.[0];
    if (!rota) return Response.json({ error: 'Rota não encontrada' }, { status: 404 });

    // ── Suporte ao novo formato itens_rota ──────────────────────────────
    const usaFormatoNovo = rota.itens_rota?.length > 0;
    let itensAtivos = [];

    if (usaFormatoNovo) {
      const itensNaoRecusados = rota.itens_rota.filter(i => !i.recusado);

      const idsPedidos = itensNaoRecusados.filter(i => i.tipo === 'pedido').map(i => i.item_id);
      const idsCheques = itensNaoRecusados.filter(i => i.tipo === 'cheque').map(i => i.item_id);

      // Busca pedidos individualmente (SDK não suporta $in)
      const [pedidosDB, chequesDB, clientesDB] = await Promise.all([
        idsPedidos.length
          ? Promise.all(idsPedidos.map(id => base44.asServiceRole.entities.Pedido.filter({ id }, '', 1).then(r => r?.[0]).catch(() => null)))
              .then(res => res.filter(Boolean))
          : [],
        idsCheques.length
          ? Promise.all(idsCheques.map(id => base44.asServiceRole.entities.Cheque.filter({ id }, '', 1).then(r => r?.[0]).catch(() => null)))
              .then(res => res.filter(Boolean))
          : [],
        base44.asServiceRole.entities.Cliente.list('nome', 1000),
      ]);

      const clienteMap = {};
      clientesDB.forEach(c => { clienteMap[c.codigo] = c; });

      // Agrupar por cliente_codigo
      const grupoMap = new Map();
      itensNaoRecusados.forEach(rotaItem => {
        const itemDB = rotaItem.tipo === 'pedido'
          ? pedidosDB.find(p => p.id === rotaItem.item_id)
          : chequesDB.find(c => c.id === rotaItem.item_id);
        if (!itemDB) return;

        const codCli = rotaItem.cliente_codigo || itemDB.cliente_codigo;
        const clienteDB = clienteMap[codCli] || {};
        const key = codCli || itemDB.cliente_nome || 'sem_cliente';

        if (!grupoMap.has(key)) {
          const endParts = [clienteDB.endereco, clienteDB.numero, clienteDB.cidade, clienteDB.estado || 'SP'].filter(Boolean);
          grupoMap.set(key, {
            cliente_codigo: codCli,
            cliente_nome: clienteDB.nome || itemDB.cliente_nome || 'Desconhecido',
            cliente_cidade: clienteDB.cidade || itemDB.cliente_regiao || '',
            cliente_estado: clienteDB.estado || 'SP',
            cliente_latitude: clienteDB.latitude || null,
            cliente_longitude: clienteDB.longitude || null,
            cliente_endereco_completo: clienteDB.cidade ? endParts.join(', ') + ', Brasil' : '',
            representante_nome: clienteDB.representante_nome || itemDB.representante_nome || null,
            representante_codigo: clienteDB.representante_codigo || itemDB.representante_codigo || null,
            pedidos: [],
            total_cliente: 0,
          });
        }

        const grupo = grupoMap.get(key);
        const valorSaldo = rotaItem.tipo === 'cheque'
          ? ((itemDB.valor || 0) - (itemDB.valor_pago || 0))
          : (itemDB.saldo_restante ?? itemDB.valor_pedido ?? 0);

        grupo.pedidos.push({
          numero_pedido: rotaItem.tipo === 'cheque' ? itemDB.numero_cheque : itemDB.numero_pedido,
          valor_saldo: valorSaldo,
          tipo_item: rotaItem.tipo,
        });
        grupo.total_cliente += valorSaldo;
      });

      itensAtivos = Array.from(grupoMap.values());
    } else {
      itensAtivos = (rota.dados_cobranca || []).filter(c => !c.recusado);
    }

    // ── DESTINO: GIL ──────────────────────────────────────────────────
    if (destino === 'gil') {
      const numeroGil = '5511981264504';

      const cidades = [...new Set(itensAtivos.map(i => i.cliente_cidade).filter(Boolean))].join(', ');

      const listaClientes = itensAtivos
        .map(c => {
          const total = formatCurrency(c.total_cliente);
          const pedidos = (c.pedidos || []).map(p => {
            const label = p.tipo_item === 'cheque' ? `Cheque #${p.numero_pedido}` : `Pedido #${p.numero_pedido}`;
            return `    ▪ ${label}: ${formatCurrency(p.valor_saldo)}`;
          }).join('\n');
          return `👤 *${c.cliente_nome}* (${c.cliente_cidade || '—'}) — ${total}\n${pedidos}`;
        })
        .join('\n\n');

      const totalGeral = itensAtivos.reduce((s, c) => s + (c.total_cliente || 0), 0);

      // Gerar links Maps priorizando coordenadas lat/lng
      const mapsUrls = gerarUrlsMaps(itensAtivos);
      const linksTexto = mapsUrls.length
        ? mapsUrls.map((url, i) => `Parte ${i + 1}: ${url}`).join('\n')
        : '—';

      const texto =
        `*\`J&C Vision | Mensagem Automática\`*\n\n` +
        `Olá *Gil*! 🛵\n\n` +
        `Sua rota do dia *${formatDate(rota.data_rota)}* está pronta!\n\n` +
        `🏙️ *Cidades:* ${cidades || '—'}\n\n` +
        `💰 *Total a cobrar:* ${formatCurrency(totalGeral)}\n\n` +
        `👥 *Clientes (${itensAtivos.length}):*\n\n${listaClientes || '—'}\n\n` +
        `🗺️ *Links do Maps:*\n${linksTexto}\n\n` +
        `_Sistema J&C Esquadrias_\n\n` +
        `Para mais informações acesse: https://jcvision.base44.app/`;

      let gilOk = false, gilErro = null;
      try {
        await enviar(EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE, numeroGil, texto);
        gilOk = true;
      } catch (e) {
        gilErro = e.message;
      }

      // ── Mensagem para a Expedição (sempre tenta, independente do Gil) ──
      const numeroExpedicao = '5511994933003';
      const listaClientesExpedicao = itensAtivos
        .map((c, i) => `${i + 1}. *${c.cliente_nome}*${c.cliente_cidade ? ` — ${c.cliente_cidade}` : ''}`)
        .join('\n');

      const textoExpedicao =
        `*\`J&C Vision | Rota de Cobrança\`*\n\n` +
        `📋 Rota do dia *${formatDate(rota.data_rota)}* — Cobrador: *Gil*\n\n` +
        `👥 *Clientes a serem visitados (${itensAtivos.length}):*\n\n` +
        `${listaClientesExpedicao || '—'}\n\n` +
        `_Sistema J&C Esquadrias_`;

      let expedicaoOk = false, expedicaoErro = null;
      try {
        await enviar(EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE, numeroExpedicao, textoExpedicao);
        expedicaoOk = true;
      } catch (e) {
        expedicaoErro = e.message;
      }

      return Response.json({
        success: true,
        destino: 'gil',
        gil: { numero: numeroGil, ok: gilOk, erro: gilErro },
        expedicao: { numero: numeroExpedicao, ok: expedicaoOk, erro: expedicaoErro },
      });
    }

    // ── DESTINO: REPRESENTANTES ───────────────────────────────────────
    if (destino === 'representantes') {
      // Buscar representantes e clientes para enriquecer dados null na rota
      // (re-usa clientesDB se já foi buscado no bloco do novo formato)
      const [representantes, clientes] = await Promise.all([
        base44.asServiceRole.entities.Representante.list('nome', 300),
        base44.asServiceRole.entities.Cliente.list('nome', 1000),
      ]);

      const repMapNome = {};
      representantes.forEach(r => { repMapNome[r.nome] = r; });
      const clienteMapCodigo = {};
      clientes.forEach(c => { clienteMapCodigo[c.codigo] = c; });

      // Enriquecer itens cujo representante_nome está null — busca pelo cadastro do cliente
      const itensEnriquecidos = itensAtivos.map(item => {
        if (item.representante_nome) return item;
        const clienteDB = clienteMapCodigo[item.cliente_codigo];
        if (!clienteDB) return item;
        return {
          ...item,
          representante_codigo: clienteDB.representante_codigo || null,
          representante_nome: clienteDB.representante_nome || null,
        };
      });

      const porRep = {};
      itensEnriquecidos.forEach(item => {
        const repNome = item.representante_nome || '__SEM_REP__';
        if (!porRep[repNome]) {
          const repDB = repMapNome[item.representante_nome];
          porRep[repNome] = {
            nome: item.representante_nome || repNome,
            telefone: repDB?.telefone || '',
            clientes: [],
          };
        }
        porRep[repNome].clientes.push(item);
      });

      const resultados = [];
      for (const [repNome, rep] of Object.entries(porRep)) {
        // Se veio filtro de rep específico, pula os demais
        if (apenas_rep_nome && repNome !== apenas_rep_nome) continue;

        if (repNome === '__SEM_REP__') {
          resultados.push({ rep: 'Sem Representante', status: 'pulado', motivo: 'sem representante no cadastro do cliente' });
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
          `*\`J&C Vision | Mensagem Automática\`*\n\n` +
          `Olá *${rep.nome}*! 👋\n\n` +
          `O cobrador *Gil* fará a rota de cobrança no dia *${formatDate(rota.data_rota)}*.\n\n` +
          `Os seus clientes que serão visitados são:\n${listaClientes}\n\n` +
          `💰 *Total: ${formatCurrency(totalRep)}*\n\n` +
          `_Equipe J&C Esquadrias_\n\n` +
          `Para mais informações acesse: https://jcvision.base44.app/`;

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