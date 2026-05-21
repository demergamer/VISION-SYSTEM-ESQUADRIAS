import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Loader2, X, Plus, Search, Upload, AlertCircle, DollarSign, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO, addMonths, isToday, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import ModalContainer from "@/components/modals/ModalContainer";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

function SeletorCheques({ cheques, onConfirm, onClose }) {
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState([]);

  const disponiveis = useMemo(() => {
    const base = cheques.filter(c => c.status !== 'repassado');
    if (!busca) return base;
    const t = busca.toLowerCase();
    return base.filter(c =>
      c.numero_cheque?.toLowerCase().includes(t) ||
      c.banco?.toLowerCase().includes(t) ||
      c.emitente?.toLowerCase().includes(t) ||
      c.cliente_nome?.toLowerCase().includes(t)
    );
  }, [cheques, busca]);

  const totalSel = cheques.filter(c => selecionados.includes(c.id)).reduce((s, c) => s + (c.valor || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
      <Card className="w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">🔍 Selecionar Cheques em Carteira</h3>
            <Button type="button" size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por número, banco, emitente..." className="pl-9" autoFocus />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
          {disponiveis.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Nenhum cheque disponível</p>
          ) : disponiveis.map(c => (
            <div key={c.id} onClick={() => setSelecionados(prev => prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id])}
              className={cn("flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all", selecionados.includes(c.id) ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200")}>
              <Checkbox checked={selecionados.includes(c.id)} onCheckedChange={() => {}} className="shrink-0" />
              <div className="flex-1">
                <p className="font-mono text-sm font-bold">{c.banco} Nº {c.numero_cheque}</p>
                <p className="text-xs text-slate-500">{c.emitente} {c.cliente_nome ? `— ${c.cliente_nome}` : ''}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-blue-700">{formatCurrency(c.valor)}</p>
                {c.data_vencimento && <p className="text-xs text-slate-400">{format(new Date(c.data_vencimento), 'dd/MM/yy')}</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t bg-white space-y-3">
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
            <span className="font-semibold text-blue-800">{selecionados.length} cheque(s)</span>
            <span className="font-bold text-xl text-blue-700">{formatCurrency(totalSel)}</span>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="button" onClick={() => onConfirm(selecionados, cheques.filter(c => selecionados.includes(c.id)))} disabled={selecionados.length === 0} className="flex-1 bg-blue-600 hover:bg-blue-700">
              <CheckCircle className="w-4 h-4 mr-2" />Usar {selecionados.length} cheque(s)
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function UploadComprovante({ url, onUpload, uploading }) {
  return (
    <label className={cn("flex items-center gap-2 h-10 px-3 rounded-lg border-2 border-dashed cursor-pointer transition-all text-xs mt-2", url ? "border-green-300 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 hover:border-blue-300")}>
      {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : url ? <CheckCircle className="w-3 h-3" /> : <Upload className="w-3 h-3 text-slate-400" />}
      <span>{uploading ? 'Enviando...' : url ? 'Comprovante anexado' : 'Anexar comprovante desta forma'}</span>
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto text-blue-600 underline" onClick={e => e.stopPropagation()}>Ver</a>}
      <input type="file" accept="image/*,.pdf" onChange={onUpload} className="hidden" disabled={uploading} />
    </label>
  );
}

export default function LiquidarContasMassaModal({ open, onClose, empresas, contas, cheques, saldoCaixa }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [empresaSelecionada, setEmpresaSelecionada] = useState('');
  const [contasSelecionadas, setContasSelecionadas] = useState({});
  const [ajustes, setAjustes] = useState({});
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [observacao, setObservacao] = useState('');
  const [formasPagamento, setFormasPagamento] = useState([{ tipo: 'pix', valor: '', detalhes: '', cheques_ids: [], comprovante_url: '', uploadingComp: false }]);
  const [showSeletorCheques, setShowSeletorCheques] = useState(false);
  const [fpIdxCheques, setFpIdxCheques] = useState(null);

  const contasDaEmpresa = useMemo(() => {
    if (!empresaSelecionada) return [];
    return contas.filter(c => c.empresa_codigo === empresaSelecionada && ['pendente', 'pendente_preenchimento', 'parcial'].includes(c.status))
      .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
  }, [contas, empresaSelecionada]);

  const contasParaLiquidar = contasDaEmpresa.filter(c => contasSelecionadas[c.id]);

  const totalSelecionado = contasParaLiquidar.reduce((sum, c) => {
    const aj = ajustes[c.id] || {};
    return sum + (c.valor || 0) + parseFloat(aj.juros || 0) - parseFloat(aj.desconto || 0);
  }, 0);

  const totalFormas = formasPagamento.reduce((s, fp) => s + (parseFloat(fp.valor) || 0), 0);

  const toggleConta = (id) => setContasSelecionadas(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleTodas = () => {
    const todas = contasDaEmpresa.every(c => contasSelecionadas[c.id]);
    const novo = {};
    if (!todas) contasDaEmpresa.forEach(c => { novo[c.id] = true; });
    setContasSelecionadas(novo);
  };

  const atualizarFP = (idx, campo, val) => setFormasPagamento(prev => prev.map((f, i) => i === idx ? { ...f, [campo]: val } : f));
  const adicionarFP = () => setFormasPagamento(prev => [...prev, { tipo: 'pix', valor: '', detalhes: '', cheques_ids: [], comprovante_url: '', uploadingComp: false }]);
  const removerFP = (idx) => setFormasPagamento(prev => prev.filter((_, i) => i !== idx));

  const uploadComprovanteFP = async (idx, e) => {
    const file = e.target.files[0];
    if (!file) return;
    atualizarFP(idx, 'uploadingComp', true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      atualizarFP(idx, 'comprovante_url', file_url);
      atualizarFP(idx, 'uploadingComp', false);
      toast.success('Comprovante anexado!');
    } catch { atualizarFP(idx, 'uploadingComp', false); toast.error('Erro ao enviar comprovante'); }
  };

  const confirmarCheques = (ids, chequesData) => {
    const totalCheques = chequesData.reduce((s, c) => s + (c.valor || 0), 0);
    const detalhes = chequesData.map(c => `${c.banco} Nº ${c.numero_cheque} (${c.emitente})`).join(', ');
    setFormasPagamento(prev => prev.map((f, i) => i === fpIdxCheques ? { ...f, cheques_ids: ids, valor: totalCheques, detalhes } : f));
    setShowSeletorCheques(false);
  };

  const liquidarMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const borderos = await base44.entities.BorderoPagamento.list('-numero_bordero', 1);
      const numeroBordero = (borderos[0]?.numero_bordero || 0) + 1;
      const empresa = empresas.find(e => e.codigo === empresaSelecionada);

      const contasDetalhes = contasParaLiquidar.map(c => {
        const aj = ajustes[c.id] || {};
        const juros = parseFloat(aj.juros || 0), desc = parseFloat(aj.desconto || 0);
        return { conta_id: c.id, descricao: c.descricao, valor_original: c.valor, juros_multa: juros, desconto: desc, valor_pago: (c.valor || 0) + juros - desc, data_vencimento: c.data_vencimento, fornecedor_nome: c.fornecedor_nome, numero_lancamento: c.numero_lancamento };
      });

      await base44.entities.BorderoPagamento.create({
        numero_bordero: numeroBordero,
        fornecedor_codigo: empresa?.codigo || empresaSelecionada,
        fornecedor_nome: empresa?.nome || empresaSelecionada,
        contas_ids: contasParaLiquidar.map(c => c.id),
        contas_detalhes: contasDetalhes,
        valor_total: totalSelecionado,
        formas_pagamento: formasPagamento.filter(fp => parseFloat(fp.valor) > 0).map(fp => ({ tipo: fp.tipo, valor: parseFloat(fp.valor), detalhes: fp.detalhes, cheques_ids: fp.cheques_ids, comprovante_url: fp.comprovante_url })),
        data_pagamento: dataPagamento,
        observacao,
        liquidado_por: user.email
      });

      // Atualizar cheques repassados
      for (const fp of formasPagamento) {
        if (fp.tipo === 'cheque_terceiro' && fp.cheques_ids?.length > 0) {
          for (const cid of fp.cheques_ids) {
            await base44.entities.Cheque.update(cid, {
              status: 'repassado',
              fornecedor_repassado_codigo: empresa?.codigo,
              fornecedor_repassado_nome: empresa?.nome,
              data_repasse: new Date().toISOString()
            });
          }
        }
      }

      let recorrentesGerados = 0;
      for (const conta of contasParaLiquidar) {
        const aj = ajustes[conta.id] || {};
        const juros = parseFloat(aj.juros || 0), desc = parseFloat(aj.desconto || 0);
        await base44.entities.ContaPagar.update(conta.id, {
          status: 'pago', data_pagamento: dataPagamento,
          valor_pago: (conta.valor || 0) + juros - desc,
          juros_multa: juros, desconto: desc
        });

        if (conta.tipo_lancamento === 'recorrente') {
          const proximoVenc = format(addMonths(parseISO(conta.data_vencimento), 1), 'yyyy-MM-dd');
          const todas = await base44.entities.ContaPagar.list('-numero_lancamento', 200);
          const daEmp = todas.filter(c => c.empresa_codigo === conta.empresa_codigo && c.numero_lancamento);
          let prox = 1;
          if (daEmp.length > 0) {
            const nums = daEmp.map(c => { const b = (c.numero_lancamento || '').split('/')[0]; const p = b.split('-'); return parseInt(p[p.length - 1]) || 0; });
            prox = Math.max(...nums) + 1;
          }
          await base44.entities.ContaPagar.create({
            empresa_codigo: conta.empresa_codigo, empresa_nome: conta.empresa_nome,
            numero_lancamento: `${conta.empresa_codigo}-${String(prox).padStart(4, '0')}`,
            fornecedor_codigo: conta.fornecedor_codigo, fornecedor_nome: conta.fornecedor_nome,
            descricao: conta.descricao, observacao: conta.observacao,
            valor: 0, data_vencimento: proximoVenc,
            status: 'pendente_preenchimento', categoria_financeira: conta.categoria_financeira,
            tipo_lancamento: 'recorrente', recorrencia_grupo_id: conta.recorrencia_grupo_id, anexos_complexos: []
          });
          recorrentesGerados++;
        }
      }

      // Caixa (dinheiro)
      let saldo = saldoCaixa || 0;
      for (const fp of formasPagamento) {
        if (fp.tipo === 'dinheiro' && parseFloat(fp.valor) > 0) {
          const val = parseFloat(fp.valor);
          await base44.entities.CaixaDiario.create({ tipo_operacao: 'saida', valor: val, saldo_anterior: saldo, saldo_atual: saldo - val, descricao: `Liq. Borderô #${numeroBordero} (${empresa?.nome})`, data_operacao: new Date().toISOString() });
          saldo -= val;
        }
      }
      return { numeroBordero, recorrentesGerados };
    },
    onSuccess: ({ numeroBordero, recorrentesGerados }) => {
      queryClient.invalidateQueries({ queryKey: ['contasPagar'] });
      queryClient.invalidateQueries({ queryKey: ['borderosPagamento'] });
      queryClient.invalidateQueries({ queryKey: ['caixaDiario'] });
      queryClient.invalidateQueries({ queryKey: ['cheques'] });
      toast.success(`✅ Borderô #${numeroBordero} gerado!${recorrentesGerados > 0 ? ` ${recorrentesGerados} recorrência(s) criada(s) para o próximo mês.` : ''}`);
      handleClose();
    },
    onError: () => toast.error('Erro ao processar liquidação')
  });

  const handleClose = () => {
    setStep(1); setEmpresaSelecionada(''); setContasSelecionadas({}); setAjustes({});
    setFormasPagamento([{ tipo: 'pix', valor: '', detalhes: '', cheques_ids: [], comprovante_url: '', uploadingComp: false }]);
    setObservacao('');
    onClose();
  };

  return (
    <>
      {showSeletorCheques && <SeletorCheques cheques={cheques} onConfirm={confirmarCheques} onClose={() => setShowSeletorCheques(false)} />}

      <ModalContainer open={open} onClose={handleClose} title="Liquidar Contas" description="Pagamento em lote com geração de Borderô" size="lg">
        <div className="space-y-4">
          {/* Steps */}
          <div className="flex items-center gap-2 text-xs">
            {[1,2,3].map(s => (
              <React.Fragment key={s}>
                <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium", step === s ? "bg-blue-600 text-white" : step > s ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400")}>
                  {step > s ? <CheckCircle className="w-3 h-3" /> : <span>{s}</span>}
                  {s === 1 ? 'Empresa' : s === 2 ? 'Contas' : 'Pagamento'}
                </div>
                {s < 3 && <div className={cn("flex-1 h-px", step > s ? "bg-green-300" : "bg-slate-200")} />}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-3">
              {empresas.map(emp => {
                const qtd = contas.filter(c => c.empresa_codigo === emp.codigo && ['pendente', 'pendente_preenchimento', 'parcial'].includes(c.status)).length;
                return (
                  <Card key={emp.id} className={cn("p-4 cursor-pointer border-2 transition-all hover:shadow-md", empresaSelecionada === emp.codigo ? "border-blue-500 bg-blue-50" : "border-slate-200")} onClick={() => setEmpresaSelecionada(emp.codigo)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                          <span className="text-white font-bold text-xs">{emp.sigla?.slice(0, 3) || '?'}</span>
                        </div>
                        <div><p className="font-semibold text-slate-800">{emp.nome}</p><p className="text-xs text-slate-400">{emp.codigo}</p></div>
                      </div>
                      <Badge className={qtd > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}>{qtd} em aberto</Badge>
                    </div>
                  </Card>
                );
              })}
              <div className="flex justify-end"><Button onClick={() => setStep(2)} disabled={!empresaSelecionada}>Próximo →</Button></div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Contas: <span className="text-blue-600">{empresas.find(e => e.codigo === empresaSelecionada)?.nome}</span></p>
                <Button size="sm" variant="outline" onClick={toggleTodas}>{contasDaEmpresa.every(c => contasSelecionadas[c.id]) ? 'Desmarcar todas' : 'Selecionar todas'}</Button>
              </div>

              {contasDaEmpresa.length === 0 ? (
                <Card className="p-8 text-center text-slate-500"><CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-2" /><p>Nenhuma conta em aberto!</p></Card>
              ) : (
                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                  {contasDaEmpresa.map(conta => {
                    const sel = !!contasSelecionadas[conta.id];
                    const aj = ajustes[conta.id] || {};
                    const isAtrasada = conta.status === 'pendente' && conta.data_vencimento && isPast(parseISO(conta.data_vencimento)) && !isToday(parseISO(conta.data_vencimento));
                    return (
                      <Card key={conta.id} className={cn("p-3 border-2 transition-all", sel ? "border-blue-300 bg-blue-50/40" : "border-slate-200")}>
                        <div className="flex items-start gap-3">
                          <Checkbox checked={sel} onCheckedChange={() => toggleConta(conta.id)} className="mt-1 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-semibold text-sm text-slate-800">{conta.fornecedor_nome}</p>
                                  {conta.numero_lancamento && <span className="text-xs font-mono text-blue-600 font-bold">{conta.numero_lancamento}</span>}
                                  {isAtrasada && <Badge className="bg-red-100 text-red-700 text-xs py-0">Atrasada</Badge>}
                                  {conta.tipo_lancamento === 'recorrente' && <Badge className="bg-purple-100 text-purple-700 text-xs py-0">Recorrente</Badge>}
                                </div>
                                <p className="text-xs text-slate-500">{conta.descricao}</p>
                                <p className="text-xs text-slate-400">{conta.data_vencimento ? format(parseISO(conta.data_vencimento), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</p>
                              </div>
                              <p className="font-bold shrink-0">{formatCurrency(conta.valor)}</p>
                            </div>
                            {sel && (
                              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-blue-200">
                                <div className="space-y-0.5">
                                  <Label className="text-xs text-red-600">(+) Juros/Multa</Label>
                                  <Input type="number" step="0.01" min="0" value={aj.juros || ''} onChange={e => setAjustes(p => ({ ...p, [conta.id]: { ...(p[conta.id] || {}), juros: e.target.value } }))} placeholder="0,00" className="h-7 text-xs" />
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-xs text-green-600">(-) Desconto</Label>
                                  <Input type="number" step="0.01" min="0" value={aj.desconto || ''} onChange={e => setAjustes(p => ({ ...p, [conta.id]: { ...(p[conta.id] || {}), desconto: e.target.value } }))} placeholder="0,00" className="h-7 text-xs" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {contasParaLiquidar.length > 0 && (
                <Card className="p-3 bg-blue-50 border-blue-200 flex items-center justify-between">
                  <span className="font-semibold text-blue-800">{contasParaLiquidar.length} conta(s)</span>
                  <span className="font-bold text-xl text-blue-700">{formatCurrency(totalSelecionado)}</span>
                </Card>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>← Voltar</Button>
                <Button onClick={() => setStep(3)} disabled={contasParaLiquidar.length === 0}>Continuar →</Button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <Card className="p-3 bg-slate-50 space-y-1">
                <p className="font-semibold text-sm text-slate-700">Resumo</p>
                {contasParaLiquidar.map(c => {
                  const aj = ajustes[c.id] || {};
                  const total = (c.valor || 0) + parseFloat(aj.juros || 0) - parseFloat(aj.desconto || 0);
                  return (
                    <div key={c.id} className="flex justify-between text-xs">
                      <span className="text-slate-600 truncate">{c.fornecedor_nome} — {c.descricao?.slice(0, 28)}</span>
                      <span className="font-medium shrink-0 ml-2">{formatCurrency(total)}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between font-bold text-base border-t pt-1 text-blue-700">
                  <span>Total:</span><span>{formatCurrency(totalSelecionado)}</span>
                </div>
              </Card>

              <div className="space-y-1">
                <Label className="text-xs">Data do Pagamento *</Label>
                <Input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} className="h-9" required />
              </div>

              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-slate-800">Formas de Pagamento</h3>
                  <Button type="button" size="sm" variant="outline" onClick={adicionarFP}><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
                </div>
                {formasPagamento.map((fp, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">Forma {idx + 1}</span>
                      {formasPagamento.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => removerFP(idx)} className="h-6 text-red-500"><X className="w-3 h-3" /></Button>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <Label className="text-xs">Tipo</Label>
                        <Select value={fp.tipo} onValueChange={v => atualizarFP(idx, 'tipo', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pix">🏦 PIX</SelectItem>
                            <SelectItem value="transferencia">🏦 Transferência</SelectItem>
                            <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                            <SelectItem value="cheque_terceiro">🎫 Cheque Terceiro</SelectItem>
                            <SelectItem value="credito">💳 Cartão Crédito</SelectItem>
                            <SelectItem value="pecas">⚙️ Peças/Permuta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-xs">Valor (R$)</Label>
                        <Input type="number" step="0.01" value={fp.valor} onChange={e => atualizarFP(idx, 'valor', e.target.value)} className="h-8 text-xs" />
                      </div>
                    </div>

                    {/* Campos específicos por tipo */}
                    {fp.tipo === 'credito' && (
                      <div className="space-y-0.5">
                        <Label className="text-xs">Parcelas do Cartão</Label>
                        <Select value={fp.detalhes} onValueChange={v => atualizarFP(idx, 'detalhes', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>{Array.from({ length: 18 }, (_, i) => <SelectItem key={i+1} value={String(i+1)}>{i+1}x</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}

                    {fp.tipo === 'cheque_terceiro' && (
                      <div className="space-y-1">
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={() => { setFpIdxCheques(idx); setShowSeletorCheques(true); }}>
                            <Search className="w-3 h-3" />Buscar Cheques em Carteira
                          </Button>
                        </div>
                        {fp.cheques_ids?.length > 0 && (
                          <p className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">✓ {fp.cheques_ids.length} cheque(s) — {fp.detalhes?.slice(0, 50)}</p>
                        )}
                        <div className="space-y-0.5">
                          <Label className="text-xs text-slate-500">Ou digite valor manual</Label>
                          <Input type="number" step="0.01" value={fp.cheques_ids?.length > 0 ? '' : fp.valor} disabled={fp.cheques_ids?.length > 0} placeholder="Valor manual" onChange={e => atualizarFP(idx, 'valor', e.target.value)} className="h-7 text-xs" />
                        </div>
                      </div>
                    )}

                    {fp.tipo === 'pecas' && (
                      <div className="space-y-0.5">
                        <Label className="text-xs">Números dos Pedidos Abatidos</Label>
                        <Input value={fp.detalhes} onChange={e => atualizarFP(idx, 'detalhes', e.target.value)} placeholder="Ex: 70.230, 70.231, 70.232" className="h-8 text-xs" />
                      </div>
                    )}

                    {fp.tipo === 'dinheiro' && (
                      <p className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded">💰 Saldo caixa: {formatCurrency(saldoCaixa)}</p>
                    )}

                    {/* Comprovante individual por forma */}
                    <UploadComprovante
                      url={fp.comprovante_url}
                      uploading={fp.uploadingComp}
                      onUpload={e => uploadComprovanteFP(idx, e)}
                    />
                  </div>
                ))}

                <div className="flex justify-between font-semibold pt-2 border-t text-sm">
                  <span>Total informado:</span>
                  <span className={cn(Math.abs(totalFormas - totalSelecionado) > 0.01 ? "text-red-600" : "text-green-600")}>{formatCurrency(totalFormas)}</span>
                </div>
                {Math.abs(totalFormas - totalSelecionado) > 0.01 && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                    <AlertCircle className="w-3 h-3 shrink-0" />Diferença de {formatCurrency(Math.abs(totalFormas - totalSelecionado))}
                  </div>
                )}
              </Card>

              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={2} className="text-sm" />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>← Voltar</Button>
                <Button onClick={() => liquidarMutation.mutate()} disabled={liquidarMutation.isPending || contasParaLiquidar.length === 0} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                  {liquidarMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Processando...</> : <><DollarSign className="w-4 h-4" />Confirmar Liquidação</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </ModalContainer>
    </>
  );
}