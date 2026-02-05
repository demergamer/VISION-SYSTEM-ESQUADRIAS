import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  LayoutGrid, List, Filter, Plus, Search, 
  ArrowUpRight, AlertCircle, CheckCircle2, Clock,
  MoreHorizontal, Wallet, User, ArrowRightLeft, MapPin, Building2, Banknote, Landmark,
  RefreshCw, Trash2, AlertTriangle, CheckCircle, Loader2, Upload, FileText, ChevronRight, X as XIcon, CreditCard, DollarSign
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

import ModalContainer from "@/components/modals/ModalContainer";
import ChequeForm from "@/components/cheques/ChequeForm";
import ChequeDetails from "@/components/cheques/ChequeDetails";
import PermissionGuard from "@/components/PermissionGuard";
import { usePermissions } from "@/components/hooks/usePermissions";

// Importação dos Novos Componentes
import RegistrarDevolucaoModal from "@/components/cheques/Chequesdevolvidos";
import ResolveDuplicatesModal from "@/components/cheques/Chequeduplicados";
import ChequePagamentoModal from "@/components/cheques/Chequepagamentos";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function Cheques() {
  const queryClient = useQueryClient();
  const { canDo } = usePermissions();
  
  const [viewMode, setViewMode] = useState('table');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // NAVEGAÇÃO
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
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [chequeParaPagamento, setChequeParaPagamento] = useState(null);

  const [duplicateGroups, setDuplicateGroups] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: cheques = [], refetch } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });

  const mapClientes = useMemo(() => {
      const map = {};
      clientes.forEach(c => map[c.codigo] = c);
      return map;
  }, [clientes]);

  // --- LÓGICA 1: DEVOLUÇÃO ---
  const handleSaveDevolucao = async (payload) => {
    setIsProcessing(true);
    try {
        const { cheques_ids, detalhes_devolucao, pagamento } = payload;
        
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

  // --- LÓGICA 2: DUPLICATAS ---
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

  // --- LÓGICA 3: PAGAMENTO POSTERIOR ---
  const handleOpenPagamento = (cheque) => {
      setChequeParaPagamento(cheque);
      setShowPagamentoModal(true);
  };

  const handleSavePagamentoDevolvido = async (pagamento) => {
      setIsProcessing(true);
      try {
          // Atualiza o cheque original como pago
          await base44.entities.Cheque.update(chequeParaPagamento.id, {
              status_pagamento_devolucao: 'pago',
              data_pagamento_devolucao: new Date().toISOString(),
              comprovante_pagamento_devolucao: pagamento.comprovante
          });

          // Se for troca, cria o novo
          if (pagamento.metodo === 'cheque_troca' && pagamento.novoCheque) {
              await base44.entities.Cheque.create({
                  numero_cheque: pagamento.novoCheque.numero,
                  banco: pagamento.novoCheque.banco,
                  valor: parseFloat(pagamento.novoCheque.valor),
                  data_vencimento: pagamento.novoCheque.vencimento,
                  status: 'em_maos',
                  origem: 'troca_devolucao_tardia',
                  observacao: `Regularização do cheque devolvido #${chequeParaPagamento.numero_cheque}`
              });
          }

          await refetch();
          setShowPagamentoModal(false);
          toast.success("Pagamento registrado!");
      } catch(e) {
          toast.error("Erro ao salvar pagamento.");
      } finally {
          setIsProcessing(false);
      }
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

    const depJC = compensados.filter(c => c.destino_deposito === 'J&C ESQUADRIAS').reduce((a,c)=>a+c.valor,0);
    const depBIG = compensados.filter(c => c.destino_deposito === 'BIG METAIS').reduce((a,c)=>a+c.valor,0);
    const depOLIVER = compensados.filter(c => c.destino_deposito === 'OLIVER EXTRUSORA').reduce((a,c)=>a+c.valor,0);
    const repassadosBaixadosVal = lista.filter(c => c.status === 'repassado' && c.data_vencimento && isPast(parseISO(c.data_vencimento))).reduce((a,c)=>a+c.valor,0);

    return { 
        listaFinal, 
        totais: { 
            emMaos: emMaos.reduce((a,c)=>a+c.valor,0), 
            repassados: repassados.reduce((a,c)=>a+c.valor,0),
            devolvidos: devolvidos.reduce((a,c)=>a+c.valor,0),
            depJC, depBIG, depOLIVER, repassadosBaixadosVal,
            devolvidosAqui: devolvidos.filter(c => !c.fornecedor_repassado_nome).reduce((a,c)=>a+c.valor,0),
            devolvidosNaoAqui: devolvidos.filter(c => !!c.fornecedor_repassado_nome).reduce((a,c)=>a+c.valor,0),
            devolvidosPagos: devolvidos.filter(c => c.status_pagamento_devolucao==='pago').reduce((a,c)=>a+c.valor,0)
        } 
    };
  }, [cheques, searchTerm, filters, mainTab, subTab]);

  const handleMainTabChange = (val) => {
      setMainTab(val);
      if (val === 'a_compensar') setSubTab('em_maos');
      else if (val === 'devolvidos') setSubTab('aqui');
      else if (val === 'compensados') setSubTab('jc');
  };

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
                  {/* BOTÕES DE AÇÃO */}
                  {canDo('Cheques', 'editar') && (
                      <Button onClick={() => setShowDevolucaoModal(true)} className="gap-2 border-red-200 text-red-700 bg-white hover:bg-red-50 shadow-sm border">
                          <AlertTriangle className="w-4 h-4" /> Devolução
                      </Button>
                  )}
                  {canDo('Cheques', 'editar') && (
                      <Button variant="outline" onClick={handleCheckDuplicates} className="gap-2 bg-white border-amber-200 text-amber-700 hover:bg-amber-50">
                          <RefreshCw className="w-4 h-4" /> Verificar Duplicatas
                      </Button>
                  )}
                  <Button onClick={handleNew} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="w-4 h-4" /> Novo</Button>
              </div>
            </div>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="px-6 py-6 space-y-6 w-full">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <Tabs value={mainTab} onValueChange={handleMainTabChange} className="w-full lg:w-auto">
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
                  <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => setViewMode('table')} className={cn("h-8 w-8 rounded-md", viewMode === 'table' ? "bg-white shadow-sm" : "text-slate-500")}><List className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setViewMode('grid')} className={cn("h-8 w-8 rounded-md", viewMode === 'grid' ? "bg-white shadow-sm" : "text-slate-500")}><LayoutGrid className="w-4 h-4" /></Button>
                  </div>
              </div>
          </div>

          <AnimatePresence>
              {showFilters && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <Card className="bg-slate-50 border-slate-200 mb-6">
                          <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Banco</label><Select value={filters.banco} onValueChange={v => setFilters({...filters, banco: v})}><SelectTrigger className="bg-white"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="BRADESCO">Bradesco</SelectItem><SelectItem value="ITAÚ">Itaú</SelectItem><SelectItem value="SANTANDER">Santander</SelectItem></SelectContent></Select></div>
                              <div className="flex items-end"><Button variant="ghost" onClick={() => setFilters({ dataInicio: '', dataFim: '', banco: 'todos', valorMin: '', valorMax: '' })} className="w-full text-red-500 hover:text-red-700 hover:bg-red-50">Limpar</Button></div>
                          </div>
                      </Card>
                  </motion.div>
              )}
          </AnimatePresence>

          {/* SUB-ABAS RESTAURADAS */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 animate-in fade-in slide-in-from-left-2">
              {mainTab === 'a_compensar' && (
                  <>
                      <Button variant={subTab === 'em_maos' ? 'default' : 'outline'} onClick={() => setSubTab('em_maos')} className={cn("rounded-full h-8 text-xs", subTab === 'em_maos' && "bg-blue-600 hover:bg-blue-700")}>🏢 Em Carteira ({formatCurrency(dadosProcessados.totais.emMaos)})</Button>
                      <Button variant={subTab === 'repassados' ? 'default' : 'outline'} onClick={() => setSubTab('repassados')} className={cn("rounded-full h-8 text-xs", subTab === 'repassados' && "bg-purple-600 hover:bg-purple-700")}>🤝 Repassados ({formatCurrency(dadosProcessados.totais.repassadosFuturo)})</Button>
                  </>
              )}
              {mainTab === 'devolvidos' && (
                  <>
                      <Button variant={subTab === 'aqui' ? 'default' : 'outline'} onClick={() => setSubTab('aqui')} className={cn("rounded-full h-8 text-xs", subTab === 'aqui' && "bg-red-600 hover:bg-red-700")}>🏦 Na Empresa ({formatCurrency(dadosProcessados.totais.devolvidosAqui)})</Button>
                      <Button variant={subTab === 'nao_aqui' ? 'default' : 'outline'} onClick={() => setSubTab('nao_aqui')} className={cn("rounded-full h-8 text-xs", subTab === 'nao_aqui' && "bg-orange-500 hover:bg-orange-600 text-white")}>🤝 Com Terceiros ({formatCurrency(dadosProcessados.totais.devolvidosNaoAqui)})</Button>
                      <Button variant={subTab === 'pagos' ? 'default' : 'outline'} onClick={() => setSubTab('pagos')} className={cn("rounded-full h-8 text-xs", subTab === 'pagos' && "bg-emerald-600 hover:bg-emerald-700")}>✅ Resolvidos ({formatCurrency(dadosProcessados.totais.devolvidosPagos)})</Button>
                  </>
              )}
              {mainTab === 'compensados' && (
                  <>
                      <Button variant={subTab === 'jc' ? 'default' : 'outline'} onClick={() => setSubTab('jc')} className={cn("rounded-full h-8 text-xs", subTab === 'jc' && "bg-emerald-600 hover:bg-emerald-700")}><Landmark className="w-3 h-3 mr-1"/> J&C ({formatCurrency(dadosProcessados.totais.depJC)})</Button>
                      <Button variant={subTab === 'big' ? 'default' : 'outline'} onClick={() => setSubTab('big')} className={cn("rounded-full h-8 text-xs", subTab === 'big' && "bg-emerald-600 hover:bg-emerald-700")}><Landmark className="w-3 h-3 mr-1"/> Big Metais ({formatCurrency(dadosProcessados.totais.depBIG)})</Button>
                      <Button variant={subTab === 'oliver' ? 'default' : 'outline'} onClick={() => setSubTab('oliver')} className={cn("rounded-full h-8 text-xs", subTab === 'oliver' && "bg-emerald-600 hover:bg-emerald-700")}><Landmark className="w-3 h-3 mr-1"/> Oliver ({formatCurrency(dadosProcessados.totais.depOLIVER)})</Button>
                      <Button variant={subTab === 'repassados' ? 'default' : 'outline'} onClick={() => setSubTab('repassados')} className={cn("rounded-full h-8 text-xs", subTab === 'repassados' && "bg-indigo-600 hover:bg-indigo-700")}>Baixados Repasse ({formatCurrency(dadosProcessados.totais.repassadosBaixadosVal)})</Button>
                  </>
              )}
          </div>

          {/* TABELA */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                  <TableHeader className="bg-slate-50">
                      <TableRow>
                          <TableHead className="w-[50px]"><Checkbox checked={selectedIds.length > 0 && selectedIds.length === dadosProcessados.listaFinal.length} onCheckedChange={handleSelectAll} /></TableHead>
                          <TableHead>Cheque</TableHead>
                          <TableHead>Cliente / Representante</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-center">Status / Localização</TableHead>
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
                                  <TableRow key={cheque.id} className="group hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => handleView(cheque)}>
                                      <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedIds.includes(cheque.id)} onCheckedChange={() => handleSelectOne(cheque.id)} /></TableCell>
                                      <TableCell><div className="font-mono font-bold text-slate-700">#{cheque.numero_cheque}</div><div className="text-xs text-slate-500 uppercase">{cheque.banco}</div></TableCell>
                                      <TableCell><div className="font-medium text-slate-800">{cheque.cliente_nome}</div>{cliente?.representante_nome && <div className="text-[10px] text-blue-600 flex gap-1"><User className="w-3 h-3"/>{cliente.representante_nome.split(' ')[0]}</div>}</TableCell>
                                      <TableCell><div className={cn("text-sm", (cheque.status==='normal' && isPast(parseISO(cheque.data_vencimento))) ? "text-red-600 font-bold" : "text-slate-600")}>{cheque.data_vencimento ? format(parseISO(cheque.data_vencimento), 'dd/MM/yyyy') : '-'}</div></TableCell>
                                      <TableCell className="text-right font-bold text-slate-700">{formatCurrency(cheque.valor)}</TableCell>
                                      <TableCell className="text-center">
                                          {cheque.status === 'compensado' ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{cheque.destino_deposito ? cheque.destino_deposito.split(' ')[0] : 'Compensado'}</Badge> :
                                           cheque.status === 'pago' ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Resolvido</Badge> :
                                           cheque.status === 'devolvido' ? <Badge className="bg-red-100 text-red-700 border-red-200">Devolvido</Badge> :
                                           cheque.status === 'excluido' ? <Badge variant="outline" className="border-slate-300 text-slate-400">Excluído</Badge> :
                                           cheque.status === 'repassado' ? <Badge className="bg-purple-100 text-purple-700 border-purple-200">Repassado</Badge> :
                                           <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Em Carteira</Badge>}
                                      </TableCell>
                                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                          <div className="flex justify-end gap-1">
                                              {/* AÇÃO REGULARIZAR (PARA DEVOLVIDOS PENDENTES) */}
                                              {cheque.status === 'devolvido' && cheque.status_pagamento_devolucao !== 'pago' && (
                                                  <Button variant="ghost" size="icon" onClick={() => handleOpenPagamento(cheque)} title="Regularizar Pagamento">
                                                      <DollarSign className="w-4 h-4 text-emerald-600" />
                                                  </Button>
                                              )}
                                              {mainTab === 'excluidos' ? (
                                                  <Button variant="ghost" size="icon" onClick={() => handleRestore(cheque.id)} title="Restaurar"><RefreshCw className="w-4 h-4 text-emerald-600"/></Button>
                                              ) : (
                                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(cheque)}><MoreHorizontal className="w-4 h-4 text-slate-400 hover:text-indigo-600"/></Button>
                                              )}
                                          </div>
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

        <RegistrarDevolucaoModal 
            isOpen={showDevolucaoModal} 
            onClose={() => setShowDevolucaoModal(false)}
            todosCheques={cheques}
            preSelectedIds={selectedIds}
            onSave={handleSaveDevolucao}
        />

        <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
            <DialogHeader><DialogTitle>Resolver Duplicatas</DialogTitle><DialogDescription>Selecione o cheque correto.</DialogDescription></DialogHeader>
            <ResolveDuplicatesModal duplicateGroups={duplicateGroups} onResolve={handleResolveDuplicates} onCancel={() => setShowDuplicateModal(false)} isProcessing={isProcessing} />
          </DialogContent>
        </Dialog>

        <ChequePagamentoModal 
            isOpen={showPagamentoModal}
            onClose={() => setShowPagamentoModal(false)}
            cheque={chequeParaPagamento}
            onSave={handleSavePagamentoDevolvido}
            isProcessing={isProcessing}
        />

      </div>
    </PermissionGuard>
  );
}