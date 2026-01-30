import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart, Plus, Search, RefreshCw, DollarSign, AlertTriangle,
  FileText, ArrowLeft, Filter, Upload, Truck, Clock, CheckCircle, XCircle,
  MoreHorizontal, LayoutGrid, List, MapPin, Calendar, Edit, Eye, RotateCcw,
  SlidersHorizontal, X as XIcon, Loader2, Factory, Split
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Componentes Internos
import ModalContainer from "@/components/modals/ModalContainer";
import PedidoForm from "@/components/pedidos/PedidoForm";
import PedidoDetails from "@/components/pedidos/PedidoDetails";
import PedidoTable from "@/components/pedidos/PedidoTable";
import LiquidacaoForm from "@/components/pedidos/LiquidacaoForm";
import ImportarPedidos from "@/components/pedidos/ImportarPedidos";
import RotasList from "@/components/pedidos/RotasList";
import RotaChecklist from "@/components/pedidos/RotaChecklist";
import AlterarPortadorModal from "@/components/pedidos/AlterarPortadorModal";
import ClienteForm from "@/components/clientes/ClienteForm";
import CancelarPedidoModal from "@/components/pedidos/CancelarPedidoModal";
import LiquidacaoMassa from "@/components/pedidos/LiquidacaoMassa";
import RotaCobrancaModal from "@/components/pedidos/RotaCobrancaModal";
import BorderoDetails from "@/components/pedidos/BorderoDetails";
import AprovarLiquidacaoModal from "@/components/pedidos/AprovarLiquidacaoModal";
import DividirRotaModal from "@/components/pedidos/DividirRotaModal";
import PermissionGuard from "@/components/PermissionGuard";
import { usePermissions } from "@/components/UserNotRegisteredError";

// --- PAINEL DE FILTROS ---
const FilterPanel = ({ filters, setFilters, onClear, isOpen }) => {
  if (!isOpen) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm animate-in slide-in-from-top-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" /> Filtros Avançados
        </h3>
        <Button variant="ghost" size="sm" onClick={onClear} className="text-xs text-red-500 h-8 hover:bg-red-50 hover:text-red-600">
          Limpar Filtros
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-slate-500">Data Inicial</Label>
          <Input type="date" className="h-9 bg-slate-50" value={filters.dateStart} onChange={(e) => setFilters({...filters, dateStart: e.target.value})} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-slate-500">Data Final</Label>
          <Input type="date" className="h-9 bg-slate-50" value={filters.dateEnd} onChange={(e) => setFilters({...filters, dateEnd: e.target.value})} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-slate-500">Região</Label>
          <Input placeholder="Ex: Zona Norte" className="h-9 bg-slate-50" value={filters.region} onChange={(e) => setFilters({...filters, region: e.target.value})} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-slate-500">Valor Mínimo</Label>
          <div className="relative">
             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
             <Input type="number" className="h-9 bg-slate-50 pl-7" value={filters.minValue} onChange={(e) => setFilters({...filters, minValue: e.target.value})} />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- WIDGETS ---
const StatWidget = ({ title, value, icon: Icon, color }) => {
  const colorStyles = { blue: "bg-blue-50 text-blue-600", red: "bg-red-50 text-red-600", yellow: "bg-amber-50 text-amber-600", purple: "bg-purple-50 text-purple-600", emerald: "bg-emerald-50 text-emerald-600", slate: "bg-slate-100 text-slate-600" };
  return (<div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between hover:shadow-md transition-all duration-300"><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p><h3 className="text-2xl font-bold text-slate-800">{value}</h3></div><div className={`p-3 rounded-xl ${colorStyles[color] || colorStyles.slate}`}><Icon size={20} /></div></div>);
};

// Componente: Card de Pedido em Grade (Explorer)
const PedidoGridCard = ({ pedido, onEdit, onView, onLiquidar, onCancelar, onReverter, canDo }) => {
  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  const getStatusBadge = (status, dataEntrega) => {
    const now = new Date();
    const dataRef = dataEntrega ? new Date(dataEntrega) : new Date();
    const diasAtraso = differenceInDays(now, dataRef);
    switch (status) {
      case 'aguardando': return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Em Trânsito</Badge>;
      case 'pago': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Liquidado</Badge>;
      case 'cancelado': return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Cancelado</Badge>;
      case 'parcial': return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Parcial</Badge>;
      default:
        if (diasAtraso > 20) return <Badge className="bg-red-100 text-red-700 border-red-200">Atrasado ({diasAtraso}d)</Badge>;
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Aberto</Badge>;
    }
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all flex flex-col gap-3 group relative h-full">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 pr-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">#{pedido.numero_pedido}</span>
          <h3 className="font-bold text-slate-800 truncate" title={pedido.cliente_nome}>{pedido.cliente_nome}</h3>
          <p className="text-xs text-slate-500 font-mono truncate">{pedido.cliente_codigo}</p>
        </div>
        <div className="shrink-0">{getStatusBadge(pedido.status, pedido.data_entrega)}</div>
      </div>
      <div className="space-y-1 py-2 border-t border-slate-100 border-b">
        <div className="flex items-center gap-2 text-sm text-slate-600"><Calendar className="w-3.5 h-3.5 text-slate-400" /><span>{pedido.data_entrega ? format(new Date(pedido.data_entrega), 'dd/MM/yyyy') : '-'}</span></div>
        <div className="flex items-center gap-2 text-sm text-slate-600"><MapPin className="w-3.5 h-3.5 text-slate-400" /><span className="truncate">{pedido.cliente_regiao || 'Sem região'}</span></div>
      </div>
      <div className="flex justify-between items-end mt-auto">
        <div><p className="text-xs text-slate-400">Saldo</p><p className={cn("text-lg font-bold", (pedido.saldo_restante || 0) > 0 ? "text-amber-600" : "text-emerald-600")}>{formatCurrency(pedido.saldo_restante !== undefined ? pedido.saldo_restante : (pedido.valor_pedido - (pedido.total_pago || 0)))}</p></div>
        <div className="text-right"><p className="text-xs text-slate-400">Total</p><p className="text-sm font-medium text-slate-600">{formatCurrency(pedido.valor_pedido)}</p></div>
      </div>
      <div className="flex gap-1 justify-end pt-2 border-t border-slate-50">
         {canDo('Pedidos', 'visualizar') && (<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100" onClick={() => onView(pedido)} title="Ver Detalhes"><Eye className="w-4 h-4 text-slate-500" /></Button>)}
         {pedido.status === 'pago' && onReverter && canDo('Pedidos', 'liquidar') && (<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-amber-50" onClick={() => onReverter(pedido)} title="Reverter"><RotateCcw className="w-4 h-4 text-amber-600" /></Button>)}
         {pedido.status !== 'pago' && pedido.status !== 'cancelado' && (<>{canDo('Pedidos', 'editar') && (<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-blue-50" onClick={() => onEdit(pedido)} title="Editar"><Edit className="w-4 h-4 text-blue-600" /></Button>)}{canDo('Pedidos', 'liquidar') && (<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-emerald-50" onClick={() => onLiquidar(pedido)} title="Liquidar"><DollarSign className="w-4 h-4 text-emerald-600" /></Button>)}{canDo('Pedidos', 'editar') && (<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50" onClick={() => onCancelar(pedido)} title="Cancelar"><XCircle className="w-4 h-4 text-red-600" /></Button>)}</>)}
      </div>
    </div>
  );
};

export default function Pedidos() {
  const queryClient = useQueryClient();
  const { canDo } = usePermissions();
  
  // --- STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('abertos');
  const [viewMode, setViewMode] = useState('table'); 
  const [liquidacaoView, setLiquidacaoView] = useState('bordero'); 
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ dateStart: '', dateEnd: '', region: '', minValue: '' });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshingData, setRefreshingData] = useState(false);

  // --- MODAIS ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showLiquidarModal, setShowLiquidarModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRotaModal, setShowRotaModal] = useState(false);
  const [showAlterarPortadorModal, setShowAlterarPortadorModal] = useState(false);
  const [showCadastrarClienteModal, setShowCadastrarClienteModal] = useState(false);
  const [showCancelarPedidoModal, setShowCancelarPedidoModal] = useState(false);
  const [showLiquidacaoMassaModal, setShowLiquidacaoMassaModal] = useState(false);
  const [showRotaCobrancaModal, setShowRotaCobrancaModal] = useState(false);
  const [showAutorizacaoModal, setShowAutorizacaoModal] = useState(false);
  const [showDividirRotaModal, setShowDividirRotaModal] = useState(false);
  const [showReverterDialog, setShowReverterDialog] = useState(false);

  // --- SELEÇÕES ---
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [selectedAutorizacao, setSelectedAutorizacao] = useState(null);
  const [selectedRota, setSelectedRota] = useState(null);
  const [pedidoParaCadastro, setPedidoParaCadastro] = useState(null);
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState(null);
  const [pedidoParaReverter, setPedidoParaReverter] = useState(null);

  // --- QUERIES ---
  const { data: pedidos = [], isLoading: loadingPedidos, refetch: refetchPedidos } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
  const { data: rotas = [], isLoading: loadingRotas, refetch: refetchRotas } = useQuery({ queryKey: ['rotas'], queryFn: () => base44.entities.RotaImportada.list('-created_date') });
  const { data: representantes = [] } = useQuery({ queryKey: ['representantes'], queryFn: () => base44.entities.Representante.list() });
  const { data: cheques = [] } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });
  const { data: borderos = [], isLoading: loadingBorderos, refetch: refetchBorderos } = useQuery({ queryKey: ['borderos'], queryFn: () => base44.entities.Bordero.list('-created_date') });
  const { data: liquidacoesPendentes = [], isLoading: loadingAutorizacoes, refetch: refetchAutorizacoes } = useQuery({ queryKey: ['liquidacoesPendentes'], queryFn: () => base44.entities.LiquidacaoPendente.list('-created_date') });

  // --- STATS ---
  const stats = useMemo(() => {
    // LÓGICA CORRIGIDA PARA "EM TRÂNSITO": Tem rota E não foi entregue fisicamente
    const transito = pedidos.filter(p => p.rota_importada_id && !p.confirmado_entrega && p.status !== 'cancelado').length;
    const abertos = pedidos.filter(p => p.status === 'aberto' || p.status === 'parcial').length;
    const totalAReceber = pedidos
        .filter(p => p.status === 'aberto' || p.status === 'parcial')
        .reduce((sum, p) => sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0);
    const autorizacoes = liquidacoesPendentes.filter(lp => lp.status === 'pendente').length;
    return { 
        transito, 
        abertos, 
        autorizacoes, 
        rotas: rotas.length,
        totalAReceber
    };
  }, [pedidos, liquidacoesPendentes, rotas]);

  // --- MUTAÇÕES ---
  const createMutation = useMutation({ mutationFn: (data) => base44.entities.Pedido.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pedidos'] }); setShowAddModal(false); toast.success('Pedido cadastrado!'); } });
  const updateMutation = useMutation({ 
    mutationFn: ({ id, data }) => base44.entities.Pedido.update(id, data), 
    onSuccess: async () => { 
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pedidos'] }),
        queryClient.invalidateQueries({ queryKey: ['creditos'] }),
        queryClient.invalidateQueries({ queryKey: ['borderos'] })
      ]);
      setShowEditModal(false); 
      setShowLiquidarModal(false); 
      setSelectedPedido(null); 
      toast.success('Pedido atualizado!');
    } 
  });

  // --- FILTROS DE DADOS ---
  const filteredPedidos = useMemo(() => {
    let filtered = pedidos;
    // Filtro por Aba
    switch (activeTab) {
      case 'transito': 
        // REGRA DE OURO: Está em rota E não tem baixa de entrega (independente de estar pago)
        filtered = filtered.filter(p => p.rota_importada_id && !p.confirmado_entrega && p.status !== 'cancelado'); 
        break;
      case 'abertos': 
        // REGRA: Deve dinheiro
        filtered = filtered.filter(p => p.status === 'aberto' || p.status === 'parcial'); 
        break;
      case 'liquidacoes': 
        // REGRA: Está pago
        filtered = filtered.filter(p => p.status === 'pago'); 
        break;
      case 'cancelados': 
        filtered = filtered.filter(p => p.status === 'cancelado'); 
        break;
      default: break; 
    }

    if (searchTerm) {
      filtered = filtered.filter(pedido =>
        pedido.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.cliente_codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.numero_pedido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.bordero_numero?.toString().includes(searchTerm)
      );
    }
    
    if (showFilters) {
        if (filters.dateStart) { const start = parseISO(filters.dateStart); filtered = filtered.filter(p => p.data_entrega && new Date(p.data_entrega) >= start); }
        if (filters.dateEnd) { const end = parseISO(filters.dateEnd); end.setHours(23, 59, 59, 999); filtered = filtered.filter(p => p.data_entrega && new Date(p.data_entrega) <= end); }
        if (filters.region) { filtered = filtered.filter(p => p.cliente_regiao?.toLowerCase().includes(filters.region.toLowerCase())); }
        if (filters.minValue) { filtered = filtered.filter(p => (p.valor_pedido || 0) >= parseFloat(filters.minValue)); }
    }
    return filtered;
  }, [pedidos, activeTab, searchTerm, showFilters, filters]);

  const filteredBorderos = useMemo(() => {
    let filtered = borderos;
    if (searchTerm) {
      filtered = filtered.filter(b =>
        b.numero_bordero?.toString().includes(searchTerm) ||
        b.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.liquidado_por?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [borderos, searchTerm]);

  // --- HANDLERS ---
  const handleEdit = (pedido) => { setSelectedPedido(pedido); setShowEditModal(true); };
  const handleView = (pedido) => { 
      if (pedido.isBordero) {
          setSelectedPedido(pedido);
          setShowDetailsModal(true);
      } else {
          setSelectedPedido(pedido); 
          pedido.status === 'pago' ? setShowDetailsModal(true) : setShowEditModal(true);
      }
  };
  const handleLiquidar = (pedido) => { setSelectedPedido(pedido); setShowLiquidarModal(true); };
  const handleCancelar = (pedido) => { setPedidoParaCancelar(pedido); setShowCancelarPedidoModal(true); };
  
  const handleRefresh = async () => {
    setRefreshingData(true);
    try {
        await Promise.all([refetchPedidos(), refetchRotas(), refetchBorderos(), refetchAutorizacoes()]);
        toast.success('Dados atualizados!');
    } finally {
        setRefreshingData(false);
    }
  };

  const handleSelectRota = (rota) => { setSelectedRota(rota); setShowRotaModal(true); };
  const handleAlterarPortador = (rota) => { setSelectedRota(rota); setShowAlterarPortadorModal(true); };
  const handleDividirRota = (rota) => { setSelectedRota(rota); setShowDividirRotaModal(true); };

  const handleSaveDivisaoRota = async (novaRotaInfo, idsSelecionados) => {
    setIsProcessing(true);
    try {
        const pedidosMover = pedidos.filter(p => idsSelecionados.includes(p.id));
        const valorMover = pedidosMover.reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
        
        const novaRotaData = {
            codigo_rota: novaRotaInfo.codigo_rota,
            motorista_nome: novaRotaInfo.motorista_nome,
            motorista_codigo: novaRotaInfo.motorista_codigo,
            data_importacao: selectedRota.data_importacao,
            total_pedidos: idsSelecionados.length,
            pedidos_confirmados: 0,
            valor_total: valorMover,
            status: 'pendente'
        };
        const novaRota = await base44.entities.RotaImportada.create(novaRotaData);

        for (const id of idsSelecionados) {
            await base44.entities.Pedido.update(id, { 
                rota_importada_id: novaRota.id,
                rota_entrega: novaRotaInfo.codigo_rota 
            });
        }

        await base44.entities.RotaImportada.update(selectedRota.id, {
            total_pedidos: selectedRota.total_pedidos - idsSelecionados.length,
            valor_total: (selectedRota.valor_total || 0) - valorMover
        });

        await Promise.all([refetchRotas(), refetchPedidos()]);
        setShowDividirRotaModal(false);
        toast.success(`Rota dividida! Nova rota ${novaRotaInfo.codigo_rota} criada.`);
    } catch (e) {
        toast.error("Erro ao dividir rota.");
        console.error(e);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleSaveRotaChecklist = async (data) => {
      try {
          await base44.entities.RotaImportada.update(data.rota.id, data.rota);
          // Atualiza status e confirmado_entrega (logística)
          const promises = data.pedidos.map(p => base44.entities.Pedido.update(p.id, { 
              confirmado_entrega: p.confirmado_entrega,
              // Se foi confirmado, status deve ir pra 'aberto' (se não pago) ou manter 'pago'. 
              // Se não confirmado, volta pra 'aguardando'.
              // A lógica de RotaChecklist.jsx já manda o status correto.
              status: p.status 
          }));
          await Promise.all(promises);
          await Promise.all([refetchRotas(), refetchPedidos()]);
          setShowRotaModal(false);
          toast.success("Rota atualizada!");
      } catch (e) { toast.error("Erro ao salvar rota."); }
  };

  const handleLiquidacaoMassa = async () => {
      await Promise.all([refetchPedidos(), refetchBorderos()]);
      setShowLiquidacaoMassaModal(false);
      setActiveTab('liquidacoes');
      setLiquidacaoView('bordero');
  };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  return (
    <PermissionGuard setor="Pedidos">
      {isProcessing && <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center"><Loader2 className="w-12 h-12 text-blue-600 animate-spin" /></div>}

      <div className="min-h-screen bg-[#F5F7FA] pb-10 font-sans text-slate-900">
        <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}><Button variant="ghost" size="icon" className="rounded-xl hover:bg-white"><ArrowLeft className="w-5 h-5 text-slate-500" /></Button></Link>
              <div><h1 className="text-3xl font-bold tracking-tight text-slate-900">Gerenciamento de Pedidos</h1><p className="text-slate-500 mt-1">Controle de entregas, faturamento e rotas</p></div>
            </div>
            <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleRefresh} disabled={refreshingData} className="bg-white border-slate-200"><RefreshCw className={cn("w-4 h-4 mr-2", refreshingData && "animate-spin")} /> Atualizar</Button>
                {canDo('Pedidos', 'adicionar') && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="outline" className="bg-white"><MoreHorizontal className="w-4 h-4 mr-2" /> Ferramentas</Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setShowImportModal(true)}><Upload className="w-4 h-4 mr-2" /> Importar Planilha</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowLiquidacaoMassaModal(true)}><DollarSign className="w-4 h-4 mr-2" /> Liquidação em Massa</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowRotaCobrancaModal(true)}><FileText className="w-4 h-4 mr-2" /> Rota de Cobrança</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                {canDo('Pedidos', 'adicionar') && <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-2" /> Novo Pedido</Button>}
            </div>
          </div>

          {/* Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatWidget title="Total a Receber" value={formatCurrency(stats.totalAReceber)} icon={DollarSign} color="blue" />
            <StatWidget title="Em Trânsito" value={stats.transito} icon={Truck} color="yellow" />
            <StatWidget title="Abertos" value={stats.abertos} icon={FileText} color="purple" />
            <StatWidget title="Rotas Ativas" value={stats.rotas} icon={Truck} color="slate" />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <TabsList className="bg-slate-100 p-1 rounded-full border border-slate-200 h-auto flex-wrap justify-start">
                    <TabsTrigger value="producao" className="rounded-full gap-2 px-4"><Factory className="w-4 h-4 text-slate-500"/> Em Produção</TabsTrigger>
                    <TabsTrigger value="transito" className="rounded-full gap-2 px-4"><Truck className="w-4 h-4 text-amber-500"/> Em Trânsito <span className="bg-amber-100 text-amber-700 px-2 rounded-full text-[10px]">{stats.transito}</span></TabsTrigger>
                    <TabsTrigger value="abertos" className="rounded-full gap-2 px-4"><FileText className="w-4 h-4 text-blue-500"/> Abertos <span className="bg-blue-100 text-blue-700 px-2 rounded-full text-[10px]">{stats.abertos}</span></TabsTrigger>
                    <TabsTrigger value="autorizacoes" className="rounded-full gap-2 px-4"><Clock className="w-4 h-4 text-orange-500"/> Autorizações {stats.autorizacoes > 0 && <span className="bg-orange-100 text-orange-700 px-2 rounded-full text-[10px]">{stats.autorizacoes}</span>}</TabsTrigger>
                    <TabsTrigger value="liquidacoes" className="rounded-full gap-2 px-4"><CheckCircle className="w-4 h-4 text-emerald-500"/> Liquidações</TabsTrigger>
                    <TabsTrigger value="cancelados" className="rounded-full gap-2 px-4"><XIcon className="w-4 h-4 text-slate-400"/> Cancelados</TabsTrigger>
                    <div className="w-px h-6 bg-slate-300 mx-1 hidden sm:block" />
                    <TabsTrigger value="rotas" className="rounded-full gap-2 px-4"><Truck className="w-4 h-4 text-purple-500"/> Rotas</TabsTrigger>
                </TabsList>

                {/* Toolbar */}
                {activeTab !== 'rotas' && activeTab !== 'producao' && (
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={cn("h-10 px-3 rounded-xl", showFilters ? "bg-blue-50 border-blue-300" : "")}>
                            <Filter className="w-4 h-4 mr-2"/> Filtros
                        </Button>
                        
                        {/* SELETORES DE VIEW MODE */}
                        <div className="bg-white border border-slate-200 rounded-xl p-1 flex">
                            <Button variant="ghost" size="sm" className={cn("h-8 px-2 rounded-lg transition-all", viewMode === 'table' ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600")} onClick={() => setViewMode('table')} title="Lista"><List className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" className={cn("h-8 px-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600")} onClick={() => setViewMode('grid')} title="Grade"><LayoutGrid className="w-4 h-4" /></Button>
                        </div>

                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input placeholder="Buscar pedido..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white" />
                        </div>
                    </div>
                )}
            </div>

            <FilterPanel isOpen={showFilters} filters={filters} setFilters={setFilters} onClear={() => setFilters({})} />

            {/* --- CONTEÚDO DAS ABAS --- */}

            <TabsContent value="producao">
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <Factory className="w-16 h-16 mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-slate-600">Módulo em Desenvolvimento</h3>
                    <p>O controle de produção estará disponível em breve.</p>
                </div>
            </TabsContent>

            <TabsContent value="rotas">
                <RotasList 
                    rotas={rotas} 
                    onSelectRota={handleSelectRota} 
                    onAlterarPortador={handleAlterarPortador}
                    onDividirRota={handleDividirRota} 
                    isLoading={loadingRotas} 
                />
            </TabsContent>

            <TabsContent value="transito">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredPedidos.length > 0 ? filteredPedidos.map(p => (
                        <div key={p.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between mb-2">
                                <span className="font-bold text-amber-800">#{p.numero_pedido}</span>
                                <span className="text-sm bg-white px-2 rounded border border-amber-100">{format(new Date(p.data_entrega), 'dd/MM/yyyy')}</span>
                            </div>
                            <p className="font-bold text-slate-800 mb-4 truncate">{p.cliente_nome}</p>
                            <p className="text-xl font-bold text-emerald-600 mb-4">{formatCurrency(p.valor_pedido)}</p>
                            <div className="grid grid-cols-2 gap-2">
                                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => handleLiquidar(p)}>Liquidar</Button>
                                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleCancelar(p)}>Cancelar</Button>
                            </div>
                        </div>
                    )) : <p className="col-span-full text-center py-10 text-slate-500">Nenhum pedido em trânsito.</p>}
                </div>
            </TabsContent>

            <TabsContent value="autorizacoes">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {liquidacoesPendentes.filter(lp => lp.status === 'pendente').map(aut => (
                        <Card key={aut.id} className="p-5 border-orange-200 bg-orange-50/30 cursor-pointer hover:shadow-md transition-all" onClick={() => { setSelectedAutorizacao(aut); setShowAutorizacaoModal(true); }}>
                            <div className="flex justify-between items-start mb-2">
                                <Badge className="bg-orange-100 text-orange-700">Solicitação #{aut.numero_solicitacao}</Badge>
                                <span className="text-xs text-slate-500">{format(new Date(aut.created_date), 'dd/MM HH:mm')}</span>
                            </div>
                            <p className="font-bold text-slate-800 mb-1">{aut.cliente_nome}</p>
                            <p className="text-sm text-slate-600 mb-3">{aut.pedidos_ids?.length || 0} pedidos</p>
                            <div className="flex justify-between items-end">
                                <div className="text-xs text-slate-500">Proposto:</div>
                                <div className="font-bold text-lg text-emerald-600">{formatCurrency(aut.valor_final_proposto)}</div>
                            </div>
                        </Card>
                    ))}
                    {liquidacoesPendentes.filter(lp => lp.status === 'pendente').length === 0 && <p className="col-span-full text-center py-10 text-slate-500">Nenhuma autorização pendente.</p>}
                </div>
            </TabsContent>

            <TabsContent value="liquidacoes">
                <div className="flex gap-2 mb-4">
                    <Button 
                        variant={liquidacaoView === 'bordero' ? 'default' : 'outline'} 
                        onClick={() => setLiquidacaoView('bordero')}
                        className={liquidacaoView === 'bordero' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                    >
                        <FileText className="w-4 h-4 mr-2"/> Por Borderô
                    </Button>
                    <Button 
                        variant={liquidacaoView === 'pedidos' ? 'default' : 'outline'} 
                        onClick={() => setLiquidacaoView('pedidos')}
                        className={liquidacaoView === 'pedidos' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                    >
                        <ShoppingCart className="w-4 h-4 mr-2"/> Por Pedidos
                    </Button>
                </div>

                {liquidacaoView === 'bordero' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredBorderos.length > 0 ? filteredBorderos.map(bordero => (
                            <Card key={bordero.id} className="p-5 hover:shadow-md transition-all cursor-pointer border-slate-200" onClick={() => { setSelectedPedido({...bordero, isBordero: true}); setShowDetailsModal(true); }}>
                                <div className="flex justify-between mb-2">
                                    <span className="font-bold text-slate-700">Borderô #{bordero.numero_bordero}</span>
                                    <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">Liquidado</Badge>
                                </div>
                                <p className="text-sm text-slate-600 mb-1">{bordero.cliente_nome || "Vários Clientes"}</p>
                                <p className="text-xs text-slate-400 mb-3">{format(new Date(bordero.created_date), 'dd/MM/yyyy HH:mm')}</p>
                                <div className="flex justify-between items-end border-t pt-3">
                                    <span className="text-xs text-slate-500">{bordero.pedidos_ids?.length || 0} pedidos</span>
                                    <span className="font-bold text-emerald-600 text-lg">{formatCurrency(bordero.valor_total)}</span>
                                </div>
                            </Card>
                        )) : <p className="col-span-full text-center py-10 text-slate-500">Nenhum borderô encontrado.</p>}
                    </div>
                ) : (
                    <PedidoTable 
                        pedidos={filteredPedidos} 
                        onEdit={handleEdit} 
                        onView={handleView} 
                        onLiquidar={handleLiquidar} 
                        onCancelar={handleCancelar} 
                        onReverter={(p) => { setPedidoParaReverter(p); setShowReverterDialog(true); }}
                        isLoading={loadingPedidos}
                        showBorderoRef={true}
                    />
                )}
            </TabsContent>

            {/* ABERTOS & CANCELADOS */}
            {['abertos', 'cancelados'].map(tab => (
                <TabsContent key={tab} value={tab}>
                    {viewMode === 'table' ? (
                        <PedidoTable 
                            pedidos={filteredPedidos} 
                            onEdit={handleEdit} 
                            onView={handleView} 
                            onLiquidar={handleLiquidar} 
                            onCancelar={handleCancelar} 
                            onReverter={null}
                            isLoading={loadingPedidos}
                        />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredPedidos.map(pedido => (
                                <PedidoGridCard 
                                    key={pedido.id} 
                                    pedido={pedido} 
                                    onEdit={handleEdit} 
                                    onView={handleView} 
                                    onLiquidar={handleLiquidar} 
                                    onCancelar={handleCancelar} 
                                    canDo={canDo} 
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            ))}

          </Tabs>

          {/* MODAIS */}
          <ModalContainer open={showImportModal} onClose={() => setShowImportModal(false)} title="Importar Pedidos" size="lg">
            <ImportarPedidos 
                clientes={clientes} 
                rotas={rotas} 
                pedidosExistentes={pedidos} 
                onImportComplete={() => { queryClient.invalidateQueries({queryKey:['pedidos']}); setShowImportModal(false); toast.success('Importado!'); }} 
                onCancel={() => setShowImportModal(false)} 
            />
          </ModalContainer>

          <ModalContainer open={showDividirRotaModal} onClose={() => setShowDividirRotaModal(false)} title="Dividir Rota" description="Mova pedidos selecionados para uma nova rota" size="lg">
            {selectedRota && <DividirRotaModal rotaOriginal={selectedRota} pedidos={pedidos.filter(p => p.rota_importada_id === selectedRota.id)} onSave={handleSaveDivisaoRota} onCancel={() => setShowDividirRotaModal(false)} isLoading={isProcessing} />}
          </ModalContainer>

          <ModalContainer open={showRotaModal} onClose={() => setShowRotaModal(false)} title="Checklist da Rota" size="lg">
             {selectedRota && <RotaChecklist rota={selectedRota} pedidos={pedidos.filter(p => p.rota_importada_id === selectedRota.id)} onSave={handleSaveRotaChecklist} onCancel={() => setShowRotaModal(false)} />}
          </ModalContainer>

          <ModalContainer open={showLiquidacaoMassaModal} onClose={() => setShowLiquidacaoMassaModal(false)} title="Liquidação em Massa" size="xl">
             <LiquidacaoMassa pedidos={pedidos} onSave={handleLiquidacaoMassa} onCancel={() => setShowLiquidacaoMassaModal(false)} />
          </ModalContainer>

          <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Novo Pedido" size="lg"><PedidoForm clientes={clientes} onSave={(data) => createMutation.mutate(data)} onCancel={() => setShowAddModal(false)} isLoading={createMutation.isPending} /></ModalContainer>
          <ModalContainer open={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Pedido" size="lg"><PedidoForm pedido={selectedPedido} clientes={clientes} onSave={(data) => updateMutation.mutate({ id: selectedPedido.id, data })} onCancel={() => setShowEditModal(false)} isLoading={updateMutation.isPending} /></ModalContainer>
          <ModalContainer open={showLiquidarModal} onClose={() => setShowLiquidarModal(false)} title="Liquidar"><LiquidacaoForm pedido={selectedPedido} onSave={(data) => updateMutation.mutate({ id: selectedPedido.id, data })} onCancel={() => setShowLiquidarModal(false)} /></ModalContainer>
          <ModalContainer open={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Detalhes" size="xl">
             {selectedPedido?.isBordero ? <BorderoDetails bordero={selectedPedido} pedidos={pedidos} onClose={() => setShowDetailsModal(false)}/> : <PedidoDetails pedido={selectedPedido} onClose={() => setShowDetailsModal(false)} />}
          </ModalContainer>
          <ModalContainer open={showAutorizacaoModal} onClose={() => setShowAutorizacaoModal(false)} title="Aprovar Liquidação" size="xl"><AprovarLiquidacaoModal autorizacao={selectedAutorizacao} todosPedidos={pedidos} onAprovar={() => {}} onRejeitar={() => {}} onCancel={() => setShowAutorizacaoModal(false)} /></ModalContainer>
          <ModalContainer open={showAlterarPortadorModal} onClose={() => setShowAlterarPortadorModal(false)} title="Alterar Portador" size="lg">
             {selectedRota && <AlterarPortadorModal rota={selectedRota} pedidos={pedidos.filter(p => p.rota_importada_id === selectedRota.id)} onSave={() => {setShowAlterarPortadorModal(false); toast.success("Portador alterado");}} onCancel={() => setShowAlterarPortadorModal(false)} />}
          </ModalContainer>

        </div>
      </div>
    </PermissionGuard>
  );
}