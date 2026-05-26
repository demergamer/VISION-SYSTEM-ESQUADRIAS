import React, { useState, useMemo, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Loader2, FileText, Printer, X, CheckSquare, Square } from "lucide-react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ModalContainer from "@/components/modals/ModalContainer";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const CATEGORIA_LABELS = {
  aluminio: 'Alumínio', vidros: 'Vidros', acessorios: 'Acessórios',
  servicos_terceiros: 'Serv. Terceiros', manutencao: 'Manutenção',
  logistica: 'Logística', administrativas: 'Administrativas', impostos: 'Impostos',
  custo_producao: 'Custo Produção', vale: 'Vale', comissoes: 'Comissões',
  aluguel: 'Aluguel', ferramentaria: 'Ferramentaria', despesas: 'Despesas',
  gas: 'Gás', produtos_quimicos: 'Prod. Químicos', telefone: 'Telefone',
};

const TIPO_PGTO_LABELS = {
  pix: 'PIX', transferencia: 'Transf.', dinheiro: 'Dinheiro',
  cheque_terceiro: 'Cheque', credito: 'Cartão', pecas: 'Peças',
  boleto: 'Boleto', debito: 'Débito',
};

function extrairFormaPagamento(conta) {
  const arr = conta.formas_pagamento;
  if (!Array.isArray(arr) || arr.length === 0) return '—';
  return arr.map(fp => {
    // Array de strings simples
    if (typeof fp === 'string') return TIPO_PGTO_LABELS[fp] || fp;
    // Array de objetos com .tipo
    if (fp && fp.tipo) return TIPO_PGTO_LABELS[fp.tipo] || fp.tipo;
    // Array de objetos com .forma ou .nome
    if (fp && fp.forma) return fp.forma;
    if (fp && fp.nome) return fp.nome;
    return String(fp);
  }).filter(Boolean).join(', ') || '—';
}

function extrairImpostos(c) {
  const linhas = [];
  if (c.imposto_irrf > 0)   linhas.push(`IRRF: ${formatCurrency(c.imposto_irrf)}`);
  if (c.imposto_icms > 0)   linhas.push(`ICMS: ${formatCurrency(c.imposto_icms)}`);
  if (c.imposto_iss > 0)    linhas.push(`ISS: ${formatCurrency(c.imposto_iss)}`);
  if (c.imposto_outros > 0) linhas.push(`Outros imp.: ${formatCurrency(c.imposto_outros)}`);
  // fallback: objeto tributacao ou impostos
  if (linhas.length === 0 && c.tributacao && typeof c.tributacao === 'object') {
    Object.entries(c.tributacao).forEach(([k, v]) => { if (v > 0) linhas.push(`${k.toUpperCase()}: ${formatCurrency(v)}`); });
  }
  return linhas;
}

function gerarHTMLRelatorio(empresa, contasSelecionadas, dataInicio, dataFim) {
  const totalOriginal = contasSelecionadas.reduce((s, c) => s + (c.valor || 0), 0);
  const totalPago = contasSelecionadas.reduce((s, c) => s + (c.valor_pago || c.valor || 0), 0);
  const periodoStr = `${format(parseISO(dataInicio), 'dd/MM/yyyy')} a ${format(parseISO(dataFim), 'dd/MM/yyyy')}`;

  const linhas = contasSelecionadas.map((c, i) => {
    const valorOriginal = c.valor || 0;
    const valorPago = c.valor_pago || c.valor || 0;
    const juros = c.juros_multa || 0;
    const desconto = c.desconto || 0;
    const dataLanc = c.created_date ? format(new Date(c.created_date), 'dd/MM/yy') : '—';
    const dataVenc = c.data_vencimento ? format(parseISO(c.data_vencimento), 'dd/MM/yy') : '—';
    const dataPgto = c.data_pagamento ? format(parseISO(c.data_pagamento), 'dd/MM/yy') : '—';
    const forma = extrairFormaPagamento(c);
    const categoria = CATEGORIA_LABELS[c.categoria_financeira] || c.categoria_financeira || '—';
    const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';

    // Descrição + impostos concatenados
    const impostos = extrairImpostos(c);
    const descricaoHTML = impostos.length > 0
      ? `${c.descricao || '—'}<div style="margin-top:3px;padding-top:3px;border-top:1px dashed #cbd5e1;color:#64748b;font-size:9px">${impostos.join(' | ')}</div>`
      : (c.descricao || '—');

    // Coluna de datas agrupadas
    const datasHTML = `
      <div style="white-space:nowrap;font-size:9.5px;line-height:1.6">
        <div><span style="font-weight:600;color:#475569">Lanç:</span> ${dataLanc}</div>
        <div><span style="font-weight:600;color:#475569">Venc:</span> ${dataVenc}</div>
        <div><span style="font-weight:600;color:#16a34a">Pgto:</span> <strong>${dataPgto}</strong></div>
      </div>`;

    return `
      <tr style="background:${rowBg}">
        <td style="padding:5px 6px;font-size:10px;font-family:monospace;color:#1e40af;font-weight:600;white-space:nowrap;width:9%">${c.numero_lancamento || '—'}</td>
        <td style="padding:5px 6px;font-size:10px;width:14%;overflow:hidden">${c.fornecedor_nome || '—'}</td>
        <td style="padding:5px 6px;font-size:10px;white-space:nowrap;width:9%">${categoria}</td>
        <td style="padding:5px 6px;font-size:10px;width:35%">${descricaoHTML}</td>
        <td style="padding:5px 6px;width:11%;vertical-align:top">${datasHTML}</td>
        <td style="padding:5px 6px;font-size:10px;text-align:center;white-space:nowrap;width:9%">${forma}</td>
        <td style="padding:5px 6px;font-size:10px;text-align:right;white-space:nowrap;width:7%">${formatCurrency(valorOriginal)}</td>
        <td style="padding:5px 6px;font-size:10px;text-align:right;white-space:nowrap;font-weight:700;width:6%;color:${juros > 0 ? '#dc2626' : desconto > 0 ? '#16a34a' : '#1e293b'}">${formatCurrency(valorPago)}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Relatório Contábil — ${empresa?.nome || ''}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #1e293b; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
    .header-left h1 { font-size: 18px; font-weight: 800; color: #1e40af; }
    .header-left h2 { font-size: 13px; font-weight: 600; color: #334155; margin-top: 2px; }
    .header-left p { font-size: 11px; color: #64748b; margin-top: 2px; }
    .header-right { text-align: right; }
    .header-right .periodo { font-size: 11px; color: #475569; }
    .header-right .gerado { font-size: 10px; color: #94a3b8; margin-top: 4px; }
    .badge { display: inline-block; background: #dbeafe; color: #1e40af; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 12px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    thead tr { background: #1e40af; color: white; }
    thead th { padding: 6px 6px; text-align: left; font-size: 9.5px; font-weight: 700; letter-spacing: 0.3px; }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }
    tbody tr:hover { background: #eff6ff; }
    .footer-row td { background: #1e293b !important; color: white !important; font-weight: 700; font-size: 11px; padding: 7px 6px; }
    .footer-row td.right { text-align: right; }
    .summary { margin-top: 12px; display: flex; gap: 20px; }
    .summary-box { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 14px; }
    .summary-box .label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-box .value { font-size: 15px; font-weight: 800; color: #1e293b; margin-top: 2px; }
    .summary-box.green .value { color: #16a34a; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${empresa?.nome || 'Empresa'}</h1>
      <h2>Relatório Analítico de Contas Pagas</h2>
      <p>${empresa?.razao_social || ''} ${empresa?.cnpj ? '— CNPJ: ' + empresa.cnpj : ''}</p>
      <span class="badge">${contasSelecionadas.length} lançamento(s)</span>
    </div>
    <div class="header-right">
      <div class="periodo">📅 Período: <strong>${periodoStr}</strong></div>
      <div class="gerado">Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:9%">Lançamento</th>
        <th style="width:14%">Fornecedor</th>
        <th style="width:9%">Categoria</th>
        <th style="width:35%">Descrição (Extrato)</th>
        <th class="center" style="width:11%">Datas</th>
        <th class="center" style="width:9%">Forma Pgto</th>
        <th class="right" style="width:7%">Vlr. Original</th>
        <th class="right" style="width:6%">Vlr. Pago</th>
      </tr>
    </thead>
    <tbody>
      ${linhas}
      <tr class="footer-row">
        <td colspan="6" style="text-align:right;padding-right:12px">TOTAIS</td>
        <td class="right">${formatCurrency(totalOriginal)}</td>
        <td class="right">${formatCurrency(totalPago)}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-box">
      <div class="label">Total de Lançamentos</div>
      <div class="value">${contasSelecionadas.length}</div>
    </div>
    <div class="summary-box">
      <div class="label">Total Original</div>
      <div class="value">${formatCurrency(totalOriginal)}</div>
    </div>
    <div class="summary-box green">
      <div class="label">Total Pago Efetivo</div>
      <div class="value">${formatCurrency(totalPago)}</div>
    </div>
    <div class="summary-box">
      <div class="label">Diferença (Juros/Desc.)</div>
      <div class="value" style="color:${totalPago - totalOriginal >= 0 ? '#dc2626' : '#16a34a'}">${formatCurrency(totalPago - totalOriginal)}</div>
    </div>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
}

export default function RelatorioContabilModal({ open, onClose, empresas, contasTodas }) {
  const [empresaSelecionada, setEmpresaSelecionada] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [selecionadas, setSelecionadas] = useState({});

  const empresa = useMemo(() => empresas.find(e => e.codigo === empresaSelecionada), [empresas, empresaSelecionada]);

  const contasFiltradas = useMemo(() => {
    if (!empresaSelecionada || !dataInicio || !dataFim) return [];
    return contasTodas.filter(c => {
      if (c.empresa_codigo !== empresaSelecionada) return false;
      if (c.status !== 'pago' && !c.data_pagamento) return false;
      if (!c.data_pagamento) return false;
      const dp = parseISO(c.data_pagamento);
      return dp >= parseISO(dataInicio) && dp <= parseISO(dataFim);
    }).sort((a, b) => new Date(a.data_pagamento) - new Date(b.data_pagamento));
  }, [contasTodas, empresaSelecionada, dataInicio, dataFim]);

  // Selecionar todas quando a lista mudar
  const prevLengthRef = React.useRef(0);
  React.useEffect(() => {
    if (contasFiltradas.length !== prevLengthRef.current) {
      prevLengthRef.current = contasFiltradas.length;
      const novas = {};
      contasFiltradas.forEach(c => { novas[c.id] = true; });
      setSelecionadas(novas);
    }
  }, [contasFiltradas]);

  const qtdSelecionadas = Object.values(selecionadas).filter(Boolean).length;
  const todasMarcadas = contasFiltradas.length > 0 && contasFiltradas.every(c => selecionadas[c.id]);

  const toggleTodas = () => {
    const novas = {};
    if (!todasMarcadas) contasFiltradas.forEach(c => { novas[c.id] = true; });
    setSelecionadas(novas);
  };

  const toggle = (id) => setSelecionadas(p => ({ ...p, [id]: !p[id] }));

  const gerarPDF = () => {
    const contasParaImprimir = contasFiltradas.filter(c => selecionadas[c.id]);
    if (contasParaImprimir.length === 0) return;
    const html = gerarHTMLRelatorio(empresa, contasParaImprimir, dataInicio, dataFim);
    const janela = window.open('', '_blank');
    janela.document.write(html);
    janela.document.close();
  };

  const handleClose = () => {
    setEmpresaSelecionada('');
    setDataInicio('');
    setDataFim('');
    setSelecionadas({});
    onClose();
  };

  return (
    <ModalContainer open={open} onClose={handleClose} title="Relatório Contábil" description="Gerar PDF de contas pagas por empresa e período" size="lg">
      <div className="space-y-4">
        {/* Filtros */}
        <Card className="p-4 bg-slate-50 space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Filtros</p>
          <div className="space-y-1">
            <Label className="text-xs">Empresa *</Label>
            <Select value={empresaSelecionada} onValueChange={setEmpresaSelecionada}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione a empresa..." /></SelectTrigger>
              <SelectContent>
                {empresas.map(e => (
                  <SelectItem key={e.codigo} value={e.codigo}>{e.sigla} — {e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Data Pagamento — Início *</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Pagamento — Fim *</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="h-9" />
            </div>
          </div>
        </Card>

        {/* Lista de contas */}
        {contasFiltradas.length === 0 && empresaSelecionada && dataInicio && dataFim && (
          <Card className="p-8 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Nenhuma conta paga encontrada neste período.</p>
          </Card>
        )}

        {contasFiltradas.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={toggleTodas}
                className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {todasMarcadas ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                {todasMarcadas ? 'Desmarcar todas' : 'Selecionar todas'} ({contasFiltradas.length})
              </button>
              <span className="text-xs text-slate-500">{qtdSelecionadas} selecionada(s)</span>
            </div>

            <div className="max-h-[40vh] overflow-y-auto space-y-1 pr-1">
              {contasFiltradas.map(c => {
                const sel = !!selecionadas[c.id];
                return (
                  <div
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all",
                      sel ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <Checkbox checked={sel} onCheckedChange={() => {}} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {c.numero_lancamento && (
                          <span className="text-xs font-mono font-bold text-blue-600">{c.numero_lancamento}</span>
                        )}
                        <span className="text-xs font-semibold text-slate-700 truncate">{c.fornecedor_nome}</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{c.descricao}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-800">{formatCurrency(c.valor_pago || c.valor)}</p>
                      <p className="text-xs text-green-600">{c.data_pagamento ? format(parseISO(c.data_pagamento), 'dd/MM/yy') : '—'}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totais resumo */}
            <Card className="p-3 bg-blue-50 border-blue-200">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-blue-800">Total Original Selecionado:</span>
                <span className="font-bold text-blue-700">
                  {formatCurrency(contasFiltradas.filter(c => selecionadas[c.id]).reduce((s, c) => s + (c.valor || 0), 0))}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="font-semibold text-green-800">Total Pago Selecionado:</span>
                <span className="font-bold text-green-700">
                  {formatCurrency(contasFiltradas.filter(c => selecionadas[c.id]).reduce((s, c) => s + (c.valor_pago || c.valor || 0), 0))}
                </span>
              </div>
            </Card>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={gerarPDF}
            disabled={qtdSelecionadas === 0}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Printer className="w-4 h-4" />
            Gerar PDF ({qtdSelecionadas})
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
}