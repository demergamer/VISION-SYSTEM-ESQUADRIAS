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
  const dataFormatada = formatDate(rota.data_rota);
  const nomeRota = `COBRANÇA ${rota.cobrador_nome || 'GIL'} - ${new Date().toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase()}`;

  // Dividir em páginas (aproximadamente 25 linhas por página)
  let linhasAcumuladas = 0;
  let paginaAtual = 1;
  const linhasHTMLPorPagina = [];
  let linhasHTMLPagina = '';

  for (let i = 0; i < clientes.length; i++) {
    const cliente = clientes[i];
    const pedidosCount = (cliente.pedidos || []).length;
    const linhasEste = pedidosCount + 1; // pedidos + subtotal

    // Se vai ultrapassar limite, começa nova página
    if (linhasAcumuladas + linhasEste > 25 && linhasAcumuladas > 0) {
      linhasHTMLPorPagina.push(linhasHTMLPagina);
      linhasHTMLPagina = '';
      linhasAcumuladas = 0;
      paginaAtual++;
    }

    // Adicionar cliente
    const pedidosRows = (cliente.pedidos || []).map((p, pi) => `
      <tr>
        <td style="border:1px solid #000;padding:4px;font-size:9px">${p.numero_pedido}</td>
        <td style="border:1px solid #000;padding:4px;font-size:9px">${formatCurrency(p.valor_saldo)}</td>
        <td style="border:1px solid #000;padding:4px;font-size:9px"></td>
        <td style="border:1px solid #000;padding:4px;font-size:9px">${formatCurrency(p.valor_saldo)}</td>
        <td style="border:1px solid #000;padding:4px;font-size:9px"></td>
        <td style="border:1px solid #000;padding:4px;font-size:9px"></td>
        <td style="border:1px solid #000;padding:4px;font-size:9px"></td>
      </tr>
    `).join('');

    const clienteHTML = `
      <tr style="background:#e8e8e8">
        <td style="border:1px solid #000;padding:4px;font-weight:bold;font-size:9px">${cliente.cliente_nome}</td>
        <td style="border:1px solid #000;padding:4px;font-size:9px"></td>
        <td style="border:1px solid #000;padding:4px;font-size:9px"></td>
        <td style="border:1px solid #000;padding:4px;font-size:9px"></td>
        <td style="border:1px solid #000;padding:4px;font-size:9px"></td>
        <td style="border:1px solid #000;padding:4px;font-size:9px"></td>
        <td style="border:1px solid #000;padding:4px;font-size:9px"></td>
      </tr>
      ${pedidosRows}
      <tr style="background:#d0d0d0">
        <td colspan="3" style="border:1px solid #000;padding:4px;font-weight:bold;font-size:9px;text-align:right">SUBTOTAL ${cliente.cliente_nome}:</td>
        <td style="border:1px solid #000;padding:4px;font-weight:bold;font-size:9px">${formatCurrency(cliente.total_cliente)}</td>
        <td style="border:1px solid #000;padding:4px;font-size:9px"></td>
        <td style="border:1px solid #000;padding:4px;font-size:9px"></td>
        <td style="border:1px solid #000;padding:4px;font-size:9px"></td>
      </tr>
    `;

    linhasHTMLPagina += clienteHTML;
    linhasAcumuladas += linhasEste;
  }

  if (linhasHTMLPagina) {
    linhasHTMLPorPagina.push(linhasHTMLPagina);
  }

  const paginasHTML = linhasHTMLPorPagina.map((linhas, idx) => {
    const numeroPagina = idx + 1;
    return `
      <div style="page-break-after:always;padding:0;margin:0">
        <!-- Header da página -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #000">
          <div style="display:flex;align-items:center;gap:8px">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png" style="height:30px" alt="J&C" />
            <div>
              <div style="font-size:9px;font-weight:bold;color:#333">J&C ONE VISION SYSTEM</div>
              <div style="font-size:8px;color:#666">Sistema de Gestão Integrado</div>
            </div>
          </div>
          <div style="text-align:right;font-size:9px">
            <strong>Página ${numeroPagina}</strong>
          </div>
        </div>

        <!-- Título e total -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div>
            <div style="font-weight:bold;font-size:11px">${nomeRota}</div>
            <div style="font-size:9px">TABELA PRINCIPAL ${dataFormatada}</div>
          </div>
          <div style="text-align:right;font-weight:bold;font-size:10px">
            TOTAL A RECEBER: ${formatCurrency(totalGeral)}
          </div>
        </div>

        <!-- Tabela -->
        <table style="width:100%;border-collapse:collapse;font-size:9px">
          <thead>
            <tr style="background:#999;color:white">
              <th style="border:1px solid #000;padding:4px;text-align:left;font-size:9px">CLIENTE</th>
              <th style="border:1px solid #000;padding:4px;text-align:left;font-size:9px">REGIÃO</th>
              <th style="border:1px solid #000;padding:4px;text-align:left;font-size:9px">PEDIDO</th>
              <th style="border:1px solid #000;padding:4px;text-align:left;font-size:9px">VALOR</th>
              <th style="border:1px solid #000;padding:4px;text-align:left;font-size:9px">PAGO</th>
              <th style="border:1px solid #000;padding:4px;text-align:left;font-size:9px">COBRAR</th>
              <th style="border:1px solid #000;padding:4px;text-align:left;font-size:9px">OBSERVAÇÕES</th>
            </tr>
          </thead>
          <tbody>
            ${linhas}
          </tbody>
        </table>

        <div style="margin-top:8px;text-align:center;font-size:8px;color:#999">
          Página ${numeroPagina}
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Rota de Cobrança — ${rota.codigo_rota}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: Arial, sans-serif;
      color: #000;
      background: #fff;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  ${paginasHTML}
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
    onClose();
  }, []);

  return null;
}