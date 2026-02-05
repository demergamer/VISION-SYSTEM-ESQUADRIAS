import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  LayoutGrid, List, Filter, Plus, Search, 
  ArrowUpRight, AlertCircle, CheckCircle2, Clock,
  MoreHorizontal, Wallet, User, ArrowRightLeft, MapPin, Building2, Banknote, Landmark,
  RefreshCw, Trash2, AlertTriangle, CheckCircle, Loader2, Upload, FileText, ChevronRight, X as XIcon, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { format, isPast, isFuture, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

import ModalContainer from "@/components/modals/ModalContainer";
import ChequeForm from "@/components/cheques/ChequeForm";
import ChequeDetails from "@/components/cheques/ChequeDetails";
import PermissionGuard from "@/components/PermissionGuard";
import { usePermissions } from "@/components/hooks/usePermissions";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

// --- COMPONENTE: MODAL DE REGISTRO DE DEVOLUÇÃO (WIZARD) ---
function RegistrarDevolucaoModal({ isOpen, onClose, todosCheques, onSave, preSelectedIds }) {
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  // Inicia com os IDs que já estavam selecionados na tabela principal
  const [selectedIds, setSelectedIds] = useState(preSelectedIds || []);
  
  // Passo 2: Detalhes
  const [devolucaoDetails, setDevolucaoDetails] = useState({}); 
  
  // Passo 3: Financeiro
  const [pagarAgora, setPagarAgora] = useState(false);
  const [pagamentoForm, setPagamentoForm] = useState({
    valor: '',
    metodo: 'dinheiro',
    parcelas: 1,
    comprovante: null,
    novoCheque: { numero: '', banco: '', vencimento: '', valor: '' }
  });
  const [isUploading, setIsUploading] = useState(false);

  // Filtra cheques válidos para devolução (exclui os já devolvidos ou excluídos)
  const chequesDisponiveis = useMemo(() => {
    return todosCheques.filter(c => 
      c.status !== 'excluido' && 
      c.status !== 'devolvido' && 
      c.status !== 'compensado' &&
      (c.numero_cheque?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       c.titular?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       c.valor?.toString().includes(searchTerm))
    );
  }, [todosCheques, searchTerm]);

  const chequesSelecionados = useMemo(() => {
    return todosCheques.filter(c => selectedIds.includes(c.id));
  }, [todosCheques, selectedIds]);

  const totalDivida = chequesSelecionados.reduce((acc, c) => acc + c.valor, 0);

  const handleUpload = async (file, chequeId) => {
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (chequeId) {
        setDevolucaoDetails(prev => ({ ...prev, [chequeId]: { ...prev[chequeId], file: file_url } }));
      } else {
        setPagamentoForm(prev => ({ ...prev, comprovante: file_url }));
      }
      toast.success("Arquivo anexado!");
    } catch (e) {
      toast.error("Erro no upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFinalizar = () => {
    // Validação Básica
    const motivosPreenchidos = chequesSelecionados.every(c => devolucaoDetails[c.id]?.motivo);
    if (!motivosPreenchidos) return toast.error("Informe o motivo para todos os cheques selecionados.");

    if (pagarAgora && !pagamentoForm.valor) return toast.error("Informe o valor do pagamento.");

    const payload = {
      cheques_ids: selectedIds,
      detalhes_devolucao: devolucaoDetails,
      pagamento: pagarAgora ? pagamentoForm : null
    };
    onSave(payload);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Registrar Devolução</DialogTitle>
          <DialogDescription>Passo {step} de 3</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-2">
          {/* PASSO 1: SELEÇÃO */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Pesquisar cheque para devolver..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <div className="border rounded-md h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-[50px]"></TableHead><TableHead>Cheque</TableHead><TableHead>Titular</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {chequesDisponiveis.map(cheque => (
                      <TableRow key={cheque.id}>
                        <TableCell>
                          <Checkbox checked={selectedIds.includes(cheque.id)} onCheckedChange={(checked) => setSelectedIds(prev => checked ? [...prev, cheque.id] : prev.filter(id => id !== cheque.id))} />
                        </TableCell>
                        <TableCell>#{cheque.numero_cheque}</TableCell>
                        <TableCell>{cheque.titular}</TableCell>
                        <TableCell>{formatCurrency(cheque.valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-right text-sm text-slate-500">{selectedIds.length} selecionados</p>
            </div>
          )}

          {/* PASSO 2: DETALHES */}
          {step === 2 && (
            <div className="space-y-4">
              {chequesSelecionados.map(cheque => (
                <Card key={cheque.id} className="p-4 border-slate-200">
                  <div className="flex justify-between mb-2 font-bold text-slate-700">
                    <span>Cheque #{cheque.numero_cheque}</span>
                    <span>{formatCurrency(cheque.valor)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Motivo Devolução</Label>
                      <Select onValueChange={(val) => setDevolucaoDetails(prev => ({...prev, [cheque.id]: {...prev[cheque.id], motivo: val}}))}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="11">11 - Sem Fundos (1ª)</SelectItem>
                          <SelectItem value="12">12 - Sem Fundos (2ª)</SelectItem>
                          <SelectItem value="21">21 - Sustado</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Imagem do Cheque</Label>
                      <div className="flex gap-2">
                        <Button variant="outline" className="w-full relative" disabled={isUploading}>
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4 mr-2"/>} Upload
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleUpload(e.target.files[0], cheque.id)} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* PASSO 3: PAGAMENTO */}
          {step === 3 && (
            <div className="space-y-4">
              <Card className="p-4 bg-slate-50 flex justify-between items-center">
                <Label className="text-base">Lançar Pagamento Agora?</Label>
                <Switch checked={pagarAgora} onCheckedChange={setPagarAgora} />
              </Card>
              
              {pagarAgora && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Valor Pago</Label>
                      <Input type="number" value={pagamentoForm.valor} onChange={(e) => setPagamentoForm({...pagamentoForm, valor: e.target.value})} placeholder={totalDivida} />
                    </div>
                    <div className="space-y-1">
                      <Label>Forma Pagamento</Label>
                      <Select value={pagamentoForm.metodo} onValueChange={(v) => setPagamentoForm({...pagamentoForm, metodo: v})}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="cartao">Cartão</SelectItem>
                          <SelectItem value="cheque_troca">Outro Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {pagamentoForm.metodo === 'cartao' && (
                    <div className="space-y-1">
                      <Label>Parcelas</Label>
                      <Input type="number" value={pagamentoForm.parcelas} onChange={(e) => setPagamentoForm({...pagamentoForm, parcelas: e.target.value})} />
                    </div>
                  )}

                  {pagamentoForm.metodo === 'cheque_troca' && (
                    <Card className="p-4 bg-blue-50 border-blue-100">
                      <Label className="mb-2 block font-bold text-blue-800">Dados do Novo Cheque</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Banco" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, banco: e.target.value}}))} />
                        <Input placeholder="Número" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, numero: e.target.value}}))} />
                        <Input type="number" placeholder="Valor" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, valor: e.target.value}}))} />
                        <Input type="date" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, vencimento: e.target.value}}))} />
                      </div>
                    </Card>
                  )}

                  <div className="space-y-1">
                    <Label>Comprovante</Label>
                    <Button variant="outline" className="w-full relative">
                        <Upload className="w-4 h-4 mr-2"/> Anexar Comprovante
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleUpload(e.target.files[0], null)} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 border-t pt-4">
          {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Voltar</Button>}
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={selectedIds.length === 0}>Próximo</Button>
          ) : (
            <Button onClick={handleFinalizar} className="bg-red-600 hover:bg-red-700 text-white">Concluir Devolução</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- COMPONENTE INTERNO: RESOLVER DUPLICATAS (Mantido) ---
function ResolveDuplicatesModal({ duplicateGroups, onResolve, onCancel, isProcessing }) {
  const [selectedKeepers, setSelectedKeepers] = useState({});
  React.useEffect(() => {
    const initialSelections = {};
    Object.keys(duplicateGroups).forEach(key => { initialSelections[key] = duplicateGroups[key][0].id; });
    setSelectedKeepers(initialSelections);
  }, [duplicateGroups]);

  const handleConfirm = () => {
    const idsToExclude = [];
    Object.keys(duplicateGroups).forEach(key => {
      const keeperId = selectedKeepers[key];
      const group = duplicateGroups[key];
      group.forEach(cheque => { if (cheque.id !== keeperId) idsToExclude.push(cheque.id); });
    });
    onResolve(idsToExclude);
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-bold">Atenção: Cheques Idênticos Detectados</p>
          <p>O sistema encontrou registros duplicados. Selecione o original para manter.</p>
        </div>
      </div>
      <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-2">
        {Object.entries(duplicateGroups).map(([key, group], index) => (
          <Card key={key} className="p-4 border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3 border-b pb-2 bg-slate-50 -mx-4 -mt-4 px-4 py-2 rounded-t-lg">
              <span className="bg-white border text-slate-500 text-xs font-bold px-2 py-1 rounded">Grupo #{index + 1}</span>
              <span className="font-mono text-sm text-slate-700 font-medium">Cheque Nº {group[0].numero_cheque}</span>
              <span className="ml-auto font-bold text-slate-800">{formatCurrency(group[0].valor)}</span>
            </div>
            <RadioGroup value={selectedKeepers[key]} onValueChange={(val) => setSelectedKeepers(prev => ({ ...prev, [key]: val }))} className="space-y-3">
              {group.map(cheque => (
                <div key={cheque.id} onClick={() => setSelectedKeepers(prev => ({ ...prev, [key]: cheque.id }))} className={cn("flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer relative", selectedKeepers[key] === cheque.id ? "border-green-500 bg-green-50 ring-1 ring-green-500" : "border-slate-200 hover:bg-slate-50")}>
                  <RadioGroupItem value={cheque.id} id={cheque.id} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div><Label className="font-bold cursor-pointer text-slate-800">ID: {cheque.id}</Label><p className="text-xs text-slate-500">Cadastrado: {format(parseISO(cheque.created_date || new Date().toISOString()), 'dd/MM/yyyy')}</p></div>
                      <Badge variant="outline" className="capitalize bg-white">{cheque.status}</Badge>
                    </div>
                  </div>
                  {selectedKeepers[key] === cheque.id && (<div className="absolute top-2 right-2 text-green-600"><CheckCircle className="w-4 h-4"/></div>)}
                </div>
              ))}
            </RadioGroup>
          </Card>
        ))}
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>Cancelar</Button>
        <Button onClick={handleConfirm} disabled={isProcessing} className="bg-green-600 hover:bg-green-700 text-white">{isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />} Resolver</Button>
      </div>
    </div>
  );
}

export default function Cheques() {
  const queryClient = useQueryClient();
  const { canDo } = usePermissions();
  
  const [viewMode, setViewMode] = useState('table');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [mainTab, setMainTab] = useState('a_compensar');
  const [subTab, setSubTab] = useState('em_maos');

  const [filters, setFilters] = useState({ dataInicio: '', dataFim: '', banco: 'todos', valorMin: '', valorMax: '' });
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCheque, setSelectedCheque] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // MODAIS ESPECIAIS
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showDevolucaoModal, setShowDevolucaoModal] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: cheques = [], refetch } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });

  const mapClientes = useMemo(() => {
      const map = {};
      clientes.forEach(c => map[c.codigo] = c);
      return map;
  }, [clientes]);

  // --- LÓGICA DE DEVOLUÇÃO ---
  const handleSaveDevolucao = async (payload) => {
    setIsProcessing(true);
    try {
        const { cheques_ids, detalhes_devolucao, pagamento } = payload;
        
        // 1. Atualizar Cheques
        const updatePromises = cheques_ids.map(id => {
            const detalhe = detalhes_devolucao[id];
            return base44.entities.Cheque.update(id, {
                status: 'devolvido',
                motivo_devolucao: detalhe?.motivo || 'outros',
                foto_devolucao: detalhe?.file || null,
                data_devolucao: new Date().toISOString().split('T')[0],
                status_pagamento_devolucao: pagamento ? 'pago' : 'pendente'
            });
        });
        await Promise.all(updatePromises);

        // 2. Novo Cheque (Troca)
        if (pagamento && pagamento.metodo === 'cheque_troca' && pagamento.novoCheque) {
            await base44.entities.Cheque.create({
                numero_cheque: pagamento.novoCheque.numero,
                banco: pagamento.novoCheque.banco,
                valor: parseFloat(pagamento.novoCheque.valor),
                data_vencimento: pagamento.novoCheque.vencimento,
                status: 'em_maos',
                origem: 'troca_devolucao',
                observacao: `Troca dos devolvidos: ${cheques_ids.join(', ')}`
            });
        }

        await refetch();
        setShowDevolucaoModal(false);
        toast.success("Devolução registrada!");
    } catch (e) {
        toast.error("Erro ao registrar devolução.");
    } finally {
        setIsProcessing(false);
    }
  };

  // --- LÓGICA DE DUPLICATAS ---
  const handleCheckDuplicates = () => {
    const groups = {};
    const chequesAtivos = cheques.filter(c => c.status === 'normal' || c.status === 'repassado');
    chequesAtivos.forEach(c => {
      const num = c.numero_cheque ? String(c.numero_cheque).trim() : '';
      const cc = c.conta ? String(c.conta).trim() : '';
      const venc = c.data_vencimento ? c.data_vencimento.split('T')[0] : '';
      const key = `${num}|${cc}|${venc}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    
    const conflictGroups = {};
    let count = 0;
    Object.keys(groups).forEach(key => { if (groups[key].length > 1) { conflictGroups[key] = groups[key]; count++; } });

    if (count > 0) { setDuplicateGroups(conflictGroups); setShowDuplicateModal(true); toast.warning(`Encontradas ${count} duplicatas.`); }
    else { toast.success("Nenhuma duplicata encontrada."); }
  };

  const handleResolveDuplicates = async (idsToExclude) => {
    setIsProcessing(true);
    try {
      await Promise.all(idsToExclude.map(id => base44.entities.Cheque.update(id, { status: 'excluido', observacao: '[AUTO] Duplicata' })));
      await refetch();
      setShowDuplicateModal(false);
      toast.success("Resolvido!");
    } catch (e) { toast.error("Erro."); } finally { setIsProcessing(false); }
  };

  // --- FILTROS DE TABELA ---
  const dadosProcessados = useMemo(() => {
    let lista = cheques;
    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      lista = lista.filter(c => c.numero_cheque?.toLowerCase().includes(termo) || c.titular?.toLowerCase().includes(termo) || c.valor?.toString().includes(termo));
    }
    if (filters.banco !== 'todos') lista = lista.filter(c => c.banco === filters.banco);
    
    const emMaos = lista.filter(c => c.status === 'normal');
    const repassados = lista.filter(c => c.status === 'repassado' && (!c.data_vencimento || isFuture(parseISO(c.data_vencimento))));
    const devolvidos = lista.filter(c => c.status === 'devolvido' || (c.status === 'pago' && c.motivo_devolucao));
    const compensados = lista.filter(c => c.status === 'compensado');
    const excluidos = lista.filter(c => c.status === 'excluido');

    let listaFinal = [];
    if (mainTab === 'a_compensar') listaFinal = subTab === 'em_maos' ? emMaos : repassados;
    else if (mainTab === 'devolvidos') listaFinal = devolvidos;
    else if (mainTab === 'compensados') listaFinal = compensados;
    else if (mainTab === 'excluidos') listaFinal = excluidos;

    return { 
        listaFinal, 
        totais: { 
            emMaos: emMaos.reduce((a,c)=>a+c.valor,0), 
            repassados: repassados.reduce((a,c)=>a+c.valor,0),
            devolvidos: devolvidos.reduce((a,c)=>a+c.valor,0)
        } 
    };
  }, [cheques, searchTerm, filters, mainTab, subTab]);

  const handleEdit = (cheque) => { setSelectedCheque(cheque); setShowFormModal(true); };
  const handleView = (cheque) => { setSelectedCheque(cheque); setShowDetailsModal(true); };
  const handleNew = () => { setSelectedCheque(null); setShowFormModal(true); };
  const handleSelectAll = (checked) => { if (checked) setSelectedIds(dadosProcessados.listaFinal.map(c => c.id)); else setSelectedIds([]); };
  const handleSelectOne = (id) => { setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };
  const handleRestore = async (id) => { if(confirm("Restaurar?")) { await base44.entities.Cheque.update(id, {status:'normal'}); refetch(); } };

  return (
    <PermissionGuard setor="Cheques">
      <div className="min-h-screen bg-[#F8FAFC] pb-10 w-full">
        {/* HEADER */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
          <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 w-full">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Wallet className="w-6 h-6 text-indigo-600" /> Gestão de Cheques</h1>
              <p className="text-slate-500 text-sm">Controle de recebíveis e custódia</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-3 overflow-x-auto pb-1 sm:pb-0">
                  <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg min-w-[150px]"><p className="text-[10px] font-bold text-blue-600 flex items-center gap-1"><Clock className="w-3 h-3"/> Em Mãos</p><p className="text-lg font-bold text-blue-900">{formatCurrency(dadosProcessados.totais.emMaos)}</p></div>
                  <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-lg min-w-[150px]"><p className="text-[10px] font-bold text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Devolvidos</p><p className="text-lg font-bold text-red-900">{formatCurrency(dadosProcessados.totais.devolvidos)}</p></div>
              </div>
              <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block" />
              <div className="flex gap-2">
                  {/* BOTÃO VERIFICAR DUPLICATAS */}
                  {canDo('Cheques', 'editar') && (
                      <Button variant="outline" onClick={handleCheckDuplicates} className="gap-2 bg-white border-amber-200 text-amber-700 hover:bg-amber-50">
                          <RefreshCw className="w-4 h-4" /> Verificar Duplicatas
                      </Button>
                  )}
                  {/* BOTÃO AÇÕES (DROPDOWN ATIVADO) */}
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="gap-2" disabled={selectedIds.length === 0}>
                              <MoreHorizontal className="w-4 h-4" /> Ações ({selectedIds.length})
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações em Massa</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setShowDevolucaoModal(true)}>
                              <AlertTriangle className="w-4 h-4 mr-2 text-red-500" /> Marcar como Devolvido
                          </DropdownMenuItem>
                          {/* Adicione outras ações aqui se necessário */}
                      </DropdownMenuContent>
                  </DropdownMenu>

                  <Button onClick={handleNew} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="w-4 h-4" /> Novo</Button>
              </div>
            </div>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="px-6 py-6 space-y-6 w-full">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <Tabs value={mainTab} onValueChange={(v) => { setMainTab(v); if(v==='a_compensar') setSubTab('em_maos'); }} className="w-full lg:w-auto">
                  <TabsList className="bg-slate-100 p-1 h-auto flex-wrap">
                      <TabsTrigger value="a_compensar" className="gap-2 px-4 py-2"><Clock className="w-4 h-4" /> A Compensar</TabsTrigger>
                      <TabsTrigger value="devolvidos" className="gap-2 px-4 py-2"><AlertCircle className="w-4 h-4" /> Devolvidos</TabsTrigger>
                      <TabsTrigger value="compensados" className="gap-2 px-4 py-2"><CheckCircle2 className="w-4 h-4" /> Compensados</TabsTrigger>
                      <TabsTrigger value="excluidos" className="gap-2 px-4 py-2"><Trash2 className="w-4 h-4" /> Excluídos</TabsTrigger>
                  </TabsList>
              </Tabs>
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                  <div className="relative flex-1 lg:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9"/></div>
                  <Button variant={showFilters ? "secondary" : "outline"} size="icon" onClick={() => setShowFilters(!showFilters)}><Filter className="w-4 h-4" /></Button>
              </div>
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {mainTab === 'a_compensar' && (
                  <>
                      <Button variant={subTab === 'em_maos' ? 'default' : 'outline'} onClick={() => setSubTab('em_maos')} className={cn("rounded-full h-8 text-xs", subTab === 'em_maos' && "bg-blue-600 hover:bg-blue-700")}>Em Mãos</Button>
                      <Button variant={subTab === 'repassados' ? 'default' : 'outline'} onClick={() => setSubTab('repassados')} className={cn("rounded-full h-8 text-xs", subTab === 'repassados' && "bg-purple-600 hover:bg-purple-700")}>Repassados</Button>
                  </>
              )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                  <TableHeader className="bg-slate-50">
                      <TableRow>
                          <TableHead className="w-[50px]"><Checkbox checked={selectedIds.length > 0 && selectedIds.length === dadosProcessados.listaFinal.length} onCheckedChange={handleSelectAll} /></TableHead>
                          <TableHead>Cheque</TableHead>
                          <TableHead>Titular / Cliente</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {dadosProcessados.listaFinal.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-500">Nenhum registro encontrado.</TableCell></TableRow>
                      ) : (
                          dadosProcessados.listaFinal.map(cheque => {
                              const cliente = mapClientes[cheque.cliente_codigo];
                              return (
                                  <TableRow key={cheque.id} className="group hover:bg-slate-50/80 cursor-pointer" onClick={() => handleView(cheque)}>
                                      <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedIds.includes(cheque.id)} onCheckedChange={() => handleSelectOne(cheque.id)} /></TableCell>
                                      <TableCell><div className="font-mono font-bold text-slate-700">#{cheque.numero_cheque}</div><div className="text-xs text-slate-500 uppercase">{cheque.banco}</div></TableCell>
                                      <TableCell><div className="font-medium text-slate-800">{cheque.cliente_nome}</div>{cliente?.representante_nome && <div className="text-[10px] text-blue-600 flex gap-1"><User className="w-3 h-3"/>{cliente.representante_nome.split(' ')[0]}</div>}</TableCell>
                                      <TableCell><div className={cn("text-sm", (cheque.status==='normal' && isPast(parseISO(cheque.data_vencimento))) ? "text-red-600 font-bold" : "text-slate-600")}>{cheque.data_vencimento ? format(parseISO(cheque.data_vencimento), 'dd/MM/yyyy') : '-'}</div></TableCell>
                                      <TableCell className="text-right font-bold text-slate-700">{formatCurrency(cheque.valor)}</TableCell>
                                      <TableCell className="text-center"><Badge variant="outline" className={cn("capitalize", cheque.status==='devolvido' && "bg-red-100 text-red-700 border-red-200")}>{cheque.status === 'normal' ? 'Em Mãos' : cheque.status}</Badge></TableCell>
                                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                          {mainTab === 'excluidos' ? <Button variant="ghost" size="icon" onClick={() => handleRestore(cheque.id)}><RefreshCw className="w-4 h-4 text-emerald-600"/></Button> : <Button variant="ghost" size="icon" onClick={() => handleEdit(cheque)}><MoreHorizontal className="w-4 h-4 text-slate-400"/></Button>}
                                      </TableCell>
                                  </TableRow>
                              )
                          })
                      )}
                  </TableBody>
              </Table>
          </div>
        </div>

        {/* MODAIS */}
        <ModalContainer open={showFormModal} onClose={() => setShowFormModal(false)} title={selectedCheque ? "Editar Cheque" : "Novo Cheque"}>
          <ChequeForm cheque={selectedCheque} clientes={clientes} onSave={() => { setShowFormModal(false); refetch(); }} onCancel={() => setShowFormModal(false)} />
        </ModalContainer>

        <ModalContainer open={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Detalhes do Cheque">
          {selectedCheque && <ChequeDetails cheque={selectedCheque} clientes={clientes} onEdit={() => { setShowDetailsModal(false); handleEdit(selectedCheque); }} onClose={() => setShowDetailsModal(false)} />}
        </ModalContainer>

        {/* MODAL DE DEVOLUÇÃO (NOVO) */}
        <RegistrarDevolucaoModal 
            isOpen={showDevolucaoModal} 
            onClose={() => setShowDevolucaoModal(false)}
            todosCheques={cheques}
            preSelectedIds={selectedIds}
            clientes={clientes}
            onSave={handleSaveDevolucao}
        />

        {/* MODAL DE DUPLICATAS */}
        <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
            <DialogHeader><DialogTitle>Resolver Duplicatas</DialogTitle><DialogDescription>Selecione o cheque correto.</DialogDescription></DialogHeader>
            <ResolveDuplicatesModal duplicateGroups={duplicateGroups} onResolve={handleResolveDuplicates} onCancel={() => setShowDuplicateModal(false)} isProcessing={isProcessing} />
          </DialogContent>
        </Dialog>

      </div>
    </PermissionGuard>
  );
}