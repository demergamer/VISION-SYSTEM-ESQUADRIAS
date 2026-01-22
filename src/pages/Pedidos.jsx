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
  MoreHorizontal, ChevronDown, Package, UserPlus,
  LayoutGrid, List, MapPin, Calendar, Edit, Eye, RotateCcw,
  SlidersHorizontal, X as XIcon, Loader2 // Adicionado icone Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format, differenceInDays, isWithinInterval, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

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
import PermissionGuard from "@/components/PermissionGuard";
import { usePermissions } from "@/components/UserNotRegisteredError";

// --- PAINEL DE FILTROS AVANÇADOS ---
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

// ... (Componentes PedidoGridCard, PedidoAguardandoCard e StatWidget mantidos - omitidos para brevidade pois não mudaram)
const PedidoGridCard = ({ pedido, onEdit, onView, onLiquidar, onCancelar, onReverter, canDo }) => {
  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  const getStatusBadge = (status, dataEntrega) => {
    const now = new Date();
    const dataRef = dataEntrega ? new Date(dataEntrega) : new Date();
    const diasAtraso = differenceInDays(now, dataRef);
    switch (status) {
      case 'aguardando': return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Aguardando</Badge>;
      case 'pago': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Pago</Badge>;
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

const PedidoAguardandoCard = ({ pedido, onConfirmar, onCancelar, onCadastrarCliente }) => {
  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  const formatDate = (dateString) => { try { return format(new Date(dateString), 'dd/MM/yyyy'); } catch (e) { return dateString; } };
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400" />
      <div className="flex justify-between items-start pl-2"><div><span className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-0.5">Nº Pedido</span><h3 className="text-2xl font-extrabold text-slate-800">#{pedido.numero_pedido}</h3></div><div className="text-right bg-white/60 px-3 py-1 rounded-lg border border-amber-100"><span className="text-[10px] font-bold text-slate-400 uppercase block">Entrega</span><span className="text-sm font-semibold text-slate-700">{formatDate(pedido.data_entrega)}</span></div></div>
      <div className="bg-white/80 rounded-xl p-4 border border-amber-100 flex flex-col gap-3"><div><span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cliente / Código</span>{pedido.cliente_pendente ? (<div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100"><AlertTriangle size={18} /> <span className="font-bold text-sm">Cliente Não Cadastrado</span></div>) : (<div className="flex flex-col"><span className="font-bold text-slate-800 text-base line-clamp-1" title={pedido.cliente_nome}>{pedido.cliente_nome || "Nome não informado"}</span><span className="text-xs text-slate-500 font-mono mt-0.5">Cód: {pedido.cliente_codigo || "-"}</span></div>)}</div><div className="flex items-end justify-between border-t border-slate-100 pt-3 mt-1"><span className="text-xs font-medium text-slate-500">Valor Total</span><span className="text-xl font-bold text-emerald-600">{formatCurrency(pedido.valor_pedido)}</span></div></div>
      <div className="grid grid-cols-2 gap-3 mt-auto pt-2">{pedido.cliente_pendente ? (<Button onClick={() => onCadastrarCliente(pedido)} className="col-span-2 bg-amber-500 hover:bg-amber-600 text-white h-11 font-semibold text-base shadow-sm shadow-amber-200"><UserPlus className="w-5 h-5 mr-2" /> Cadastrar</Button>) : (<Button onClick={() => onConfirmar(pedido)} className="col-span-1 bg-emerald-500 hover:bg-emerald-600 text-white h-11 font-semibold text-base shadow-sm shadow-emerald-200"><CheckCircle className="w-5 h-5 mr-2" /> Confirmar</Button>)}<Button variant="outline" onClick={() => onCancelar(pedido)} className={`h-11 font-semibold text-base border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 ${pedido.cliente_pendente ? 'col-span-2' : 'col-span-1'}`}><XCircle className="w-5 h-5 mr-2" /> Cancelar</Button></div>
    </div>
  );
};

const StatWidget = ({ title, value, icon: Icon, color }) => {
  const colorStyles = { blue: "bg-blue-50 text-blue-600", red: "bg-red-50 text-red-600", yellow: "bg-amber-50 text-amber-600", purple: "bg-purple-50 text-purple-600", emerald: "bg-emerald-50 text-emerald-600", slate: "bg-slate-100 text-slate-600" };
  return (<div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between hover:shadow-md transition-all duration-300"><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p><h3 className="text-2xl font-bold text-slate-800">{value}</h3></div><div className={`p-3 rounded-xl ${colorStyles[color] || colorStyles.slate}`}><Icon size={20} /></div></div>);
};

export default function Pedidos() {
  const queryClient = useQueryClient();
  const { canDo } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('abertos');
  const [viewMode, setViewMode] = useState('table');
  const [liquidacaoView, setLiquidacaoView] = useState('bordero'); // 'bordero' ou 'pedidos' 
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ dateStart: '', dateEnd: '', region: '', minValue: '' });
  
  // NOVO: Estado de Processamento para Loading
  const [isProcessing, setIsProcessing] = useState(false);

  // Modais
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showLiquidarModal, setShowLiquidarModal] = useState(false);
  const [showCancelarDialog, setShowCancelarDialog] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRotaModal, setShowRotaModal] = useState(false);
  const [showAlterarPortadorModal, setShowAlterarPortadorModal] = useState(false);
  const [showCadastrarClienteModal, setShowCadastrarClienteModal] = useState(false);
  const [showCancelarPedidoModal, setShowCancelarPedidoModal] = useState(false);
  const [showLiquidacaoMassaModal, setShowLiquidacaoMassaModal] = useState(false);
  const [showRotaCobrancaModal, setShowRotaCobrancaModal] = useState(false);
  const [showAutorizacaoModal, setShowAutorizacaoModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [selectedAutorizacao, setSelectedAutorizacao] = useState(null);
  const [selectedRota, setSelectedRota] = useState(null);
  const [pedidoParaCadastro, setPedidoParaCadastro] = useState(null);
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState(null);
  const [showReverterDialog, setShowReverterDialog] = useState(false);
  const [pedidoParaReverter, setPedidoParaReverter] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const clienteCodigo = urlParams.get('cliente');
    if (clienteCodigo) setSearchTerm(clienteCodigo);
  }, []);

  const { data: pedidos = [], isLoading: loadingPedidos, refetch: refetchPedidos } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
  const { data: rotas = [], isLoading: loadingRotas, refetch: refetchRotas } = useQuery({ queryKey: ['rotas'], queryFn: () => base44.entities.RotaImportada.list('-created_date') });
  const { data: representantes = [] } = useQuery({ queryKey: ['representantes'], queryFn: () => base44.entities.Representante.list() });
  const { data: cheques = [] } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });
  const { data: borderos = [], isLoading: loadingBorderos, refetch: refetchBorderos } = useQuery({ queryKey: ['borderos'], queryFn: () => base44.entities.Bordero.list('-created_date') });
  const { data: liquidacoesPendentes = [], isLoading: loadingAutorizacoes, refetch: refetchAutorizacoes } = useQuery({ queryKey: ['liquidacoesPendentes'], queryFn: () => base44.entities.LiquidacaoPendente.list('-created_date') });

  const stats = useMemo(() => {
    const now = new Date();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    const aguardando = pedidos.filter(p => p.status === 'aguardando');
    const abertos = pedidos.filter(p => p.status === 'aberto' || p.status === 'parcial');
    const pagos = pedidos.filter(p => p.status === 'pago');
    const cancelados = pedidos.filter(p => p.status === 'cancelado');
    const atrasados = abertos.filter(p => new Date(p.data_entrega) < twentyDaysAgo);
    const totalAReceber = abertos.reduce((sum, p) => sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0);
    const totalAtrasado = atrasados.reduce((sum, p) => sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0);
    const autorizacoesPendentes = liquidacoesPendentes.filter(lp => lp.status === 'pendente').length;
    return { aguardando: aguardando.length, abertos: abertos.length, pagos: pagos.length, liquidacoes: borderos.length, autorizacoes: autorizacoesPendentes, cancelados: cancelados.length, atrasados: atrasados.length, totalAReceber, totalAtrasado };
  }, [pedidos, borderos, liquidacoesPendentes]);

  const createMutation = useMutation({ mutationFn: (data) => base44.entities.Pedido.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pedidos'] }); setShowAddModal(false); toast.success('Pedido cadastrado!'); } });
  const updateMutation = useMutation({ 
    mutationFn: ({ id, data }) => base44.entities.Pedido.update(id, data), 
    onSuccess: async () => { 
      await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      await queryClient.invalidateQueries({ queryKey: ['creditos'] });
      await queryClient.invalidateQueries({ queryKey: ['borderos'] });
      setShowEditModal(false); 
      setShowLiquidarModal(false); 
      setSelectedPedido(null); 
      toast.success('Pedido atualizado!');
    } 
  });

  const filteredPedidos = useMemo(() => {
    let filtered = pedidos;
    switch (activeTab) {
      case 'aguardando': filtered = filtered.filter(p => p.status === 'aguardando'); break;
      case 'abertos': filtered = filtered.filter(p => p.status === 'aberto' || p.status === 'parcial'); break;
      case 'liquidacoes': filtered = filtered.filter(p => p.status === 'pago'); break;
      case 'cancelados': filtered = filtered.filter(p => p.status === 'cancelado'); break;
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
        b.cliente_codigo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [borderos, searchTerm]);

  const pedidosDaRota = useMemo(() => {
    if (!selectedRota) return [];
    return pedidos.filter(p => p.rota_importada_id === selectedRota.id);
  }, [pedidos, selectedRota]);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  // --- FUNÇÕES DE CONTROLE (HANDLERS) ---
  const handleEdit = (pedido) => { setSelectedPedido(pedido); setShowEditModal(true); };
  const handleView = (pedido) => { setSelectedPedido(pedido); pedido.status === 'pago' ? setShowDetailsModal(true) : setShowEditModal(true); };
  const handleLiquidar = (pedido) => { setSelectedPedido(pedido); setShowLiquidarModal(true); };
  const handleCancelar = (pedido) => { setPedidoParaCancelar(pedido); setShowCancelarPedidoModal(true); };
  const handleRefresh = () => { refetchPedidos(); refetchRotas(); refetchBorderos(); refetchAutorizacoes(); toast.success('Atualizado!'); };
  const handleImportComplete = () => { queryClient.invalidateQueries({ queryKey: ['pedidos'] }); queryClient.invalidateQueries({ queryKey: ['rotas'] }); setShowImportModal(false); toast.success('Importação concluída!'); };
  const handleSelectRota = async (rota) => { setSelectedRota(rota); setShowRotaModal(true); try { const pedidosDaRotaAtual = pedidos.filter(p => p.rota_importada_id === rota.id); const pedidosPendentes = pedidosDaRotaAtual.filter(p => p.cliente_pendente); if (pedidosPendentes.length > 0) { let atualizados = 0; for (const pedido of pedidosPendentes) { const nomeClientePedido = pedido.cliente_nome?.toLowerCase().trim() || ''; const clienteEncontrado = clientes.find(c => { const nomeCliente = c.nome?.toLowerCase().trim() || ''; return nomeCliente === nomeClientePedido || nomeCliente.includes(nomeClientePedido) || nomeClientePedido.includes(nomeCliente); }); if (clienteEncontrado) { await base44.entities.Pedido.update(pedido.id, { cliente_codigo: clienteEncontrado.codigo, cliente_regiao: clienteEncontrado.regiao, representante_codigo: clienteEncontrado.representante_codigo, representante_nome: clienteEncontrado.representante_nome, porcentagem_comissao: clienteEncontrado.porcentagem_comissao, cliente_pendente: false }); atualizados++; } } if (atualizados > 0) { await queryClient.invalidateQueries({ queryKey: ['pedidos'] }); toast.success(`${atualizados} pedido(s) vinculado(s) automaticamente!`); } } } catch (error) { console.error('Erro na verificação silenciosa de pedidos:', error); } };
  const handleSaveRotaChecklist = async (data) => { try { await base44.entities.RotaImportada.update(data.rota.id, data.rota); const promises = data.pedidos.map(pedido => base44.entities.Pedido.update(pedido.id, { confirmado_entrega: pedido.confirmado_entrega, status: pedido.status })); await Promise.all(promises); await queryClient.invalidateQueries({ queryKey: ['pedidos'] }); await queryClient.invalidateQueries({ queryKey: ['rotas'] }); setShowRotaModal(false); toast.success('Rota e pedidos atualizados!'); } catch (error) { toast.error("Erro ao salvar rota."); } };
  const handleAlterarPortador = (rota) => { setSelectedRota(rota); setShowAlterarPortadorModal(true); };
  const handleSaveAlterarPortador = async (motorista) => { setShowAlterarPortadorModal(false); toast.success('Portador alterado!'); };
  const handleCadastrarCliente = (pedido) => { setPedidoParaCadastro(pedido); setShowCadastrarClienteModal(true); };
  const handleSaveNovoCliente = async (clienteData) => { try { const novoCliente = await base44.entities.Cliente.create(clienteData); const nomeNovoCliente = clienteData.nome?.toLowerCase().trim() || ''; const pedidosComMesmoCliente = pedidos.filter(p => { const nomePedido = p.cliente_nome?.toLowerCase().trim() || ''; return nomePedido === nomeNovoCliente || nomePedido.includes(nomeNovoCliente) || nomeNovoCliente.includes(nomePedido); }); for (const pedido of pedidosComMesmoCliente) { const updateData = { cliente_codigo: novoCliente.codigo, cliente_regiao: novoCliente.regiao, representante_codigo: novoCliente.representante_codigo, representante_nome: novoCliente.representante_nome, porcentagem_comissao: novoCliente.porcentagem_comissao, cliente_pendente: false }; if (pedidoParaCadastro && pedido.id === pedidoParaCadastro.id) { updateData.confirmado_entrega = true; updateData.status = 'aberto'; } await base44.entities.Pedido.update(pedido.id, updateData); } await queryClient.invalidateQueries({ queryKey: ['clientes'] }); await queryClient.invalidateQueries({ queryKey: ['pedidos'] }); setShowCadastrarClienteModal(false); setPedidoParaCadastro(null); toast.success(`Cliente cadastrado! ${pedidosComMesmoCliente.length} pedido(s) vinculados.`); } catch (error) { toast.error('Erro ao cadastrar cliente'); } };
  const handleCancelarPedidoRota = (pedido) => { setPedidoParaCancelar(pedido); setShowCancelarPedidoModal(true); };
  const handleSaveCancelarPedido = async (data) => { try { await base44.entities.Pedido.update(pedidoParaCancelar.id, data); await queryClient.invalidateQueries({ queryKey: ['pedidos'] }); setShowCancelarPedidoModal(false); toast.success('Pedido cancelado!'); } catch(e) { toast.error('Erro ao cancelar'); } };
  const handleConfirmarAguardando = async (pedido) => { try { await base44.entities.Pedido.update(pedido.id, { confirmado_entrega: true, status: 'aberto' }); await queryClient.invalidateQueries({ queryKey: ['pedidos'] }); toast.success('Pedido confirmado!'); } catch (error) { toast.error('Erro ao confirmar'); } };
  const handleReverterLiquidacao = async () => { if (!pedidoParaReverter) return; try { await base44.entities.Pedido.update(pedidoParaReverter.id, { status: 'aberto', saldo_restante: pedidoParaReverter.valor_pedido, total_pago: 0, data_pagamento: null, mes_pagamento: null, desconto_dado: 0, outras_informacoes: pedidoParaReverter.outras_informacoes + `\n[${new Date().toLocaleDateString()}] Liquidação Revertida.` }); await queryClient.invalidateQueries({ queryKey: ['pedidos'] }); setShowReverterDialog(false); setPedidoParaReverter(null); toast.success('Revertido!'); } catch (e) { toast.error('Erro ao reverter'); } };

  const handleLiquidacaoMassa = async (data) => {
    setIsProcessing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      await queryClient.invalidateQueries({ queryKey: ['cheques'] });
      await queryClient.invalidateQueries({ queryKey: ['creditos'] });
      await queryClient.invalidateQueries({ queryKey: ['borderos'] });
      setShowLiquidacaoMassaModal(false);
      toast.success('Liquidação concluída com sucesso!');
      setActiveTab('liquidacoes');
      setLiquidacaoView('bordero');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao processar liquidação');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PermissionGuard setor="Pedidos">
      {/* OVERLAY DE LOADING */}
      {isProcessing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm transition-all animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-slate-100">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-800">Processando Liquidação</h3>
                    <p className="text-sm text-slate-500">Aguarde enquanto atualizamos os pedidos...</p>
                </div>
            </div>
        </div>
      )}

      <div className="min-h-screen bg-[#F5F7FA] pb-10 font-sans text-slate-900">
        <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white hover:shadow-sm">
                  <ArrowLeft className="w-5 h-5 text-slate-500" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gerenciamento de Pedidos</h1>
                <p className="text-slate-500 mt-1">Controle de entregas, faturamento e rotas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleRefresh} className="bg-white border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 gap-2 rounded-xl h-10">
                <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Atualizar</span>
              </Button>
              {canDo('Pedidos', 'adicionar') && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="bg-white border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 gap-2 rounded-xl h-10">
                        <MoreHorizontal className="w-4 h-4" /> <span className="hidden sm:inline">Ferramentas</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl">
                      <DropdownMenuLabel>Ações em Massa</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowImportModal(true)} className="gap-2 cursor-pointer"><Upload className="w-4 h-4" /> Importar Planilha</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowLiquidacaoMassaModal(true)} className="gap-2 cursor-pointer"><DollarSign className="w-4 h-4" /> Liquidação em Massa</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowRotaCobrancaModal(true)} className="gap-2 cursor-pointer"><FileText className="w-4 h-4" /> Rota de Cobrança</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2 rounded-xl h-10 px-6">
                    <Plus className="w-4 h-4" /> Novo Pedido
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatWidget title="Total a Receber" value={formatCurrency(stats.totalAReceber)} icon={DollarSign} color="blue" />
            <StatWidget title="Em Atraso" value={formatCurrency(stats.totalAtrasado)} icon={AlertTriangle} color="red" />
            <StatWidget title="Aguardando Conf." value={stats.aguardando} icon={Package} color="yellow" />
            <StatWidget title="Pedidos Abertos" value={stats.abertos} icon={FileText} color="purple" />
          </div>

          {/* Abas e Controles */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <TabsList className="bg-slate-100 p-1 rounded-full border border-slate-200 h-auto flex-wrap justify-start">
                <TabsTrigger value="aguardando" className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all gap-2"><Package className="w-4 h-4 text-amber-500" /> Aguardando <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] ml-1">{stats.aguardando}</span></TabsTrigger>
                <TabsTrigger value="abertos" className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all gap-2"><FileText className="w-4 h-4 text-blue-500" /> Abertos <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] ml-1">{stats.abertos}</span></TabsTrigger>
                <TabsTrigger value="autorizacoes" className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all gap-2"><Clock className="w-4 h-4 text-orange-500" /> Autorizações {stats.autorizacoes > 0 && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] ml-1">{stats.autorizacoes}</span>}</TabsTrigger>
                <TabsTrigger value="liquidacoes" className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Liquidações <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] ml-1">{stats.liquidacoes}</span></TabsTrigger>
                <TabsTrigger value="cancelados" className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all gap-2"><XCircle className="w-4 h-4 text-slate-400" /> Cancelados</TabsTrigger>
                <div className="w-px h-6 bg-slate-300 mx-1 hidden sm:block" />
                <TabsTrigger value="rotas" className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all gap-2"><Truck className="w-4 h-4 text-purple-500" /> Rotas <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] ml-1">{rotas.length}</span></TabsTrigger>
              </TabsList>
              {activeTab !== 'rotas' && (
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" size="sm" className={cn("h-10 px-3 rounded-xl border-slate-200 gap-2", showFilters ? "bg-blue-50 text-blue-600 border-blue-200" : "text-slate-500")} onClick={() => setShowFilters(!showFilters)}><Filter className="w-4 h-4" /> <span className="hidden sm:inline">Filtros</span>{(filters.dateStart || filters.region || filters.minValue) && <Badge variant="secondary" className="bg-blue-200 text-blue-800 text-[10px] px-1 h-4 min-w-4 flex justify-center items-center rounded-full ml-1">!</Badge>}</Button>
                    <div className="bg-white border border-slate-200 rounded-xl p-1 flex"><Button variant="ghost" size="sm" className={cn("h-8 px-2 rounded-lg transition-all", viewMode === 'table' ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600")} onClick={() => setViewMode('table')} title="Visualizar em Lista"><List className="w-4 h-4" /></Button><Button variant="ghost" size="sm" className={cn("h-8 px-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600")} onClick={() => setViewMode('grid')} title="Visualizar em Blocos"><LayoutGrid className="w-4 h-4" /></Button></div>
                    <div className="relative flex-1 md:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Buscar pedido, cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" /></div>
                </div>
              )}
            </div>

            <FilterPanel isOpen={showFilters} filters={filters} setFilters={setFilters} onClear={() => setFilters({ dateStart: '', dateEnd: '', region: '', minValue: '' })} />

            <TabsContent value="rotas" className="mt-0 focus-visible:outline-none">
              <Card className="p-0 border-none shadow-none bg-transparent">
                <RotasList rotas={rotas} onSelectRota={handleSelectRota} onAlterarPortador={handleAlterarPortador} isLoading={loadingRotas} />
              </Card>
            </TabsContent>

            <TabsContent value="aguardando" className="mt-0 focus-visible:outline-none">
              {filteredPedidos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredPedidos.map((pedido) => (
                    <PedidoAguardandoCard key={pedido.id} pedido={pedido} onConfirmar={handleConfirmarAguardando} onCancelar={handleCancelar} onCadastrarCliente={handleCadastrarCliente} />
                  ))}
                </div>
              ) : (
                <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed border-2 border-slate-200 bg-slate-50/50"><div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100"><Package className="w-8 h-8 text-slate-300" /></div><h3 className="text-lg font-medium text-slate-900">Tudo limpo!</h3><p className="text-slate-500 max-w-sm mt-1">Nenhum pedido aguardando confirmação no momento.</p></Card>
              )}
            </TabsContent>

            <TabsContent value="autorizacoes" className="mt-0 focus-visible:outline-none">
              {loadingAutorizacoes ? (
                <p className="text-center text-slate-500 py-10">Carregando autorizações...</p>
              ) : liquidacoesPendentes.filter(lp => lp.status === 'pendente').length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liquidacoesPendentes.filter(lp => lp.status === 'pendente').map(autorizacao => (
                    <Card key={autorizacao.id} className="border border-orange-100 hover:shadow-lg transition-all p-5 bg-gradient-to-br from-white to-orange-50">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Solicitação</span>
                          <h3 className="text-2xl font-bold text-slate-800">#{autorizacao.numero_solicitacao}</h3>
                        </div>
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                          {autorizacao.solicitante_tipo === 'cliente' ? 'Cliente' : 'Representante'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 mb-4 pb-4 border-b border-orange-100">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Data:</span>
                          <span className="font-medium text-slate-800">{format(new Date(autorizacao.created_date), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Cliente:</span>
                          <span className="font-medium text-slate-800 truncate ml-2" title={autorizacao.cliente_nome}>{autorizacao.cliente_nome}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Pedidos:</span>
                          <span className="font-semibold text-blue-600">{autorizacao.pedidos_ids?.length || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Total Original:</span>
                          <span className="font-medium text-slate-700">{formatCurrency(autorizacao.valor_total_original)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Valor Informado:</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(autorizacao.valor_final_proposto)}</span>
                        </div>
                      </div>

                      {autorizacao.comprovante_url && (
                        <div className="mb-3">
                          <a href={autorizacao.comprovante_url} target="_blank" rel="noopener noreferrer" className="block border border-orange-200 rounded-lg overflow-hidden hover:border-orange-400 transition-colors">
                            <img src={autorizacao.comprovante_url} alt="Comprovante" className="w-full h-32 object-cover" />
                          </a>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                          onClick={() => {
                            setSelectedAutorizacao(autorizacao);
                            setShowAutorizacaoModal(true);
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Revisar
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                    <Clock className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">Nenhuma autorização pendente</h3>
                  <p className="text-slate-500 max-w-sm mt-1">Todas as solicitações foram processadas.</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="liquidacoes" className="mt-0 focus-visible:outline-none space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-1 inline-flex gap-1">
                <Button 
                  variant={liquidacaoView === 'bordero' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setLiquidacaoView('bordero')}
                  className={cn("rounded-lg h-9", liquidacaoView === 'bordero' && "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm")}
                >
                  <FileText className="w-4 h-4 mr-2" /> Por Borderô
                </Button>
                <Button 
                  variant={liquidacaoView === 'pedidos' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setLiquidacaoView('pedidos')}
                  className={cn("rounded-lg h-9", liquidacaoView === 'pedidos' && "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm")}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" /> Por Pedidos
                </Button>
              </div>

              {liquidacaoView === 'bordero' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loadingBorderos ? (
                    <p className="col-span-full text-center text-slate-500 py-10">Carregando borderôs...</p>
                  ) : filteredBorderos.length > 0 ? (
                    filteredBorderos.map(bordero => (
                      <Card key={bordero.id} className="border border-slate-100 hover:shadow-lg transition-all p-5 bg-white">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Borderô</span>
                            <h3 className="text-2xl font-bold text-slate-800">#{bordero.numero_bordero}</h3>
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                            {bordero.tipo_liquidacao === 'massa' ? 'Em Massa' : bordero.tipo_liquidacao === 'individual' ? 'Individual' : 'Aprovada'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 mb-4 pb-4 border-b border-slate-100">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Data:</span>
                            <span className="font-medium text-slate-800">{format(new Date(bordero.created_date), 'dd/MM/yyyy HH:mm')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Pedidos:</span>
                            <span className="font-semibold text-blue-600">{bordero.pedidos_ids?.length || 0}</span>
                          </div>
                          {bordero.cliente_nome && (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Cliente:</span>
                              <span className="font-medium text-slate-800 truncate ml-2" title={bordero.cliente_nome}>{bordero.cliente_nome}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Liquidado por:</span>
                            <span className="font-medium text-slate-700 text-xs truncate ml-2" title={bordero.liquidado_por}>{bordero.liquidado_por?.split('@')[0] || 'Sistema'}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-end mb-3">
                          <div>
                            <p className="text-xs text-slate-400">Valor Total</p>
                            <p className="text-xl font-bold text-emerald-600">{formatCurrency(bordero.valor_total)}</p>
                          </div>
                        </div>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full bg-slate-50 hover:bg-slate-100 border-slate-200"
                          onClick={() => {
                            setSelectedPedido({ ...bordero, isBordero: true });
                            setShowDetailsModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" /> Ver Detalhes & Anexos
                        </Button>
                      </Card>
                    ))
                  ) : (
                    <Card className="col-span-full flex flex-col items-center justify-center py-16 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                        <FileText className="w-8 h-8 text-slate-300" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900">Nenhum borderô encontrado</h3>
                      <p className="text-slate-500 max-w-sm mt-1">Realize liquidações para gerar borderôs.</p>
                    </Card>
                  )}
                </div>
              ) : (
                viewMode === 'table' ? (
                  <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                    <PedidoTable pedidos={filteredPedidos} onEdit={handleEdit} onView={handleView} onLiquidar={handleLiquidar} onCancelar={handleCancelar} onReverter={(pedido) => { setPedidoParaReverter(pedido); setShowReverterDialog(true); }} isLoading={loadingPedidos} showBorderoRef={true} />
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredPedidos.map(pedido => (
                      <PedidoGridCard key={pedido.id} pedido={pedido} onEdit={handleEdit} onView={handleView} onLiquidar={handleLiquidar} onCancelar={handleCancelar} onReverter={(pedido) => { setPedidoParaReverter(pedido); setShowReverterDialog(true); }} canDo={canDo} />
                    ))}
                    {filteredPedidos.length === 0 && <p className="col-span-full text-center text-slate-500 py-10">Nenhum pedido encontrado.</p>}
                  </div>
                )
              )}
            </TabsContent>

            {['abertos', 'cancelados'].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0 focus-visible:outline-none">
                {viewMode === 'table' ? (
                    <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <PedidoTable pedidos={filteredPedidos} onEdit={handleEdit} onView={handleView} onLiquidar={handleLiquidar} onCancelar={handleCancelar} onReverter={null} isLoading={loadingPedidos} />
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredPedidos.map(pedido => (
                            <PedidoGridCard key={pedido.id} pedido={pedido} onEdit={handleEdit} onView={handleView} onLiquidar={handleLiquidar} onCancelar={handleCancelar} onReverter={null} canDo={canDo} />
                        ))}
                        {filteredPedidos.length === 0 && <p className="col-span-full text-center text-slate-500 py-10">Nenhum pedido encontrado.</p>}
                    </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Novo Pedido" description="Cadastre um novo pedido a receber" size="lg"><PedidoForm clientes={clientes} onSave={(data) => createMutation.mutate(data)} onCancel={() => setShowAddModal(false)} isLoading={createMutation.isPending} onCadastrarCliente={() => { setShowAddModal(false); setShowCadastrarClienteModal(true); }} /></ModalContainer>
          <ModalContainer open={showEditModal} onClose={() => { setShowEditModal(false); setSelectedPedido(null); }} title="Editar Pedido" description="Atualize os dados do pedido" size="lg"><PedidoForm pedido={selectedPedido} clientes={clientes} onSave={(data) => updateMutation.mutate({ id: selectedPedido.id, data })} onCancel={() => { setShowEditModal(false); setSelectedPedido(null); }} isLoading={updateMutation.isPending} /></ModalContainer>
          <ModalContainer open={showDetailsModal} onClose={() => { setShowDetailsModal(false); setSelectedPedido(null); }} title={selectedPedido?.isBordero ? `Detalhes do Borderô #${selectedPedido.numero_bordero}` : "Detalhes do Pedido"} description={selectedPedido?.isBordero ? "Visualização completa do borderô e anexos" : "Visualização completa do pedido"} size="xl">
            {selectedPedido && (
              selectedPedido.isBordero ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Tipo de Liquidação</p>
                      <p className="font-semibold text-slate-800">{selectedPedido.tipo_liquidacao === 'massa' ? 'Em Massa' : selectedPedido.tipo_liquidacao === 'individual' ? 'Individual' : 'Pendente Aprovada'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Valor Total</p>
                      <p className="font-bold text-emerald-600 text-lg">{formatCurrency(selectedPedido.valor_total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Forma de Pagamento</p>
                      <p className="font-medium text-slate-700">{selectedPedido.forma_pagamento || 'Não especificada'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Liquidado em</p>
                      <p className="font-medium text-slate-700">{format(new Date(selectedPedido.created_date), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    {selectedPedido.cliente_nome && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 mb-1">Cliente</p>
                        <p className="font-medium text-slate-800">{selectedPedido.cliente_nome} ({selectedPedido.cliente_codigo})</p>
                      </div>
                    )}
                    {selectedPedido.observacao && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 mb-1">Observações</p>
                        <p className="text-sm text-slate-700">{selectedPedido.observacao}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-blue-500" /> Pedidos Liquidados ({selectedPedido.pedidos_ids?.length || 0})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedPedido.pedidos_ids?.map((pedidoId) => {
                        const pedido = pedidos.find(p => p.id === pedidoId);
                        return pedido ? (
                          <div key={pedidoId} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
                            <div>
                              <p className="font-medium text-slate-800">#{pedido.numero_pedido}</p>
                              <p className="text-xs text-slate-500">{pedido.cliente_nome}</p>
                            </div>
                            <p className="font-semibold text-blue-600">{formatCurrency(pedido.valor_pedido)}</p>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>

                  {selectedPedido.comprovantes_urls && selectedPedido.comprovantes_urls.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-500" /> Comprovantes de Pagamento
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedPedido.comprovantes_urls.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block border border-slate-200 rounded-lg overflow-hidden hover:border-emerald-400 transition-colors">
                            <img src={url} alt={`Comprovante ${idx + 1}`} className="w-full h-32 object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPedido.cheques_anexos && selectedPedido.cheques_anexos.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-purple-500" /> Cheques Vinculados
                      </h3>
                      <div className="space-y-3">
                        {selectedPedido.cheques_anexos.map((cheque, idx) => (
                          <div key={idx} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl">
                            <div className="grid grid-cols-3 gap-3 mb-2">
                              <div>
                                <p className="text-xs text-slate-500">Nº Cheque</p>
                                <p className="font-bold text-slate-800">{cheque.numero_cheque}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Banco</p>
                                <p className="font-medium text-slate-700">{cheque.banco}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Valor</p>
                                <p className="font-bold text-purple-600">{formatCurrency(cheque.valor)}</p>
                              </div>
                            </div>
                            {cheque.anexo_foto_url && (
                              <a href={cheque.anexo_foto_url} target="_blank" rel="noopener noreferrer" className="block mt-2 border border-purple-300 rounded-lg overflow-hidden hover:border-purple-500 transition-colors">
                                <img src={cheque.anexo_foto_url} alt={`Cheque ${cheque.numero_cheque}`} className="w-full h-32 object-cover" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button variant="outline" className="w-full" onClick={() => { setShowDetailsModal(false); setSelectedPedido(null); }}>
                    Fechar
                  </Button>
                </div>
              ) : (
                <PedidoDetails pedido={selectedPedido} onClose={() => { setShowDetailsModal(false); setSelectedPedido(null); }} />
              )
            )}
          </ModalContainer>
          <ModalContainer open={showLiquidarModal} onClose={() => { setShowLiquidarModal(false); setSelectedPedido(null); }} title="Liquidação de Pedido" description="Registre o pagamento do pedido">{selectedPedido && <LiquidacaoForm pedido={selectedPedido} onSave={(data) => updateMutation.mutate({ id: selectedPedido.id, data })} onCancel={() => { setShowLiquidarModal(false); setSelectedPedido(null); }} isLoading={updateMutation.isPending} />}</ModalContainer>
          <ModalContainer open={showImportModal} onClose={() => setShowImportModal(false)} title="Importar Pedidos" description="Importe pedidos de uma planilha Excel" size="lg"><ImportarPedidos clientes={clientes} rotas={rotas} onImportComplete={handleImportComplete} onCancel={() => setShowImportModal(false)} /></ModalContainer>
          <ModalContainer open={showRotaModal} onClose={() => { setShowRotaModal(false); setSelectedRota(null); }} title="Checklist da Rota" description="Confirme os pedidos entregues" size="lg">{selectedRota && <RotaChecklist rota={selectedRota} pedidos={pedidosDaRota} onSave={handleSaveRotaChecklist} onCadastrarCliente={handleCadastrarCliente} onCancelarPedido={handleCancelarPedidoRota} onCancel={() => { setShowRotaModal(false); setSelectedRota(null); }} />}</ModalContainer>
          <ModalContainer open={showAlterarPortadorModal} onClose={() => { setShowAlterarPortadorModal(false); setSelectedRota(null); }} title="Alterar Portador da Rota" description="Gere um relatório PDF e altere o motorista responsável" size="lg">{selectedRota && <AlterarPortadorModal rota={selectedRota} pedidos={pedidosDaRota} onSave={handleSaveAlterarPortador} onCancel={() => { setShowAlterarPortadorModal(false); setSelectedRota(null); }} />}</ModalContainer>
          <ModalContainer open={showCadastrarClienteModal} onClose={() => { setShowCadastrarClienteModal(false); setPedidoParaCadastro(null); }} title="Cadastrar Cliente Pendente" description={`Cliente: ${pedidoParaCadastro?.cliente_nome || ''}`} size="lg"><ClienteForm cliente={pedidoParaCadastro ? { nome: pedidoParaCadastro.cliente_nome } : null} representantes={representantes} onSave={handleSaveNovoCliente} onCancel={() => { setShowCadastrarClienteModal(false); setPedidoParaCadastro(null); }} /></ModalContainer>
          <ModalContainer open={showCancelarPedidoModal} onClose={() => { setShowCancelarPedidoModal(false); setPedidoParaCancelar(null); }} title="Cancelar Pedido" description="Informe o motivo do cancelamento">{pedidoParaCancelar && <CancelarPedidoModal pedido={pedidoParaCancelar} onSave={handleSaveCancelarPedido} onCancel={() => { setShowCancelarPedidoModal(false); setPedidoParaCancelar(null); }} />}</ModalContainer>
          <ModalContainer open={showLiquidacaoMassaModal} onClose={() => setShowLiquidacaoMassaModal(false)} title="Liquidação em Massa" description="Selecione e liquide múltiplos pedidos de uma vez" size="xl"><LiquidacaoMassa pedidos={pedidos} onSave={handleLiquidacaoMassa} onCancel={() => setShowLiquidacaoMassaModal(false)} /></ModalContainer>
          {showRotaCobrancaModal && <RotaCobrancaModal pedidos={pedidos} cheques={cheques} onClose={() => setShowRotaCobrancaModal(false)} />}
          <ModalContainer open={showAutorizacaoModal} onClose={() => { setShowAutorizacaoModal(false); setSelectedAutorizacao(null); }} title="Revisar Autorização" description="Aprove ou rejeite a solicitação de liquidação" size="xl">
            {selectedAutorizacao && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                  <div><p className="text-xs text-slate-500 mb-1">Cliente</p><p className="font-semibold text-slate-800">{selectedAutorizacao.cliente_nome}</p></div>
                  <div><p className="text-xs text-slate-500 mb-1">Solicitante</p><p className="font-medium text-slate-700">{selectedAutorizacao.solicitante_tipo === 'cliente' ? 'Cliente' : 'Representante'}</p></div>
                  <div><p className="text-xs text-slate-500 mb-1">Total Original</p><p className="font-bold text-slate-700">{formatCurrency(selectedAutorizacao.valor_total_original)}</p></div>
                  <div><p className="text-xs text-slate-500 mb-1">Valor Informado</p><p className="font-bold text-emerald-600 text-lg">{formatCurrency(selectedAutorizacao.valor_final_proposto)}</p></div>
                </div>

                {selectedAutorizacao.comprovante_url && (
                  <div>
                    <h3 className="font-bold text-slate-800 mb-3">Comprovante</h3>
                    <a href={selectedAutorizacao.comprovante_url} target="_blank" rel="noopener noreferrer" className="block border rounded-lg overflow-hidden">
                      <img src={selectedAutorizacao.comprovante_url} alt="Comprovante" className="w-full max-h-64 object-contain" />
                    </a>
                  </div>
                )}

                <div>
                  <h3 className="font-bold text-slate-800 mb-3">Pedidos ({selectedAutorizacao.pedidos_ids?.length || 0})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedAutorizacao.pedidos_ids?.map(pedidoId => {
                      const pedido = pedidos.find(p => p.id === pedidoId);
                      return pedido ? (
                        <div key={pedidoId} className="flex justify-between items-center p-3 bg-white border rounded-lg">
                          <div><p className="font-medium">#{pedido.numero_pedido}</p><p className="text-xs text-slate-500">{pedido.cliente_nome}</p></div>
                          <p className="font-semibold text-blue-600">{formatCurrency(pedido.saldo_restante || pedido.valor_pedido)}</p>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => { setShowAutorizacaoModal(false); setSelectedAutorizacao(null); }}>Cancelar</Button>
                  <Button variant="destructive" className="flex-1" onClick={async () => {
                    try {
                      await base44.entities.LiquidacaoPendente.update(selectedAutorizacao.id, { status: 'rejeitado', motivo_rejeicao: 'Rejeitado pelo administrador' });
                      await queryClient.invalidateQueries({ queryKey: ['liquidacoesPendentes'] });
                      setShowAutorizacaoModal(false);
                      setSelectedAutorizacao(null);
                      toast.success('Solicitação rejeitada');
                    } catch (e) { toast.error('Erro ao rejeitar'); }
                  }}>Rejeitar</Button>
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={async () => {
                    setIsProcessing(true);
                    try {
                      await base44.entities.LiquidacaoPendente.update(selectedAutorizacao.id, { status: 'aprovado', aprovado_por: user?.email, data_aprovacao: new Date().toISOString() });
                      await queryClient.invalidateQueries({ queryKey: ['liquidacoesPendentes'] });
                      await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
                      await queryClient.invalidateQueries({ queryKey: ['borderos'] });
                      setShowAutorizacaoModal(false);
                      setSelectedAutorizacao(null);
                      toast.success('Liquidação aprovada!');
                    } catch (e) { toast.error('Erro ao aprovar'); } finally { setIsProcessing(false); }
                  }}>Aprovar & Liquidar</Button>
                </div>
              </div>
            )}
          </ModalContainer>
          <AlertDialog open={showReverterDialog} onOpenChange={setShowReverterDialog}>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Reverter Liquidação</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja reverter essa liquidação? {pedidoParaReverter && (<div className="mt-4 p-3 bg-slate-50 rounded-lg"><p className="font-medium">Pedido: {pedidoParaReverter.numero_pedido}</p><p className="text-sm">Cliente: {pedidoParaReverter.cliente_nome}</p><p className="text-sm mt-2 text-amber-600">Esta ação irá reverter o pedido para status "aberto", zerar o valor pago e o desconto.</p></div>)}</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel onClick={() => { setShowReverterDialog(false); setPedidoParaReverter(null); }}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleReverterLiquidacao}>Sim, Reverter</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </PermissionGuard>
  );
}