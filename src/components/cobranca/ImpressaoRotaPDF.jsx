const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const DIAS_SEMANA = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];

function getDiaSemana(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return DIAS_SEMANA[date.getDay()] || '';
}

function getTelefones(c) {
  const tels = [];
  if (c.todos_telefones?.length) return c.todos_telefones.map(t => `Tel: ${t}`).join(' / ');
  if (c.contatos_nomeados?.length) return c.contatos_nomeados.map(ct => `Tel: ${ct.telefone}`).join(' / ');
  if (c.cliente_telefone) return `Tel: ${c.cliente_telefone}`;
  return '';
}

function gerarHTML(rota) {
  const clientes = (rota.dados_cobranca || []).filter(c => !c.recusado);
  const totalGeral = clientes.reduce((s, c) => s + (c.total_cliente || 0), 0);
  const diaSemana = getDiaSemana(rota.data_rota);
  const dataFormatada = formatDate(rota.data_rota);

  // Agrupar pedidos por cliente
  const grupos = clientes.map(c => ({
    ...c,
    pedidos: c.pedidos || [],
    telefones: getTelefones(c),
  }));

  const linhas = grupos.map(c => {
    const firstPedido = c.pedidos[0];
    const restPedidos = c.pedidos.slice(1);

    const primeiraLinha = `
      <tr class="data-row">
        <td class="col-cliente" rowspan="${c.pedidos.length || 1}"><strong>${c.cliente_nome}</strong></td>
        <td class="col-cidade" rowspan="${c.pedidos.length || 1}">${c.cliente_cidade || ''}</td>
        <td class="col-pedido">${firstPedido ? (firstPedido.tipo_item === 'cheque' ? `CHQ ${firstPedido.numero_pedido}` : firstPedido.numero_pedido) : ''}</td>
        <td class="col-valor">${firstPedido ? formatCurrency(firstPedido.valor_saldo) : ''}</td>
        <td class="col-pago"></td>
        <td class="col-cobrar">${firstPedido ? `<strong>${formatCurrency(firstPedido.valor_saldo)}</strong>` : ''}</td>
        <td class="col-obs"></td>
        <td class="col-dados" rowspan="${c.pedidos.length || 1}">${c.telefones}</td>
      </tr>`;

    const linhasExtra = restPedidos.map(p => `
      <tr class="data-row">
        <td class="col-pedido">${p.tipo_item === 'cheque' ? `CHQ ${p.numero_pedido}` : p.numero_pedido}</td>
        <td class="col-valor">${formatCurrency(p.valor_saldo)}</td>
        <td class="col-pago"></td>
        <td class="col-cobrar"><strong>${formatCurrency(p.valor_saldo)}</strong></td>
        <td class="col-obs"></td>
      </tr>`).join('');

    const subtotalLinha = `
      <tr class="subtotal-row">
        <td colspan="4" class="subtotal-label">SUBTOTAL ${c.cliente_nome.toUpperCase()}:</td>
        <td class="subtotal-valor" colspan="4"><strong>${formatCurrency(c.total_cliente)}</strong></td>
      </tr>
      <tr class="spacer-row"><td colspan="8"></td></tr>`;

    return primeiraLinha + linhasExtra + subtotalLinha;
  }).join('');

  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Rota ${rota.codigo_rota}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #000; background: #fff; padding: 16px; }

    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
    .logo-area { display: flex; align-items: center; gap: 10px; }
    .logo-area img { height: 40px; }
    .logo-text { }
    .logo-text .title { font-size: 15px; font-weight: 900; color: #1a3a6b; letter-spacing: 1px; }
    .logo-text .subtitle { font-size: 11px; color: #555; }
    .page-num { font-size: 12px; color: #333; text-align: right; }

    .rota-header { border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: flex-end; }
    .rota-titulo { font-size: 17px; font-weight: 900; color: #000; }
    .rota-sub { font-size: 11px; color: #333; margin-top: 3px; }
    .total-geral { font-size: 17px; font-weight: 900; color: #000; text-align: right; }

    table { width: 100%; border-collapse: collapse; margin-top: 8px; }

    thead tr th {
      background: #1a3a6b !important;
      color: white !important;
      padding: 7px 8px;
      text-align: left;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: 1px solid #1a3a6b;
    }

    .data-row td {
      padding: 4px 8px;
      border: 1px solid #ccc;
      font-size: 12px;
      vertical-align: top;
    }

    .col-cliente { min-width: 150px; }
    .col-cidade  { min-width: 100px; }
    .col-pedido  { min-width: 80px; }
    .col-valor   { min-width: 90px; text-align: right; }
    .col-pago    { min-width: 90px; text-align: right; }
    .col-cobrar  { min-width: 90px; text-align: right; color: #cc0000 !important; }
    .col-obs     { min-width: 110px; }
    .col-dados   { min-width: 170px; font-size: 11px; color: #333; }

    .subtotal-row td {
      background: #dce6f1 !important;
      padding: 5px 8px;
      font-size: 12px;
      border: 1px solid #aabbcc;
    }
    .subtotal-label { text-align: right; font-weight: 700; color: #1a3a6b !important; }
    .subtotal-valor { text-align: right; color: #cc0000 !important; font-size: 13px; }

    .spacer-row td { height: 12px; border: none; background: transparent; }

    .footer-total {
      margin-top: 20px;
      padding: 14px 20px;
      background: #1a3a6b !important;
      color: white !important;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 16px;
      font-weight: 900;
      border-radius: 4px;
    }

    .rodape { margin-top: 12px; text-align: center; font-size: 11px; color: #999; }

    @media print {
      body { padding: 4px; }
      thead tr th { background: #1a3a6b !important; color: white !important; -webkit-print-color-adjust: exact !important; }
      .subtotal-row td { background: #dce6f1 !important; -webkit-print-color-adjust: exact !important; }
      .footer-total { background: #1a3a6b !important; color: white !important; border-radius: 0; -webkit-print-color-adjust: exact !important; }
      .col-cobrar, .subtotal-valor { color: #cc0000 !important; }
    }
  </style>
</head>
<body>

  <div class="page-header">
    <div class="logo-area">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png" alt="J&C"/>
      <div class="logo-text">
        <div class="title">J&C One Vision System</div>
        <div class="subtitle">Sistema de Gestão Integrado</div>
      </div>
    </div>
    <div class="page-num">Página 1</div>
  </div>

  <div class="rota-header">
    <div>
      <div class="rota-titulo">COBRANÇA ${(rota.cobrador_nome || 'GIL').toUpperCase()} — ${diaSemana}</div>
      <div class="rota-sub">TABELA PRINCIPAL &nbsp;&nbsp; ${dataFormatada} &nbsp;&nbsp; Rota: ${rota.codigo_rota}</div>
    </div>
    <div class="total-geral">TOTAL A RECEBER: ${formatCurrency(totalGeral)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="col-cliente">CLIENTE</th>
        <th class="col-cidade">CIDADE</th>
        <th class="col-pedido">PEDIDO</th>
        <th class="col-valor">VALOR</th>
        <th class="col-pago">PAGO</th>
        <th class="col-cobrar">COBRAR</th>
        <th class="col-obs">OBSERVAÇÕES</th>
        <th class="col-dados">DADOS CLIENTE — SE NECESSÁRIO</th>
      </tr>
    </thead>
    <tbody>
      ${linhas}
    </tbody>
  </table>

  <div class="footer-total">
    <span> TOTAL A RECEBER</span>
    <span>${formatCurrency(totalGeral)}</span>
  </div>

  <div class="rodape">J&C One Vision System — Gerado em ${now}</div>

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

export default function ImpressaoRotaPDF({ rota, onClose }) {
  abrirRelatorioRota(rota);
  onClose();
  return null;
}