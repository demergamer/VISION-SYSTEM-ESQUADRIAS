import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

function gerarHTML(contasVencer, porEmpresa, totalGeral, hoje, em7dias) {
  const toISO = (d) => d.toISOString().split('T')[0];
  const isHoje = (dateStr) => dateStr === toISO(hoje);
  const hojeStr = formatDate(toISO(hoje));
  const em7diasStr = formatDate(toISO(em7dias));
  const geradoEm = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  let rows = '';
  for (const c of contasVencer) {
    const atrasadaHoje = isHoje(c.data_vencimento);
    const rowClass = atrasadaHoje ? 'row-hoje' : 'row-futuro';
    const badge = atrasadaHoje
      ? '<span class="badge badge-hoje">🔴 HOJE</span>'
      : '<span class="badge badge-futuro">🟡 Futuro</span>';
    rows += `
      <tr class="${rowClass}">
        <td>${badge}</td>
        <td>${formatDate(c.data_vencimento)}</td>
        <td><strong>${c.empresa_nome || c.empresa_codigo || '-'}</strong></td>
        <td>${c.fornecedor_nome || '-'}</td>
        <td>${c.descricao || '-'}</td>
        <td class="valor">${formatCurrency(c.valor)}</td>
      </tr>`;
  }

  let resumoEmpresas = '';
  for (const [empresa, contas] of Object.entries(porEmpresa)) {
    const total = contas.reduce((s, c) => s + (c.valor || 0), 0);
    const venceHoje = contas.filter(c => isHoje(c.data_vencimento));
    resumoEmpresas += `
      <div class="empresa-card">
        <div class="empresa-nome">${empresa}</div>
        <div class="empresa-stats">
          <span>${contas.length} conta(s)</span>
          ${venceHoje.length > 0 ? `<span class="urgente">⚠️ ${venceHoje.length} vence hoje</span>` : ''}
          <span class="empresa-total">${formatCurrency(total)}</span>
        </div>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Relatório Contas a Vencer</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f4f8; color: #1a202c; }
  .container { max-width: 900px; margin: 0 auto; padding: 20px; }

  /* Header */
  .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%); color: white; padding: 28px 32px; border-radius: 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 20px; }
  .logo { height: 60px; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3)); }
  .header-text h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .header-text p { font-size: 13px; opacity: 0.85; margin-top: 4px; }
  .header-badge { margin-left: auto; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 50px; font-size: 13px; text-align: center; white-space: nowrap; }

  /* Summary cards */
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
  .card { background: white; border-radius: 12px; padding: 18px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .card-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .card-value { font-size: 24px; font-weight: 800; margin-top: 4px; color: #1e3a8a; }
  .card-value.red { color: #dc2626; }
  .card-value.green { color: #16a34a; }

  /* Empresa cards */
  .empresas { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .empresa-card { background: white; border-radius: 12px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); border-left: 4px solid #2563eb; }
  .empresa-nome { font-weight: 700; font-size: 14px; color: #1e3a8a; margin-bottom: 8px; }
  .empresa-stats { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #64748b; flex-wrap: wrap; }
  .empresa-total { font-weight: 800; color: #1e3a8a; margin-left: auto; font-size: 14px; }
  .urgente { color: #dc2626; font-weight: 700; }

  /* Table */
  .table-wrap { background: white; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); overflow: hidden; margin-bottom: 20px; }
  .table-title { padding: 16px 20px; font-weight: 700; font-size: 15px; border-bottom: 1px solid #e2e8f0; color: #1e3a8a; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f8fafc; padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; }
  td { padding: 11px 14px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
  tr:last-child td { border-bottom: none; }
  .row-hoje td { background: #fff5f5; }
  .row-hoje td:first-child { border-left: 3px solid #dc2626; }
  .row-futuro td:first-child { border-left: 3px solid #f59e0b; }
  .valor { font-weight: 700; color: #1e3a8a; text-align: right; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 50px; font-size: 11px; font-weight: 700; }
  .badge-hoje { background: #fee2e2; color: #dc2626; }
  .badge-futuro { background: #fef9c3; color: #92400e; }

  /* Footer */
  .footer { text-align: center; font-size: 11px; color: #94a3b8; padding: 10px; }
  .total-bar { background: linear-gradient(135deg, #1e3a8a, #2563eb); color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-radius: 12px; margin-bottom: 12px; }
  .total-bar-label { font-size: 14px; font-weight: 600; opacity: 0.9; }
  .total-bar-value { font-size: 24px; font-weight: 900; }

  @media (max-width: 600px) {
    .summary { grid-template-columns: 1fr 1fr; }
    .header { flex-direction: column; text-align: center; }
    .header-badge { margin-left: 0; }
    th:nth-child(5), td:nth-child(5) { display: none; }
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <img class="logo" src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png" alt="J&C" />
    <div class="header-text">
      <h1>J&C One Vision — Contas a Vencer</h1>
      <p>Relatório automático gerado em ${geradoEm}</p>
    </div>
    <div class="header-badge">
      📅 ${hojeStr} a ${em7diasStr}<br/>
      <strong>Próximos 7 dias</strong>
    </div>
  </div>

  <div class="summary">
    <div class="card">
      <div class="card-label">Total a Pagar</div>
      <div class="card-value">${formatCurrency(totalGeral)}</div>
    </div>
    <div class="card">
      <div class="card-label">Lançamentos</div>
      <div class="card-value">${contasVencer.length}</div>
    </div>
    <div class="card">
      <div class="card-label">Vence Hoje</div>
      <div class="card-value red">${contasVencer.filter(c => isHoje(c.data_vencimento)).length}</div>
    </div>
  </div>

  <div class="empresas">${resumoEmpresas}</div>

  <div class="table-wrap">
    <div class="table-title">📋 Detalhamento Completo</div>
    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>Vencimento</th>
          <th>Empresa</th>
          <th>Fornecedor</th>
          <th>Descrição</th>
          <th style="text-align:right">Valor</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <div class="total-bar">
    <span class="total-bar-label">💰 TOTAL GERAL</span>
    <span class="total-bar-value">${formatCurrency(totalGeral)}</span>
  </div>

  <div class="footer">J&C One Vision System — Relatório gerado automaticamente em ${geradoEm}</div>
</div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Permite chamada autenticada (admin) OU chamada de automação (sem user)
    let isAutomation = false;
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_) {
      isAutomation = true;
    }

    if (!isAutomation && (!user || user.role !== 'admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let telefone = '11940437073'; // padrão para automação
    try {
      const body = await req.json();
      if (body?.telefone) telefone = body.telefone;
    } catch (_) {}

    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE');

    // Datas
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const em7dias = new Date(hoje);
    em7dias.setDate(em7dias.getDate() + 7);
    const toISO = (d) => d.toISOString().split('T')[0];
    const isHoje = (dateStr) => dateStr === toISO(hoje);

    // Buscar contas
    const todasContas = await base44.asServiceRole.entities.ContaPagar.filter({
      status: { '$in': ['pendente', 'parcial', 'pendente_preenchimento'] }
    }, 'data_vencimento', 500);

    const contasVencer = todasContas.filter(c => {
      if (!c.data_vencimento) return false;
      const venc = new Date(c.data_vencimento + 'T00:00:00');
      return venc >= hoje && venc <= em7dias;
    }).sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));

    const totalGeral = contasVencer.reduce((s, c) => s + (c.valor || 0), 0);

    const porEmpresa = {};
    for (const c of contasVencer) {
      const emp = c.empresa_nome || c.empresa_codigo || 'Sem Empresa';
      if (!porEmpresa[emp]) porEmpresa[emp] = [];
      porEmpresa[emp].push(c);
    }

    // Formatar número
    const numero = telefone.replace(/\D/g, '');
    const numeroFormatado = numero.startsWith('55') ? numero : `55${numero}`;

    const headers = { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY };

    // --- 1. Mensagem de texto resumo ---
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
          const emoji = isHoje(c.data_vencimento) ? '🔴' : '🟡';
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

    const r1 = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST', headers,
      body: JSON.stringify({ number: numeroFormatado, text: msg }),
    });
    const result1 = await r1.json();

    // --- 2. Enviar HTML como documento ---
    let result2 = null;
    try {
      const htmlContent = gerarHTML(contasVencer, porEmpresa, totalGeral, hoje, em7dias);
      const htmlBase64 = btoa(unescape(encodeURIComponent(htmlContent)));
      const dataStr = formatDate(toISO(hoje)).replace(/\//g, '-');

      const r2 = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, {
        method: 'POST', headers,
        body: JSON.stringify({
          number: numeroFormatado,
          mediatype: 'document',
          mimetype: 'text/html',
          caption: `📊 Relatório Completo — Abra no navegador para visualização completa`,
          media: `data:text/html;base64,${htmlBase64}`,
          fileName: `contas-vencer-${dataStr}.html`,
        }),
      });
      result2 = await r2.json();
    } catch (e) {
      result2 = { error: e.message };
    }

    return Response.json({
      success: true,
      message: `Relatório enviado para ${numeroFormatado}`,
      contas: contasVencer.length,
      total: totalGeral,
      texto_enviado: result1,
      html_enviado: result2,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});