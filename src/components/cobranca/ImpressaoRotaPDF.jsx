import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

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

// Ponto de origem: Av. Miró Atílio Peduzi, 500 - Ribeirão Pires, SP
const ORIGEM_LAT = -23.7108;
const ORIGEM_LNG = -46.4117;

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Algoritmo do Vizinho Mais Próximo (Nearest Neighbor TSP)
// Garante uma rota coerente entre todos os pontos, não apenas relação com origem
function ordenarRotaTSP(clientes) {
  const comCoordenada = clientes.filter(c => c.cliente_latitude && c.cliente_longitude);
  const semCoordenada = clientes.filter(c => !c.cliente_latitude || !c.cliente_longitude);

  if (comCoordenada.length === 0) return clientes;

  const visitados = new Set();
  const rota = [];
  let latAtual = ORIGEM_LAT;
  let lngAtual = ORIGEM_LNG;

  while (visitados.size < comCoordenada.length) {
    let menorDist = Infinity;
    let proximo = null;
    for (const c of comCoordenada) {
      if (visitados.has(c.cliente_codigo || c.cliente_nome)) continue;
      const dist = haversine(latAtual, lngAtual, c.cliente_latitude, c.cliente_longitude);
      if (dist < menorDist) { menorDist = dist; proximo = c; }
    }
    if (!proximo) break;
    visitados.add(proximo.cliente_codigo || proximo.cliente_nome);
    rota.push(proximo);
    latAtual = proximo.cliente_latitude;
    lngAtual = proximo.cliente_longitude;
  }

  return [...rota, ...semCoordenada];
}

function gerarHTML(rota, clientesDB = []) {
  // Enriquecer dados com cidades do banco de dados se faltarem
  const enriquecidos = (rota.dados_cobranca || []).map(item => {
    if (!item.cliente_cidade) {
      const clienteDB = clientesDB.find(c => c.codigo === item.cliente_codigo);
      return {
        ...item,
        cliente_cidade: clienteDB?.cidade || item.cliente_cidade || '',
      };
    }
    return item;
  });

  // Ordenar usando TSP do vizinho mais próximo para rota coerente
  const clientes = ordenarRotaTSP([...enriquecidos]);
  const totalGeral = rota.valor_total_rota || clientes.reduce((s, c) => s + (c.total_cliente || 0), 0);
  const dataFormatada = formatDate(rota.data_rota);
  const diaSemana = getDiaSemana(rota.data_rota);
  const cobrador = (rota.cobrador_nome || 'GIL').toUpperCase();
  const nomeRota = `COBRANÇA ${cobrador} - ${diaSemana}`;

  // Gerar todas as linhas da tabela
  let todasLinhas = '';
  for (const cliente of clientes) {
    const pedidos = cliente.pedidos || [];
    const regiao = cliente.cliente_cidade || cliente.cliente_regiao || cliente.cliente_estado || '';
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
        <th style="border:1px solid #666;padding:4px 6px;text-align:left;font-size:9px;width:14%">CIDADE</th>
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
  const { data: clientesDB = [] } = useQuery({
    queryKey: ['clientes_pdf_impressao'],
    queryFn: () => base44.entities.Cliente.list('codigo', 500),
  });

  useEffect(() => {
    if (clientesDB.length > 0) {
      const html = gerarHTML(rota, clientesDB);
      const janela = window.open('', '_blank');
      if (janela) {
        janela.document.write(html);
        janela.document.close();
      }
      onClose();
    }
  }, [clientesDB, rota, onClose]);

  return null;
}