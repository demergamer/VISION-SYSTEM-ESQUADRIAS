import { useEffect } from 'react';

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

function gerarHTML(rota) {
  const clientes = rota.dados_cobranca || [];
  const totalGeral = rota.valor_total_rota || clientes.reduce((s, c) => s + (c.total_cliente || 0), 0);
  const totalPedidos = clientes.reduce((s, c) => s + (c.pedidos?.length || 0), 0);
  const comWhatsApp = clientes.filter(c => c.whatsapp_enviado).length;

  const linhasClientes = clientes.map((cliente, idx) => {
    const pedidosRows = (cliente.pedidos || []).map((p, pi) => `
      <tr style="background:${pi % 2 === 0 ? '#ffffff' : '#f8fafc'}">
        <td style="padding:5px 10px;font-size:10px;font-weight:700;color:#1e40af">#${p.numero_pedido}</td>
        <td style="padding:5px 10px;font-size:10px;color:#64748b">${formatDate(p.data_entrega)}</td>
        <td style="padding:5px 10px;font-size:10px;color:${p.em_transito ? '#16a34a' : '#64748b'}">${p.em_transito ? '🚚 Em Trânsito' : (p.status_original || '-')}</td>
        <td style="padding:5px 10px;font-size:10px;text-align:right;font-weight:700">${formatCurrency(p.valor_saldo)}</td>
        <td style="padding:5px 10px;font-size:10px;color:#94a3b8"></td>
      </tr>
    `).join('');

    return `
      <div style="margin-bottom:14px;page-break-inside:avoid">
        <div style="background:#1e3a8a;color:white;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;border-radius:6px 6px 0 0">
          <div>
            <strong style="font-size:13px">${idx + 1}. ${cliente.cliente_nome}</strong>
            <span style="font-size:10px;opacity:0.8;margin-left:10px">${cliente.cliente_telefone || 'Sem telefone'}</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            ${cliente.whatsapp_enviado ? '<span style="font-size:10px;background:rgba(255,255,255,0.2);padding:2px 6px;border-radius:4px">✓ WhatsApp</span>' : ''}
            <strong style="font-size:13px">${formatCurrency(cliente.total_cliente)}</strong>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #e2e8f0;border-top:none">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:5px 10px;text-align:left;border-bottom:1px solid #e2e8f0;width:80px;font-size:10px">Pedido</th>
              <th style="padding:5px 10px;text-align:left;border-bottom:1px solid #e2e8f0;font-size:10px">Entrega Prev.</th>
              <th style="padding:5px 10px;text-align:left;border-bottom:1px solid #e2e8f0;font-size:10px">Status</th>
              <th style="padding:5px 10px;text-align:right;border-bottom:1px solid #e2e8f0;width:90px;font-size:10px">Saldo (R$)</th>
              <th style="padding:5px 10px;text-align:left;border-bottom:1px solid #e2e8f0;width:130px;font-size:10px">Observações / Recibo</th>
            </tr>
          </thead>
          <tbody>
            ${pedidosRows}
            <tr style="background:#f0f4ff">
              <td colspan="3" style="padding:5px 10px;font-weight:700;font-size:11px;color:#1e3a8a">SUBTOTAL ${cliente.cliente_nome}</td>
              <td style="padding:5px 10px;text-align:right;font-weight:900;color:#1e3a8a">${formatCurrency(cliente.total_cliente)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Rota de Cobrança — ${rota.codigo_rota}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #1e293b; background: #fff; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <!-- Cabeçalho -->
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;border-bottom:2px solid #1e3a8a;padding-bottom:12px">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png" style="height:44px" alt="J&C" />
    <div style="flex:1">
      <div style="font-size:18px;font-weight:900;color:#1e3a8a">Rota de Cobrança — ${rota.codigo_rota}</div>
      <div style="font-size:11px;color:#64748b;margin-top:2px">
        Data: <strong>${formatDate(rota.data_rota)}</strong> &nbsp;·&nbsp;
        Cobrador: <strong>${rota.cobrador_nome || 'Gil'}</strong> &nbsp;·&nbsp;
        Gerado em: ${new Date().toLocaleString('pt-BR')}
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#64748b">Total Geral</div>
      <div style="font-size:20px;font-weight:900;color:#1e3a8a">${formatCurrency(totalGeral)}</div>
    </div>
  </div>

  <!-- Resumo rápido -->
  <div style="display:flex;gap:10px;margin-bottom:16px">
    ${[
      { label: 'Clientes', value: clientes.length },
      { label: 'Pedidos', value: totalPedidos },
      { label: 'Com WhatsApp', value: comWhatsApp },
    ].map(s => `
      <div style="flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;text-align:center">
        <div style="font-size:9px;color:#64748b;text-transform:uppercase;margin-bottom:2px">${s.label}</div>
        <div style="font-size:16px;font-weight:900;color:#1e3a8a">${s.value}</div>
      </div>
    `).join('')}
  </div>

  <!-- Clientes e pedidos -->
  ${linhasClientes}

  <!-- Total Geral -->
  <div style="background:#1e3a8a;color:white;padding:12px 20px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;margin-top:8px">
    <span style="font-size:14px;font-weight:700">💰 TOTAL GERAL DA ROTA ${rota.codigo_rota}</span>
    <span style="font-size:20px;font-weight:900">${formatCurrency(totalGeral)}</span>
  </div>

  <p style="font-size:9px;color:#94a3b8;text-align:center;margin-top:12px">
    J&C One Vision System · Rota ${rota.codigo_rota} · ${formatDate(rota.data_rota)} · Relatório gerado em ${new Date().toLocaleString('pt-BR')}
  </p>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
}

export default function ImpressaoRotaPDF({ rota, onClose }) {
  useEffect(() => {
    const html = gerarHTML(rota);
    const janela = window.open('', '_blank');
    if (janela) {
      janela.document.write(html);
      janela.document.close();
    }
    // Fecha o componente após abrir a janela
    onClose();
  }, []);

  return null;
}