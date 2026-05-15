import React, { useState, useRef, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DollarSign, Percent, Wallet, Loader2, Plus, X,
  Upload, FileText, Trash2, AlertCircle, Sparkles, CheckCircle2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import ModalContainer from "@/components/modals/ModalContainer";
import AdicionarChequeModal from "@/components/pedidos/AdicionarChequeModal";
import { toast } from "sonner";

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

// Upload inline reutilizável
function UploadInline({ comprovante, onUpload, onRemove, uploading }) {
  const ref = useRef(null);
  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      onUpload(res.file_url);
      toast.success('Comprovante anexado!');
    } catch { toast.error('Erro ao enviar arquivo'); }
  };
  if (comprovante) {
    return (
      <div className="flex items-center gap-2 mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
        <a href={comprovante} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 hover:underline flex-1 truncate">Ver comprovante</a>
        <Button type="button" size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-red-500 hover:bg-red-50"><X className="w-3 h-3" /></Button>
      </div>
    );
  }
  return (
    <div className="mt-2">
      <input ref={ref} type="file" accept="image/*,.pdf" onChange={handleChange} className="hidden" />
      <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => ref.current?.click()} className="w-full h-8 text-xs gap-1.5 border-dashed">
        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
        {uploading ? 'Enviando...' : 'Anexar Comprovante'}
      </Button>
    </div>
  );
}

/**
 * Modal de liquidação completa para cheques devolvidos.
 * Props:
 *  - isOpen: boolean
 *  - onClose: fn
 *  - cheques: array de cheques devolvidos pré-selecionados
 *  - clienteCodigo: string
 *  - clienteNome: string
 *  - onSave: fn(resultado) — chamado após sucesso
 */
export default function LiquidacaoChequeDevolvido({ isOpen, onClose, cheques = [], clienteCodigo, clienteNome, onSave }) {
  const totalOriginal = cheques.reduce((s, c) => s + (c.valor || 0), 0);

  // --- Formas de pagamento ---
  const [formasPagamento, setFormasPagamento] = useState([
    { tipo: 'dinheiro', valor: '', parcelas: '1', chequesSalvos: [], comprovante: '' }
  ]);
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [chequeModalIndex, setChequeModalIndex] = useState(0);
  const [uploadingFormaIndex, setUploadingFormaIndex] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);

  // --- Desconto ---
  const [descontoTipo, setDescontoTipo] = useState('reais');
  const [descontoValor, setDescontoValor] = useState('');

  // --- Créditos do cliente ---
  const [creditosSelecionados, setCreditosSelecionados] = useState([]);

  // --- Estado global ---
  const [isSaving, setIsSaving] = useState(false);
  const [showCreditoModal, setShowCreditoModal] = useState(false);
  const [excedentePendente, setExcedentePendente] = useState(0);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [isProcessingGlobalDrop, setIsProcessingGlobalDrop] = useState(false);
  const globalDragCounter = useRef(0);

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setFormasPagamento([{ tipo: 'dinheiro', valor: '', parcelas: '1', chequesSalvos: [], comprovante: '' }]);
      setDescontoValor('');
      setDescontoTipo('reais');
      setCreditosSelecionados([]);
    }
  }, [isOpen]);

  const { data: creditos = [] } = useQuery({
    queryKey: ['creditos_chqdev', clienteCodigo],
    queryFn: async () => {
      if (!clienteCodigo) return [];
      const todos = await base44.entities.Credito.list('-created_date', 200);
      return todos.filter(c => c.cliente_codigo === clienteCodigo && c.status === 'disponivel');
    },
    enabled: isOpen && !!clienteCodigo
  });

  const creditoAUsar = useMemo(() =>
    creditosSelecionados.reduce((sum, id) => {
      const cred = creditos.find(c => c.id === id);
      return sum + (cred?.valor || 0);
    }, 0), [creditosSelecionados, creditos]);

  const toggleCredito = (id) => setCreditosSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const calcularDesconto = () => {
    if (!descontoValor) return 0;
    if (descontoTipo === 'porcentagem') return (totalOriginal * parseFloat(descontoValor)) / 100;
    return parseFloat(descontoValor) || 0;
  };

  const totalFormasManuais = formasPagamento.reduce((s, fp) => s + (parseFloat(fp.valor) || 0), 0);
  const totalPago = totalFormasManuais + creditoAUsar;
  const totalDevido = totalOriginal - calcularDesconto();

  // --- Handlers de formas de pagamento ---
  const adicionarForma = () => setFormasPagamento([...formasPagamento, { tipo: 'dinheiro', valor: '', parcelas: '1', chequesSalvos: [], comprovante: '' }]);
  const removerForma = (i) => { if (formasPagamento.length > 1) setFormasPagamento(formasPagamento.filter((_, idx) => idx !== i)); };
  const atualizarForma = (i, campo, valor) => {
    const novas = [...formasPagamento];
    novas[i][campo] = valor;
    setFormasPagamento(novas);
  };
  const setComprovanteForma = (i, url) => {
    const novas = [...formasPagamento]; novas[i].comprovante = url; setFormasPagamento(novas);
  };

  const handleDropFile = async (index, file) => {
    if (!file) return;
    setUploadingFormaIndex(index);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setComprovanteForma(index, res.file_url);
      toast.success('Comprovante anexado!');
    } catch { toast.error('Erro ao enviar arquivo'); } finally { setUploadingFormaIndex(null); }
  };

  const handleGlobalDrop = async (e) => {
    e.preventDefault();
    globalDragCounter.current = 0;
    setIsGlobalDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    setIsProcessingGlobalDrop(true);
    try {
      const novas = [...formasPagamento];
      const primeiraVazia = novas.length === 1 && !novas[0].comprovante && !novas[0].valor;
      for (let i = 0; i < files.length; i++) {
        try {
          const res = await base44.integrations.Core.UploadFile({ file: files[i] });
          if (i === 0 && primeiraVazia) { novas[0].comprovante = res.file_url; }
          else { novas.push({ tipo: 'pix', valor: '', parcelas: '1', chequesSalvos: [], comprovante: res.file_url }); }
        } catch { toast.error(`Erro ao enviar ${files[i].name}`); }
      }
      setFormasPagamento(novas);
      toast.success(`${files.length} arquivo(s) processado(s)! Preencha os valores.`);
    } finally { setIsProcessingGlobalDrop(false); }
  };

  const handleSaveCheque = async (chequeData) => {
    const novoCheque = await base44.entities.Cheque.create(chequeData);
    const novas = [...formasPagamento];
    novas[chequeModalIndex].chequesSalvos.push(novoCheque);
    novas[chequeModalIndex].valor = String(novas[chequeModalIndex].chequesSalvos.reduce((s, c) => s + (parseFloat(c.valor) || 0), 0));
    setFormasPagamento(novas);
    setShowChequeModal(false);
    toast.success('Cheque cadastrado!');
  };

  const handleSaveChequeAndAddAnother = async (chequeData) => {
    const novoCheque = await base44.entities.Cheque.create(chequeData);
    const novas = [...formasPagamento];
    novas[chequeModalIndex].chequesSalvos.push(novoCheque);
    novas[chequeModalIndex].valor = String(novas[chequeModalIndex].chequesSalvos.reduce((s, c) => s + (parseFloat(c.valor) || 0), 0));
    setFormasPagamento(novas);
    toast.success('Cheque cadastrado! Adicione outro.');
  };

  // --- Submissão ---
  const executarLiquidacao = async (sobraParaCredito = 0) => {
    setShowCreditoModal(false);
    setIsSaving(true);
    try {
      const user = await base44.auth.me();
      const desconto = calcularDesconto();

      // Busca borderos para próximo número
      const todosBorderos = await base44.entities.Bordero.list('-created_date', 200);
      const proximoNumero = todosBorderos.length > 0 ? Math.max(...todosBorderos.map(b => b.numero_bordero || 0)) + 1 : 1;

      const formaStr = formasPagamento
        .filter(fp => parseFloat(fp.valor) > 0)
        .map(fp => `${fp.tipo.toUpperCase()}: ${formatCurrency(parseFloat(fp.valor))}`)
        .join(' | ');
      const descStr = desconto > 0 ? ` | DESCONTO: ${formatCurrency(desconto)}` : '';
      const credStr = creditoAUsar > 0 ? ` | CRÉDITO: ${formatCurrency(creditoAUsar)}` : '';
      const formaPagamentoStr = `CHQ.DEV: ${cheques.map(c => `#${c.numero_cheque}`).join(', ')} | ${formaStr}${descStr}${credStr}`;

      const chequesAnexos = formasPagamento.flatMap(fp =>
        fp.chequesSalvos.map(ch => ({ numero: ch.numero_cheque, banco: ch.banco, valor: ch.valor }))
      );
      const comprovantesUrls = formasPagamento.filter(fp => fp.comprovante).map(fp => fp.comprovante);

      // Cria bordero
      await base44.entities.Bordero.create({
        numero_bordero: proximoNumero,
        tipo_liquidacao: 'individual',
        cliente_codigo: clienteCodigo,
        cliente_nome: clienteNome,
        pedidos_ids: [],
        valor_total: totalPago,
        valor_desconto_aplicado: desconto,
        forma_pagamento: formaPagamentoStr,
        comprovantes_urls: comprovantesUrls,
        cheques_anexos: chequesAnexos,
        observacao: `Liquidação de ${cheques.length} cheque(s) devolvido(s)`,
        liquidado_por: user?.email || ''
      });

      // Baixa os cheques devolvidos
      await Promise.all(cheques.map(c =>
        base44.entities.Cheque.update(c.id, {
          status_pagamento_devolucao: 'pago',
          data_pagamento: new Date().toISOString().split('T')[0],
          forma_pagamento: formaStr,
          observacao: (c.observacao || '') + `\n[${new Date().toLocaleDateString('pt-BR')}] Liq. Bordero #${proximoNumero}`
        })
      ));

      // Consome créditos usados
      if (creditoAUsar > 0) {
        let restante = creditoAUsar;
        for (const id of creditosSelecionados) {
          if (restante <= 0) break;
          const cred = creditos.find(c => c.id === id);
          if (cred) {
            await base44.entities.Credito.update(id, { status: 'usado', data_uso: new Date().toISOString().split('T')[0] });
            restante -= cred.valor;
          }
        }
      }

      // Gera crédito se excedente
      if (sobraParaCredito > 0.01) {
        const todosCreditos = await base44.entities.Credito.list('-created_date', 200);
        const proximoCredito = todosCreditos.length > 0 ? Math.max(...todosCreditos.map(c => c.numero_credito || 0)) + 1 : 1;
        await base44.entities.Credito.create({
          numero_credito: proximoCredito,
          cliente_codigo: clienteCodigo,
          cliente_nome: clienteNome,
          valor: sobraParaCredito,
          origem: `Excedente Liq. Cheques Devolvidos (Borderô #${proximoNumero})`,
          status: 'disponivel'
        });
        toast.success(`Crédito de ${formatCurrency(sobraParaCredito)} gerado!`);
      }

      toast.success(`Bordero #${proximoNumero} criado! ${cheques.length} cheque(s) baixado(s).`);
      await onSave();
    } catch (error) {
      toast.error('Erro ao processar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmar = () => {
    if (formasPagamento.length === 0) { toast.error('Adicione ao menos uma forma de pagamento.'); return; }

    const tiposObrigatorios = { pix: 'PIX', c_debito: 'C. Débito', c_credito: 'C. Crédito', link_pagamento: 'Link de Pagamento' };
    for (const fp of formasPagamento) {
      if (tiposObrigatorios[fp.tipo] && parseFloat(fp.valor) > 0 && !fp.comprovante) {
        toast.error(`Comprovante obrigatório para ${tiposObrigatorios[fp.tipo]}`);
        return;
      }
    }
    if (totalPago <= 0 && creditoAUsar <= 0 && calcularDesconto() <= 0) {
      toast.error('Informe ao menos um valor (pagamento, crédito ou desconto).');
      return;
    }

    const excedente = totalPago - totalDevido;
    if (excedente > 0.01) {
      setExcedentePendente(excedente);
      setShowCreditoModal(true);
      return;
    }
    executarLiquidacao(0);
  };

  if (!isOpen) return null;

  return (
    <ModalContainer open={isOpen} onClose={onClose} title="Liquidar Cheques Devolvidos" size="3xl">
      <div
        className="space-y-5 relative"
        onDragEnter={(e) => { e.preventDefault(); globalDragCounter.current += 1; setIsGlobalDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); }}
        onDragLeave={(e) => { globalDragCounter.current -= 1; if (globalDragCounter.current <= 0) { globalDragCounter.current = 0; setIsGlobalDragging(false); } }}
        onDrop={handleGlobalDrop}
      >
        {isGlobalDragging && (
          <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-blue-900/25 backdrop-blur-sm pointer-events-none border-4 border-dashed border-blue-500 rounded-lg">
            <Upload className="w-16 h-16 text-blue-400 mb-4" />
            <p className="text-xl font-extrabold text-white text-center px-8 drop-shadow-lg">Solte os comprovantes aqui</p>
          </div>
        )}
        {isProcessingGlobalDrop && (
          <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-none">
            <Loader2 className="w-12 h-12 text-white animate-spin mb-3" />
            <p className="text-white font-semibold text-lg">Processando arquivos...</p>
          </div>
        )}

        {/* Resumo dos cheques */}
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="font-bold text-red-700">{cheques.length} Cheque(s) Devolvido(s) — {clienteNome}</span>
          </div>
          <div className="space-y-1.5">
            {cheques.map(c => (
              <div key={c.id} className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-2 border border-red-100">
                <span className="font-mono font-bold text-slate-700">#{c.numero_cheque}</span>
                <span className="text-slate-500 text-xs">{c.banco} · Motivo: {c.motivo_devolucao || '—'}</span>
                <span className="font-bold text-red-700">{formatCurrency(c.valor)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-red-200 flex justify-between font-bold text-red-800">
            <span>Total:</span><span>{formatCurrency(totalOriginal)}</span>
          </div>
        </Card>

        {/* Desconto */}
        <Card className="p-4 bg-slate-50 space-y-3">
          <h3 className="font-semibold text-slate-700">Ajuste</h3>
          <div className="space-y-2">
            <Label>Desconto</Label>
            <RadioGroup value={descontoTipo} onValueChange={setDescontoTipo} className="flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="reais" id="desc-r" /><Label htmlFor="desc-r">Em Reais (R$)</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="porcentagem" id="desc-p" /><Label htmlFor="desc-p">Em Porcentagem (%)</Label></div>
            </RadioGroup>
            <div className="relative">
              {descontoTipo === 'reais' ? <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /> : <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
              <Input type="number" step="0.01" min="0" value={descontoValor} onChange={(e) => setDescontoValor(e.target.value)} className="pl-10" placeholder="0,00" />
            </div>
          </div>
        </Card>

        {/* Formas de pagamento */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Formas de Pagamento</Label>
            <Button type="button" size="sm" variant="outline" onClick={adicionarForma}><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
          </div>
          {formasPagamento.map((fp, index) => (
            <Card
              key={index}
              className="bg-white p-3 relative overflow-hidden"
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingIndex(index); }}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingIndex(index); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget)) setDraggingIndex(null); }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingIndex(null); handleDropFile(index, e.dataTransfer.files[0]); }}
            >
              {draggingIndex === index && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm border-2 border-dashed border-emerald-500 rounded-lg pointer-events-none">
                  <Upload className="w-8 h-8 text-emerald-600 mb-1" />
                  <span className="text-emerald-700 font-semibold text-sm">Solte o comprovante aqui</span>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Forma {index + 1}</span>
                  {formasPagamento.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => removerForma(index)} className="text-red-600 h-6"><X className="w-3 h-3" /></Button>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Tipo *</Label>
                    <Select value={fp.tipo} onValueChange={(v) => atualizarForma(index, 'tipo', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="servicos">Serviços</SelectItem>
                        <SelectItem value="c_debito">C. Débito</SelectItem>
                        <SelectItem value="c_credito">C. Crédito</SelectItem>
                        <SelectItem value="link_pagamento">Link de Pagamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Valor (R$) *</Label>
                    <Input type="number" step="0.01" value={fp.valor} onChange={(e) => atualizarForma(index, 'valor', e.target.value)} disabled={fp.tipo === 'cheque'} />
                  </div>
                </div>
                {(fp.tipo === 'c_credito' || fp.tipo === 'link_pagamento') && (
                  <div className="space-y-1">
                    <Label>Parcelas</Label>
                    <Select value={fp.parcelas} onValueChange={(v) => atualizarForma(index, 'parcelas', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 18 }, (_, i) => i + 1).map(n => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {fp.tipo === 'cheque' && (
                  <div className="space-y-2">
                    <Button type="button" variant="outline" onClick={() => { setChequeModalIndex(index); setShowChequeModal(true); }} className="w-full text-xs h-8">
                      {fp.chequesSalvos.length > 0 ? `+ Adicionar mais (${fp.chequesSalvos.length} salvo(s))` : 'Cadastrar Cheque'}
                    </Button>
                    {fp.chequesSalvos.length > 0 && (
                      <div className="space-y-1">
                        {fp.chequesSalvos.map((ch, ci) => (
                          <div key={ci} className="flex items-center justify-between text-xs bg-slate-50 border rounded px-2 py-1.5">
                            <span>Cheque #{ch.numero_cheque} · {ch.banco} · <strong>{formatCurrency(ch.valor)}</strong></span>
                            <Button type="button" size="icon" variant="ghost" className="h-5 w-5 text-red-500"
                              onClick={() => {
                                const novas = [...formasPagamento];
                                novas[index].chequesSalvos = novas[index].chequesSalvos.filter((_, i) => i !== ci);
                                novas[index].valor = String(novas[index].chequesSalvos.reduce((s, c) => s + (parseFloat(c.valor) || 0), 0));
                                setFormasPagamento(novas);
                              }}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <UploadInline comprovante={fp.comprovante} onUpload={(url) => setComprovanteForma(index, url)} onRemove={() => setComprovanteForma(index, '')} uploading={uploadingFormaIndex === index} />
              </div>
            </Card>
          ))}
        </div>

        {/* Créditos */}
        {creditos.length > 0 && (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4 text-green-700" />
              <span className="font-bold text-green-700">Créditos Disponíveis do Cliente</span>
            </div>
            <div className="space-y-2">
              {creditos.map(cred => (
                <div key={cred.id} className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-green-100">
                  <Checkbox id={`cred-lchq-${cred.id}`} checked={creditosSelecionados.includes(cred.id)} onCheckedChange={() => toggleCredito(cred.id)} />
                  <Label htmlFor={`cred-lchq-${cred.id}`} className="flex-1 cursor-pointer text-sm">
                    <span className="font-medium text-slate-800">{cred.origem || 'Crédito'}</span>
                    {cred.created_date && <span className="text-slate-500 ml-1 text-xs">— {new Date(cred.created_date).toLocaleDateString('pt-BR')}</span>}
                  </Label>
                  <span className="font-bold text-green-700 text-sm">{formatCurrency(cred.valor)}</span>
                </div>
              ))}
            </div>
            {creditoAUsar > 0 && (
              <div className="mt-2 pt-2 border-t border-green-200 flex justify-between text-sm font-bold text-green-800">
                <span>Total créditos selecionados:</span><span>{formatCurrency(creditoAUsar)}</span>
              </div>
            )}
          </Card>
        )}

        {/* Totalizador */}
        <Card className="p-4 bg-emerald-50 border-emerald-200 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-600">Total dos Cheques:</span><span className="font-medium">{formatCurrency(totalOriginal)}</span></div>
          {calcularDesconto() > 0 && <div className="flex justify-between text-red-600"><span>Desconto:</span><span>- {formatCurrency(calcularDesconto())}</span></div>}
          <div className="flex justify-between border-t pt-2 font-bold text-slate-700"><span>Total a Pagar:</span><span>{formatCurrency(totalDevido)}</span></div>
          {creditoAUsar > 0 && <div className="flex justify-between text-green-600"><span>Crédito Usado:</span><span>{formatCurrency(creditoAUsar)}</span></div>}
          <div className="flex justify-between text-blue-700 font-semibold"><span>Pagamento em dinheiro/formas:</span><span>{formatCurrency(totalFormasManuais)}</span></div>
          <div className="flex justify-between border-t pt-2 text-lg font-bold">
            <span>Novo Saldo:</span>
            <span className={cn(totalPago >= totalDevido ? "text-emerald-700" : "text-amber-600")}>
              {formatCurrency(Math.max(0, totalDevido - totalPago))}
            </span>
          </div>
          {totalPago < totalDevido && totalPago > 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">⚠️ Liquidação parcial — cheques permanecerão como pendentes.</p>
          )}
        </Card>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleConfirmar} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Confirmar Liquidação</>}
          </Button>
        </div>

        {isSaving && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
              <p className="text-slate-600 font-medium">Processando liquidação...</p>
            </div>
          </div>
        )}

        {/* Pop-up excedente → crédito */}
        <Dialog open={showCreditoModal} onOpenChange={setShowCreditoModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-700"><Sparkles className="w-5 h-5" /> Pagamento a Maior Detectado</DialogTitle>
              <DialogDescription>Confirme como deseja tratar o valor excedente</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
                <p className="text-sm text-indigo-700 mb-1">Excedente</p>
                <p className="text-3xl font-extrabold text-indigo-800">{formatCurrency(excedentePendente)}</p>
              </div>
              <p className="text-sm text-slate-600">Deseja gerar esse valor como <strong>Crédito</strong> para <strong>{clienteNome}</strong>?</p>
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={() => executarLiquidacao(excedentePendente)} className="bg-indigo-600 hover:bg-indigo-700 gap-2"><Sparkles className="w-4 h-4" />Sim, Gerar Crédito e Liquidar</Button>
                <Button variant="outline" onClick={() => setShowCreditoModal(false)}>Não, vou corrigir os valores</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <ModalContainer open={showChequeModal} onClose={() => setShowChequeModal(false)} title="Adicionar Cheque" size="lg">
          {clienteCodigo && (
            <AdicionarChequeModal
              clienteInfo={{ cliente_codigo: clienteCodigo, cliente_nome: clienteNome }}
              onSave={handleSaveCheque}
              onSaveAndAddAnother={handleSaveChequeAndAddAnother}
              onCancel={() => setShowChequeModal(false)}
            />
          )}
        </ModalContainer>
      </div>
    </ModalContainer>
  );
}