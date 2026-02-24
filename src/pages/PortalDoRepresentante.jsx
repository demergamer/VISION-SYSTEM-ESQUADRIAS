import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Users, ShoppingCart, CreditCard, AlertCircle, 
  Search, Briefcase, LogOut, Loader2, 
  ChevronDown, ChevronRight, MapPin, Truck, Eye, Wallet, CalendarClock, DollarSign,
  Lock, UserPlus, Edit, FileText, Building2, Mail, Package, Factory, User, Settings, ChevronUp
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Componentes Internos
import PinGateway from "@/components/portais/PinGateway";
import ModalContainer from "@/components/modals/ModalContainer";
import SolicitarNovoCliente from "@/components/portais/representante/SolicitarNovoCliente";
import LiquidacaoSelfService from "@/components/portais/cliente/LiquidacaoSelfService";
import NovaLiquidacaoRepresentante from "@/components/portais/representante/NovaLiquidacaoRepresentante";
import ConviteClienteModal from "@/components/portais/representante/ConviteClienteModal";
import BorderoDetailsModal from "@/components/portais/representante/BorderoDetailsModal";
import SolicitarOrcamentoModal from "@/components/portais/representante/SolicitarOrcamentoModal";
import ComissaoModal from "@/components/portais/representante/ComissaoModal";
import MinhasAutorizacoesModal from "@/components/portais/representante/MinhasAutorizacoesModal";
import RepresentanteDetails from "@/components/representantes/RepresentanteDetails";
import RepresentanteForm from "@/components/representantes/RepresentanteForm";
import ClienteDetails from "@/components/clientes/ClienteDetails";
import ClienteForm from "@/components/clientes/ClienteForm";

// --- UTILITÁRIOS ---
const realizarLogout = () => {
  try { localStorage.clear(); sessionStorage.clear(); window.location.href = '/'; } 
  catch (e) { window.location.reload(); }
};

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

// --- COMPONENTE: WIDGET DE ESTATÍSTICA ---
const StatWidget = ({ title, value, subtitle, icon: Icon, colorClass }) => (
  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
    <div className="flex justify-between items-start mb-3">
      <div className={`p-3 rounded-2xl ${colorClass}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {subtitle && <Badge variant="secondary" className="font-normal bg-slate-100">{subtitle}</Badge>}
    </div>
    <div>
      <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</h3>
      <p className="text-sm font-medium text-slate-500 mt-1 uppercase tracking-wide">{title}</p>
    </div>
  </div>
);

// --- COMPONENTE: MODAL DE DETALHES ---
const DetailsModal = ({ item, type, open, onOpenChange }) => {
  if (!item) return null;

  const getTitle = () => {
    if (type === 'pedido') return `Pedido #${item.numero_pedido}`;
    if (type === 'cheque') return `Cheque #${item.numero_cheque}`;
    if (type === 'credito') return `Crédito Ref. ${item.referencia || 'N/A'}`;
    return 'Detalhes';
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0" style={{ scrollbarWidth: 'auto', scrollbarColor: '#888 #f1f1f1' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {type === 'pedido' ? <ShoppingCart className="w-5 h-5" /> : type === 'cheque' ? <CreditCard className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
            Detalhes do Item
          </DialogTitle>
          <DialogDescription>{getTitle()}</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 px-6 pb-6 bg-slate-50 rounded-xl border mx-6" style={{ scrollbarWidth: 'auto', scrollbarColor: '#888 #f1f1f1' }}>
          <div className="space-y-4 pt-4">
            {Object.entries(item).map(([key, value]) => {
              if (key === 'id' || key === 'representante_codigo' || typeof value === 'object') return null;
              return (
                <div key={key} className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-2 last:border-0">
                  <span className="text-sm font-medium text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="col-span-2 text-sm text-slate-800 font-semibold break-words">
                    {key.includes('valor') || key.includes('saldo') || key.includes('total') 
                      ? formatCurrency(value) 
                      : (key.includes('data') ? (value ? format(new Date(value), 'dd/MM/yyyy') : '-') : String(value))}
                  </span>
                </div>
              )
            })}
            {type === 'pedido' && item.itens && (
              <div className="mt-6">
                <h4 className="font-bold text-slate-800 mb-2">Itens do Pedido</h4>
                <div className="bg-white rounded-lg border p-2">
                  <pre className="text-xs text-slate-600 overflow-auto">{JSON.stringify(item.itens, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// --- COMPONENTE: VISÃO POR PEDIDOS (ABA GERAL) ---
const PedidosView = ({ pedidos, onViewDetails }) => {
  const [activeTab, setActiveTab] = useState('abertos');
  const [searchTerm, setSearchTerm] = useState('');

  const safePedidos = pedidos || [];
  
  const filtrarPorBusca = (lista) => {
    if (!searchTerm) return lista;
    return lista.filter(p => 
      p.numero_pedido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.valor_pedido?.toString().includes(searchTerm)
    );
  };

  const pedidosEmProducao = filtrarPorBusca(safePedidos.filter(p => p.status === 'em_producao'));
  const pedidosEmTransito = filtrarPorBusca(safePedidos.filter(p => p.status === 'em_transito' || p.status === 'aguardando'));
  const pedidosAbertos = filtrarPorBusca(safePedidos.filter(p => p.status === 'aberto' || p.status === 'parcial'));
  const pedidosLiquidados = filtrarPorBusca(safePedidos.filter(p => p.status === 'pago'));

  const getPedidosAtuais = () => {
    switch(activeTab) {
      case 'producao': return pedidosEmProducao;
      case 'transito': return pedidosEmTransito;
      case 'abertos': return pedidosAbertos;
      case 'liquidados': return pedidosLiquidados;
      default: return [];
    }
  };

  const pedidosExibidos = getPedidosAtuais();

  return (
    <div className="space-y-4">
      {/* Barra de Ferramentas */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white rounded-2xl p-4 border border-slate-200">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-auto flex-wrap justify-start gap-2">
            <TabsTrigger value="producao" className="rounded-lg px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
              🏗️ Em Produção <Badge className="ml-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-0">{pedidosEmProducao.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="transito" className="rounded-lg px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm">
              🚚 Em Trânsito <Badge className="ml-2 bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">{pedidosEmTransito.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="abertos" className="rounded-lg px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
              📂 Em Aberto <Badge className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">{pedidosAbertos.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="liquidados" className="rounded-lg px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">
              💲 Liquidados <Badge className="ml-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">{pedidosLiquidados.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por cliente, pedido ou valor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      {pedidosExibidos.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                {activeTab === 'abertos' && <TableHead className="text-right">Saldo</TableHead>}
                {activeTab === 'liquidados' && <TableHead>Borderô</TableHead>}
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosExibidos.map(p => {
                const hoje = new Date();
                hoje.setHours(0,0,0,0);
                const diasAtraso = p.data_entrega ? differenceInDays(hoje, parseISO(p.data_entrega)) : 0;
                const isAtrasado = (p.status === 'aberto' || p.status === 'parcial') && diasAtraso > 15;

                return (
                  <TableRow key={p.id} className="hover:bg-slate-50">
                    <TableCell className="text-sm text-slate-600">
                      {p.data_entrega ? format(new Date(p.data_entrega), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="font-mono font-medium">#{p.numero_pedido}</TableCell>
                    <TableCell>{p.cliente_nome}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(p.valor_pedido)}</TableCell>
                    {activeTab === 'abertos' && (
                      <TableCell className="text-right">
                        <span className={cn("font-bold", isAtrasado ? "text-red-600" : "text-blue-600")}>
                           {formatCurrency(p.saldo_restante || 0)}
                        </span>
                      </TableCell>
                    )}
                    {activeTab === 'liquidados' && (
                      <TableCell>
                        {p.bordero_numero ? (
                          <Badge variant="outline" className="font-mono">#{p.bordero_numero}</Badge>
                        ) : '-'}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <Badge className={cn(
                        "text-xs",
                        p.status === 'pago' && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
                        isAtrasado && "bg-red-100 text-red-700 hover:bg-red-100",
                        !isAtrasado && p.status === 'aberto' && "bg-blue-100 text-blue-700 hover:bg-blue-100",
                        !isAtrasado && p.status === 'parcial' && "bg-amber-100 text-amber-700 hover:bg-amber-100",
                        (p.status === 'em_transito' || p.status === 'aguardando') && "bg-orange-100 text-orange-700 hover:bg-orange-100"
                      )}>
                        {p.status === 'pago' ? '✅ Pago' : 
                         isAtrasado ? `⚠️ Atrasado (+${diasAtraso}d)` :
                         p.status === 'parcial' ? '⏳ Parcial' :
                         p.status === 'em_transito' || p.status === 'aguardando' ? '🚚 Em Trânsito' :
                         '📂 Aberto'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" onClick={() => onViewDetails(p, 'pedido')} className="gap-1"><Eye className="w-4 h-4" /> Ver</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum pedido encontrado nesta categoria.</p>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE: LINHA DO CLIENTE EXPANSÍVEL (ATUALIZADA COM SUBNÍVEIS) ---
const ClientRow = ({ cliente, pedidos, cheques, creditos, onViewDetails, onSolicitarLiquidacao, onViewClientDetails, onEditClient, onInviteClient }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [innerTab, setInnerTab] = useState('abertos');
  
  // Garantir que os arrays existam
  const safePedidos = pedidos || [];
  const safeCheques = cheques || [];
  const safeCreditos = creditos || [];
  
  // 1. Cálculos de Filtros
  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  const pedidosProducao = safePedidos.filter(p => p.status === 'em_producao');
  const pedidosTransito = safePedidos.filter(p => ['em_transito', 'aguardando'].includes(p.status));
  const pedidosPagos = safePedidos.filter(p => p.status === 'pago');
  
  // Regra > 15 dias
  const pedidosAtrasados = safePedidos.filter(p => {
    if ((p.status !== 'aberto' && p.status !== 'parcial') || !p.data_entrega) return false;
    return differenceInDays(hoje, parseISO(p.data_entrega)) > 15; 
  });
  
  // Aberto = Aberto/Parcial E NÃO Atrasado
  const pedidosAbertos = safePedidos.filter(p => 
    (['aberto', 'parcial'].includes(p.status)) && 
    !pedidosAtrasados.some(pa => pa.id === p.id)
  );

  const creditosDisponiveis = safeCreditos.filter(c => c.status === 'disponivel');
  const chequesDisponiveis = safeCheques.filter(c => c.status === 'normal');

  // Cálculos Financeiros
  const totalDevendo = safePedidos.reduce((acc, p) => acc + (p.saldo_restante || 0), 0);
  const temAtraso = pedidosAtrasados.length > 0;
  
  // Função para renderizar tabela condicional
  const renderTable = () => {
    let data = [];
    let type = 'pedido';

    switch(innerTab) {
        case 'producao': data = pedidosProducao; break;
        case 'transito': data = pedidosTransito; break;
        case 'abertos': data = pedidosAbertos; break;
        case 'atrasados': data = pedidosAtrasados; break;
        case 'finalizados': data = pedidosPagos; break;
        case 'creditos': data = creditosDisponiveis; type = 'credito'; break;
        case 'cheques': data = chequesDisponiveis; type = 'cheque'; break;
        default: data = [];
    }

    if (data.length === 0) {
        return <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-lg border border-dashed">Nenhum item nesta categoria.</div>;
    }

    return (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead>{type === 'pedido' ? 'Pedido' : type === 'cheque' ? 'Cheque' : 'Ref.'}</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        {type === 'pedido' && <TableHead className="text-right">Saldo</TableHead>}
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map(item => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50">
                            <TableCell className="font-mono">
                                {type === 'pedido' ? `#${item.numero_pedido}` : 
                                 type === 'cheque' ? item.numero_cheque : 
                                 item.referencia}
                            </TableCell>
                            <TableCell>
                                {type === 'pedido' ? (item.data_entrega ? format(new Date(item.data_entrega), 'dd/MM/yy') : '-') : 
                                 type === 'cheque' ? (item.data_vencimento ? format(new Date(item.data_vencimento), 'dd/MM/yy') : '-') :
                                 (item.data_emissao ? format(new Date(item.data_emissao), 'dd/MM/yy') : '-')}
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                                {formatCurrency(type === 'pedido' ? item.valor_pedido : item.valor || item.valor_original)}
                            </TableCell>
                            {type === 'pedido' && (
                                <TableCell className="text-right font-bold text-slate-800">
                                    {formatCurrency(item.saldo_restante)}
                                </TableCell>
                            )}
                            <TableCell className="text-center">
                                <Badge variant="outline" className={cn(
                                    "text-[10px]",
                                    innerTab === 'atrasados' ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-600 border-slate-200"
                                )}>
                                    {innerTab === 'atrasados' ? 'Atrasado' : item.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Button size="sm" variant="ghost" onClick={() => onViewDetails(item, type)}><Eye className="w-4 h-4 text-slate-400"/></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
  };

  return (
    <div className={`mb-4 bg-white rounded-2xl border transition-all duration-300 ${isExpanded ? 'shadow-md border-blue-200 ring-1 ring-blue-100' : 'shadow-sm border-slate-100'}`}>
      
      <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-4 cursor-pointer flex-1 hover:opacity-80 transition-opacity">
          <div className="relative shrink-0">
            <Avatar className="w-12 h-12 border border-slate-200 shadow-sm">
              {cliente.logo_url && <AvatarImage src={cliente.logo_url} className="object-cover" />}
              <AvatarFallback className={cn("text-sm font-bold", temAtraso ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600")}>
                {(cliente.nome_fantasia || cliente.nome || '').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {temAtraso && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />}
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-800">{cliente.nome}</h4>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {cliente.regiao || 'Sem região'}</span>
              <span className="font-mono bg-slate-100 px-2 rounded text-xs">{cliente.codigo}</span>
              {totalDevendo > 0 && <span className="text-red-600 font-bold bg-red-50 px-2 rounded text-xs">Devendo: {formatCurrency(totalDevendo)}</span>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!cliente.email && <Button size="sm" variant="destructive" onClick={(e) => {e.stopPropagation(); onInviteClient(cliente)}} className="gap-2 bg-red-600 hover:bg-red-700 animate-pulse"><Mail className="w-4 h-4" /> CONVIDE AGORA</Button>}
          <Button size="sm" variant="outline" onClick={(e) => {e.stopPropagation(); onViewClientDetails(cliente)}} className="gap-1"><Eye className="w-4 h-4" /> Ver</Button>
          <Button size="sm" variant="outline" onClick={(e) => {e.stopPropagation(); onEditClient(cliente)}} className="gap-1"><Edit className="w-4 h-4" /> Editar</Button>
          <Button size="sm" variant="ghost" onClick={() => setIsExpanded(!isExpanded)}>{isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}</Button>
        </div>
      </div>

      {/* ÁREA EXPANDIDA */}
      {isExpanded && (
        <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="h-px w-full bg-slate-100 mb-4" />
          
          <Tabs value={innerTab} onValueChange={setInnerTab} className="w-full">
            <TabsList className="bg-slate-100 p-1 rounded-lg h-auto flex-wrap justify-start gap-1 mb-4 w-full">
                <TabsTrigger value="producao" className="text-xs">🏗️ Produção ({pedidosProducao.length})</TabsTrigger>
                <TabsTrigger value="transito" className="text-xs">🚚 Trânsito ({pedidosTransito.length})</TabsTrigger>
                <TabsTrigger value="abertos" className="text-xs">📂 Abertos ({pedidosAbertos.length})</TabsTrigger>
                <TabsTrigger value="atrasados" className="text-xs text-red-600 data-[state=active]:text-red-700">⚠️ Atrasados ({pedidosAtrasados.length})</TabsTrigger>
                <TabsTrigger value="finalizados" className="text-xs text-emerald-600">✅ Pagos ({pedidosPagos.length})</TabsTrigger>
                <TabsTrigger value="creditos" className="text-xs text-emerald-600">💳 Créditos ({creditosDisponiveis.length})</TabsTrigger>
                <TabsTrigger value="cheques" className="text-xs text-purple-600">💵 Cheques ({chequesDisponiveis.length})</TabsTrigger>
            </TabsList>
            
            <div className="min-h-[100px]">
                {renderTable()}
            </div>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t mt-2">
            <Button onClick={() => onSolicitarLiquidacao(cliente)} disabled={pedidosAbertos.length === 0 && pedidosAtrasados.length === 0} className="bg-emerald-600 hover:bg-emerald-700"><DollarSign className="w-4 h-4 mr-2" /> Solicitar Liquidação</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function PainelRepresentante() {
  const [user, setUser] = useState(null);
  const [representante, setRepresentante] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState('clientes');
  const [detailsModal, setDetailsModal] = useState({ open: false, item: null, type: null });
  const [showSolicitarClienteModal, setShowSolicitarClienteModal] = useState(false);
  const [showLiquidacaoModal, setShowLiquidacaoModal] = useState(false);
  const [showLiquidacaoGlobalModal, setShowLiquidacaoGlobalModal] = useState(false);
  const [clienteParaLiquidacao, setClienteParaLiquidacao] = useState(null);
  
  const [clienteDetailsModal, setClienteDetailsModal] = useState({ open: false, cliente: null });
  const [editClienteModal, setEditClienteModal] = useState({ open: false, cliente: null });
  const [inviteClienteModal, setInviteClienteModal] = useState({ open: false, cliente: null });
  const [borderoModal, setBorderoModal] = useState({ open: false, bordero: null });
  const [showOrcamentoModal, setShowOrcamentoModal] = useState(false);
  const [showComissaoModal, setShowComissaoModal] = useState(false);
  const [showAutorizacoesModal, setShowAutorizacoesModal] = useState(false);

  // Perfil do representante
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [showEditPerfilModal, setShowEditPerfilModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const u = await base44.auth.me();
        if (mounted && u) {
          setUser(u);
          const reps = await base44.entities.Representante.list();
          const rep = reps.find(r => r.email === u.email);
          setRepresentante(rep);
        }
      } catch (e) { console.error(e); } 
      finally { if (mounted) setLoading(false); }
    }
    loadData();
    return () => { mounted = false };
  }, []);

  const { data: todosClientes = [], refetch: refetchClientes } = useQuery({ queryKey: ['clientes', representante?.id], queryFn: () => base44.entities.Cliente.list(), enabled: !!representante });
  const { data: todosPedidos = [], refetch: refetchPedidos } = useQuery({ queryKey: ['pedidos', representante?.id], queryFn: () => base44.entities.Pedido.list(), enabled: !!representante });
  const { data: todosCheques = [] } = useQuery({ queryKey: ['cheques', representante?.id], queryFn: () => base44.entities.Cheque.list(), enabled: !!representante });
  const { data: todosCreditos = [] } = useQuery({ queryKey: ['creditos', representante?.id], queryFn: () => base44.entities.Credito.list(), enabled: !!representante });
  const { data: todosBorderos = [] } = useQuery({ 
    queryKey: ['borderos', representante?.id], 
    queryFn: () => base44.entities.Bordero.list(), 
    enabled: !!representante 
  });

  // Meus Pedidos
  const meusPedidos = useMemo(() => {
    if (!representante) return [];
    const safeTodosPedidos = todosPedidos || [];
    return safeTodosPedidos.filter(p => p.representante_codigo === representante.codigo);
  }, [representante, todosPedidos]);

  const meusPedidosAbertos = useMemo(() => {
    const safeMeusPedidos = meusPedidos || [];
    return safeMeusPedidos.filter(p => ['aberto', 'parcial', 'aguardando'].includes(p.status));
  }, [meusPedidos]);

  const meusBorderos = useMemo(() => {
    if (!representante) return [];
    const safeMeusPedidos = meusPedidos || [];
    const safeTodosBorderos = todosBorderos || [];
    const meusPedidosIds = safeMeusPedidos.map(p => p.id);
    return safeTodosBorderos.filter(bordero => {
      const pedidosDoBordero = bordero.pedidos_ids || [];
      return pedidosDoBordero.some(pedidoId => meusPedidosIds.includes(pedidoId));
    });
  }, [representante, todosBorderos, meusPedidos]);

  const meusClientes = useMemo(() => {
    if (!representante) return [];
    const safeTodosClientes = todosClientes || [];
    const safeTodosPedidos = todosPedidos || [];
    const safeTodosCheques = todosCheques || [];
    const safeTodosCreditos = todosCreditos || [];
    
    let clientes = safeTodosClientes.filter(c => c.representante_codigo === representante.codigo);
    if (searchTerm) {
      clientes = clientes.filter(c => c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || c.codigo?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return clientes.map(c => ({
      ...c,
      pedidos: safeTodosPedidos.filter(p => p.cliente_codigo === c.codigo),
      cheques: safeTodosCheques.filter(ch => ch.cliente_codigo === c.codigo),
      creditos: safeTodosCreditos.filter(cr => cr.cliente_codigo === c.codigo)
    }));
  }, [representante, todosClientes, todosPedidos, todosCheques, todosCreditos, searchTerm]);

  const stats = useMemo(() => {
    const clientesComVendas30k = (meusClientes || []).filter(c => {
      const totalVendas = (c.pedidos || []).filter(p => p.status !== 'cancelado').reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
      return totalVendas > 30000;
    }).length;
    
    // SOMA CORRETA DO SALDO
    const totalVendasAbertas = (meusPedidos || []).filter(p => p.status === 'aberto' || p.status === 'parcial').reduce((sum, p) => sum + (p.saldo_restante !== undefined ? p.saldo_restante : (p.valor_pedido - p.total_pago)), 0);
    
    const chequesTotal = (todosCheques || []).filter(c => (meusClientes || []).some(cli => cli.codigo === c.cliente_codigo)).reduce((sum, c) => sum + (c.valor || 0), 0);
    
    return { totalClientes: (meusClientes || []).length, clientes30k: clientesComVendas30k, vendasAbertas: totalVendasAbertas, carteiraCheques: chequesTotal };
  }, [meusClientes, meusPedidos, todosCheques]);

  const handleViewDetails = (item, type) => { setDetailsModal({ open: true, item, type }); };
  const handleSolicitarLiquidacao = (cliente) => { setClienteParaLiquidacao(cliente); setShowLiquidacaoModal(true); };
  const handleViewClientDetails = (cliente) => { setClienteDetailsModal({ open: true, cliente }); };
  const handleEditClient = (cliente) => { setEditClienteModal({ open: true, cliente }); };
  const handleInviteClient = (cliente) => { setInviteClienteModal({ open: true, cliente }); };
  const handleViewBordero = (bordero) => { setBorderoModal({ open: true, bordero }); };

  const handleSaveRepresentante = async (form) => {
    await base44.entities.Representante.update(representante.id, form);
    setRepresentante(prev => ({ ...prev, ...form }));
    setShowEditPerfilModal(false);
    toast.success('Perfil atualizado com sucesso!');
  };

  if (loading) return <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center"><Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" /><p className="text-slate-500 font-medium">Carregando portal...</p></div>;
  if (!user || !representante) return <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6"><Card className="p-8 max-w-md text-center border-amber-200 bg-amber-50"><AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" /><h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Restrito</h2><p className="text-slate-600 mb-4">Email não vinculado a um representante.</p><div className="flex justify-center gap-3"><Button onClick={() => window.location.reload()} variant="outline" className="bg-white">Recarregar</Button><Button onClick={realizarLogout} variant="destructive">Sair</Button></div></Card></div>;

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-20 font-sans text-slate-900">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
        <div className="flex items-center gap-5">
          <Avatar className="w-20 h-20 border-4 border-white shadow-lg cursor-pointer hover:opacity-90 transition-opacity shrink-0" onClick={() => setShowPerfilModal(true)}>
            {representante.foto_url && <AvatarImage src={representante.foto_url} className="object-cover" />}
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-2xl font-bold">
              {(representante.nome_social || representante.nome || '').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Olá, <span className="text-blue-600">{(representante.nome_social || representante.nome).split(' ')[0]}</span></h1>
            <p className="text-sm text-slate-500 font-medium">Portal do Representante</p>
            <div className="flex items-center gap-2 mt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowPerfilModal(true)} className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800">
                <User className="w-3 h-3 mr-1" /> Meus Dados
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowEditPerfilModal(true)} className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800">
                <Edit className="w-3 h-3 mr-1" /> Editar Perfil
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Buscar Cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-full bg-slate-100 border-transparent focus:bg-white transition-all" /></div>
          <Button onClick={realizarLogout} variant="ghost" size="icon" className="rounded-full hover:bg-red-50 hover:text-red-600"><LogOut className="w-5 h-5" /></Button>
        </div>
      </div>
      <div className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 bg-slate-700 hover:bg-slate-800">
                  <Settings className="w-4 h-4" /> Ferramentas <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel>Ações do Portal</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                  <Lock className="w-4 h-4 mr-2" /> 📋 Orçamento
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowSolicitarClienteModal(true)}>
                  <UserPlus className="w-4 h-4 mr-2" /> 👤 Solicitar Cliente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowLiquidacaoGlobalModal(true)} disabled={meusPedidosAbertos.length === 0}>
                  <DollarSign className="w-4 h-4 mr-2" /> 💰 Liquidação
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAutorizacoesModal(true)}>
                  <FileText className="w-4 h-4 mr-2" /> 📋 Minhas Autorizações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowComissaoModal(true)}>
                  <Wallet className="w-4 h-4 mr-2" /> 📊 Comissão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex gap-1"><Button variant={viewMode === 'clientes' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('clientes')} className={cn("rounded-lg h-9 gap-2", viewMode === 'clientes' && "bg-blue-600 hover:bg-blue-700 text-white shadow-sm")}><Building2 className="w-4 h-4" /> Clientes</Button><Button variant={viewMode === 'pedidos' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('pedidos')} className={cn("rounded-lg h-9 gap-2", viewMode === 'pedidos' && "bg-blue-600 hover:bg-blue-700 text-white shadow-sm")}><Package className="w-4 h-4" /> Pedidos</Button><Button variant={viewMode === 'borderos' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('borderos')} className={cn("rounded-lg h-9 gap-2", viewMode === 'borderos' && "bg-blue-600 hover:bg-blue-700 text-white shadow-sm")}><FileText className="w-4 h-4" /> Borderôs</Button></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"><StatWidget title="Clientes na Carteira" value={stats.totalClientes} icon={Users} colorClass="bg-blue-500 shadow-blue-200" /><StatWidget title="Clientes +30k" value={stats.clientes30k} subtitle="VIPs" icon={Briefcase} colorClass="bg-purple-500 shadow-purple-200" /><StatWidget title="Vendas em Aberto" value={formatCurrency(stats.vendasAbertas)} icon={ShoppingCart} colorClass="bg-amber-500 shadow-amber-200" /><StatWidget title="Custódia de Cheques" value={formatCurrency(stats.carteiraCheques)} icon={CreditCard} colorClass="bg-emerald-500 shadow-emerald-200" /></div>
        {viewMode === 'clientes' ? (<div className="space-y-4"><h2 className="text-lg font-bold text-slate-700 ml-2">Carteira de Clientes</h2>{meusClientes.length > 0 ? (meusClientes.map(cliente => (<ClientRow key={cliente.id} cliente={cliente} pedidos={cliente.pedidos} cheques={cliente.cheques} creditos={cliente.creditos} onViewDetails={handleViewDetails} onSolicitarLiquidacao={handleSolicitarLiquidacao} onViewClientDetails={handleViewClientDetails} onEditClient={handleEditClient} onInviteClient={handleInviteClient} />))) : (<div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200"><Users className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500 font-medium">Nenhum cliente encontrado.</p></div>)}</div>) : viewMode === 'pedidos' ? (<PedidosView pedidos={meusPedidos} onViewDetails={handleViewDetails} />) : (<div className="space-y-4"><h2 className="text-lg font-bold text-slate-700 ml-2">Borderôs de Liquidação</h2>{meusBorderos.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{meusBorderos.map(bordero => (<div key={bordero.id} onClick={() => handleViewBordero(bordero)} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-all cursor-pointer group"><div className="flex items-start justify-between mb-3"><div className="flex items-center gap-2"><div className="p-2 rounded-lg bg-blue-100 text-blue-600"><FileText className="w-5 h-5" /></div><div><p className="text-xs text-slate-500 font-bold uppercase">Borderô</p><p className="text-xl font-bold text-slate-800">#{bordero.numero_bordero}</p></div></div><Badge variant="outline">{bordero.tipo_liquidacao}</Badge></div>{bordero.cliente_nome && <p className="text-sm font-medium text-slate-700 mb-2">{bordero.cliente_nome}</p>}<div className="pt-3 border-t border-slate-100"><div className="flex justify-between items-center"><span className="text-xs text-slate-500">Valor Total</span><span className="text-lg font-bold text-emerald-600">{formatCurrency(bordero.valor_total)}</span></div><div className="flex justify-between items-center mt-1"><span className="text-xs text-slate-500">Pedidos</span><span className="text-sm font-medium text-slate-700">{bordero.pedidos_ids?.length || 0}</span></div>{bordero.created_date && <div className="flex justify-between items-center mt-1"><span className="text-xs text-slate-500">Data</span><span className="text-xs text-slate-600">{format(new Date(bordero.created_date), 'dd/MM/yyyy')}</span></div>}</div><div className="mt-3 pt-3 border-t border-slate-100 flex justify-end"><Eye className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" /></div></div>))}</div>) : (<div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200"><FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500 font-medium">Nenhum borderô encontrado.</p></div>)}</div>)}</div>
      <DetailsModal open={detailsModal.open} onOpenChange={(open) => setDetailsModal(prev => ({ ...prev, open }))} item={detailsModal.item} type={detailsModal.type} />
      <ModalContainer open={showSolicitarClienteModal} onClose={() => setShowSolicitarClienteModal(false)} title="Solicitar Cadastro de Cliente" description="Preencha os dados do novo cliente" size="lg"><SolicitarNovoCliente representante={representante} onSuccess={() => { setShowSolicitarClienteModal(false); toast.success('Solicitação enviada!'); }} onCancel={() => setShowSolicitarClienteModal(false)} /></ModalContainer>
      <ModalContainer open={showLiquidacaoModal} onClose={() => { setShowLiquidacaoModal(false); setClienteParaLiquidacao(null); }} title="Solicitar Liquidação" description={clienteParaLiquidacao ? `Cliente: ${clienteParaLiquidacao.nome}` : ''} size="xl">{clienteParaLiquidacao && (<LiquidacaoSelfService pedidos={clienteParaLiquidacao.pedidos.filter(p => ['aberto', 'parcial', 'aguardando'].includes(p.status))} clienteCodigo={clienteParaLiquidacao.codigo} clienteNome={clienteParaLiquidacao.nome} onSuccess={() => { setShowLiquidacaoModal(false); setClienteParaLiquidacao(null); }} onCancel={() => { setShowLiquidacaoModal(false); setClienteParaLiquidacao(null); }} />)}</ModalContainer>
      <NovaLiquidacaoRepresentante open={showLiquidacaoGlobalModal} onClose={() => setShowLiquidacaoGlobalModal(false)} pedidos={meusPedidosAbertos} onSuccess={() => { setShowLiquidacaoGlobalModal(false); refetchPedidos(); }} />
      {/* Modal Ver Cliente - usa ClienteDetails oficial */}
      <Dialog open={clienteDetailsModal.open} onOpenChange={(o) => !o && setClienteDetailsModal({ open: false, cliente: null })}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-slate-600" /> Dados do Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            {clienteDetailsModal.cliente && (
              <ClienteDetails
                cliente={clienteDetailsModal.cliente}
                stats={{}}
                creditos={todosCreditos.filter(c => c.cliente_codigo === clienteDetailsModal.cliente.codigo)}
                onEdit={() => { setClienteDetailsModal({ open: false, cliente: null }); setEditClienteModal({ open: true, cliente: clienteDetailsModal.cliente }); }}
                onClose={() => setClienteDetailsModal({ open: false, cliente: null })}
                onViewPedidos={() => setClienteDetailsModal({ open: false, cliente: null })}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Cliente - usa ClienteForm com isClientMode */}
      <Dialog open={editClienteModal.open} onOpenChange={(o) => !o && setEditClienteModal({ open: false, cliente: null })}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" /> Editar Cadastro do Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {editClienteModal.cliente && (
              <ClienteForm
                cliente={editClienteModal.cliente}
                isClientMode={true}
                onSave={() => { refetchClientes(); setEditClienteModal({ open: false, cliente: null }); toast.success('Cadastro atualizado!'); }}
                onCancel={() => setEditClienteModal({ open: false, cliente: null })}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      <ConviteClienteModal cliente={inviteClienteModal.cliente} open={inviteClienteModal.open} onClose={() => setInviteClienteModal({ open: false, cliente: null })} onSuccess={() => { refetchClientes(); setInviteClienteModal({ open: false, cliente: null }); }} />
      <BorderoDetailsModal bordero={borderoModal.bordero} pedidos={todosPedidos} open={borderoModal.open} onClose={() => setBorderoModal({ open: false, bordero: null })} />
      <SolicitarOrcamentoModal open={showOrcamentoModal} onClose={() => setShowOrcamentoModal(false)} clientes={meusClientes} representanteCodigo={representante?.codigo} representanteNome={representante?.nome} />
      <ComissaoModal open={showComissaoModal} onClose={() => setShowComissaoModal(false)} pedidos={meusPedidos} representante={representante} />
      <MinhasAutorizacoesModal open={showAutorizacoesModal} onClose={() => setShowAutorizacoesModal(false)} representanteLogado={representante} pedidosAbertos={meusPedidosAbertos} />

      {/* Modal Meus Dados (RepresentanteDetails) */}
      <Dialog open={showPerfilModal} onOpenChange={setShowPerfilModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-slate-600" /> Meus Dados
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            {representante && (
              <RepresentanteDetails
                representante={representante}
                stats={{ totalClientes: meusClientes.length }}
                onEdit={() => { setShowPerfilModal(false); setShowEditPerfilModal(true); }}
                onClose={() => setShowPerfilModal(false)}
                onAvatarUpdate={(url) => setRepresentante(prev => ({ ...prev, foto_url: url }))}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Perfil (RepresentanteForm com isSelfEditMode) */}
      <Dialog open={showEditPerfilModal} onOpenChange={setShowEditPerfilModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" /> Editar Meu Perfil
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6">
            {representante && (
              <RepresentanteForm
                representante={representante}
                isSelfEditMode={true}
                onSave={handleSaveRepresentante}
                onCancel={() => setShowEditPerfilModal(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}