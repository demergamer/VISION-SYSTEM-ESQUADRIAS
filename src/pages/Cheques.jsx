import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  LayoutGrid, List, Filter, Plus, Search, 
  AlertCircle, CheckCircle2, Clock,
  MoreHorizontal, Wallet, User, ArrowRightLeft, Landmark,
  RefreshCw, Trash2, AlertTriangle, Loader2, DollarSign, ChevronLeft, ChevronRight, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { format, isPast, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

// Componentes Internos
import ModalContainer from "@/components/modals/ModalContainer";
import ChequeForm from "@/components/cheques/ChequeForm";
import ChequeDetails from "@/components/cheques/ChequeDetails";
import PermissionGuard from "@/components/PermissionGuard";
import { usePermissions } from "@/components/hooks/usePermissions";

// Componentes Extraídos
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
  
  const [mainTab, setMainTab] = useState('normal'); 
  const [subTab, setSubTab] = useState('todos');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [filters, setFilters] = useState({ banco: 'todos' });
  const [selectedIds, setSelectedIds] = useState([]);

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showDevolucaoModal, setShowDevolucaoModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);

  const [selectedCheque, setSelectedCheque] = useState(null);
  const [chequeParaPagamento, setChequeParaPagamento] = useState(null);
  const [duplicateGroups, setDuplicateGroups] = useState({});

  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: cheques = [], refetch } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
  const { data: representantes = [] } = useQuery({ queryKey: ['representantes'], queryFn: () => base44.entities.Representante.list() });

  const mapClientes = useMemo(() => {
      const map = {};
      clientes.forEach(c => map[c.codigo] = c);
      return map;
  }, [clientes]);

  useEffect(() => {
      setCurrentPage(1);
      setSelectedIds([]);
  }, [mainTab, subTab, searchTerm, itemsPerPage]);

  const handleMainTabChange = (val) => {
      setMainTab(val);
      setSubTab('todos'); 
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Cheque.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cheques'] }); setShowFormModal(false); toast.success('Cadastrado!'); },
    onError: (error) => toast.error('Erro: ' + error.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cheque.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cheques'] }); setShowFormModal(false); setSelectedCheque(null); toast.success('Atualizado!'); },
    onError: (error) => toast.error('Erro: ' + error.message)
  });

  // INTELIGÊNCIA: AUTO-COMPENSAÇÃO VISUAL (REGRAS 1 E 3)
  const chequesTransformados = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    return cheques.map(c => {
        let isVencido = false;
        if (c.data_vencimento) {
            const [ano, mes, dia] = c.data_vencimento.split('T')[0].split('-');
            const vencObj = new Date(ano, mes - 1, dia);
            vencObj.setHours(0,0,0,0);
            isVencido = vencObj <= hoje;
        }

        let status_exibicao = c.status;
        let destino_exibicao = c.fornecedor_repassado_nome;

        // Regra 1: Cheque em carteira (normal) Vencido -> Vai para Compensado (Sem Informação)
        if (c.status === 'normal' && isVencido) {
            status_exibicao = 'compensado';
            destino_exibicao = 'Sem Informação';
        } 
        // Regra 3: Cheque Repassado Vencido -> MANTÉM REPASSADO, apenas a Flag (isVencido) muda!
        // Não jogamos mais pro status 'compensado'.

        return { ...c, status_exibicao, destino_exibicao, is_auto_compensado: status_exibicao !== c.status, isVencido };
    });
  }, [cheques]);

  const dadosProcessados = useMemo(() => {
    let listaGlobal = chequesTransformados;
    
    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      listaGlobal = listaGlobal.filter(c =>
        c.numero_cheque?.toLowerCase().includes(termo) ||
        c.emitente?.toLowerCase().includes(termo) ||
        c.cliente_nome?.toLowerCase().includes(termo) ||
        c.banco?.toLowerCase().includes(termo) ||
        c.valor?.toString().includes(termo)
      );
    }

    if (filters.banco !== 'todos') listaGlobal = listaGlobal.filter(c => c.banco === filters.banco);

    const totais = {
        emMaos: listaGlobal.filter(c => c.status_exibicao === 'normal').reduce((a,c)=>a+c.valor,0),
        devolvidosPendentes: listaGlobal.filter(c => c.status_exibicao === 'devolvido' && c.status_pagamento_devolucao !== 'pago').reduce((a,c)=>a+c.valor,0),
        
        // REPASSADOS AGORA SÃO DIVIDIDOS EM DOIS PONTOS
        repassadosAVencer: listaGlobal.filter(c => c.status_exibicao === 'repassado' && !c.isVencido).reduce((a,c)=>a+c.valor,0),
        repassadosCompensados: listaGlobal.filter(c => c.status_exibicao === 'repassado' && c.isVencido).reduce((a,c)=>a+c.valor,0),

        countNormal: listaGlobal.filter(c => c.status_exibicao === 'normal').length,
        countRepassado: listaGlobal.filter(c => c.status_exibicao === 'repassado').length,
        countDevolvido: listaGlobal.filter(c => c.status_exibicao === 'devolvido').length,
        countCompensado: listaGlobal.filter(c => c.status_exibicao === 'compensado').length,
        countExcluido: listaGlobal.filter(c => c.status_exibicao === 'excluido').length,

        devAqui: listaGlobal.filter(c => c.status_exibicao === 'devolvido' && !c.fornecedor_repassado_nome && c.status_pagamento_devolucao !== 'pago').reduce((a,c)=>a+c.valor,0),
        devNaoAqui: listaGlobal.filter(c => c.status_exibicao === 'devolvido' && !!c.fornecedor_repassado_nome && c.status_pagamento_devolucao !== 'pago').reduce((a,c)=>a+c.valor,0),
        devResolvidos: listaGlobal.filter(c => c.status_exibicao === 'devolvido' && c.status_pagamento_devolucao === 'pago').reduce((a,c)=>a+c.valor,0),

        compJC: listaGlobal.filter(c => c.status_exibicao === 'compensado' && c.destino_exibicao === 'J&C ESQUADRIAS').reduce((a,c)=>a+c.valor,0),
        compBIG: listaGlobal.filter(c => c.status_exibicao === 'compensado' && c.destino_exibicao === 'BIG METAIS').reduce((a,c)=>a+c.valor,0),
        compOliver: listaGlobal.filter(c => c.status_exibicao === 'compensado' && c.destino_exibicao === 'OLIVER EXTRUSORA').reduce((a,c)=>a+c.valor,0),
        compSemInfo: listaGlobal.filter(c => c.status_exibicao === 'compensado' && c.destino_exibicao === 'Sem Informação').reduce((a,c)=>a+c.valor,0),
    };

    let listaFinal = listaGlobal.filter(c => c.status_exibicao === mainTab);

    // FILTROS DE SUB-ABAS (FLAGS)
    if (mainTab === 'repassado') {
        if (subTab === 'a_vencer') listaFinal = listaFinal.filter(c => !c.isVencido);
        if (subTab === 'compensados') listaFinal = listaFinal.filter(c => c.isVencido);
    }
    else if (mainTab === 'devolvido') {
        if (subTab === 'aqui') listaFinal = listaFinal.filter(c => !c.fornecedor_repassado_nome && c.status_pagamento_devolucao !== 'pago');
        if (subTab === 'nao_aqui') listaFinal = listaFinal.filter(c => !!c.fornecedor_repassado_nome && c.status_pagamento_devolucao !== 'pago');
        if (subTab === 'resolvidos') listaFinal = listaFinal.filter(c => c.status_pagamento_devolucao === 'pago');
    } 
    else if (mainTab === 'compensado') {
        if (subTab === 'jc') listaFinal = listaFinal.filter(c => c.destino_exibicao === 'J&C ESQUADRIAS');
        if (subTab === 'big') listaFinal = listaFinal.filter(c => c.destino_exibicao === 'BIG METAIS');
        if (subTab === 'oliver') listaFinal = listaFinal.filter(c => c.destino_exibicao === 'OLIVER EXTRUSORA');
        if (subTab === 'sem_info') listaFinal = listaFinal.filter(c => c.destino_exibicao === 'Sem Informação');
    }

    return { listaFinal, totais };
  }, [chequesTransformados, searchTerm, filters, mainTab, subTab]);

  const totalPages = Math.ceil(dadosProcessados.listaFinal.length / itemsPerPage);
  const paginatedCheques = dadosProcessados.listaFinal.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleCheckDuplicates = () => {
    setIsCheckingDuplicates(true);
    setTimeout(() => {
        const groups = {};
        const chequesAtivos = cheques.filter(c => c.status === 'normal' || c.status === 'repassado');
        
        chequesAtivos.forEach(c => {
          const num = c.numero_cheque ? String(c.numero_cheque).trim() : '';
          const banco = c.banco ? String(c.banco).trim() : '';
          const venc = c.data_vencimento ? c.data_vencimento.split('T')[0] : '';
          const key = `${num}|${banco}|${venc}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(c);
        });
        
        const conflictGroups = {};
        let count = 0;
        Object.keys(groups).forEach(key => { if (groups[key].length > 1) { conflictGroups[key] = groups[key]; count++; } });

        setIsCheckingDuplicates(false);
        if (count > 0) { 
            setDuplicateGroups(conflictGroups); 
            setShowDuplicateModal(true); 
            toast.warning(`Encontradas ${count} duplicatas.`); 
        } else { 
            toast.success("Nenhuma duplicata encontrada."); 
        }
    }, 1500);
  };

  const handleResolveDuplicates = async (idsToExclude) => {
    setIsProcessing(true);
    try {
      await Promise.all(idsToExclude.map(id => base44.entities.Cheque.update(id, { status: 'excluido', observacao: '[AUTO] Duplicata' })));
      await refetch();
      setShowDuplicateModal(false);
      toast.success("Resolvido!");
    } catch (e) { toast.error("Erro ao resolver."); } finally { setIsProcessing(false); }
  };

  const handleSaveDevolucao = async (payload) => {
    setIsProcessing(true);
    try {
        const { cheques_ids, detalhes_devolucao, pagamento } = payload;
        
        const updatePromises = cheques_ids.map(id => {
            const detalhe = detalhes_devolucao[id];
            return base44.entities.Cheque.update(id, {
                status: 'devolvido',
                motivo_devolucao: detalhe?.motivo || 'outros',
                anexo_devolucao: detalhe?.file ? [detalhe.file] : [],
                data_devolucao: new Date().toISOString().split('T')[0],
                status_pagamento_devolucao: pagamento ? 'pago' : 'pendente'
            });
        });
        await Promise.all(updatePromises);

        if (pagamento && pagamento.metodo === 'cheque_troca' && pagamento.novosCheques && pagamento.novosCheques.length > 0) {
            const createChequePromises = pagamento.novosCheques.map(chequeData => {
                if(!chequeData.numero || !chequeData.valor) return null;
                return base44.entities.Cheque.create({
                    numero_cheque: chequeData.numero,
                    banco: chequeData.banco,
                    agencia: chequeData.agencia,
                    conta: chequeData.conta,
                    valor: parseFloat(chequeData.valor),
                    data_vencimento: chequeData.vencimento,
                    emitente: chequeData.emitente || 'Troca',
                    status: 'normal',
                    observacao: `Troca ref. devolução dos cheques: ${cheques_ids.join(', ')}`
                });
            });
            await Promise.all(createChequePromises.filter(Boolean));
        }

        await refetch();
        setShowDevolucaoModal(false);
        setSelectedIds([]);
        toast.success("Devolução registrada!");
    } catch (e) {
        toast.error("Erro ao registrar devolução: " + e.message);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleOpenPagamento = (e, cheque) => { e.stopPropagation(); setChequeParaPagamento(cheque); setShowPagamentoModal(true); };
  
  const handleSavePagamentoDevolvido = async (pagamento) => {
      setIsProcessing(true);
      try {
          await base44.entities.Cheque.update(chequeParaPagamento.id, {
              status_pagamento_devolucao: 'pago',
              data_pagamento: new Date().toISOString().split('T')[0],
              forma_pagamento: pagamento.metodo,
              valor_pago: parseFloat(pagamento.valor),
              anexo_devolucao: pagamento.comprovante ? [pagamento.comprovante] : [],
              observacao: (chequeParaPagamento.observacao || '') + `\n[${new Date().toLocaleDateString()}] Liq. por: ${pagamento.representante || 'Escritório'}`,
              cheque_substituto_numero: pagamento.novoCheque?.numero || null
          });

          if (pagamento.metodo === 'cheque_troca' && pagamento.novoCheque) {
              await base44.entities.Cheque.create({
                  numero_cheque: pagamento.novoCheque.numero,
                  banco: pagamento.novoCheque.banco,
                  agencia: pagamento.novoCheque.agencia,
                  conta: pagamento.novoCheque.conta,
                  valor: parseFloat(pagamento.novoCheque.valor),
                  data_vencimento: pagamento.novoCheque.vencimento,
                  emitente: pagamento.novoCheque.emitente || 'Troca',
                  status: 'normal',
                  cheque_substituido_numero: chequeParaPagamento.numero_cheque,
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

  const handleEdit = (cheque) => { setSelectedCheque(cheque); setShowFormModal(true); };
  const handleView = (cheque) => { setSelectedCheque(cheque); setShowDetailsModal(true); };
  const handleNew = () => { setSelectedCheque(null); setShowFormModal(true); };
  const handleSelectAll = (checked) => { if (checked) setSelectedIds(paginatedCheques.map(c => c.id)); else setSelectedIds([]); };
  const handleSelectOne = (id) => { setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };
  const handleRestore = async (id) => { if(window.confirm("Deseja restaurar?")) { await base44.entities.Cheque.update(id, {status:'normal'}); refetch(); } };

  return (
    <PermissionGuard setor="Cheques">
      <div className="min-h-screen bg-[#F8FAFC] pb-10 w-full">
        <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
          <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 w-full">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Wallet className="w-6 h-6 text-indigo-600" /> Gestão de Cheques</h1>
              <p className="text-slate-500 text-sm">Controle de recebíveis e custódia</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-3 overflow-x-auto pb-1 sm:pb-0">
                  <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg min-w-[150px]">
                      <p className="text-[10px] font-bold text-blue-600 flex items-center gap-1"><Clock className="w-3 h-3"/> Em Carteira</p>
                      <p className="text-lg font-bold text-blue-900">{formatCurrency(dadosProcessados.totais.emMaos)}</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 px-4 py-2 rounded-lg min-w-[150px]">
                      <p className="text-[10px] font-bold text-purple-600 flex items-center gap-1"><ArrowRightLeft className="w-3 h-3"/> Repassados (A Vencer)</p>
                      <p className="text-lg font-bold text-purple-900">{formatCurrency(dadosProcessados.totais.repassadosAVencer)}</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-lg min-w-[150px]">
                      <p className="text-[10px] font-bold text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Devolvidos Pendentes</p>
                      <p className="text-lg font-bold text-red-900">{formatCurrency(dadosProcessados.totais.devolvidosPendentes)}</p>
                  </div>
              </div>
              <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block" />
              <div className="flex flex-wrap gap-2">
                  {canDo('Cheques', 'editar') && (
                      <Button onClick={() => setShowDevolucaoModal(true)} className="gap-2 border-red-200 text-red-700 bg-white hover:bg-red-50 shadow-sm border transition-all hover:shadow-md">
                          <AlertTriangle className="w-4 h-4" /> Registrar Devolução
                      </Button>
                  )}
                  {canDo('Cheques', 'editar') && (
                      <Button variant="outline" onClick={handleCheckDuplicates} disabled={isCheckingDuplicates} className="gap-2 bg-white border-amber-200 text-amber-700 hover:bg-amber-50">
                          {isCheckingDuplicates ? <><Loader2 className="w-4 h-4 animate-spin" /> Varrendo...</> : <><RefreshCw className="w-4 h-4" /> Duplicatas</>}
                      </Button>
                  )}
                  {/* Botão de Excluídos movido para o topo */}
                  <Button 
                      variant="outline" 
                      onClick={() => handleMainTabChange('excluido')} 
                      className={cn("gap-2 border transition-all", mainTab === 'excluido' ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100")}
                  >
                      <Trash2 className="w-4 h-4" /> Excluídos
                  </Button>

                  {canDo('Cheques', 'adicionar') && (
                    <Button onClick={handleNew} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"><Plus className="w-4 h-4" /> Novo Cheque</Button>
                  )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6 w-full max-w-[1800px] mx-auto">
          
          {/* ABAS REORDENADAS */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <Tabs value={mainTab} onValueChange={handleMainTabChange} className="w-full lg:w-auto">
                  <TabsList className="bg-slate-100 p-1 h-auto flex-wrap">
                      <TabsTrigger value="normal" className="gap-2 px-4 py-2"><Clock className="w-4 h-4" /> Em Carteira <Badge className="ml-1 bg-blue-100 text-blue-700">{dadosProcessados.totais.countNormal}</Badge></TabsTrigger>
                      <TabsTrigger value="compensado" className="gap-2 px-4 py-2"><CheckCircle2 className="w-4 h-4" /> Compensados <Badge className="ml-1 bg-green-100 text-green-700">{dadosProcessados.totais.countCompensado}</Badge></TabsTrigger>
                      <TabsTrigger value="repassado" className="gap-2 px-4 py-2"><ArrowRightLeft className="w-4 h-4" /> Repassados <Badge className="ml-1 bg-purple-100 text-purple-700">{dadosProcessados.totais.countRepassado}</Badge></TabsTrigger>
                      <TabsTrigger value="devolvido" className="gap-2 px-4 py-2"><AlertCircle className="w-4 h-4" /> Devolvidos <Badge className="ml-1 bg-red-100 text-red-700">{dadosProcessados.totais.countDevolvido}</Badge></TabsTrigger>
                      <TabsTrigger value="excluido" className="hidden">Excluidos Oculto</TabsTrigger>
                  </TabsList>
              </Tabs>
              
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                  <div className="relative flex-1 lg:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9"/></div>
                  <Button variant={showFilters ? "secondary" : "outline"} size="icon" onClick={() => setShowFilters(!showFilters)}><Filter className="w-4 h-4" /></Button>
              </div>
          </div>

          <AnimatePresence>
              {showFilters && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <Card className="bg-slate-50 border-slate-200 mb-6">
                          <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Banco</label><Select value={filters.banco} onValueChange={v => setFilters({...filters, banco: v})}><SelectTrigger className="bg-white"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="BRADESCO">Bradesco</SelectItem><SelectItem value="ITAÚ">Itaú</SelectItem><SelectItem value="SANTANDER">Santander</SelectItem></SelectContent></Select></div>
                              <div className="flex items-end"><Button variant="ghost" onClick={() => setFilters({ banco: 'todos' })} className="w-full text-red-500 hover:text-red-700 hover:bg-red-50">Limpar Filtros</Button></div>
                          </div>
                      </Card>
                  </motion.div>
              )}
          </AnimatePresence>

          {/* SUB-ABAS (FLAGS) */}
          <div className="flex gap-2 overflow-x-auto pb-2 animate-in fade-in slide-in-from-left-2">
              {mainTab === 'repassado' && (
                  <>
                      <Button variant={subTab === 'todos' ? 'default' : 'outline'} onClick={() => setSubTab('todos')} className="rounded-full h-8 text-xs">Todos</Button>
                      <Button variant={subTab === 'a_vencer' ? 'default' : 'outline'} onClick={() => setSubTab('a_vencer')} className={cn("rounded-full h-8 text-xs", subTab === 'a_vencer' && "bg-purple-600 hover:bg-purple-700")}>
                          <Clock className="w-3 h-3 mr-1"/> A Vencer ({formatCurrency(dadosProcessados.totais.repassadosAVencer)})
                      </Button>
                      <Button variant={subTab === 'compensados' ? 'default' : 'outline'} onClick={() => setSubTab('compensados')} className={cn("rounded-full h-8 text-xs", subTab === 'compensados' && "bg-green-600 hover:bg-green-700")}>
                          <CheckCircle2 className="w-3 h-3 mr-1"/> Compensados ({formatCurrency(dadosProcessados.totais.repassadosCompensados)})
                      </Button>
                  </>
              )}
              {mainTab === 'devolvido' && (
                  <>
                      <Button variant={subTab === 'todos' ? 'default' : 'outline'} onClick={() => setSubTab('todos')} className="rounded-full h-8 text-xs">Todos</Button>
                      <Button variant={subTab === 'aqui' ? 'default' : 'outline'} onClick={() => setSubTab('aqui')} className={cn("rounded-full h-8 text-xs", subTab === 'aqui' && "bg-red-600 hover:bg-red-700")}>🏦 Na Empresa ({formatCurrency(dadosProcessados.totais.devAqui)})</Button>
                      <Button variant={subTab === 'nao_aqui' ? 'default' : 'outline'} onClick={() => setSubTab('nao_aqui')} className={cn("rounded-full h-8 text-xs", subTab === 'nao_aqui' && "bg-orange-500 hover:bg-orange-600 text-white")}>🤝 Com Terceiros ({formatCurrency(dadosProcessados.totais.devNaoAqui)})</Button>
                      <Button variant={subTab === 'resolvidos' ? 'default' : 'outline'} onClick={() => setSubTab('resolvidos')} className={cn("rounded-full h-8 text-xs", subTab === 'resolvidos' && "bg-emerald-600 hover:bg-emerald-700")}>✅ Resolvidos ({formatCurrency(dadosProcessados.totais.devResolvidos)})</Button>
                  </>
              )}
              {mainTab === 'compensado' && (
                  <>
                      <Button variant={subTab === 'todos' ? 'default' : 'outline'} onClick={() => setSubTab('todos')} className="rounded-full h-8 text-xs">Todos</Button>
                      <Button variant={subTab === 'jc' ? 'default' : 'outline'} onClick={() => setSubTab('jc')} className={cn("rounded-full h-8 text-xs", subTab === 'jc' && "bg-emerald-600 hover:bg-emerald-700")}><Landmark className="w-3 h-3 mr-1"/> J&C ({formatCurrency(dadosProcessados.totais.compJC)})</Button>
                      <Button variant={subTab === 'big' ? 'default' : 'outline'} onClick={() => setSubTab('big')} className={cn("rounded-full h-8 text-xs", subTab === 'big' && "bg-emerald-600 hover:bg-emerald-700")}><Landmark className="w-3 h-3 mr-1"/> Big Metais ({formatCurrency(dadosProcessados.totais.compBIG)})</Button>
                      <Button variant={subTab === 'oliver' ? 'default' : 'outline'} onClick={() => setSubTab('oliver')} className={cn("rounded-full h-8 text-xs", subTab === 'oliver' && "bg-emerald-600 hover:bg-emerald-700")}><Landmark className="w-3 h-3 mr-1"/> Oliver ({formatCurrency(dadosProcessados.totais.compOliver)})</Button>
                      <Button variant={subTab === 'sem_info' ? 'default' : 'outline'} onClick={() => setSubTab('sem_info')} className={cn("rounded-full h-8 text-xs", subTab === 'sem_info' && "bg-slate-600 hover:bg-slate-700 text-white")}><Info className="w-3 h-3 mr-1"/> Sem Informação ({formatCurrency(dadosProcessados.totais.compSemInfo)})</Button>
                  </>
              )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
              <Table>
                  <TableHeader className="bg-slate-50">
                      <TableRow>
                          <TableHead className="w-[50px]"><Checkbox checked={selectedIds.length > 0 && selectedIds.length === paginatedCheques.length} onCheckedChange={handleSelectAll} /></TableHead>
                          <TableHead>Cheque</TableHead>
                          <TableHead>Cliente / Representante</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-center">Status / Localização</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {paginatedCheques.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-500">Nenhum registro encontrado nesta aba/filtro.</TableCell></TableRow>
                      ) : (
                          paginatedCheques.map(cheque => {
                              const cliente = mapClientes[cheque.cliente_codigo];
                              return (
                                  <TableRow key={cheque.id} className="group hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => handleView(cheque)}>
                                      <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedIds.includes(cheque.id)} onCheckedChange={() => handleSelectOne(cheque.id)} /></TableCell>
                                      <TableCell><div className="font-mono font-bold text-slate-700">#{cheque.numero_cheque}</div><div className="text-xs text-slate-500 uppercase">{cheque.banco}</div></TableCell>
                                      <TableCell><div className="font-medium text-slate-800">{cheque.cliente_nome}</div>{cliente?.representante_nome && <div className="text-[10px] text-blue-600 flex gap-1"><User className="w-3 h-3"/>{cliente.representante_nome.split(' ')[0]}</div>}</TableCell>
                                      <TableCell><div className={cn("text-sm", (cheque.status_exibicao==='normal' && cheque.isVencido) ? "text-red-600 font-bold" : "text-slate-600")}>{cheque.data_vencimento ? format(parseISO(cheque.data_vencimento), 'dd/MM/yyyy') : '-'}</div></TableCell>
                                      <TableCell className="text-right font-bold text-slate-700">{formatCurrency(cheque.valor)}</TableCell>
                                      <TableCell className="text-center">
                                          {cheque.status_exibicao === 'compensado' ? (
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                                    {cheque.destino_exibicao ? cheque.destino_exibicao.split(' ')[0] : 'Compensado'}
                                                </Badge>
                                                {cheque.is_auto_compensado && <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> Automático</span>}
                                            </div>
                                          ) :
                                           (cheque.status_exibicao === 'devolvido' && cheque.status_pagamento_devolucao === 'pago') ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Resolvido</Badge> :
                                           cheque.status_exibicao === 'devolvido' ? <Badge className="bg-red-100 text-red-700 border-red-200">Devolvido Pendente</Badge> :
                                           cheque.status_exibicao === 'excluido' ? <Badge variant="outline" className="border-slate-300 text-slate-400">Excluído</Badge> :
                                           cheque.status_exibicao === 'repassado' ? (
                                             <div className="flex flex-col items-center justify-center gap-1">
                                                <Badge className="bg-purple-100 text-purple-700 border-purple-200">Repassado</Badge>
                                                {cheque.isVencido && <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Compensado</span>}
                                             </div>
                                           ) :
                                           <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Em Carteira</Badge>}
                                      </TableCell>
                                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                          <div className="flex justify-end gap-1">
                                              {cheque.status_exibicao === 'devolvido' && cheque.status_pagamento_devolucao !== 'pago' && canDo('Cheques', 'editar') && (
                                                  <Button variant="ghost" size="icon" onClick={(e) => handleOpenPagamento(e, cheque)} title="Liquidar Devolução Pendente" className="hover:bg-emerald-50 text-emerald-600"><DollarSign className="w-4 h-4" /></Button>
                                              )}
                                              {mainTab === 'excluido' ? (
                                                  <Button variant="ghost" size="icon" onClick={() => handleRestore(cheque.id)} title="Restaurar Cheque"><RefreshCw className="w-4 h-4 text-emerald-600"/></Button>
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
              
              {/* PAGINAÇÃO */}
              <div className="bg-slate-50 border-t border-slate-200 p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>Exibir:</span>
                      <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="h-8 rounded-md border-slate-300 px-2 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500">
                          <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option>
                      </select>
                      <span>por pág. (Total: {dadosProcessados.listaFinal.length})</span>
                  </div>
                  
                  {totalPages > 1 && (
                      <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4 mr-1" /> Anterior</Button>
                          <span className="text-sm font-bold px-3 text-slate-600">Pág. {currentPage} de {totalPages}</span>
                          <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Próxima <ChevronRight className="w-4 h-4 ml-1" /></Button>
                      </div>
                  )}
              </div>
          </div>
        </div>
        
        {/* Cadastro e Edição */}
        <ModalContainer 
          open={showFormModal} 
          onClose={() => setShowFormModal(false)} 
          title={selectedCheque ? "Editar Cheque" : "Novo Cheque"} 
          size="xl"
        >
          <ChequeForm 
            cheque={selectedCheque} 
            clientes={clientes} 
            onSave={(data) => selectedCheque ? updateMutation.mutate({id: selectedCheque.id, data}) : createMutation.mutate(data)} 
            onCancel={() => setShowFormModal(false)} 
            isLoading={createMutation.isPending || updateMutation.isPending} 
          />
        </ModalContainer>

        {/* Registro de Devolução */}
        <RegistrarDevolucaoModal 
            isOpen={showDevolucaoModal} 
            onClose={() => setShowDevolucaoModal(false)}
            todosCheques={cheques}
            preSelectedIds={selectedIds}
            onSave={handleSaveDevolucao}
        />

        {/* Pagamento de Devolução */}
        <ChequePagamentoModal 
            isOpen={showPagamentoModal}
            onClose={() => setShowPagamentoModal(false)}
            cheque={chequeParaPagamento}
            onSave={handleSavePagamentoDevolvido}
            isProcessing={isProcessing}
            representantes={representantes}
        />

        {/* Resolução de Duplicatas */}
        <ModalContainer 
            open={showDuplicateModal} 
            onClose={() => setShowDuplicateModal(false)} 
            title="Resolver Duplicatas" 
            size="2xl"
        >
            <ResolveDuplicatesModal 
                duplicateGroups={duplicateGroups} 
                onResolve={handleResolveDuplicates} 
                onCancel={() => setShowDuplicateModal(false)} 
                isProcessing={isProcessing} 
            />
        </ModalContainer>

      </div>
    </PermissionGuard>
  );
}
