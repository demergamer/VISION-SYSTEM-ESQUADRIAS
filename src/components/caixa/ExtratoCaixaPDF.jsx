import React from 'react';
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const TIPO_LABELS = {
  entrada: 'Entrada',
  saida: 'Saída',
  sangria: 'Sangria',
  aporte: 'Aporte',
  ticket_criado: 'Vale Emitido',
  ticket_troco: 'Troco de Vale',
  ticket_reembolso: 'Estorno de Vale',
  ticket_baixa_exata: 'Baixa de Vale',
};

const ENTRADAS = ['entrada', 'ticket_troco', 'aporte'];
const SAIDAS = ['saida', 'sangria', 'ticket_criado', 'ticket_reembolso'];

function isEntrada(tipo) { return ENTRADAS.includes(tipo); }
function isSaida(tipo) { return SAIDAS.includes(tipo); }

export function imprimirExtrato({ movimentacoes, valesAbertos, dataInicio, dataFim }) {
  const periodoLabel =
    dataInicio && dataFim
      ? `${format(parseISO(dataInicio), 'dd/MM/yyyy')} a ${format(parseISO(dataFim), 'dd/MM/yyyy')}`
      : dataInicio
      ? `A partir de ${format(parseISO(dataInicio), 'dd/MM/yyyy')}`
      : dataFim
      ? `Até ${format(parseISO(dataFim), 'dd/MM/yyyy')}`
      : 'Período Completo';

  const totalEntradas = movimentacoes.filter(m => isEntrada(m.tipo_operacao)).reduce((s, m) => s + (m.valor || 0), 0);
  const totalSaidas = movimentacoes.filter(m => isSaida(m.tipo_operacao)).reduce((s, m) => s + (m.valor || 0), 0);
  const saldoFinal = movimentacoes.length > 0 ? movimentacoes[0].saldo_atual : 0;
  const totalValesAbertos = valesAbertos.reduce((s, v) => s + (v.valor || 0), 0);

  const linhasMovimentacoes = [...movimentacoes].reverse().map((mov, idx) => {
    const entrada = isEntrada(mov.tipo_operacao);
    const saida = isSaida(mov.tipo_operacao);
    const valorColor = entrada ? '#16a34a' : saida ? '#dc2626' : '#64748b';
    const sinal = entrada ? '+' : saida ? '-' : '';
    const dataHora = mov.data_operacao
      ? format(parseISO(mov.data_operacao), 'dd/MM/yy HH:mm', { locale: ptBR })
      : mov.created_date
      ? format(parseISO(mov.created_date), 'dd/MM/yy HH:mm', { locale: ptBR })
      : '-';
    const bgRow = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    const ticketRef = mov.ticket_id ? `#${mov.ticket_id}` : (mov.id ? mov.id.slice(0, 8) : '-');

    return `
      <tr style="background:${bgRow}">
        <td style="padding:7px 10px; font-size:11px; color:#475569; white-space:nowrap">${dataHora}</td>
        <td style="padding:7px 10px; font-size:11px; color:#64748b; font-family:monospace">${ticketRef}</td>
        <td style="padding:7px 10px; font-size:11px; font-weight:600; color:#334155">${TIPO_LABELS[mov.tipo_operacao] || mov.tipo_operacao}</td>
        <td style="padding:7px 10px; font-size:11px; color:#475569; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${mov.descricao || '-'}</td>
        <td style="padding:7px 10px; font-size:11px; color:#64748b">${mov.responsavel || '-'}</td>
        <td style="padding:7px 10px; font-size:12px; font-weight:700; color:${valorColor}; text-align:right; white-space:nowrap">${sinal}${formatCurrency(mov.valor)}</td>
        <td style="padding:7px 10px; font-size:12px; font-weight:700; color:#0f172a; text-align:right; white-space:nowrap">${formatCurrency(mov.saldo_atual)}</td>
      </tr>`;
  }).join('');

  const linhasVales = valesAbertos.length === 0
    ? `<tr><td colspan="5" style="padding:16px; text-align:center; color:#94a3b8; font-size:12px">Nenhum vale em aberto</td></tr>`
    : valesAbertos.map((v, idx) => {
        const bgRow = idx % 2 === 0 ? '#ffffff' : '#fffbeb';
        return `
          <tr style="background:${bgRow}">
            <td style="padding:7px 10px; font-size:11px; font-weight:700; color:#b45309">#${v.ticket_id}</td>
            <td style="padding:7px 10px; font-size:11px; color:#475569">${v.funcionario}</td>
            <td style="padding:7px 10px; font-size:11px; color:#64748b">${v.motivo || '-'}</td>
            <td style="padding:7px 10px; font-size:11px; color:#64748b">${v.data_lancamento || '-'}</td>
            <td style="padding:7px 10px; font-size:12px; font-weight:700; color:#dc2626; text-align:right">${formatCurrency(v.valor)}</td>
          </tr>`;
      }).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Extrato de Caixa — ${periodoLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; padding: 24px; }
    @media print {
      body { padding: 12px; }
      .no-print { display: none !important; }
      @page { margin: 15mm; }
    }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1e293b; color: #fff; padding: 9px 10px; font-size: 11px; text-align: left; font-weight: 600; }
    tr:hover { background: #f0f9ff !important; }
  </style>
</head>
<body>

  <!-- Cabeçalho -->
  <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:3px solid #0f172a; padding-bottom:16px; margin-bottom:20px">
    <div style="display:flex; align-items:center; gap:14px">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png"
           style="height:52px; width:auto" alt="J&C" />
      <div>
        <h1 style="font-size:20px; font-weight:800; color:#0f172a">J&C Esquadrias</h1>
        <p style="font-size:11px; color:#64748b; margin-top:2px">CNPJ — Sistema de Gestão J&C Vision</p>
      </div>
    </div>
    <div style="text-align:right">
      <p style="font-size:14px; font-weight:700; color:#0f172a">Extrato de Movimentações de Caixa</p>
      <p style="font-size:12px; color:#3b82f6; font-weight:600; margin-top:4px">📅 ${periodoLabel}</p>
      <p style="font-size:10px; color:#94a3b8; margin-top:2px">Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
    </div>
  </div>

  <!-- Resumo de totais -->
  <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px">
    <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:10px; padding:12px">
      <p style="font-size:10px; color:#166534; font-weight:600; text-transform:uppercase; letter-spacing:.5px">Total Entradas</p>
      <p style="font-size:18px; font-weight:800; color:#16a34a; margin-top:4px">${formatCurrency(totalEntradas)}</p>
    </div>
    <div style="background:#fef2f2; border:1px solid #fca5a5; border-radius:10px; padding:12px">
      <p style="font-size:10px; color:#991b1b; font-weight:600; text-transform:uppercase; letter-spacing:.5px">Total Saídas</p>
      <p style="font-size:18px; font-weight:800; color:#dc2626; margin-top:4px">${formatCurrency(totalSaidas)}</p>
    </div>
    <div style="background:#eff6ff; border:1px solid #93c5fd; border-radius:10px; padding:12px">
      <p style="font-size:10px; color:#1e40af; font-weight:600; text-transform:uppercase; letter-spacing:.5px">Saldo Final</p>
      <p style="font-size:18px; font-weight:800; color:#1d4ed8; margin-top:4px">${formatCurrency(saldoFinal)}</p>
    </div>
    <div style="background:#fffbeb; border:1px solid #fcd34d; border-radius:10px; padding:12px">
      <p style="font-size:10px; color:#92400e; font-weight:600; text-transform:uppercase; letter-spacing:.5px">Vales na Rua</p>
      <p style="font-size:18px; font-weight:800; color:#d97706; margin-top:4px">${formatCurrency(totalValesAbertos)}</p>
    </div>
  </div>

  <!-- Tabela de movimentações -->
  <h2 style="font-size:13px; font-weight:700; color:#0f172a; margin-bottom:8px; text-transform:uppercase; letter-spacing:.5px">
    📋 Histórico de Movimentações (${movimentacoes.length} registros)
  </h2>
  <table style="margin-bottom:28px; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden">
    <thead>
      <tr>
        <th>Data/Hora</th>
        <th>Lançamento</th>
        <th>Operação</th>
        <th>Descrição</th>
        <th>Responsável</th>
        <th style="text-align:right">Valor</th>
        <th style="text-align:right">Saldo</th>
      </tr>
    </thead>
    <tbody>
      ${linhasMovimentacoes || '<tr><td colspan="7" style="padding:16px; text-align:center; color:#94a3b8">Nenhuma movimentação no período</td></tr>'}
    </tbody>
  </table>

  <!-- Vales em aberto -->
  <h2 style="font-size:13px; font-weight:700; color:#92400e; margin-bottom:8px; text-transform:uppercase; letter-spacing:.5px; background:#fffbeb; padding:10px 14px; border-radius:8px; border:1px solid #fcd34d">
    🚧 Vales em Aberto — Dinheiro Circulando na Rua (${valesAbertos.length} vale${valesAbertos.length !== 1 ? 's' : ''} · ${formatCurrency(totalValesAbertos)})
  </h2>
  <table style="border:1px solid #fde68a; border-radius:8px; overflow:hidden">
    <thead>
      <tr style="background:#92400e">
        <th>Nº Vale</th>
        <th>Funcionário</th>
        <th>Motivo</th>
        <th>Lançamento</th>
        <th style="text-align:right">Valor</th>
      </tr>
    </thead>
    <tbody>${linhasVales}</tbody>
    ${valesAbertos.length > 0 ? `
    <tfoot>
      <tr style="background:#fef3c7">
        <td colspan="4" style="padding:9px 10px; font-size:12px; font-weight:700; color:#92400e">SUBTOTAL — Fundos Circulantes</td>
        <td style="padding:9px 10px; font-size:13px; font-weight:800; color:#dc2626; text-align:right">${formatCurrency(totalValesAbertos)}</td>
      </tr>
    </tfoot>` : ''}
  </table>

  <p style="text-align:center; font-size:10px; color:#94a3b8; margin-top:28px; border-top:1px solid #e2e8f0; padding-top:12px">
    Documento gerado pelo J&C Vision — Sistema de Gestão Interno · ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
  </p>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}