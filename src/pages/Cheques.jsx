import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  LayoutGrid, List, Filter, Plus, Search, 
  ArrowUpRight, AlertCircle, CheckCircle2, Clock,
  MoreHorizontal, Wallet, User, ArrowRightLeft, MapPin, Building2, Banknote, Landmark,
  RefreshCw, Trash2, AlertTriangle, CheckCircle, Loader2
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

import ModalContainer from "@/components/modals/ModalContainer";
import ChequeForm from "@/components/cheques/ChequeForm";
import ChequeDetails from "@/components/cheques/ChequeDetails";
// Importe seu hook de permissões se estiver usando
// import { usePermissions } from "@/components/hooks/usePermissions"; 

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

// --- COMPONENTE INTERNO: RESOLVER DUPLICATAS ---
function ResolveDuplicatesModal({ duplicateGroups, onResolve, onCancel, isProcessing }) {
  const [selectedKeepers, setSelectedKeepers] = useState({});

  // Seleciona automaticamente o primeiro de cada grupo como sugestão
  React.useEffect(() => {
    const initialSelections = {};
    Object.keys(duplicateGroups).forEach(key => {
      initialSelections[key] = duplicateGroups[key][0].id;
    });
    setSelectedKeepers(initialSelections);
  }, [duplicateGroups]);

  const handleConfirm = () => {
    const idsToExclude = [];
    Object.keys(duplicateGroups).forEach(key => {
      const keeperId = selectedKeepers[key];
      const group = duplicateGroups[key];
      group.forEach(cheque => {
        if (cheque.id !== keeperId) idsToExclude.push(cheque.id);
      });
    });
    onResolve(idsToExclude);
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-bold">Atenção: Cheques Idênticos Detectados</p>
          <p>O sistema encontrou registros duplicados (mesmo número, conta, vencimento e titular). Selecione abaixo qual é o <strong>original</strong> para manter. Os outros serão movidos para "Excluídos".</p>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-2">
        {Object.entries(duplicateGroups).map(([key, group], index) => (
          <Card key={key} className="p-4 border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3 border-b pb-2 bg-slate-50 -mx-4 -mt-4 px-4 py-2 rounded-t-lg">
              <span className="bg-white border text-slate-500 text-xs font-bold px-2 py-1 rounded">Conflito #{index + 1}</span>
              <span className="font-mono text-sm text-slate-700 font-medium">Cheque Nº {group[0].numero_cheque}</span>
              <span className="text-sm text-slate-500 hidden sm:inline">| {group[0].titular}</span>
              <span className="ml-auto font-bold text-slate-800">{formatCurrency(group[0].valor)}</span>
            </div>

            <RadioGroup 
              value={selectedKeepers[key]} 
              onValueChange={(val) => setSelectedKeepers(prev => ({ ...prev, [key]: val }))}
              className="space-y-3"
            >
              {group.map(cheque => (
                <div key={cheque.id} onClick={() => setSelectedKeepers(prev => ({ ...prev, [key]: cheque.id }))} className={cn(
                  "flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer relative",
                  selectedKeepers[key] === cheque.id ? "border-green-500 bg-green-50 ring-1 ring-green-500" : "border-slate-200 hover:bg-slate-50"
                )}>
                  <RadioGroupItem value={cheque.id} id={cheque.id} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <Label className="font-bold cursor-pointer text-slate-800">
                          ID: {cheque.id}
                        </Label>
                        <p className="text-xs text-slate-500">Cadastrado em: {format(parseISO(cheque.created_date || new Date().toISOString()), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                      <Badge variant="outline" className="capitalize bg-white">{cheque.status === 'normal' ? 'Em Mãos' : cheque.status}</Badge>
                    </div>
                    
                    <div className="mt-2 text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white/50 p-2 rounded border border-black/5">
                        <div>
                            <span className="font-semibold text-slate-400 block">Origem / Vínculo:</span>
                            {cheque.pedido_id ? `Pedido #${cheque.pedido_id}` : (cheque.origem || 'Cadastro Manual')}
                        </div>
                        <div>
                            <span className="font-semibold text-slate-400 block">Observação:</span>
                            {cheque.observacao || '-'}
                        </div>
                    </div>
                  </div>
                  {selectedKeepers[key] === cheque.id && (
                      <div className="absolute top-2 right-2 text-green-600"><CheckCircle className="w-4 h-4"/></div>
                  )}
                </div>
              ))}
            </RadioGroup>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>Cancelar</Button>
        <Button onClick={handleConfirm} disabled={isProcessing} className="bg-green-600 hover:bg-green-700 text-white">
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          Resolver Selecionados
        </Button>
      </div>
    </div>
  );
}

export default function Cheques() {
  const queryClient = useQueryClient();
  
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

  // ESTADOS PARA DUPLICATAS
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: cheques = [], refetch } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });

  const mapClientes = useMemo(() => {
      const map = {};
      clientes.forEach(c => map[c.codigo] = c);
      return map;
  }, [clientes]);

  // --- LÓGICA DE DUPLICATAS ---
  const handleCheckDuplicates = () => {
    const groups = {};
    
    // Filtra apenas cheques ativos no fluxo financeiro (Em Mãos ou Repassados)
    // Ignora Compensados, Devolvidos e Excluídos
    const chequesAtivos = cheques.filter(c => c.status === 'normal' || c.status === 'repassado');

    chequesAtivos.forEach(c => {
      // Normalização para comparação
      const num = c.numero_cheque ? String(c.numero_cheque).trim() : '';
      const ag = c.agencia ? String(c.agencia).trim() : '';
      const cc = c.conta ? String(c.conta).trim() : '';
      const tit = c.titular ? c.titular.trim().toLowerCase() : '';
      const venc = c.data_vencimento ? c.data_vencimento.split('T')[0] : '';

      // Chave única: Num + Agencia + Conta + Vencimento + Titular
      const key = `${num}|${ag}|${cc}|${venc}|${tit}`;

      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });

    // Filtra apenas grupos com mais de 1 item (duplicatas reais)
    const conflictGroups = {};
    let count = 0;
    Object.keys(groups).forEach(key => {
      if (groups[key].length > 1) {
        conflictGroups[key] = groups[key];
        count++;
      }
    });

    if (count > 0) {
      setDuplicateGroups(conflictGroups);
      setShowDuplicateModal(true);
      toast.warning(`Encontradas ${count} inconsistências.`);
    } else {
      toast.success("Nenhuma duplicata encontrada nos cheques ativos.", {
        icon: <CheckCircle className="text-emerald-500" />
      });
    }
  };

  const handleResolveDuplicates = async (idsToExclude) => {
    setIsProcessing(true);
    try {
      const promises = idsToExclude.map(id => {
        const original = cheques.find(c => c.id === id);
        return base44.entities.Cheque.update(id, {
          status: 'excluido',
          observacao: (original.observacao || '') + ' [AUTO] Excluído por duplicidade em ' + new Date().toLocaleDateString()
        });
      });

      await Promise.all(promises);
      await refetch(); // Recarrega dados
      setShowDuplicateModal(false);
      setDuplicateGroups({});
      toast.success(`${idsToExclude.length} cheques movidos para "Excluídos".`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao resolver duplicatas.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- RESTO DA LÓGICA EXISTENTE ---
  const dadosProcessados = useMemo(() => {
    let lista = cheques;

    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      lista = lista.filter(c => 
        c.numero_cheque?.toLowerCase().includes(termo) ||
        c.emitente?.toLowerCase().includes(termo) ||
        c.cliente_nome?.toLowerCase().includes(termo) ||
        c.valor?.toString().includes(termo)
      );
    }

    if (filters.banco !== 'todos') lista = lista.filter(c => c.banco === filters.banco);
    if (filters.valorMin) lista = lista.filter(c => c.valor >= parseFloat(filters.valorMin));
    if (filters.valorMax) lista = lista.filter(c => c.valor <= parseFloat(filters.valorMax));
    if (filters.dataInicio) lista = lista.filter(c => new Date(c.data_vencimento) >= new Date(filters.dataInicio));
    if (filters.dataFim) lista = lista.filter(c => new Date(c.data_vencimento) <= new Date(filters.dataFim));

    // --- LÓGICA DE SEPARAÇÃO ---
    
    // 1. A COMPENSAR
    const emMaos = lista.filter(c => c.status === 'normal');
    const repassadosACompensar = lista.filter(c => c.status === 'repassado' && c.data_vencimento && isFuture(parseISO(c.data_vencimento)));

    // 2. DEVOLVIDOS
    const devolvidosPagos = lista.filter(c => (c.status === 'pago' && c.motivo_devolucao) || (c.status === 'devolvido' && c.data_pagamento));
    const devolvidosPendentes = lista.filter(c => c.status === 'devolvido' && !c.data_pagamento);
    const devolvidosAqui = devolvidosPendentes.filter(c => !c.fornecedor_repassado_nome); 
    const devolvidosNaoAqui = devolvidosPendentes.filter(c => !!c.fornecedor_repassado_nome); 

    // 3. COMPENSADOS (DIVISÃO POR EMPRESA)
    const depositadosTotal = lista.filter(c => c.status === 'compensado');
    const repassadosBaixados = lista.filter(c => c.status === 'repassado' && c.data_vencimento && isPast(parseISO(c.data_vencimento)));

    // 4. EXCLUÍDOS (NOVA CATEGORIA)
    const excluidos = lista.filter(c => c.status === 'excluido');

    // Filtros por Empresa
    const depJC = depositadosTotal.filter(c => c.destino_deposito === 'J&C ESQUADRIAS');
    const depBIG = depositadosTotal.filter(c => c.destino_deposito === 'BIG METAIS');
    const depOLIVER = depositadosTotal.filter(c => c.destino_deposito === 'OLIVER EXTRUSORA');

    // SELEÇÃO DA LISTA FINAL
    let listaFinal = [];
    
    if (mainTab === 'a_compensar') {
        if (subTab === 'em_maos') listaFinal = emMaos;
        else if (subTab === 'repassados') listaFinal = repassadosACompensar;
        else listaFinal = [...emMaos, ...repassadosACompensar];
    } 
    else if (mainTab === 'devolvidos') {
        if (subTab === 'aqui') listaFinal = devolvidosAqui;
        else if (subTab === 'nao_aqui') listaFinal = devolvidosNaoAqui;
        else if (subTab === 'pagos') listaFinal = devolvidosPagos;
        else listaFinal = [...devolvidosPendentes, ...devolvidosPagos];
    } 
    else if (mainTab === 'compensados') {
        if (subTab === 'jc') listaFinal = depJC;
        else if (subTab === 'big') listaFinal = depBIG;
        else if (subTab === 'oliver') listaFinal = depOLIVER;
        else if (subTab === 'repassados') listaFinal = repassadosBaixados;
        else listaFinal = [...depositadosTotal, ...repassadosBaixados];
    }
    // NOVA ABA DE EXCLUÍDOS
    else if (mainTab === 'excluidos') {
        listaFinal = excluidos;
    }

    return {
      listaFinal,
      totais: {
        emMaos: emMaos.reduce((acc, c) => acc + c.valor, 0),
        repassadosFuturo: repassadosACompensar.reduce((acc, c) => acc + c.valor, 0),
        devolvidosGeral: devolvidosPendentes.reduce((acc, c) => acc + c.valor, 0) + devolvidosPagos.reduce((acc, c) => acc + c.valor, 0),
        devolvidosAqui: devolvidosAqui.reduce((acc, c) => acc + c.valor, 0),
        devolvidosNaoAqui: devolvidosNaoAqui.reduce((acc, c) => acc + c.valor, 0),
        devolvidosPagos: devolvidosPagos.reduce((acc, c) => acc + c.valor, 0),
        
        depJC: depJC.reduce((acc, c) => acc + c.valor, 0),
        depBIG: depBIG.reduce((acc, c) => acc + c.valor, 0),
        depOLIVER: depOLIVER.reduce((acc, c) => acc + c.valor, 0),
        repassadosBaixados: repassadosBaixados.reduce((acc, c) => acc + c.valor, 0),
        excluidos: excluidos.reduce((acc, c) => acc + c.valor, 0)
      }
    };
  }, [cheques, searchTerm, filters, mainTab, subTab]);

  const handleMainTabChange = (val) => {
      setMainTab(val);
      if (val === 'a_compensar') setSubTab('em_maos');
      else if (val === 'devolvidos') setSubTab('aqui'); 
      else if (val === 'compensados') setSubTab('jc');
      else if (val === 'excluidos') setSubTab('todos');
  };

  const handleEdit = (cheque) => { setSelectedCheque(cheque); setShowFormModal(true); };
  const handleView = (cheque) => { setSelectedCheque(cheque); setShowDetailsModal(true); };
  const handleNew = () => { setSelectedCheque(null); setShowFormModal(true); };
  const handleSelectAll = (checked) => { if (checked) setSelectedIds(dadosProcessados.listaFinal.map(c => c.id)); else setSelectedIds([]); };
  const handleSelectOne = (id) => { setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };

  // Função para restaurar cheque excluído
  const handleRestore = async (id) => {
      if(!confirm("Deseja restaurar este cheque para Em Mãos?")) return;
      await base44.entities.Cheque.update(id, { status: 'normal', observacao: 'Restaurado em ' + new Date().toLocaleDateString() });
      await refetch();
      toast.success("Cheque restaurado!");
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10 w-full">
      
      {/* 1. HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 w-full">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Wallet className="w-6 h-6 text-indigo-600" /> Gestão de Cheques
            </h1>
            <p className="text-slate-500 text-sm">Controle de custódia, repasses e devoluções</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* KPI Cards */}
            <div className="flex gap-3 overflow-x-auto pb-1 sm:pb-0">
                <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg min-w-[150px]">
                    <p className="text-[10px] uppercase font-bold text-blue-600 flex items-center gap-1"><Clock className="w-3 h-3"/> Em Mãos</p>
                    <p className="text-lg font-bold text-blue-900">{formatCurrency(dadosProcessados.totais.emMaos)}</p>
                </div>
                
                <div className="bg-purple-50 border border-purple-100 px-4 py-2 rounded-lg min-w-[150px]">
                    <p className="text-[10px] uppercase font-bold text-purple-600 flex items-center gap-1"><ArrowRightLeft className="w-3 h-3"/> Repassados (Passivo)</p>
                    <p className="text-lg font-bold text-purple-900">{formatCurrency(dadosProcessados.totais.repassadosFuturo)}</p>
                </div>

                <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-lg min-w-[150px]">
                    <p className="text-[10px] uppercase font-bold text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Total Devolvido</p>
                    <p className="text-lg font-bold text-red-900">{formatCurrency(dadosProcessados.totais.devolvidosGeral)}</p>
                </div>
            </div>

            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block" />

            <div className="flex gap-2">
                {/* BOTÃO ATUALIZAR / VERIFICAR DUPLICATAS (NOVO) */}
                <Button 
                    variant="outline" 
                    onClick={handleCheckDuplicates}
                    className="gap-2 bg-white border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300"
                >
                    <RefreshCw className="w-4 h-4" /> Verificar Duplicatas
                </Button>

                <Button variant="outline" className="gap-2" onClick={() => {}} disabled={selectedIds.length === 0}><MoreHorizontal className="w-4 h-4" /> Ações</Button>
                <Button onClick={handleNew} className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200"><Plus className="w-4 h-4" /> Novo</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 w-full">
        
        {/* 2. BARRA DE CONTROLE PRINCIPAL */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            
            <Tabs value={mainTab} onValueChange={handleMainTabChange} className="w-full lg:w-auto">
                <TabsList className="bg-slate-100 p-1 h-auto flex-wrap">
                    <TabsTrigger value="a_compensar" className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                        <Clock className="w-4 h-4" /> A Compensar
                    </TabsTrigger>
                    <TabsTrigger value="devolvidos" className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-sm">
                        <AlertCircle className="w-4 h-4" /> Devolvidos
                    </TabsTrigger>
                    <TabsTrigger value="compensados" className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                        <CheckCircle2 className="w-4 h-4" /> Compensados
                    </TabsTrigger>
                    <TabsTrigger value="excluidos" className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-500 data-[state=active]:shadow-sm">
                        <Trash2 className="w-4 h-4" /> Excluídos
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"/>
                </div>
                <Button variant={showFilters ? "secondary" : "outline"} size="icon" onClick={() => setShowFilters(!showFilters)} className={cn("shrink-0", showFilters && "bg-slate-200")}><Filter className="w-4 h-4" /></Button>
                <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setViewMode('table')} className={cn("h-8 w-8 rounded-md", viewMode === 'table' ? "bg-white shadow-sm" : "text-slate-500")}><List className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setViewMode('grid')} className={cn("h-8 w-8 rounded-md", viewMode === 'grid' ? "bg-white shadow-sm" : "text-slate-500")}><LayoutGrid className="w-4 h-4" /></Button>
                </div>
            </div>
        </div>

        {/* 3. PAINEL DE FILTROS */}
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

        {/* 4. SUB-ABAS (DINÂMICAS) */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 animate-in fade-in slide-in-from-left-2">
            
            {/* SUB-ABAS: A COMPENSAR */}
            {mainTab === 'a_compensar' && (
                <>
                    <Button variant={subTab === 'em_maos' ? 'default' : 'outline'} onClick={() => setSubTab('em_maos')} className={cn("rounded-full h-8 text-xs", subTab === 'em_maos' && "bg-blue-600 hover:bg-blue-700")}>
                        🏢 Em Carteira ({formatCurrency(dadosProcessados.totais.emMaos)})
                    </Button>
                    <Button variant={subTab === 'repassados' ? 'default' : 'outline'} onClick={() => setSubTab('repassados')} className={cn("rounded-full h-8 text-xs", subTab === 'repassados' && "bg-purple-600 hover:bg-purple-700")}>
                        🤝 Repassados (Passivo Futuro) ({formatCurrency(dadosProcessados.totais.repassadosFuturo)})
                    </Button>
                </>
            )}

            {/* SUB-ABAS: DEVOLVIDOS */}
            {mainTab === 'devolvidos' && (
                <>
                    <Button variant={subTab === 'aqui' ? 'default' : 'outline'} onClick={() => setSubTab('aqui')} className={cn("rounded-full h-8 text-xs", subTab === 'aqui' && "bg-red-600 hover:bg-red-700")}>
                        🏦 Na Empresa/Banco ({formatCurrency(dadosProcessados.totais.devolvidosAqui)})
                    </Button>
                    <Button variant={subTab === 'nao_aqui' ? 'default' : 'outline'} onClick={() => setSubTab('nao_aqui')} className={cn("rounded-full h-8 text-xs", subTab === 'nao_aqui' && "bg-orange-500 hover:bg-orange-600 text-white")}>
                        🤝 Com Terceiros ({formatCurrency(dadosProcessados.totais.devolvidosNaoAqui)})
                    </Button>
                    <Button variant={subTab === 'pagos' ? 'default' : 'outline'} onClick={() => setSubTab('pagos')} className={cn("rounded-full h-8 text-xs", subTab === 'pagos' && "bg-emerald-600 hover:bg-emerald-700")}>
                        ✅ Resolvidos / Pagos ({formatCurrency(dadosProcessados.totais.devolvidosPagos)})
                    </Button>
                </>
            )}

            {/* SUB-ABAS: COMPENSADOS (POR EMPRESA) */}
            {mainTab === 'compensados' && (
                <>
                    <Button variant={subTab === 'jc' ? 'default' : 'outline'} onClick={() => setSubTab('jc')} className={cn("rounded-full h-8 text-xs", subTab === 'jc' && "bg-emerald-600 hover:bg-emerald-700")}>
                        <Landmark className="w-3 h-3 mr-1"/> J&C Esquadrias ({formatCurrency(dadosProcessados.totais.depJC)})
                    </Button>
                    <Button variant={subTab === 'big' ? 'default' : 'outline'} onClick={() => setSubTab('big')} className={cn("rounded-full h-8 text-xs", subTab === 'big' && "bg-emerald-600 hover:bg-emerald-700")}>
                        <Landmark className="w-3 h-3 mr-1"/> Big Metais ({formatCurrency(dadosProcessados.totais.depBIG)})
                    </Button>
                    <Button variant={subTab === 'oliver' ? 'default' : 'outline'} onClick={() => setSubTab('oliver')} className={cn("rounded-full h-8 text-xs", subTab === 'oliver' && "bg-emerald-600 hover:bg-emerald-700")}>
                        <Landmark className="w-3 h-3 mr-1"/> Oliver Extrusora ({formatCurrency(dadosProcessados.totais.depOLIVER)})
                    </Button>
                    <Button variant={subTab === 'repassados' ? 'default' : 'outline'} onClick={() => setSubTab('repassados')} className={cn("rounded-full h-8 text-xs", subTab === 'repassados' && "bg-indigo-600 hover:bg-indigo-700")}>
                        Baixados por Repasse ({formatCurrency(dadosProcessados.totais.repassadosBaixados)})
                    </Button>
                </>
            )}
        </div>

        {/* 5. TABELA PRINCIPAL */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="w-[50px]"><Checkbox checked={selectedIds.length > 0} onCheckedChange={handleSelectAll} /></TableHead>
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
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-10 text-slate-500">Nenhum cheque encontrado nesta categoria.</TableCell>
                        </TableRow>
                    ) : (
                        dadosProcessados.listaFinal.map(cheque => {
                            const cliente = mapClientes[cheque.cliente_codigo];
                            const isVencido = cheque.status === 'normal' && cheque.data_vencimento && isPast(parseISO(cheque.data_vencimento));
                            
                            return (
                                <TableRow key={cheque.id} className="group hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => handleView(cheque)}>
                                    <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedIds.includes(cheque.id)} onCheckedChange={() => handleSelectOne(cheque.id)} /></TableCell>
                                    <TableCell>
                                        <div className="font-mono font-bold text-slate-700">#{cheque.numero_cheque}</div>
                                        <div className="text-xs text-slate-500 uppercase">{cheque.banco}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-slate-800">{cheque.cliente_nome}</div>
                                        {cliente?.representante_nome && (
                                            <div className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mt-0.5">
                                                <User className="w-3 h-3" /> {cliente.representante_nome.split(' ')[0]}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className={cn("text-sm", isVencido ? "text-red-600 font-bold" : "text-slate-600")}>
                                            {cheque.data_vencimento ? format(parseISO(cheque.data_vencimento), 'dd/MM/yyyy') : '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-slate-700">{formatCurrency(cheque.valor)}</TableCell>
                                    <TableCell className="text-center">
                                        {cheque.status === 'compensado' ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                                {cheque.destino_deposito ? cheque.destino_deposito.split(' ')[0] : 'Compensado'}
                                            </Badge>
                                        ) : cheque.status === 'pago' ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                                <Banknote className="w-3 h-3 mr-1"/> Resolvido (Pago)
                                            </Badge>
                                        ) : cheque.status === 'devolvido' ? (
                                            cheque.fornecedor_repassado_nome ? (
                                                <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100 flex w-fit mx-auto gap-1">
                                                    <MapPin className="w-3 h-3"/> Com {cheque.fornecedor_repassado_nome.split(' ')[0]}
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 flex w-fit mx-auto gap-1">
                                                    <Building2 className="w-3 h-3"/> Na Empresa
                                                </Badge>
                                            )
                                        ) : cheque.status === 'excluido' ? (
                                            <Badge variant="outline" className="border-slate-300 text-slate-400">Excluído</Badge>
                                        ) : cheque.status === 'repassado' ? (
                                            <Badge className="bg-purple-100 text-purple-700 border-purple-200">Repassado</Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Em Carteira</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        {mainTab === 'excluidos' ? (
                                            <Button variant="ghost" size="icon" onClick={() => handleRestore(cheque.id)} title="Restaurar">
                                                <CornerUpLeft className="w-4 h-4 text-emerald-600 hover:text-emerald-700" />
                                            </Button>
                                        ) : (
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(cheque)}>
                                                <MoreHorizontal className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
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

      {/* MODAL DE DUPLICATAS (NOVO) */}
      <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle>Resolver Duplicatas</DialogTitle>
            <DialogDescription>
              Selecione o cheque correto para manter. Os outros serão arquivados.
            </DialogDescription>
          </DialogHeader>
          <ResolveDuplicatesModal 
            duplicateGroups={duplicateGroups} 
            onResolve={handleResolveDuplicates} 
            onCancel={() => setShowDuplicateModal(false)} 
            isProcessing={isProcessing}
          />
        </DialogContent>
      </Dialog>

    </div>
  );
}