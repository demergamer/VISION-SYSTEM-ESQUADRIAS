import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Loader2, X, Plus, Search, Upload, AlertCircle, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO, addMonths, isToday, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import ModalContainer from "@/components/modals/ModalContainer";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function LiquidarContasMassaModal({ open, onClose, empresas, contas, cheques, saldoCaixa }) {
  const queryClient = useQueryClient();
  const [empresaSelecionada, setEmpresaSelecionada] = useState('');
  const [contasSelecionadas, setContasSelecionadas] = useState({});
  const [ajustes, setAjustes] = useState({});
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [observacao, setObservacao] = useState('');
  const [comprovante, setComprovante] = useState(null);
  const [uploadingComp, setUploadingComp] = useState(false);
  const [formasPagamento, setFormasPagamento] = useState([{ tipo: 'pix', valor: '', detalhes: '' }]);
  const [step, setStep] = useState(1); // 1: selecionar empresa, 2: selecionar contas, 3: resumo/pagamento

  const contasDaEmpresa = useMemo(() => {
    if (!empresaSelecionada) return [];
    return contas.filter(c =>
      c.empresa_codigo === empresaSelecionada &&
      ['pendente', 'pendente_preenchimento', 'parcial'].includes(c.status)
    ).sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
  }, [contas, empresaSelecionada]);

  const contasParaLiquidar = contasDaEmpresa.filter(c => contasSelecionadas[c.id]);

  const totalSelecionado = contasParaLiquidar.reduce((sum, c) => {
    const aj = ajustes[c.id] || {};
    const juros = parseFloat(aj.juros || 0);
    const desc = parseFloat(aj.desconto || 0);
    return sum + (c.valor || 0) + juros - desc;
  }, 0);

  const totalPagoFormas = formasPagamento.reduce((sum, fp) => sum + (parseFloat(fp.valor) || 0), 0);

  const toggleConta = (contaId) => {
    setContasSelecionadas(prev => ({ ...prev, [contaId]: !prev[contaId] }));
  };

  const toggleTodas = () => {
    const todas = contasDaEmpresa.every(c => contasSelecionadas[c.id]);
    const novo = {};
    if (!todas) contasDaEmpresa.forEach(c => { novo[c.id] = true; });
    setContasSelecionadas(novo);
  };

  const adicionarForma = () => setFormasPagamento(prev => [...prev, { tipo: 'pix', valor: '', detalhes: '' }]);
  const removerForma = (idx) => setFormasPagamento(prev => prev.filter((_, i) => i !== idx));
  const atualizarForma = (idx, campo, val) => setFormasPagamento(prev => prev.map((f, i) => i === idx ? { ...f, [campo]: val } : f));

  const uploadComprovante = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingComp(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setComprovante(file_url);
      toast.success('Comprovante anexado!');
    } catch { toast.error('Erro ao enviar comprovante'); }
    finally { setUploadingComp(false); }
  };

  const liquidarMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const borderos = await base44.entities.BorderoPagamento.list('-numero_bordero', 1);
      const ultimoNum = borderos.length > 0 ? (borderos[0].numero_bordero || 0) : 0;
      const numeroBordero = ultimoNum + 1;

      const empresa = empresas.find(e => e.codigo === empresaSelecionada);
      const contasDetalhes = contasParaLiquidar.map(c => {
        const aj = ajustes[c.id] || {};
        const juros = parseFloat(aj.juros || 0);
        const desc = parseFloat(aj.desconto || 0);
        const valorPago = (c.valor || 0) + juros - desc;
        return {
          conta_id: c.id,
          descricao: c.descricao,
          valor_original: c.valor,
          juros_multa: juros,
          desconto: desc,
          valor_pago: valorPago,
          data_vencimento: c.data_vencimento,
          fornecedor_nome: c.fornecedor_nome,
          numero_lancamento: c.numero_lancamento
        };
      });

      // Criar borderô
      await base44.entities.BorderoPagamento.create({
        numero_bordero: numeroBordero,
        fornecedor_codigo: empresa?.codigo || empresaSelecionada,
        fornecedor_nome: empresa?.nome || empresaSelecionada,
        contas_ids: contasParaLiquidar.map(c => c.id),
        contas_detalhes: contasDetalhes,
        valor_total: totalSelecionado,
        formas_pagamento: formasPagamento.filter(fp => parseFloat(fp.valor) > 0),
        comprovante_url: comprovante,
        data_pagamento: dataPagamento,
        observacao,
        liquidado_por: user.email
      });

      // Atualizar contas e criar clones para recorrentes
      const recorrentesCriados = [];
      for (const conta of contasParaLiquidar) {
        const aj = ajustes[conta.id] || {};
        const juros = parseFloat(aj.juros || 0);
        const desc = parseFloat(aj.desconto || 0);
        const valorPago = (conta.valor || 0) + juros - desc;

        await base44.entities.ContaPagar.update(conta.id, {
          status: 'pago',
          data_pagamento: dataPagamento,
          valor_pago: valorPago,
          juros_multa: juros,
          desconto: desc,
          recibo_url: comprovante
        });

        // Regra de recorrência: criar clone para próximo mês
        if (conta.tipo_lancamento === 'recorrente') {
          const proximoVenc = format(addMonths(parseISO(conta.data_vencimento), 1), 'yyyy-MM-dd');
          const novasCont = await base44.entities.ContaPagar.list('-numero_lancamento', 100);
          const daEmpresa = novasCont.filter(c => c.empresa_codigo === conta.empresa_codigo && c.numero_lancamento);
          let proximo = 1;
          if (daEmpresa.length > 0) {
            const nums = daEmpresa.map(c => parseInt((c.numero_lancamento || '').split('-').pop()) || 0);
            proximo = Math.max(...nums) + 1;
          }
          const novoNumero = `${conta.empresa_codigo}-${String(proximo).padStart(4, '0')}`;

          recorrentesCriados.push(base44.entities.ContaPagar.create({
            empresa_codigo: conta.empresa_codigo,
            empresa_nome: conta.empresa_nome,
            numero_lancamento: novoNumero,
            fornecedor_codigo: conta.fornecedor_codigo,
            fornecedor_nome: conta.fornecedor_nome,
            descricao: conta.descricao,
            observacao: conta.observacao,
            valor: 0,
            data_vencimento: proximoVenc,
            status: 'pendente_preenchimento',
            categoria_financeira: conta.categoria_financeira,
            tipo_lancamento: 'recorrente',
            recorrencia_grupo_id: conta.recorrencia_grupo_id,
            anexos_urls: []
          }));
        }
      }

      if (recorrentesCriados.length > 0) {
        await Promise.all(recorrentesCriados);
      }

      // Registrar saídas no caixa (dinheiro)
      const saldoAtual = saldoCaixa || 0;
      let novoSaldo = saldoAtual;
      for (const fp of formasPagamento) {
        if (fp.tipo === 'dinheiro' && parseFloat(fp.valor) > 0) {
          novoSaldo -= parseFloat(fp.valor);
          await base44.entities.CaixaDiario.create({
            tipo_operacao: 'saida',
            valor: parseFloat(fp.valor),
            saldo_anterior: saldoAtual,
            saldo_atual: novoSaldo,
            descricao: `Liquidação em massa - Borderô #${numeroBordero} (${empresa?.nome})`,
            data_operacao: new Date().toISOString()
          });
        }
      }

      return { numeroBordero, recorrentesGerados: recorrentesCriados.length };
    },
    onSuccess: ({ numeroBordero, recorrentesGerados }) => {
      queryClient.invalidateQueries({ queryKey: ['contasPagar'] });
      queryClient.invalidateQueries({ queryKey: ['borderosPagamento'] });
      queryClient.invalidateQueries({ queryKey: ['caixaDiario'] });
      toast.success(`✅ Borderô #${numeroBordero} gerado! ${recorrentesGerados > 0 ? `${recorrentesGerados} conta(s) recorrente(s) criada(s) para o próximo mês.` : ''}`);
      onClose();
    },
    onError: () => toast.error('Erro ao processar liquidação')
  });

  const handleClose = () => {
    setEmpresaSelecionada('');
    setContasSelecionadas({});
    setAjustes({});
    setStep(1);
    setFormasPagamento([{ tipo: 'pix', valor: '', detalhes: '' }]);
    setComprovante(null);
    setObservacao('');
    onClose();
  };

  const getStatusBadge = (conta) => {
    if (conta.status === 'pendente' && conta.data_vencimento && isPast(parseISO(conta.data_vencimento)) && !isToday(parseISO(conta.data_vencimento))) {
      return <Badge className="bg-red-100 text-red-700 text-xs">Atrasada</Badge>;
    }
    if (conta.data_vencimento && isToday(parseISO(conta.data_vencimento))) {
      return <Badge className="bg-amber-100 text-amber-700 text-xs">Hoje</Badge>;
    }
    if (conta.status === 'pendente_preenchimento') {
      return <Badge className="bg-yellow-100 text-yellow-800 text-xs">A Definir</Badge>;
    }
    return null;
  };

  return (
    <ModalContainer open={open} onClose={handleClose} title="Liquidar Contas" description="Selecione as contas e processe o pagamento em lote" size="lg">
      <div className="space-y-4">
        {/* Steps */}
        <div className="flex items-center gap-2 text-xs">
          {[1,2,3].map(s => (
            <React.Fragment key={s}>
              <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all", step === s ? "bg-blue-600 text-white" : step > s ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400")}>
                {step > s ? <CheckCircle className="w-3 h-3" /> : <span>{s}</span>}
                {s === 1 ? 'Empresa' : s === 2 ? 'Contas' : 'Pagamento'}
              </div>
              {s < 3 && <div className={cn("flex-1 h-px", step > s ? "bg-green-300" : "bg-slate-200")} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Empresa */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Selecione a Empresa *</Label>
              <div className="grid grid-cols-1 gap-3">
                {empresas.map(emp => {
                  const qtdAberto = contas.filter(c => c.empresa_codigo === emp.codigo && ['pendente', 'pendente_preenchimento', 'parcial'].includes(c.status)).length;
                  return (
                    <Card
                      key={emp.id}
                      className={cn("p-4 cursor-pointer transition-all hover:shadow-md border-2", empresaSelecionada === emp.codigo ? "border-blue-500 bg-blue-50" : "border-slate-200")}
                      onClick={() => setEmpresaSelecionada(emp.codigo)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <span className="text-blue-700 font-bold text-sm">{emp.sigla?.slice(0, 3) || '?'}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{emp.nome}</p>
                            <p className="text-xs text-slate-400">{emp.codigo}</p>
                          </div>
                        </div>
                        <Badge className={qtdAberto > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}>
                          {qtdAberto} em aberto
                        </Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!empresaSelecionada}>Próximo →</Button>
            </div>
          </div>
        )}

        {/* Step 2: Selecionar contas */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Contas em aberto da empresa <span className="text-blue-600">{empresas.find(e => e.codigo === empresaSelecionada)?.nome}</span></p>
              <Button size="sm" variant="outline" onClick={toggleTodas}>
                {contasDaEmpresa.every(c => contasSelecionadas[c.id]) ? 'Desmarcar todas' : 'Selecionar todas'}
              </Button>
            </div>

            {contasDaEmpresa.length === 0 ? (
              <Card className="p-8 text-center text-slate-500">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-2" />
                <p>Nenhuma conta em aberto para esta empresa!</p>
              </Card>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {contasDaEmpresa.map(conta => {
                  const selecionada = !!contasSelecionadas[conta.id];
                  const aj = ajustes[conta.id] || {};
                  return (
                    <Card key={conta.id} className={cn("p-3 transition-all border-2", selecionada ? "border-blue-300 bg-blue-50/50" : "border-slate-200")}>
                      <div className="flex items-start gap-3">
                        <Checkbox checked={selecionada} onCheckedChange={() => toggleConta(conta.id)} className="mt-1 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm text-slate-800">{conta.fornecedor_nome}</p>
                                {getStatusBadge(conta)}
                                {conta.tipo_lancamento === 'recorrente' && <Badge className="bg-purple-100 text-purple-700 text-xs">Recorrente</Badge>}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{conta.descricao}</p>
                              <p className="text-xs text-slate-400">Venc: {conta.data_vencimento ? format(parseISO(conta.data_vencimento), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</p>
                            </div>
                            <p className="font-bold text-slate-800 shrink-0">{formatCurrency(conta.valor)}</p>
                          </div>

                          {selecionada && (
                            <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-blue-200">
                              <div className="space-y-1">
                                <Label className="text-xs text-red-600">(+) Juros/Multa</Label>
                                <Input type="number" step="0.01" min="0" value={aj.juros || ''} onChange={e => setAjustes(prev => ({ ...prev, [conta.id]: { ...(prev[conta.id] || {}), juros: e.target.value } }))} placeholder="0,00" className="h-7 text-sm" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-green-600">(-) Desconto</Label>
                                <Input type="number" step="0.01" min="0" value={aj.desconto || ''} onChange={e => setAjustes(prev => ({ ...prev, [conta.id]: { ...(prev[conta.id] || {}), desconto: e.target.value } }))} placeholder="0,00" className="h-7 text-sm" />
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
              <Card className="p-3 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-800">{contasParaLiquidar.length} conta(s) selecionada(s)</span>
                  <span className="font-bold text-xl text-blue-700">{formatCurrency(totalSelecionado)}</span>
                </div>
              </Card>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>← Voltar</Button>
              <Button onClick={() => setStep(3)} disabled={contasParaLiquidar.length === 0}>Continuar →</Button>
            </div>
          </div>
        )}

        {/* Step 3: Pagamento */}
        {step === 3 && (
          <div className="space-y-4">
            <Card className="p-4 bg-slate-50 space-y-2">
              <p className="font-semibold text-slate-700">Resumo</p>
              <div className="space-y-1">
                {contasParaLiquidar.map(c => {
                  const aj = ajustes[c.id] || {};
                  const total = (c.valor || 0) + parseFloat(aj.juros || 0) - parseFloat(aj.desconto || 0);
                  return (
                    <div key={c.id} className="flex justify-between text-sm">
                      <span className="text-slate-600 truncate">{c.fornecedor_nome} — {c.descricao?.slice(0, 30)}</span>
                      <span className="font-medium shrink-0 ml-2">{formatCurrency(total)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2 text-blue-700">
                <span>Total:</span>
                <span>{formatCurrency(totalSelecionado)}</span>
              </div>
            </Card>

            <div className="space-y-2">
              <Label>Data do Pagamento *</Label>
              <Input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} required />
            </div>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Formas de Pagamento</h3>
                <Button type="button" size="sm" variant="outline" onClick={adicionarForma}><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
              </div>
              {formasPagamento.map((fp, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={fp.tipo} onValueChange={v => atualizarForma(idx, 'tipo', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                  <div className="space-y-1">
                    <Label className="text-xs">Valor (R$)</Label>
                    <Input type="number" step="0.01" value={fp.valor} onChange={e => atualizarForma(idx, 'valor', e.target.value)} className="h-9" />
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removerForma(idx)} disabled={formasPagamento.length <= 1} className="text-red-500 h-9">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total informado:</span>
                <span className={cn(Math.abs(totalPagoFormas - totalSelecionado) > 0.01 ? "text-red-600" : "text-green-600")}>
                  {formatCurrency(totalPagoFormas)}
                </span>
              </div>
              {Math.abs(totalPagoFormas - totalSelecionado) > 0.01 && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Diferença de {formatCurrency(Math.abs(totalPagoFormas - totalSelecionado))}</span>
                </div>
              )}
            </Card>

            <div className="space-y-2">
              <Label>📎 Comprovante do Lote (Opcional)</Label>
              <label className={cn("flex items-center gap-2 h-12 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all", comprovante ? "border-green-300 bg-green-50 text-green-700" : "border-slate-300 bg-white hover:border-blue-400")}>
                {uploadingComp ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Enviando...</span></> : comprovante ? <><CheckCircle className="w-4 h-4" /><span>Comprovante Anexado</span><a href={comprovante} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 underline text-sm" onClick={e => e.stopPropagation()}>Ver</a></> : <><Upload className="w-4 h-4" /><span>Clique para Anexar</span></>}
                <input type="file" accept="image/*,.pdf" onChange={uploadComprovante} className="hidden" disabled={uploadingComp} />
              </label>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Anotações sobre esta liquidação..." rows={2} />
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
  );
}