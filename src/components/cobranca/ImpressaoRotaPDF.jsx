const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

function gerarHTML(rota) {
  const clientes = rota.dados_cobranca || [];
  const ativos = clientes.filter((c) => !c.recusado);
  const totalGeral = ativos.reduce((s, c) => s + (c.total_cliente || 0), 0);
  const geradoEm = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const linhasClientes = clientes.map((c, i) => {
    const pedidosHtml = (c.pedidos || [])
      .map(p => `<div>${p.tipo_item === 'cheque' ? `Cheque ${p.numero_pedido}` : `Pedido ${p.numero_pedido}`}: ${formatCurrency(p.valor_saldo)}</div>`)
      .join('');
    const situacao = c.recusado ? 'Recusado' : c.whatsapp_enviado ? '✓ WhatsApp' : 'Pendente';
    const rowClass = c.recusado ? ' class="recusado"' : '';
    return `
      <tr${rowClass}>
        <td>${i + 1}</td>
        <td><strong>${c.cliente_nome}</strong></td>
        <td>${c.cliente_cidade || '—'}</td>
        <td>${c.representante_nome || '—'}</td>
        <td>${pedidosHtml || '—'}</td>
        <td class="valor">${formatCurrency(c.total_cliente)}</td>
        <td>${situacao}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Rota ${rota.codigo_rota}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #f5f5f5; }
    .container { max-width: 960px; margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }

    .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: white; padding: 24px 28px; display: flex; align-items: center; gap: 16px; }
    .logo { height: 52px; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3)); }
    .header-info h1 { font-size: 20px; font-weight: 800; }
    .header-info p { font-size: 12px; opacity: 0.85; margin-top: 4px; }
    .header-badge { margin-left: auto; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 50px; font-size: 12px; text-align: center; white-space: nowrap; }

    .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px 28px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .meta-card { background: white; border-radius: 8px; padding: 12px 16px; border: 1px solid #e2e8f0; }
    .meta-card .label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-card .value { font-size: 16px; font-weight: 800; color: #1e3a8a; margin-top: 2px; }

    .section { padding: 20px 28px; }
    .section-title { font-size: 13px; font-weight: 700; color: #1e3a8a; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }

    table { width: 100%; border-collapse: collapse; }
    th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px 10px; font-size: 11px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    tr:hover td { background: #f8fafc; }
    .valor { font-weight: 700; color: #1e3a8a; }
    .recusado td { opacity: 0.4; text-decoration: line-through; }

    .total-bar { background: linear-gradient(135deg, #1e3a8a, #2563eb); color: white; margin: 0 28px 28px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; border-radius: 8px; }
    .total-bar-label { font-size: 13px; font-weight: 600; opacity: 0.9; }
    .total-bar-value { font-size: 22px; font-weight: 900; }

    .footer { text-align: center; font-size: 10px; color: #94a3b8; padding: 12px; border-top: 1px solid #e2e8f0; }

    @media print {
      body { background: white; }
      .container { box-shadow: none; border-radius: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div class="container">

  <div class="header">
    <img class="logo" src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png" alt="J&C" />
    <div class="header-info">
      <h1>🛵 Rota de Cobrança — ${rota.codigo_rota}</h1>
      <p>J&C Esquadrias de Alumínio — Relatório gerado em ${geradoEm}</p>
    </div>
    <div class="header-badge">
      📅 ${formatDate(rota.data_rota)}<br/>
      <strong>${rota.cobrador_nome || 'Gil'}</strong>
    </div>
  </div>

  <div class="meta">
    <div class="meta-card">
      <div class="label">Status</div>
      <div class="value" style="font-size:14px">${rota.status}</div>
    </div>
    <div class="meta-card">
      <div class="label">Total de Clientes</div>
      <div class="value">${clientes.length}</div>
    </div>
    <div class="meta-card">
      <div class="label">Ativos</div>
      <div class="value">${ativos.length}</div>
    </div>
    <div class="meta-card">
      <div class="label">Total a Cobrar</div>
      <div class="value">${formatCurrency(totalGeral)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📋 Clientes da Rota</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Cliente</th>
          <th>Cidade</th>
          <th>Representante</th>
          <th>Pedidos / Cheques</th>
          <th>Total</th>
          <th>Situação</th>
        </tr>
      </thead>
      <tbody>
        ${linhasClientes}
      </tbody>
    </table>
  </div>

  <div class="total-bar">
    <span class="total-bar-label">💰 TOTAL GERAL DA ROTA</span>
    <span class="total-bar-value">${formatCurrency(totalGeral)}</span>
  </div>

  <div class="footer">J&C One Vision System — Documento gerado automaticamente em ${geradoEm}</div>
</div>
</body>
</html>`;
}

export function abrirRelatorioRota(rota) {
  const html = gerarHTML(rota);
  const janela = window.open('', '_blank');
  janela.document.write(html);
  janela.document.close();
  janela.focus();
}

// Componente legado mantido para compatibilidade — chama direto ao montar
export default function ImpressaoRotaPDF({ rota, onClose }) {
  abrirRelatorioRota(rota);
  onClose();
  return null;
}