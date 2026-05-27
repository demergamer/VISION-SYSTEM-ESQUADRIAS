import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { telefone } = await req.json();
    if (!telefone) {
      return Response.json({ error: 'Telefone obrigatório' }, { status: 400 });
    }

    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE');

    // Buscar contas a vencer nos próximos 7 dias
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const em7dias = new Date(hoje);
    em7dias.setDate(em7dias.getDate() + 7);

    const toISO = (d) => d.toISOString().split('T')[0];

    const todasContas = await base44.asServiceRole.entities.ContaPagar.filter({
      status: { '$in': ['pendente', 'parcial', 'pendente_preenchimento'] }
    }, 'data_vencimento', 500);

    const contasVencer = todasContas.filter(c => {
      if (!c.data_vencimento) return false;
      const venc = new Date(c.data_vencimento + 'T00:00:00');
      return venc >= hoje && venc <= em7dias;
    }).sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));

    const formatCurrency = (val) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    };

    const isHoje = (dateStr) => dateStr === toISO(hoje);

    const totalGeral = contasVencer.reduce((s, c) => s + (c.valor || 0), 0);

    // Agrupar por empresa
    const porEmpresa = {};
    for (const c of contasVencer) {
      const emp = c.empresa_nome || c.empresa_codigo || 'Sem Empresa';
      if (!porEmpresa[emp]) porEmpresa[emp] = [];
      porEmpresa[emp].push(c);
    }

    // Montar mensagem
    let msg = `📋 *RELATÓRIO DE CONTAS A VENCER*\n`;
    msg += `_Próximos 7 dias — ${formatDate(toISO(hoje))} a ${formatDate(toISO(em7dias))}_\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (contasVencer.length === 0) {
      msg += `✅ Nenhuma conta a vencer nos próximos 7 dias!\n`;
    } else {
      for (const [empresa, contas] of Object.entries(porEmpresa)) {
        const totalEmp = contas.reduce((s, c) => s + (c.valor || 0), 0);
        msg += `🏢 *${empresa}*\n`;
        for (const c of contas) {
          const hoje_ = isHoje(c.data_vencimento);
          const emoji = hoje_ ? '🔴' : '🟡';
          msg += `${emoji} ${formatDate(c.data_vencimento)} — ${c.fornecedor_nome || 'Fornecedor'}\n`;
          msg += `   ${c.descricao?.slice(0, 40) || ''} — *${formatCurrency(c.valor)}*\n`;
        }
        msg += `   _Subtotal: ${formatCurrency(totalEmp)}_\n\n`;
      }
      msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `💰 *TOTAL GERAL: ${formatCurrency(totalGeral)}*\n`;
      msg += `📊 ${contasVencer.length} lançamento(s)\n`;
    }

    msg += `\n_Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}_`;

    // Formatar número (remover caracteres não numéricos, garantir DDI 55)
    const numero = telefone.replace(/\D/g, '');
    const numeroFormatado = numero.startsWith('55') ? numero : `55${numero}`;

    // Enviar via Evolution API
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: numeroFormatado,
        text: msg,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json({ error: 'Erro ao enviar WhatsApp', details: result }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: `Relatório enviado para ${telefone}`,
      contas: contasVencer.length,
      total: totalGeral,
      evolution_response: result
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});