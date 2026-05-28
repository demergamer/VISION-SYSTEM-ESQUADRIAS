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
      const d = n.replace(/\D/g, '');
      if (!d) return '';
      if (d.startsWith('55') && d.length >= 12) return d;
      const sem = d.startsWith('55') && d.length < 12 ? d.slice(2) : d;
      return `55${sem}`;
    };
    const isValido = (n) => { const d = n.replace(/\D/g, ''); return d.length >= 12 && d.length <= 15; };

    const enviados = [];
    const falhas = [];

    // ── Formato novo (itens_rota) ──
    if (rota.itens_rota?.length > 0) {
      // Agrupar itens por cliente
      const itensMap = new Map();
      for (const item of rota.itens_rota) {
        if (item.recusado) continue;
        const key = item.cliente_codigo || 'sem_cliente';
        if (!itensMap.has(key)) itensMap.set(key, []);
        itensMap.get(key).push(item);
      }

      // Buscar todos os pedidos e cheques de uma vez
      const todosPedidosIds = rota.itens_rota.filter(i => i.tipo === 'pedido').map(i => i.item_id);
      const todosChequeIds = rota.itens_rota.filter(i => i.tipo === 'cheque').map(i => i.item_id);
      const [pedidosDB, chequesDB, clientesDB] = await Promise.all([
        todosPedidosIds.length ? base44.asServiceRole.entities.Pedido.filter({ id: { '$in': todosPedidosIds } }, '', 1000) : [],
        todosChequeIds.length ? base44.asServiceRole.entities.Cheque.filter({ id: { '$in': todosChequeIds } }, '', 500) : [],
        base44.asServiceRole.entities.Cliente.list('nome', 1000),
      ]);

      const itensRotaAtualizados = [...rota.itens_rota];

      for (const [codCli, itensDoCliente] of itensMap.entries()) {
        const clienteDB = clientesDB.find(c => c.codigo === codCli) || {};
        const nomeCliente = clienteDB.nome || codCli;

        // Coletar telefones do cliente
        const telefones = [];
        if (clienteDB.telefone_1) telefones.push(clienteDB.telefone_1);
        if (clienteDB.telefone_2) telefones.push(clienteDB.telefone_2);
        (clienteDB.contatos_lista || []).forEach(c => { if (c.telefone) telefones.push(c.telefone); });

        const numerosValidos = telefones.map(limparNumero).filter(n => n && isValido(n));

        if (!numerosValidos.length) {
          falhas.push({ cliente_nome: nomeCliente, cliente_codigo: codCli, erro: 'Sem telefone' });
          // Marcar todos os itens desse cliente como falha
          itensRotaAtualizados.forEach((item, i) => {
            if (item.cliente_codigo === codCli) {
              itensRotaAtualizados[i] = { ...item, whatsapp_enviado: false, whatsapp_erro: 'Sem telefone' };
            }
          });
          continue;
        }

        // Montar mensagem
        const linhas = itensDoCliente.map(item => {
          if (item.tipo === 'pedido') {
            const p = pedidosDB.find(x => x.id === item.item_id);
            return p ? `▪ Pedido #${p.numero_pedido} — ${formatCurrency(p.saldo_restante ?? p.valor_pedido ?? 0)}` : null;
          } else {
            const c = chequesDB.find(x => x.id === item.item_id);
            return c ? `▪ Cheque ${c.numero_cheque} — ${formatCurrency((c.valor || 0) - (c.valor_pago || 0))}` : null;
          }
        }).filter(Boolean).join('\n');

        const totalCliente = itensDoCliente.reduce((s, item) => {
          if (item.tipo === 'pedido') {
            const p = pedidosDB.find(x => x.id === item.item_id);
            return s + (p ? (p.saldo_restante ?? p.valor_pedido ?? 0) : 0);
          } else {
            const c = chequesDB.find(x => x.id === item.item_id);
            return s + (c ? (c.valor || 0) - (c.valor_pago || 0) : 0);
          }
        }, 0);

        const responsavel = clienteDB.responsavel_1 || '';
        const saudacao = responsavel ? `Olá *${responsavel}*! 😊` : `Olá *${nomeCliente}*! 😊`;
        const texto = `${saudacao}\n\nRepresentando *${nomeCliente}*.\nCobrador *Gil* na região em *${formatDate(rota.data_rota)}*.\n\n*📋 Pendências:*\n${linhas || '▪ Consulte nosso financeiro'}\n\n*💰 Total: ${formatCurrency(totalCliente)}*\n\nAguardamos! 🙏\n_J&C Esquadrias_`;

        let enviou = false;
        for (const numero of numerosValidos) {
          try {
            const resp = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
              body: JSON.stringify({ number: numero, text: texto }),
            });
            if (resp.ok) {
              enviados.push({ cliente_nome: nomeCliente, numero });
              itensRotaAtualizados.forEach((item, i) => {
                if (item.cliente_codigo === codCli) {
                  itensRotaAtualizados[i] = { ...item, whatsapp_enviado: true, whatsapp_erro: null };
                }
              });
              enviou = true;
              break;
            }
          } catch (_) {}
          await new Promise(r => setTimeout(r, 300));
        }

        if (!enviou) {
          falhas.push({ cliente_nome: nomeCliente, cliente_codigo: codCli, numero: numerosValidos[0], erro: 'Falha no envio' });
          itensRotaAtualizados.forEach((item, i) => {
            if (item.cliente_codigo === codCli) {
              itensRotaAtualizados[i] = { ...item, whatsapp_enviado: false, whatsapp_erro: 'Falha no envio' };
            }
          });
        }

        await new Promise(r => setTimeout(r, 500));
      }

      await base44.asServiceRole.entities.RotaCobranca.update(rota_id, {
        itens_rota: itensRotaAtualizados,
        whatsapp_disparado: true,
      });

    } else {
      // ── Formato legado (dados_cobranca) ──
      const dadosAtualizados = [...(rota.dados_cobranca || [])];

      for (let ci = 0; ci < dadosAtualizados.length; ci++) {
        const cliente = dadosAtualizados[ci];
        if (cliente.recusado) continue;

        const telefones = [cliente.cliente_telefone, ...(cliente.todos_telefones || [])].filter(Boolean);
        const numerosValidos = [...new Set(telefones.map(limparNumero).filter(n => n && isValido(n)))];

        if (!numerosValidos.length) {
          falhas.push({ cliente_nome: cliente.cliente_nome, erro: 'Sem telefone' });
          dadosAtualizados[ci] = { ...cliente, whatsapp_enviado: false, whatsapp_erro: 'Sem telefone' };
          continue;
        }

        const linhas = (cliente.pedidos || [])
          .map(p => `▪ Pedido #${p.numero_pedido} — ${formatCurrency(p.valor_saldo)}`)
          .join('\n');
        const texto = `Olá *${cliente.cliente_nome}*! 😊\n\nCobrador *Gil* na região em *${formatDate(rota.data_rota)}*.\n\n*📋 Pendências:*\n${linhas || '▪ Consulte nosso financeiro'}\n\n*💰 Total: ${formatCurrency(cliente.total_cliente)}*\n\nAguardamos! 🙏\n_J&C Esquadrias_`;

        let enviou = false;
        for (const numero of numerosValidos) {
          try {
            const resp = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
              body: JSON.stringify({ number: numero, text: texto }),
            });
            if (resp.ok) {
              enviados.push({ cliente_nome: cliente.cliente_nome, numero });
              dadosAtualizados[ci] = { ...cliente, whatsapp_enviado: true, whatsapp_erro: null };
              enviou = true;
              break;
            }
          } catch (_) {}
          await new Promise(r => setTimeout(r, 300));
        }

        if (!enviou) {
          falhas.push({ cliente_nome: cliente.cliente_nome, numero: numerosValidos[0], erro: 'Falha no envio' });
          dadosAtualizados[ci] = { ...cliente, whatsapp_enviado: false, whatsapp_erro: 'Falha no envio' };
        }

        await new Promise(r => setTimeout(r, 500));
      }

      await base44.asServiceRole.entities.RotaCobranca.update(rota_id, {
        dados_cobranca: dadosAtualizados,
        whatsapp_disparado: true,
      });
    }

    return Response.json({ success: true, enviados, falhas });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});