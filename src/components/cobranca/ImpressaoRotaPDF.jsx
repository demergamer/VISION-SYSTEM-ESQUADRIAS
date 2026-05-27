import { useEffect } from 'react';

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

function getDiaSemana(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const dias = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
  return dias[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
}

function gerarHTML(rota) {
  const clientes = rota.dados_cobranca || [];
  const totalGeral = rota.valor_total_rota || clientes.reduce((s, c) => s + (c.total_cliente || 0), 0);
  const dataFormatada = formatDate(rota.data_rota);
  const diaSemana = getDiaSemana(rota.data_rota);
  const cobrador = (rota.cobrador_nome || 'GIL').toUpperCase();
  const nomeRota = `COBRANÇA ${cobrador} - ${diaSemana}`;

  // Gerar todas as linhas da tabela
  let todasLinhas = '';
  for (const cliente of clientes) {
    const pedidos = cliente.pedidos || [];
    const regiao = cliente.cliente_regiao || '';
    const telefone = cliente.cliente_telefone ? `Tel: ${cliente.cliente_telefone}` : '';

    // Linha de cabeçalho do cliente
    todasLinhas += `
      <tr style="background:#e8e8e8">
        <td style="border:1px solid #ccc;padding:4px 6px;font-weight:bold;font-size:9px">${cliente.cliente_nome}</td>
        <td style="border:1px solid #ccc;padding:4px 6px;font-size:9px"></td>
        <td style="border:1px solid #ccc;padding:4px 6px;font-size:9px"></td>
        <td style="border:1px solid #ccc;padding:4px 6px;font-size:9px"></td>
        <td style="border:1px solid #ccc;padding:4px 6px;font-size:9px"></td>
        <td style="border:1px solid #ccc;padding:4px 6px;font-size:9px"></td>
        <td style="border:1px solid #ccc;padding:4px 6px;font-size:9px"></td>
        <td style="border:1px solid #ccc;padding:4px 6px;font-size:9px"></td>
      </tr>`;

    // Linhas dos pedidos
    for (const p of pedidos) {
      todasLinhas += `
        <tr>
          <td style="border:1px solid #ccc;padding:4px 6px;font-size:9px">${cliente.cliente_nome}</td>
          <td style="border:1px solid #ccc;padding:4px 6px;font-size:9px">${regiao}</td>
          <td style="border:1px solid #ccc;padding:4px 6px;font-size:9px">${p.numero_pedido || ''}</td>
          <td style="border:1px solid #ccc;padding:4px 6px;font-size:9px;text-align:right">${formatCurrency(p.valor_saldo)}</td>
          <td style="border:1px solid #ccc;padding:4px 6px;font-size:9px"></td>
          <td style="border:1px solid #ccc;padding:4px 6px;font-size:9px;text-align:right">${formatCurrency(p.valor_saldo)}</td>
          <td style="border:1px solid #ccc;padding:4px 6px;font-size:9px"></td>
          <td style="border:1px solid #ccc;padding:4px 6px;font-size:9px">${telefone}</td>
        </tr>`;
    }

    // Linha de subtotal
    todasLinhas += `
      <tr style="background:#d0d0d0">
        <td colspan="3" style="border:1px solid #ccc;padding:4px 6px;font-weight:bold;font-size:9px;text-align:right">
          SUBTOTAL ${cliente.cliente_nome}:
        </td>
        <td colspan="3" style="border:1px solid #ccc;padding:4px 6px;font-weight:bold;font-size:9px;text-align:right">
          ${formatCurrency(cliente.total_cliente)}
        </td>
        <td style="border:1px solid #ccc;padding:4px 6px"></td>
        <td style="border:1px solid #ccc;padding:4px 6px"></td>
      </tr>
      <tr><td colspan="8" style="padding:3px;border:none"></td></tr>`;
  }

  const header = (pagina) => `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;padding-bottom:6px;border-bottom:2px solid #333">
      <div style="display:flex;align-items:center;gap:8px">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png" style="height:28px" alt="J&C" />
        <div>
          <div style="font-size:8px;font-weight:bold;color:#333;line-height:1.2">J&C ONE VISION SYSTEM</div>
          <div style="font-size:7px;color:#666">Sistema de Gestão Integrado</div>
        </div>
      </div>
      <div style="font-size:8px;color:#333"><strong>Página ${pagina}</strong></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:6px">
      <div>
        <div style="font-weight:bold;font-size:11px">${nomeRota}</div>
        <div style="font-size:8px;color:#555">TABELA PRINCIPAL &nbsp;&nbsp; ${dataFormatada}</div>
      </div>
      <div style="font-weight:bold;font-size:11px">TOTAL A RECEBER: ${formatCurrency(totalGeral)}</div>
    </div>`;

  const cabecalhoTabela = `
    <thead>
      <tr style="background:#888;color:white">
        <th style="border:1px solid #666;padding:4px 6px;text-align:left;font-size:9px;width:18%">CLIENTE</th>
        <th style="border:1px solid #666;padding:4px 6px;text-align:left;font-size:9px;width:14%">REGIÃO</th>
        <th style="border:1px solid #666;padding:4px 6px;text-align:left;font-size:9px;width:7%">PEDIDO</th>
        <th style="border:1px solid #666;padding:4px 6px;text-align:left;font-size:9px;width:9%">VALOR</th>
        <th style="border:1px solid #666;padding:4px 6px;text-align:left;font-size:9px;width:9%">PAGO</th>
        <th style="border:1px solid #666;padding:4px 6px;text-align:left;font-size:9px;width:9%">COBRAR</th>
        <th style="border:1px solid #666;padding:4px 6px;text-align:left;font-size:9px;width:16%">OBSERVAÇÕES</th>
        <th style="border:1px solid #666;padding:4px 6px;text-align:left;font-size:9px;width:18%">DADOS CLIENTE - SE NECESSARIO</th>
      </tr>
    </thead>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Rota de Cobrança — ${rota.codigo_rota}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #000; background: #fff; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead { display: table-header-group; }
    }
  </style>
</head>
<body>
  ${header(1)}
  <table style="width:100%;border-collapse:collapse;font-size:9px">
    ${cabecalhoTabela}
    <tbody>
      ${todasLinhas}
    </tbody>
  </table>
  <div style="text-align:center;font-size:8px;color:#999;margin-top:8px">Página 1</div>
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