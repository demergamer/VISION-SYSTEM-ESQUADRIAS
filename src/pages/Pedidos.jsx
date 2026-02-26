import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  SlidersHorizontal, X as XIcon, Loader2, Factory, Split, UserPlus, AlertCircle,
  RepeatIcon, UserCheck, GitMerge, UploadCloud, Trash2
} from "lucide-react";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format, differenceInDays, parseISO, isToday, isFuture, isPast } from "date-fns";
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
import EmProducaoTable from "@/components/pedidos/EmProduçaoTable";
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
import AdicionarRepresentanteModal from "@/components/pedidos/AdicionarRepresentanteModal";
import MesclarNFModal from "@/components/pedidos/MesclarNFModal";
import PermissionGuard from "@/components/PermissionGuard";
import { usePermissions } from "@/components/hooks/usePermissions";
import PaginacaoControles, { SeletorItensPorPagina } from "@/components/pedidos/PaginacaoControles";

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
const StatWidget = ({ title, value, icon: Icon, color, subtext }) => {
  const colorStyles = { blue: "bg-blue-50 text-blue-600", red: "bg-red-50 text-red-600", yellow: "bg-amber-50 text-amber-600", purple: "bg-purple-50 text-purple-600", emerald: "bg-emerald-50 text-emerald-600", slate: "bg-slate-100 text-slate-600", orange: "bg-orange-50 text-orange-600" };
  return (<div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between hover:shadow-md transition-all duration-300 h-full"><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p><h3 className="text-2xl font-bold text-slate-800">{value}</h3>{subtext && <p className="text-[10px] text-slate-400 mt-1">{subtext}</p>}</div><div className={`p-3 rounded-xl ${colorStyles[color] || colorStyles.slate}`}><Icon size={20} /></div></div>);
};

// Componente: Card de Pedido em Grade (Explorer)
const PedidoGridCard = ({ pedido, onEdit, onView, onLiquidar, onCancelar, onReverter, canDo }) => {
  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  
  // CORREÇÃO CRÍTICA: BADGES VISUAIS (SÓ FICA VERMELHO SE > 15 DIAS)
  const getStatusBadge = (status, dataEntrega) => {
    const now = new Date();
    now.setHours(0,0,0,0);
    const dataRef = dataEntrega ? parseISO(dataEntrega) : new Date();
    const diasAtraso = differenceInDays(now, dataRef);
    
    switch (status) {
      case 'aguardando': return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Em Trânsito</Badge>;
      case 'pago': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Liquidado</Badge>;
      case 'cancelado': return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Cancelado</Badge>;
      case 'parcial': return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Parcial</Badge>;
      default:
        if (diasAtraso > 15) return <Badge className="bg-red-100 text-red-700 border-red-200">Atrasado (+{diasAtraso}d)</Badge>;
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
  const [abertosSubTab, setAbertosSubTab] = useState('todos'); 
  const [viewMode, setViewMode] = useState('table'); 
  const [liquidacaoView, setLiquidacaoView] = useState('bordero'); 
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ dateStart: '', dateEnd: '', region: '', minValue: '' });
  
  // Configuração de Ordenação
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  // --- PAGINAÇÃO ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);

  // --- PAGINAÇÃO DE BORDERÔS (independente) ---
  const [currentPageBorderos, setCurrentPageBorderos] = useState(1);
  const [borderosPerPage] = useState(12);

  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshingData, setRefreshingData] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('Conectando...');

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
  const [showAddRepresentanteModal, setShowAddRepresentanteModal] = useState(false);

  // --- SELEÇÕES ---
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [selectedAutorizacao, setSelectedAutorizacao] = useState(null);
  const [selectedRota, setSelectedRota] = useState(null);
  const [pedidoParaCadastro, setPedidoParaCadastro] = useState(null);
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState(null);
  const [pedidoParaReverter, setPedidoParaReverter] = useState(null);
  const [showMesclarNFModal, setShowMesclarNFModal] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef(null);

  // --- QUERIES ---
  const { data: pedidos = [], isLoading: loadingPedidos, refetch: refetchPedidos } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });
  const { data: clientes = [], refetch: refetchClientes } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
  const { data: rotas = [], isLoading: loadingRotas, refetch: refetchRotas } = useQuery({ queryKey: ['rotas'], queryFn: () => base44.entities.RotaImportada.list('-created_date') });
  const { data: representantes = [], refetch: refetchRepresentantes } = useQuery({ queryKey: ['representantes'], queryFn: () => base44.entities.Representante.list() });
  const { data: cheques = [] } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });
  const { data: borderos = [], isLoading: loadingBorderos, refetch: refetchBorderos } = useQuery({ queryKey: ['borderos'], queryFn: () => base44.entities.Bordero.list('-created_date') });
  const { data: liquidacoesPendentes = [], isLoading: loadingAutorizacoes, refetch: refetchAutorizacoes } = useQuery({ queryKey: ['liquidacoesPendentes'], queryFn: () => base44.entities.LiquidacaoPendente.list('-created_date') });

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

  // --- DEBOUNCE DA BUSCA ---
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 800);
  };

  // --- MESCLAR NF ---
  const handleMesclarNF = async (pedidosSelecionados, valorTotal) => {
    setIsProcessing(true);
    try {
      const user = await base44.auth.me();
      const todosPedidos = await base44.entities.Pedido.list();
      const proximoNumero = todosPedidos.length > 0
        ? String(Math.max(...todosPedidos.map(p => parseInt(p.numero_pedido?.replace(/\D/g,'')) || 0)) + 1)
        : '1';

      const primeiroP = pedidosSelecionados[0];
      // 1. Cria nova NF
      await base44.entities.Pedido.create({
        numero_pedido: proximoNumero,
        cliente_codigo: primeiroP.cliente_codigo,
        cliente_nome: primeiroP.cliente_nome,
        cliente_regiao: primeiroP.cliente_regiao,
        representante_codigo: primeiroP.representante_codigo,
        representante_nome: primeiroP.representante_nome,
        porcentagem_comissao: primeiroP.porcentagem_comissao,
        valor_pedido: valorTotal,
        saldo_restante: valorTotal,
        total_pago: 0,
        status: 'aberto',
        tipo_documento: 'nf',
        observacao: `NF gerada por mescla dos pedidos: ${pedidosSelecionados.map(p => '#' + p.numero_pedido).join(', ')}`,
        outras_informacoes: `[${new Date().toLocaleDateString('pt-BR')}] Mescla realizada por ${user?.email}`
      });

      // 2. Cancela pedidos originais
      await Promise.all(pedidosSelecionados.map(p =>
        base44.entities.Pedido.update(p.id, {
          status: 'cancelado',
          outras_informacoes: (p.outras_informacoes || '') + `\n[${new Date().toLocaleDateString('pt-BR')}] Pedido substituído pela NF #${proximoNumero}`
        })
      ));

      await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      setShowMesclarNFModal(false);
      toast.success(`NF #${proximoNumero} criada com sucesso! ${pedidosSelecionados.length} pedidos cancelados.`);
    } catch (e) {
      toast.error('Erro ao mesclar pedidos: ' + e.message);
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- ORDENAÇÃO ---
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      setSortConfig({ key: null, direction: null });
      return;
    }
    setSortConfig({ key, direction });
  };

  // --- FILTROS DE DADOS & ORDENAÇÃO ---
  const processedPedidos = useMemo(() => {
    let data = [...pedidos]; // Copia

    // 1. Filtro Principal
    switch (activeTab) {
      case 'transito': data = data.filter(p => p.rota_importada_id && !p.confirmado_entrega && p.status !== 'cancelado'); break;
      case 'abertos': data = data.filter(p => p.status === 'aberto' || p.status === 'parcial' || p.status === 'representante_recebe'); break;
      case 'trocas': data = data.filter(p => p.status === 'troca'); break;
      case 'liquidacoes': data = data.filter(p => p.status === 'pago'); break;
      case 'cancelados': data = data.filter(p => p.status === 'cancelado'); break;
      default: break; 
    }

    // 2. Sub-Filtro
    if (activeTab === 'abertos') {
        const hoje = new Date();
        hoje.setHours(0,0,0,0);
        
        if (abertosSubTab === 'representante_recebe') {
            data = data.filter(p => p.status === 'representante_recebe');
        } else {
            // Todos os sub-filtros normais excluem representante_recebe
            data = data.filter(p => p.status !== 'representante_recebe');

            if (abertosSubTab === 'em_dia') {
                data = data.filter(p => {
                    if (!p.data_entrega) return true;
                    const entrega = parseISO(p.data_entrega);
                    const diff = differenceInDays(hoje, entrega);
                    return diff <= 15;
                });
            } else if (abertosSubTab === 'atrasado') {
                data = data.filter(p => {
                    if (!p.data_entrega) return false;
                    const entrega = parseISO(p.data_entrega);
                    const diff = differenceInDays(hoje, entrega);
                    return diff > 15;
                });
            }
        }
    }

    // 3. Busca Multi-Nível com suporte a vírgula
    if (searchTerm) {
      const termos = searchTerm.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      if (termos.length > 1) {
        data = data.filter(p =>
          termos.some(termo => {
            const semPonto = termo.replace(/\./g, '');
            // Número longo → numero_pedido exato
            if (/^\d{4,}$/.test(semPonto)) return p.numero_pedido?.replace(/\./g, '') === semPonto;
            // Número curto → codigo cliente
            if (/^\d+$/.test(semPonto)) return p.cliente_codigo?.toLowerCase().includes(semPonto);
            // Texto → nome
            return p.cliente_nome?.toLowerCase().includes(termo);
          })
        );
      } else {
        const lower = termos[0]?.replace(/\./g, '') || '';
        data = data.filter(p =>
          p.cliente_nome?.toLowerCase().includes(lower) ||
          p.cliente_codigo?.toLowerCase().includes(lower) ||
          (p.numero_pedido?.replace(/\./g, '')?.toLowerCase().includes(lower)) ||
          p.bordero_numero?.toString().includes(lower)
        );
      }
    }
    
    // 4. Filtros Avançados
    if (showFilters) {
        if (filters.dateStart) { const start = parseISO(filters.dateStart); data = data.filter(p => p.data_entrega && new Date(p.data_entrega) >= start); }
        if (filters.dateEnd) { const end = parseISO(filters.dateEnd); end.setHours(23, 59, 59, 999); data = data.filter(p => p.data_entrega && new Date(p.data_entrega) <= end); }
        if (filters.region) { data = data.filter(p => p.cliente_regiao?.toLowerCase().includes(filters.region.toLowerCase())); }
        if (filters.minValue) { data = data.filter(p => (p.valor_pedido || 0) >= parseFloat(filters.minValue)); }
    }

    // 5. Ordenação
    if (sortConfig.key) {
        data.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (['valor_pedido', 'saldo_restante', 'total_pago'].includes(sortConfig.key)) {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else if (['data_entrega'].includes(sortConfig.key)) {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            } else {
                valA = valA ? valA.toString().toLowerCase() : '';
                valB = valB ? valB.toString().toLowerCase() : '';
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return data;
  }, [pedidos, activeTab, abertosSubTab, searchTerm, showFilters, filters, sortConfig]);

  // Reset page on filter/tab/search change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, activeTab, abertosSubTab, filters, showFilters]);
  useEffect(() => { setCurrentPageBorderos(1); }, [searchTerm]);

  // --- STATS DINÂMICOS ---
  // pedidosFiltradosBusca: todos os pedidos filtrados apenas pela busca (sem filtro de aba/sub-aba)
  // Usado para badges das abas e totalizadores financeiros que devem reagir à busca global
  const pedidosFiltradosBusca = useMemo(() => {
    if (!searchTerm) return pedidos;
    const lower = searchTerm.toLowerCase().replace(/\./g, '');
    return pedidos.filter(p =>
      p.cliente_nome?.toLowerCase().includes(lower) ||
      p.cliente_codigo?.toLowerCase().includes(lower) ||
      (p.numero_pedido?.replace(/\./g, '')?.toLowerCase().includes(lower)) ||
      p.bordero_numero?.toString().includes(lower)
    );
  }, [pedidos, searchTerm]);

  const stats = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    // Contagens de abas: reagem à busca global
    const transitoCount = pedidosFiltradosBusca.filter(p => p.rota_importada_id && !p.confirmado_entrega && p.status !== 'cancelado').length;
    const abertosCount = pedidosFiltradosBusca.filter(p => p.status === 'aberto' || p.status === 'parcial').length;
    const trocasCount = pedidosFiltradosBusca.filter(p => p.status === 'troca').length;
    const repRecebeCount = pedidosFiltradosBusca.filter(p => p.status === 'representante_recebe').length;

    // Sub-abas de "Abertos": reagem à busca
    const abertosBase = pedidosFiltradosBusca.filter(p =>
      (p.status === 'aberto' || p.status === 'parcial') && p.status !== 'representante_recebe'
    );
    const emDiaCount = abertosBase.filter(p => !p.data_entrega || differenceInDays(hoje, parseISO(p.data_entrega)) <= 15).length;
    const atrasadoCount = abertosBase.filter(p => p.data_entrega && differenceInDays(hoje, parseISO(p.data_entrega)) > 15).length;

    // Contagens fixas (não reagem à busca - contexto global do sistema)
    const autorizacoesCount = liquidacoesPendentes.filter(lp => lp.status === 'pendente').length;
    const rotasAtivasCount = rotas.filter(r => r.status === 'pendente' || r.status === 'parcial').length;

    // Totalizadores financeiros: usam pedidosFiltradosBusca
    const abertosNaBusca = pedidosFiltradosBusca.filter(p =>
      (p.status === 'aberto' || p.status === 'parcial') &&
      p.status !== 'troca' && p.status !== 'representante_recebe'
    );
    const totalAReceber = abertosNaBusca.reduce((sum, p) => sum + (p.saldo_restante !== undefined ? p.saldo_restante : (p.valor_pedido - (p.total_pago || 0))), 0);
    const totalVencido = abertosNaBusca
      .filter(p => p.data_entrega && differenceInDays(hoje, parseISO(p.data_entrega)) > 15)
      .reduce((sum, p) => sum + (p.saldo_restante !== undefined ? p.saldo_restante : (p.valor_pedido - (p.total_pago || 0))), 0);
    const valorEmTransito = pedidosFiltradosBusca
      .filter(p => p.rota_importada_id && !p.confirmado_entrega && p.status !== 'cancelado')
      .reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
    const repRecebeValor = pedidosFiltradosBusca
      .filter(p => p.status === 'representante_recebe')
      .reduce((sum, p) => sum + (p.saldo_restante !== undefined ? p.saldo_restante : (p.valor_pedido - (p.total_pago || 0))), 0);

    return { transitoCount, abertosCount, autorizacoesCount, rotasAtivasCount, totalAReceber, totalVencido, valorEmTransito, trocasCount, repRecebeCount, repRecebeValor, emDiaCount, atrasadoCount };
  }, [pedidos, pedidosFiltradosBusca, liquidacoesPendentes, rotas, searchTerm]);

  // --- PEDIDOS PAGINADOS ---
  const totalPages = Math.ceil(processedPedidos.length / itemsPerPage);
  const indexOfFirst = (currentPage - 1) * itemsPerPage;
  const currentPedidos = processedPedidos.slice(indexOfFirst, indexOfFirst + itemsPerPage);

  const filteredBorderos = useMemo(() => {
    if (!searchTerm) return borderos;
    const lower = searchTerm.toLowerCase();
    return borderos.filter(b => {
      // Busca no próprio borderô
      if (b.numero_bordero?.toString().includes(searchTerm)) return true;
      if (b.cliente_nome?.toLowerCase().includes(lower)) return true;
      if (b.liquidado_por?.toLowerCase().includes(lower)) return true;
      // Busca profunda: verifica se algum número de pedido dentro do borderô bate
      if (b.pedidos_ids && Array.isArray(b.pedidos_ids)) {
        const pedidosDoBordero = pedidos.filter(p => b.pedidos_ids.includes(p.id));
        if (pedidosDoBordero.some(p =>
          p.numero_pedido?.toLowerCase().includes(lower) ||
          p.cliente_nome?.toLowerCase().includes(lower)
        )) return true;
      }
      return false;
    });
  }, [borderos, searchTerm, pedidos]);

  // Paginação de borderôs (independente)
  const totalPagesBorderos = Math.ceil(filteredBorderos.length / borderosPerPage);
  const currentBorderos = filteredBorderos.slice(
    (currentPageBorderos - 1) * borderosPerPage,
    currentPageBorderos * borderosPerPage
  );

  // Handler para mudar status especial
  const handleMudarStatusEspecial = async (pedido, novoStatus) => {
    setIsProcessing(true);
    try {
      await base44.entities.Pedido.update(pedido.id, { status: novoStatus });
      await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      const labels = { troca: 'Pedido de Troca', representante_recebe: 'Representante Recebe' };
      toast.success(`Pedido #${pedido.numero_pedido} marcado como "${labels[novoStatus]}"`);
    } catch (e) {
      toast.error('Erro ao atualizar status.');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- HANDLERS ---
  const handleEdit = (pedido) => { setSelectedPedido(pedido); setShowEditModal(true); };
  const handleView = (pedido) => { if (pedido.isBordero) { setSelectedPedido(pedido); setShowDetailsModal(true); } else { setSelectedPedido(pedido); setShowDetailsModal(true); } };
  const handleLiquidar = (pedido) => { setSelectedPedido(pedido); setShowLiquidarModal(true); };
  const handleCancelar = (pedido) => { setPedidoParaCancelar(pedido); setShowCancelarPedidoModal(true); };

  const handleSaveCancelarPedido = async (data) => {
    setIsProcessing(true);
    try {
        await base44.entities.Pedido.update(pedidoParaCancelar.id, data);
        await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        setShowCancelarPedidoModal(false);
        setPedidoParaCancelar(null);
        toast.success('Pedido cancelado com sucesso!');
    } catch (error) {
        toast.error('Erro ao cancelar pedido.');
        console.error(error);
    } finally {
        setIsProcessing(false);
    }
  };
  
  // FUNÇÃO ATUALIZADA: LIMPEZA INTELIGENTE DE RESÍDUOS
  const handleRefresh = async () => {
    setRefreshingData(true);
    setRefreshMessage('Conectando ao banco de dados...');
    try {
        const [latestPedidos, latestRotas, latestClientes] = await Promise.all([
            base44.entities.Pedido.list(),
            base44.entities.RotaImportada.list(),
            base44.entities.Cliente.list()
        ]);

        setRefreshMessage('Verificando clientes pendentes...');
        let clientesVinculados = 0;
        const pedidosPendentes = latestPedidos.filter(p => p.cliente_pendente === true);
        const mapClientes = new Map();
        latestClientes.forEach(c => mapClientes.set(c.nome.trim().toLowerCase(), c));

        const promisesClientes = pedidosPendentes.map(pedido => {
            const nomePedido = pedido.cliente_nome?.trim().toLowerCase();
            if (!nomePedido) return null;
            let clienteEncontrado = mapClientes.get(nomePedido);
            if (!clienteEncontrado) {
                clienteEncontrado = latestClientes.find(c => 
                    c.nome?.trim().toLowerCase().includes(nomePedido) || 
                    nomePedido.includes(c.nome?.trim().toLowerCase())
                );
            }
            if (clienteEncontrado) {
                clientesVinculados++;
                return base44.entities.Pedido.update(pedido.id, {
                    cliente_codigo: clienteEncontrado.codigo,
                    cliente_regiao: clienteEncontrado.regiao,
                    representante_codigo: clienteEncontrado.representante_codigo,
                    representante_nome: clienteEncontrado.representante_nome,
                    porcentagem_comissao: clienteEncontrado.porcentagem_comissao,
                    cliente_pendente: false
                });
            }
            return null;
        });
        await Promise.all(promisesClientes.filter(Boolean));

        // NOVA LÓGICA DE LIMPEZA (INCLUI DESCONTO E ZEROS REAIS)
        setRefreshMessage('Analisando resíduos e pagamentos...');
        let residuosLimpos = 0;
        const promisesResiduos = latestPedidos
            .filter(p => {
                if (p.status !== 'aberto' && p.status !== 'parcial') return false;
                
                const valorTotal = parseFloat(p.valor_pedido) || 0;
                const totalPago = parseFloat(p.total_pago) || 0;
                const desconto = parseFloat(p.desconto_dado) || 0;
                
                const saldoReal = valorTotal - (totalPago + desconto);
                
                return saldoReal <= 0.10;
            })
            .map(p => {
                residuosLimpos++;
                const valorTotal = parseFloat(p.valor_pedido) || 0;
                const totalPago = parseFloat(p.total_pago) || 0;
                const desconto = parseFloat(p.desconto_dado) || 0;
                const saldoReal = valorTotal - (totalPago + desconto);
                
                const novoTotalPago = (saldoReal > 0 && saldoReal <= 0.10) ? (totalPago + saldoReal) : totalPago;

                return base44.entities.Pedido.update(p.id, { 
                    status: 'pago', 
                    saldo_restante: 0, 
                    total_pago: novoTotalPago,
                    outras_informacoes: (p.outras_informacoes || '') + '\n[AUTO] Baixa automática - Varredura Inteligente'
                });
            });
        await Promise.all(promisesResiduos);

        setRefreshMessage(`Sincronizando ${latestRotas.length} rotas de entrega...`);
        let routesUpdatedCount = 0;
        const updatePromises = latestRotas.map(rota => {
            const pedidosDaRota = latestPedidos.filter(p => p.rota_importada_id === rota.id);
            const total = pedidosDaRota.length;
            const confirmados = pedidosDaRota.filter(p => p.confirmado_entrega).length;
            
            let novoStatus = 'pendente';
            if (total > 0 && confirmados === total) novoStatus = 'concluida';
            else if (confirmados > 0) novoStatus = 'parcial';

            if (rota.total_pedidos !== total || rota.pedidos_confirmados !== confirmados || rota.status !== novoStatus) {
                routesUpdatedCount++;
                return base44.entities.RotaImportada.update(rota.id, {
                    total_pedidos: total,
                    pedidos_confirmados: confirmados,
                    status: novoStatus
                });
            }
            return null;
        });
        await Promise.all(updatePromises.filter(Boolean));

        setRefreshMessage('Finalizando atualizações...');
        await Promise.all([refetchPedidos(), refetchRotas(), refetchBorderos(), refetchAutorizacoes(), refetchClientes()]);
        
        let msg = 'Dados atualizados com sucesso!';
        if (clientesVinculados > 0) msg += `\n👤 ${clientesVinculados} clientes vinculados.`;
        if (residuosLimpos > 0) msg += `\n🧹 ${residuosLimpos} resíduos baixados.`;
        if (routesUpdatedCount > 0) msg += `\n🚚 ${routesUpdatedCount} rotas sincronizadas.`;
        
        toast.success(msg, { duration: 5000 });

    } catch (error) {
        console.error(error);
        toast.error('Erro ao atualizar dados: ' + error.message);
    } finally {
        setRefreshingData(false);
        setRefreshMessage('Conectando...');
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
      setIsProcessing(true);
      try {
          await base44.entities.RotaImportada.update(data.rota.id, data.rota);
          const promises = data.pedidos.map(p => base44.entities.Pedido.update(p.id, { confirmado_entrega: p.confirmado_entrega, status: p.status }));
          await Promise.all(promises);
          await Promise.all([refetchRotas(), refetchPedidos()]);
          setShowRotaModal(false);
          toast.success("Rota atualizada!");
      } catch (e) { toast.error("Erro ao salvar rota."); }
      finally { setIsProcessing(false); }
  };

  // REGRA 8: Após liquidação em massa, apenas fecha modal e refresca — sem redirecionar
  const handleLiquidacaoMassa = async () => {
      await Promise.all([refetchPedidos(), refetchBorderos()]);
      setShowLiquidacaoMassaModal(false);
      // NÃO redireciona de aba — usuário permanece onde estava
  };

  const [pedidoJaPagoAlerta, setPedidoJaPagoAlerta] = useState(null);

  const handleConfirmarEntrega = async (pedido) => {
      // REGRA 9: Alerta se pedido já consta como pago
      if (pedido.status === 'pago' && pedido.bordero_numero) {
          setPedidoJaPagoAlerta(pedido);
          return;
      }
      await doConfirmarEntrega(pedido);
  };

  const doConfirmarEntrega = async (pedido) => {
      setIsProcessing(true);
      try {
          const novoStatus = pedido.status === 'pago' ? 'pago' : 'aberto';
          await base44.entities.Pedido.update(pedido.id, {
              confirmado_entrega: true,
              status: novoStatus
          });

          // REGRA 11: Atualiza PORT/Caução vinculado para "Em Separação"
          try {
              const todosPortsAtivos = await base44.entities.Port.list();
              const portVinculado = todosPortsAtivos.find(port =>
                  port.status === 'aguardando_vinculo' &&
                  port.itens_port?.some(item =>
                      item.numero_pedido_manual &&
                      item.numero_pedido_manual.replace(/\./g, '') === String(pedido.numero_pedido).replace(/\./g, '')
                  )
              );
              if (portVinculado) {
                  await base44.entities.Port.update(portVinculado.id, { status: 'em_separacao' });
                  toast.info(`💰 PORT #${portVinculado.numero_port} atualizado para "Em Separação".`);
              }
          } catch(e) { /* non-critical */ }

          await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
          toast.success('Entrega confirmada com sucesso!');
      } catch (error) {
          toast.error('Erro ao confirmar entrega.');
          console.error(error);
      } finally {
          setIsProcessing(false);
      }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  // --- FUNÇÃO CORRIGIDA: APROVAÇÃO COM GERAÇÃO DE CRÉDITO E PARCIAL ---
  const handleAprovarSolicitacao = async (dadosAprovacao) => {
      console.log("Iniciando aprovação com:", dadosAprovacao);
      setIsProcessing(true);
      try {
          const user = await base44.auth.me();
          const { pedidosSelecionados, descontoValor, devolucao, formasPagamento, comprovantes, totais } = dadosAprovacao;
          
          // 1. Consolidação de Valores
          const valorDesconto = parseFloat(descontoValor) || 0;
          const valorDevolucao = parseFloat(devolucao) || 0;
          const valorPagoDinheiro = parseFloat(totais.totalPago) || 0; // O que entrou de caixa
          
          // Total que está sendo abatido da dívida
          const totalAbatimento = valorPagoDinheiro + valorDesconto + valorDevolucao;

          // Total da Dívida dos pedidos selecionados
          const totalDivida = pedidosSelecionados.reduce((sum, p) => {
              return sum + (p.saldo_restante !== undefined ? parseFloat(p.saldo_restante) : (parseFloat(p.valor_pedido) - parseFloat(p.total_pago || 0)));
          }, 0);

          // 2. Cálculo do Resultado (Sobra ou Falta)
          const diferenca = totalAbatimento - totalDivida;
          let creditoGerado = 0;

          // LÓGICA DE CRÉDITO (SOBRA > 0.01)
          if (diferenca > 0.01) {
              creditoGerado = diferenca;
              
              // Cria o crédito para o cliente
              await base44.entities.Credito.create({
                  cliente_codigo: selectedAutorizacao.cliente_codigo,
                  cliente_nome: selectedAutorizacao.cliente_nome,
                  valor: creditoGerado,
                  valor_original: creditoGerado,
                  valor_usado: 0,
                  data_emissao: new Date().toISOString().split('T')[0],
                  status: 'disponivel',
                  origem: 'troco_liquidacao',
                  referencia: `Liq #${selectedAutorizacao.numero_solicitacao}`,
                  descricao: `Crédito gerado por pagamento excedente na liquidação #${selectedAutorizacao.numero_solicitacao}`
              });

              toast.success(`💰 Crédito de ${formatCurrency(creditoGerado)} gerado para o cliente!`, {
                  duration: 6000,
                  style: { background: '#ECFDF5', color: '#047857', fontWeight: 'bold' }
              });
          } 
          // LÓGICA DE PARCIAL (FALTA > 0.01)
          else if (diferenca < -0.01) {
              toast.warning(`⚠️ Pagamento Parcial: Faltam ${formatCurrency(Math.abs(diferenca))}. Os pedidos permanecerão com saldo.`, {
                  duration: 6000
              });
          }

          // 3. Criar Borderô
          const todosBorderos = await base44.entities.Bordero.list();
          const proximoNumeroBordero = todosBorderos.length > 0 ? Math.max(...todosBorderos.map(b => b.numero_bordero || 0)) + 1 : 1;

          const formasStr = formasPagamento.map(fp => `${fp.tipo.toUpperCase()}: ${formatCurrency(parseFloat(fp.valor))}`).join(' | ');

          await base44.entities.Bordero.create({
              numero_bordero: proximoNumeroBordero,
              tipo_liquidacao: 'pendente_aprovada',
              cliente_codigo: selectedAutorizacao.cliente_codigo,
              cliente_nome: selectedAutorizacao.cliente_nome,
              pedidos_ids: pedidosSelecionados.map(p => p.id),
              valor_total: valorPagoDinheiro, // Registra apenas o que entrou de dinheiro
              valor_desconto_aplicado: valorDesconto, 
              forma_pagamento: formasStr,
              comprovantes_urls: comprovantes,
              observacao: `Sol. #${selectedAutorizacao.numero_solicitacao} | Desc: ${formatCurrency(valorDesconto)} | Dev: ${formatCurrency(valorDevolucao)}${creditoGerado > 0 ? ` | Crédito Gerado: ${formatCurrency(creditoGerado)}` : ''}`,
              liquidado_por: user.email
          });

          // 4. Baixa Waterfall (Cascata) nos Pedidos
          let montanteParaDistribuir = Math.min(totalAbatimento, totalDivida);
          
          for (const pedido of pedidosSelecionados) {
              if (montanteParaDistribuir <= 0.001) break; 

              const valorTotalPedido = parseFloat(pedido.valor_pedido) || 0;
              const totalPagoAnterior = parseFloat(pedido.total_pago) || 0;
              const saldoAtualPedido = pedido.saldo_restante !== undefined ? parseFloat(pedido.saldo_restante) : (valorTotalPedido - totalPagoAnterior);

              const valorAAbater = Math.min(saldoAtualPedido, montanteParaDistribuir);
              montanteParaDistribuir -= valorAAbater;
              
              const novoTotalPago = totalPagoAnterior + valorAAbater;
              const novoSaldo = valorTotalPedido - novoTotalPago;
              const statusFinal = novoSaldo <= 0.01 ? 'pago' : 'parcial';
              const saldoFinalGravacao = statusFinal === 'pago' ? 0 : novoSaldo;

              await base44.entities.Pedido.update(pedido.id, {
                  total_pago: novoTotalPago,
                  saldo_restante: saldoFinalGravacao,
                  status: statusFinal,
                  bordero_numero: proximoNumeroBordero,
                  data_pagamento: statusFinal === 'pago' ? new Date().toISOString().split('T')[0] : null,
                  outras_informacoes: (pedido.outras_informacoes || '') + 
                      `\n[${new Date().toLocaleDateString()}] Liq. Solicitação #${selectedAutorizacao.numero_solicitacao} | Abatido: ${formatCurrency(valorAAbater)}`
              });
          }

          // 5. Finalizar a Solicitação
          await base44.entities.LiquidacaoPendente.update(selectedAutorizacao.id, {
              status: 'aprovado',
              aprovado_por: user.email,
              data_aprovacao: new Date().toISOString(),
              observacao: (selectedAutorizacao.observacao || '') + `\n[APROVADO] Borderô ${proximoNumeroBordero}. ${creditoGerado > 0 ? `Crédito gerado: ${formatCurrency(creditoGerado)}` : ''}`
          });

          setShowAutorizacaoModal(false);
          setSelectedAutorizacao(null); 

          await Promise.all([
              refetchPedidos(), 
              refetchBorderos(), 
              refetchAutorizacoes(),
              queryClient.invalidateQueries({ queryKey: ['creditos'] }) 
          ]);
          
          if (creditoGerado === 0 && diferenca > -0.01) {
             toast.success(`Liquidação #${proximoNumeroBordero} realizada com sucesso!`);
          }

      } catch (e) {
          console.error("ERRO AO APROVAR:", e);
          toast.error("Erro crítico ao aprovar: " + e.message);
      } finally {
          setIsProcessing(false);
      }
  };

  return (
    <PermissionGuard setor="Pedidos">
      {isProcessing && <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center"><Loader2 className="w-12 h-12 text-blue-600 animate-spin" /></div>}
      {refreshingData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all animate-in fade-in duration-300">
            <div className="bg-white p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-5 border border-slate-100 min-w-[350px]">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                  <div className="absolute inset-0 w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse" />
                </div>
                <div className="text-center space-y-2 w-full">
                    <h3 className="text-xl font-bold text-slate-800">Varrendo Sistema...</h3>
                    <div className="h-6 flex items-center justify-center">
                        <p className="text-sm text-slate-600 font-medium animate-pulse">
                          {refreshMessage}
                        </p>
                    </div>
                </div>
            </div>
        </div>
      )}

      <div className="min-h-screen bg-[#F5F7FA] pb-10 font-sans text-slate-900">
        <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}><Button variant="ghost" size="icon" className="rounded-xl hover:bg-white"><ArrowLeft className="w-5 h-5 text-slate-500" /></Button></Link>
              <div><h1 className="text-3xl font-bold tracking-tight text-slate-900">Gerenciamento de Pedidos</h1><p className="text-slate-500 mt-1">Controle de entregas, faturamento e rotas</p></div>
            </div>
            <div className="flex items-center gap-3">
                {canDo('Pedidos', 'adicionar') && (
                    <Button variant="outline" onClick={() => setShowLiquidacaoMassaModal(true)} className="bg-white border-slate-200 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                        <DollarSign className="w-4 h-4 mr-2 text-emerald-600" /> Liq. em Massa
                    </Button>
                )}
                {canDo('Pedidos', 'adicionar') && (
                    <Button variant="outline" onClick={() => setShowMesclarNFModal(true)} className="bg-white border-slate-200 text-blue-700 border-blue-200 hover:bg-blue-50">
                        <GitMerge className="w-4 h-4 mr-2 text-blue-600" /> Mesclar NF
                    </Button>
                )}
                <Button variant="outline" onClick={() => setActiveTab('rotas')} className={cn("bg-white border-slate-200", activeTab === 'rotas' && "bg-purple-50 border-purple-300 text-purple-700")}>
                    <Truck className="w-4 h-4 mr-2 text-purple-500" /> Rotas
                    {stats.rotasAtivasCount > 0 && <span className="ml-1.5 bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{stats.rotasAtivasCount}</span>}
                </Button>
                {canDo('Pedidos', 'adicionar') && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="outline" className="bg-white"><MoreHorizontal className="w-4 h-4 mr-2" /> Ferramentas</Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setShowImportModal(true)}><Upload className="w-4 h-4 mr-2" /> Importar Planilha</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowRotaCobrancaModal(true)}><FileText className="w-4 h-4 mr-2" /> Rota de Cobrança</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setActiveTab('cancelados'); }}><XIcon className="w-4 h-4 mr-2" /> Ver Cancelados</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleRefresh} disabled={refreshingData}><RefreshCw className={cn("w-4 h-4 mr-2", refreshingData && "animate-spin")} /> Atualizar Dados</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                {canDo('Pedidos', 'adicionar') && <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-2" /> Novo Pedido</Button>}
            </div>
          </div>

          {/* Widgets Grid - 2 linhas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatWidget title="Total a Receber" value={formatCurrency(stats.totalAReceber)} icon={DollarSign} color="blue" subtext="Excl. trocas/rep." />
            <StatWidget title="Em Atraso (+15d)" value={formatCurrency(stats.totalVencido)} icon={AlertCircle} color="red" subtext="Entregue e não pago" />
            <StatWidget title="Em Trânsito (Qtd)" value={stats.transitoCount} icon={Truck} color="yellow" />
            <StatWidget title="Valor em Trânsito" value={formatCurrency(stats.valorEmTransito)} icon={Truck} color="orange" />
            <StatWidget title="Abertos" value={stats.abertosCount} icon={FileText} color="purple" />
            <StatWidget title="Rotas Pendentes" value={stats.rotasAtivasCount} icon={Truck} color="slate" />
            <StatWidget title="Trocas" value={stats.trocasCount} icon={RepeatIcon} color="yellow" />
            <StatWidget title="Rep. Recebe" value={`${stats.repRecebeCount} · ${formatCurrency(stats.repRecebeValor)}`} icon={UserCheck} color="purple" />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <TabsList className="bg-slate-100 p-1 rounded-full border border-slate-200 h-auto flex-wrap justify-start">
                    <TabsTrigger value="producao" className="rounded-full gap-2 px-4"><Factory className="w-4 h-4 text-slate-500"/> Em Produção</TabsTrigger>
                    <TabsTrigger value="transito" className="rounded-full gap-2 px-4"><Truck className="w-4 h-4 text-amber-500"/> Em Trânsito <span className="bg-amber-100 text-amber-700 px-2 rounded-full text-[10px]">{stats.transitoCount}</span></TabsTrigger>
                    <TabsTrigger value="abertos" className="rounded-full gap-2 px-4"><FileText className="w-4 h-4 text-blue-500"/> Abertos <span className="bg-blue-100 text-blue-700 px-2 rounded-full text-[10px]">{stats.abertosCount}</span></TabsTrigger>
                    <TabsTrigger value="trocas" className="rounded-full gap-2 px-4"><RepeatIcon className="w-4 h-4 text-amber-500"/> Trocas {stats.trocasCount > 0 && <span className="bg-amber-100 text-amber-700 px-2 rounded-full text-[10px]">{stats.trocasCount}</span>}</TabsTrigger>
                    <TabsTrigger value="autorizacoes" className="rounded-full gap-2 px-4"><Clock className="w-4 h-4 text-orange-500"/> Autorizações {stats.autorizacoesCount > 0 && <span className="bg-orange-100 text-orange-700 px-2 rounded-full text-[10px]">{stats.autorizacoesCount}</span>}</TabsTrigger>
                    <TabsTrigger value="liquidacoes" className="rounded-full gap-2 px-4"><CheckCircle className="w-4 h-4 text-emerald-500"/> Liquidações</TabsTrigger>
                    <TabsTrigger value="cancelados" className="hidden">Cancelados</TabsTrigger>
                    <TabsTrigger value="rotas" className="hidden">Rotas</TabsTrigger>
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
                            <Input placeholder="Buscar pedido... (vírgula p/ múltiplos)" value={searchTerm} onChange={handleSearchChange} className="pl-10 bg-white" />
                        </div>
                        <SeletorItensPorPagina itemsPerPage={itemsPerPage} onChangeItemsPerPage={(v) => { setItemsPerPage(v); setCurrentPage(1); }} />
                    </div>
                )}
            </div>

            <FilterPanel isOpen={showFilters} filters={filters} setFilters={setFilters} onClear={() => setFilters({})} />

            {/* --- SUBNÍVEIS PARA ABA ABERTOS --- */}
            {activeTab === 'abertos' && (
                <div className="flex justify-center md:justify-start animate-in fade-in slide-in-from-top-1">
                    <div className="bg-white p-1 rounded-lg border border-slate-200 inline-flex shadow-sm flex-wrap gap-0.5">
                        <button onClick={() => setAbertosSubTab('todos')} className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5", abertosSubTab === 'todos' ? "bg-blue-50 text-blue-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}>
                            Todos <span className="bg-blue-100 text-blue-700 px-1.5 rounded-full text-[10px]">{stats.abertosCount + stats.repRecebeCount}</span>
                        </button>
                        <button onClick={() => setAbertosSubTab('em_dia')} className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5", abertosSubTab === 'em_dia' ? "bg-emerald-50 text-emerald-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}>
                            Em Dia {stats.emDiaCount > 0 && <span className="bg-emerald-100 text-emerald-700 px-1.5 rounded-full text-[10px]">{stats.emDiaCount}</span>}
                        </button>
                        <button onClick={() => setAbertosSubTab('atrasado')} className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5", abertosSubTab === 'atrasado' ? "bg-red-50 text-red-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}>
                            Em Atraso {stats.atrasadoCount > 0 && <span className="bg-red-100 text-red-700 px-1.5 rounded-full text-[10px]">{stats.atrasadoCount}</span>}
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
                        <button onClick={() => setAbertosSubTab('representante_recebe')} className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5", abertosSubTab === 'representante_recebe' ? "bg-purple-50 text-purple-700 shadow-sm" : "text-slate-600 hover:bg-slate-50")}>
                            <UserCheck className="w-3.5 h-3.5" /> Rep. Recebe {stats.repRecebeCount > 0 && <span className="bg-purple-100 text-purple-700 px-1.5 rounded-full text-[10px]">{stats.repRecebeCount}</span>}
                        </button>
                    </div>
                </div>
            )}

            {/* --- CONTEÚDO DAS ABAS --- */}

            <TabsContent value="producao">
                <ProducaoTab canDo={canDo} />
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
                    {currentPedidos.length > 0 ? currentPedidos.map(p => (
                        <div key={p.id} className={cn(
                            "border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-3",
                            p.cliente_pendente ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"
                        )}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className={cn(
                                        "font-bold text-xs uppercase tracking-wider mb-1 block",
                                        p.cliente_pendente ? "text-amber-700" : "text-slate-400"
                                    )}>
                                        #{p.numero_pedido}
                                    </span>
                                    <h3 className="font-bold text-slate-800 line-clamp-1" title={p.cliente_nome}>
                                        {p.cliente_nome}
                                    </h3>
                                    {p.cliente_pendente ? (
                                        <Badge variant="outline" className="mt-1 bg-amber-100 text-amber-700 border-amber-300 text-[10px]">
                                            <AlertTriangle className="w-3 h-3 mr-1" /> Cliente Não Cadastrado
                                        </Badge>
                                    ) : (
                                        <p className="text-xs text-slate-500 font-mono mt-0.5">{p.cliente_codigo}</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Valor</span>
                                    <span className="text-lg font-bold text-emerald-600">{formatCurrency(p.valor_pedido)}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-slate-500 py-2 border-t border-slate-100/50 border-b">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" /> 
                                    {p.data_entrega ? format(new Date(p.data_entrega), 'dd/MM/yyyy') : '-'}
                                </div>
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" /> 
                                    {p.cliente_regiao || 'Sem região'}
                                </div>
                            </div>

                            <div className="mt-auto pt-2">
                                {p.cliente_pendente ? (
                                    <Button 
                                        className="w-full bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200" 
                                        onClick={() => { 
                                            setPedidoParaCadastro(p); 
                                            setShowCadastrarClienteModal(true); 
                                        }}
                                    >
                                        <UserPlus className="w-4 h-4 mr-2" /> Cadastrar Cliente
                                    </Button>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button 
                                            size="sm" 
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" 
                                            onClick={() => handleConfirmarEntrega(p)}
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" /> Confirmar
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300" 
                                            onClick={() => handleCancelar(p)}
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border-dashed border-2 border-slate-200 rounded-xl bg-slate-50/50">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                                <Truck className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">Nenhum pedido em trânsito</h3>
                            <p className="text-slate-500 max-w-sm mt-1">Importe uma rota ou lance novos pedidos.</p>
                        </div>
                    )}
                </div>
                <PaginacaoControles currentPage={currentPage} totalPages={totalPages} totalItems={processedPedidos.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
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
                    <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {currentBorderos.length > 0 ? currentBorderos.map(bordero => (
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
                    <PaginacaoControles currentPage={currentPageBorderos} totalPages={totalPagesBorderos} totalItems={filteredBorderos.length} itemsPerPage={borderosPerPage} onPageChange={setCurrentPageBorderos} />
                    </>
                ) : (
                    <>
                    <PedidoTable 
                        pedidos={currentPedidos} 
                        onEdit={handleEdit} 
                        onView={handleView} 
                        onLiquidar={handleLiquidar} 
                        onCancelar={handleCancelar} 
                        onReverter={(p) => { setPedidoParaReverter(p); setShowReverterDialog(true); }}
                        isLoading={loadingPedidos}
                        showBorderoRef={true}
                    />
                    <PaginacaoControles currentPage={currentPage} totalPages={totalPages} totalItems={processedPedidos.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
                    </>
                )}
            </TabsContent>

            {/* ABA TROCAS */}
            <TabsContent value="trocas">
                {viewMode === 'table' ? (
                    <PedidoTable 
                        pedidos={currentPedidos} 
                        onEdit={handleEdit} 
                        onView={handleView} 
                        onLiquidar={handleLiquidar} 
                        onCancelar={handleCancelar} 
                        onReverter={null}
                        onMudarStatus={handleMudarStatusEspecial}
                        isLoading={loadingPedidos}
                        sortConfig={sortConfig} 
                        onSort={handleSort}
                    />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {currentPedidos.map(pedido => (
                            <PedidoGridCard key={pedido.id} pedido={pedido} onEdit={handleEdit} onView={handleView} onLiquidar={handleLiquidar} onCancelar={handleCancelar} canDo={canDo} />
                        ))}
                    </div>
                )}
                <PaginacaoControles currentPage={currentPage} totalPages={totalPages} totalItems={processedPedidos.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
            </TabsContent>

            {/* ABERTOS & CANCELADOS */}
            <TabsContent value="abertos">
                {viewMode === 'table' ? (
                    <PedidoTable 
                        pedidos={currentPedidos} 
                        onEdit={handleEdit} 
                        onView={handleView} 
                        onLiquidar={handleLiquidar} 
                        onCancelar={handleCancelar} 
                        onReverter={null}
                        onMudarStatus={handleMudarStatusEspecial}
                        isLoading={loadingPedidos}
                        sortConfig={sortConfig} 
                        onSort={handleSort}     
                    />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {currentPedidos.map(pedido => (
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
                <PaginacaoControles currentPage={currentPage} totalPages={totalPages} totalItems={processedPedidos.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
            </TabsContent>

            <TabsContent value="cancelados">
                {viewMode === 'table' ? (
                    <PedidoTable 
                        pedidos={currentPedidos} 
                        onEdit={handleEdit} 
                        onView={handleView} 
                        onLiquidar={handleLiquidar} 
                        onCancelar={handleCancelar} 
                        onReverter={null}
                        isLoading={loadingPedidos}
                    />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {currentPedidos.map(pedido => (
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
                <PaginacaoControles currentPage={currentPage} totalPages={totalPages} totalItems={processedPedidos.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
            </TabsContent>

          </Tabs>

          <ModalContainer open={showImportModal} onClose={() => setShowImportModal(false)} title="Importar Pedidos" size="lg">
            <ImportarPedidos 
                clientes={clientes} 
                pedidosExistentes={pedidos} 
                onImportComplete={() => { queryClient.invalidateQueries({queryKey:['pedidos']}); queryClient.invalidateQueries({queryKey:['rotas']}); setShowImportModal(false); toast.success('Importado!'); }} 
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

          <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Novo Pedido" size="lg"><PedidoForm clientes={clientes} representantes={representantes} onAddRepresentante={() => setShowAddRepresentanteModal(true)} onSave={(data) => createMutation.mutate(data)} onCancel={() => setShowAddModal(false)} isLoading={createMutation.isPending} /></ModalContainer>
          <ModalContainer open={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Pedido" size="lg"><PedidoForm pedido={selectedPedido} clientes={clientes} representantes={representantes} onAddRepresentante={() => setShowAddRepresentanteModal(true)} onSave={(data) => updateMutation.mutate({ id: selectedPedido.id, data })} onCancel={() => setShowEditModal(false)} isLoading={updateMutation.isPending} /></ModalContainer>
          <ModalContainer open={showLiquidarModal} onClose={() => setShowLiquidarModal(false)} title="Liquidar"><LiquidacaoForm pedido={selectedPedido} onSave={(data) => updateMutation.mutate({ id: selectedPedido.id, data })} onCancel={() => setShowLiquidarModal(false)} /></ModalContainer>
          <ModalContainer open={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Detalhes" size="xl">
             {selectedPedido?.isBordero ? <BorderoDetails bordero={selectedPedido} pedidos={pedidos} onClose={() => setShowDetailsModal(false)}/> : <PedidoDetails pedido={selectedPedido} onClose={() => setShowDetailsModal(false)} />}
          </ModalContainer>
          <ModalContainer open={showAutorizacaoModal} onClose={() => setShowAutorizacaoModal(false)} title="Aprovar Liquidação" size="xl"><AprovarLiquidacaoModal autorizacao={selectedAutorizacao} todosPedidos={pedidos} onAprovar={handleAprovarSolicitacao} onRejeitar={async (motivo) => { setIsProcessing(true); try { await base44.entities.LiquidacaoPendente.update(selectedAutorizacao.id, { status: 'rejeitado', motivo_rejeicao: motivo }); await refetchAutorizacoes(); setShowAutorizacaoModal(false); toast.success('Solicitação rejeitada.'); } catch(e) { toast.error("Erro ao rejeitar"); } finally { setIsProcessing(false); } }} onCancel={() => setShowAutorizacaoModal(false)} isProcessing={isProcessing} /></ModalContainer>
          <ModalContainer open={showAlterarPortadorModal} onClose={() => setShowAlterarPortadorModal(false)} title="Alterar Portador" size="lg">
             {selectedRota && <AlterarPortadorModal rota={selectedRota} pedidos={pedidos.filter(p => p.rota_importada_id === selectedRota.id)} onSave={() => {setShowAlterarPortadorModal(false); toast.success("Portador alterado");}} onCancel={() => setShowAlterarPortadorModal(false)} />}
          </ModalContainer>
          <ModalContainer open={showCadastrarClienteModal} onClose={() => setShowCadastrarClienteModal(false)} title="Cadastrar Cliente" size="lg">
             <ClienteForm 
               cliente={{ nome: pedidoParaCadastro?.cliente_nome }}
               representantes={representantes} 
               onAddRepresentante={() => setShowAddRepresentanteModal(true)}
               onSave={async (data) => {
                 try {
                   const novoCliente = await base44.entities.Cliente.create(data);
                   const nomeAlvo = pedidoParaCadastro.cliente_nome.trim().toLowerCase();
                   const pedidosParaVincular = pedidos.filter(p => 
                     p.cliente_pendente && 
                     (p.cliente_nome.trim().toLowerCase() === nomeAlvo || p.cliente_nome.trim().toLowerCase().includes(nomeAlvo))
                   );

                   const updatePromises = pedidosParaVincular.map(p => 
                     base44.entities.Pedido.update(p.id, {
                       cliente_codigo: novoCliente.codigo,
                       cliente_regiao: novoCliente.regiao,
                       cliente_pendente: false,
                       porcentagem_comissao: novoCliente.porcentagem_comissao,
                       representante_codigo: novoCliente.representante_codigo,
                       representante_nome: novoCliente.representante_nome
                     })
                   );

                   await Promise.all(updatePromises);
                   await refetchPedidos();
                   
                   setShowCadastrarClienteModal(false);
                   toast.success(`Cliente cadastrado! ${updatePromises.length} pedido(s) vinculados.`);
                 } catch (e) {
                   toast.error("Erro ao cadastrar cliente.");
                   console.error(e);
                 }
               }} 
               onCancel={() => setShowCadastrarClienteModal(false)} 
             />
          </ModalContainer>
          <ModalContainer open={showAddRepresentanteModal} onClose={() => setShowAddRepresentanteModal(false)} title="Novo Representante">
             <AdicionarRepresentanteModal onSave={async (data) => {
                 await base44.entities.Representante.create(data);
                 await refetchRepresentantes();
                 setShowAddRepresentanteModal(false);
                 toast.success("Representante adicionado!");
             }} onCancel={() => setShowAddRepresentanteModal(false)} />
          </ModalContainer>
          
          {/* ALERTA: PEDIDO JÁ PAGO */}
          <AlertDialog open={!!pedidoJaPagoAlerta} onOpenChange={(open) => { if (!open) setPedidoJaPagoAlerta(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
                  <AlertCircle className="w-5 h-5" /> ATENÇÃO: Pedido Já Pago
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-700 leading-relaxed">
                  Este pedido já consta como <strong>Pago</strong> no sistema.
                  {pedidoJaPagoAlerta?.data_pagamento && (
                    <><br />Data: <strong>{new Date(pedidoJaPagoAlerta.data_pagamento).toLocaleDateString('pt-BR')}</strong></>
                  )}
                  {pedidoJaPagoAlerta?.bordero_numero && (
                    <><br />Borderô: <strong>#{pedidoJaPagoAlerta.bordero_numero}</strong></>
                  )}
                  <br /><br />Deseja confirmar a entrega mesmo assim?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPedidoJaPagoAlerta(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => { doConfirmarEntrega(pedidoJaPagoAlerta); setPedidoJaPagoAlerta(null); }}
                >
                  Confirmar Mesmo Assim
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <ModalContainer open={showMesclarNFModal} onClose={() => setShowMesclarNFModal(false)} title="Mesclar NF" description="Selecione os pedidos do mesmo cliente para gerar uma NF consolidada" size="lg">
            <MesclarNFModal
              pedidos={pedidos}
              onConfirmar={handleMesclarNF}
              onCancel={() => setShowMesclarNFModal(false)}
              isLoading={isProcessing}
            />
          </ModalContainer>

          <ModalContainer open={showCancelarPedidoModal} onClose={() => setShowCancelarPedidoModal(false)} title="Cancelar Pedido" description="Informe o motivo do cancelamento">
            {pedidoParaCancelar && (
              <CancelarPedidoModal 
                pedido={pedidoParaCancelar} 
                onSave={handleSaveCancelarPedido} 
                onCancel={() => setShowCancelarPedidoModal(false)} 
              />
            )}
          </ModalContainer>

        </div>
      </div>
    </PermissionGuard>
  );
}
// --- COMPONENTE DA ABA DE PRODUÇÃO ---
function ProducaoTab({ canDo }) {
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const queryClient = useQueryClient();

    const { data: producaoAtual = [], isLoading } = useQuery({
        queryKey: ['producao_items'],
        queryFn: () => base44.entities.ProducaoItem.list() 
    });

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

            let currentPedido = '';
            let currentClienteCodigo = '';
            let currentClienteNome = '';
            const parsedItems = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;

                const colA = String(row[0]).trim();
                
                if (colA.toLowerCase().includes('total geral')) break;

                if (colA === 'Pedido:') {
                    currentPedido = String(row[1]).replace('.0', '').trim();
                    currentClienteCodigo = String(row[7]).trim(); 
                    currentClienteNome = String(row[8]).trim();   
                    
                    const nextRow = rows[i + 1];
                    if (nextRow && (String(nextRow[0]).trim() === 'F' || String(nextRow[0]).trim() === 'J') && nextRow[7]) {
                        currentClienteNome = String(nextRow[7]).trim();
                    }
                    continue;
                }

                const isItemRow = /^(\d+(\.\d+)?)$/.test(colA) && row[1] && row[1] !== '';

                if (currentPedido && isItemRow) {
                    const codigoProd = String(row[1]).trim();
                    let descricaoProd = String(row[3] || '').trim();
                    if (!descricaoProd || descricaoProd.length < 3) {
                        descricaoProd = row.find((c, idx) => idx > 1 && typeof c === 'string' && c.trim().length > 5) || 'Produto sem descrição';
                    }

                    let qtdeProd = parseFloat(row[10]);
                    if (isNaN(qtdeProd) || qtdeProd <= 0) {
                        for (let c = row.length - 1; c >= 2; c--) {
                            if (!isNaN(parseFloat(row[c])) && parseFloat(row[c]) > 0) {
                                qtdeProd = parseFloat(row[c]);
                                break;
                            }
                        }
                    }

                    if (codigoProd && descricaoProd && qtdeProd > 0) {
                        parsedItems.push({
                            numero_pedido: currentPedido,
                            cliente_codigo: currentClienteCodigo,
                            cliente_nome: currentClienteNome,
                            produto_codigo: codigoProd,
                            descricao: descricaoProd,
                            quantidade: qtdeProd,
                            valor_unitario: 0, 
                            valor_total: 0
                        });
                    }
                }
            }

            if (parsedItems.length === 0) {
                toast.warning("A planilha foi lida, mas nenhuma peça válida foi encontrada.");
            } else {
                setPreviewData(parsedItems);
                toast.success(`Leitura concluída! ${parsedItems.length} peças prontas para revisão.`);
            }

        } catch (error) {
            console.error(error);
            toast.error("Erro ao ler arquivo do Neo.");
        } finally {
            setIsUploading(false);
            e.target.value = ''; 
        }
    };
// FUNÇÃO "WIPE & REPLACE" (Fatiado em lotes de 300 para não travar o banco)
    const handleSalvarProducao = async () => {
        if (!previewData || previewData.length === 0) return;
        setIsSaving(true);
        const BATCH_SIZE = 300; // Quantidade de registros enviados por vez

        try {
            // 1. Apagar tudo que existe (Wipe Loteado)
            if (producaoAtual.length > 0) {
                toast.info(`Limpando ${producaoAtual.length} itens antigos...`);
                for (let i = 0; i < producaoAtual.length; i += BATCH_SIZE) {
                    const lote = producaoAtual.slice(i, i + BATCH_SIZE);
                    await Promise.all(lote.map(item => base44.entities.ProducaoItem.delete(item.id)));
                }
            }

            // 2. Salvar nova carga (Replace Loteado)
            toast.info(`Salvando ${previewData.length} novos itens...`);
            const payload = previewData.map(item => ({
                ...item,
                data_atualizacao: new Date().toISOString()
            }));
            
            for (let i = 0; i < payload.length; i += BATCH_SIZE) {
                const lotePayload = payload.slice(i, i + BATCH_SIZE);
                await base44.entities.ProducaoItem.bulkCreate(lotePayload);
            }
            
            await queryClient.invalidateQueries({ queryKey: ['producao_items'] });
            setPreviewData(null);
            toast.success("✅ Tabela de produção atualizada com sucesso!");
        } catch (error) {
            toast.error("Erro ao atualizar base de produção.");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLimparProducao = async () => {
        if (!window.confirm("Isso vai apagar todos os itens em produção do sistema. Tem certeza?")) return;
        setIsSaving(true);
        const BATCH_SIZE = 300;

        try {
            for (let i = 0; i < producaoAtual.length; i += BATCH_SIZE) {
                const lote = producaoAtual.slice(i, i + BATCH_SIZE);
                await Promise.all(lote.map(item => base44.entities.ProducaoItem.delete(item.id)));
            }
            await queryClient.invalidateQueries({ queryKey: ['producao_items'] });
            toast.success("Base de produção esvaziada!");
        } catch (error) {
            toast.error("Erro ao limpar base.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleLimparProducao = async () => {
        if (!window.confirm("Isso vai apagar todos os itens em produção do sistema. Tem certeza?")) return;
        setIsSaving(true);
        try {
            const deletePromises = producaoAtual.map(item => base44.entities.ProducaoItem.delete(item.id));
            await Promise.all(deletePromises);
            await queryClient.invalidateQueries({ queryKey: ['producao_items'] });
            toast.success("Base de produção esvaziada!");
        } catch (error) {
            toast.error("Erro ao limpar base.");
        } finally {
            setIsSaving(false);
        }
    };

    const displayData = previewData || producaoAtual;
    const isPreview = !!previewData;
    const lastSyncDate = producaoAtual?.[0]?.data_atualizacao || producaoAtual?.[0]?.created_date;

    return (
        <div className="space-y-6">
            <Card className="p-6 bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Factory className="w-6 h-6 text-blue-400" />
                        Chão de Fábrica (Sincronização Neo)
                    </h2>
                    <p className="text-slate-400 mt-1 text-sm max-w-xl">
                        Suba o relatório <strong>pedidoqt.xls</strong>. Os dados anteriores serão apagados e substituídos instantaneamente.
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {canDo('Pedidos', 'adicionar') && (
                        <>
                            {producaoAtual.length > 0 && !previewData && (
                                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors" onClick={handleLimparProducao} disabled={isSaving}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Esvaziar Base
                                </Button>
                            )}

                            <input type="file" accept=".xls,.xlsx,.csv" id="neo-upload" className="hidden" onChange={handleFileUpload} />
                            <Label htmlFor="neo-upload" className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer", (isUploading || isSaving) && "opacity-50 cursor-not-allowed")}>
                                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                                {isUploading ? 'Lendo Excel...' : 'Subir Planilha do Neo'}
                            </Label>
                        </>
                    )}
                </div>
            </Card>

            {previewData && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between animate-in fade-in">
                    <div>
                        <h3 className="font-bold text-amber-800">⚠️ Modo de Visualização (Prévia)</h3>
                        <p className="text-sm text-amber-700">Você carregou <strong>{previewData.length} peças</strong>. Elas ainda não estão salvas.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="bg-white border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => setPreviewData(null)} disabled={isSaving}>Cancelar</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200" onClick={handleSalvarProducao} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                            Confirmar Substituição
                        </Button>
                    </div>
                </div>
            )}

            {/* AQUI NÓS CHAMAMOS A TABELA QUE VOCÊ ACABOU DE CRIAR! */}
            <EmProducaoTable 
                data={displayData} 
                isLoading={isLoading && !previewData} 
                isPreview={isPreview}
                lastSync={lastSyncDate}
            />
            
        </div>
    );
}
