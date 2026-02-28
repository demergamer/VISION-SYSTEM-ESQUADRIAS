import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeSync } from "@/components/hooks/useRealtimeSync";
import { useAuth } from '@/components/providers/AuthContext';

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, FileText, CreditCard, TrendingDown, CheckCircle, 
  XCircle, Clock, DollarSign, Search, Eye, Filter, ChevronDown, ChevronUp, ArrowRight,
  Package, Truck, Lock, Send, Factory, Calendar, Edit, User, LogOut
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ClienteForm from "@/components/clientes/ClienteForm";
import ClienteDetails from "@/components/clientes/ClienteDetails";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import ModalContainer from "@/components/modals/ModalContainer";
import ChequeDetails from "@/components/cheques/ChequeDetails";
import LiquidacaoSelfService from "@/components/portais/cliente/LiquidacaoSelfService";
import BorderoDetailsModal from "@/components/portais/cliente/BorderoDetailsModal";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const formatNumero = (num) => num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '';
const calcularDiasAtraso = (data) => {
    const diff = Math.floor((new Date() - new Date(data)) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
};

// Componente de Botão de Aba
const TabButton = ({ active, onClick, icon: Icon, label, count, colorClass, bgActive, borderActive }) => (
  <button 
    onClick={onClick}
    className={`flex-1 relative overflow-hidden group p-3 sm:p-4 rounded-xl transition-all duration-300 border text-left
      ${active 
        ? `${bgActive} ${borderActive} shadow-sm ring-1 ring-opacity-50` 
        : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'
      }`}
  >
    <div className="flex justify-between items-start mb-2">
      <div className={`p-2 rounded-lg ${active ? 'bg-white/60' : 'bg-slate-100 group-hover:bg-white'} transition-colors`}>
        <Icon className={`w-5 h-5 ${colorClass}`} />
      </div>
      <span className={`text-xs font-bold px-2 py-1 rounded-full ${active ? 'bg-white/60 text-slate-700' : 'bg-slate-100 text-slate-500'}`}>
        {count}
      </span>
    </div>
    <div>
      <p className={`text-xs sm:text-sm font-medium ${active ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>{label}</p>
    </div>
  </button>
);

export default function PortalCliente() {
  useRealtimeSync();
  const queryClient = useQueryClient();
  
  const { user, loading: authLoading, signOut } = useAuth();

  const [showFiltrosPedidos, setShowFiltrosPedidos] = useState(false);
  const [showFiltrosCheques, setShowFiltrosCheques] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const [filtros, setFiltros] = useState({ numeroPedido: '', rota: '', dataEntregaInicio: '', dataEntregaFim: '', valorMin: '', valorMax: '' });
  const [filtrosCheques, setFiltrosCheques] = useState({ numeroCheque: '', banco: '', dataVencimentoInicio: '', dataVencimentoFim: '' });

  const [abaPedidos, setAbaPedidos] = useState('producao');
  const [abaCheques, setAbaCheques] = useState('aVencer');
  const [subAbaPagos, setSubAbaPagos] = useState('borderos');

  const [chequeDetalhe, setChequeDetalhe] = useState(null);
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [showLiquidacaoModal, setShowLiquidacaoModal] = useState(false);
  const [borderoModal, setBorderoModal] = useState({ open: false, bordero: null });

  // Queries
  const { data: clientes = [], isLoading: clientesLoading } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
  const { data: pedidos = [] } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });
  const { data: cheques = [] } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });
  const { data: creditos = [] } = useQuery({ queryKey: ['creditos'], queryFn: () => base44.entities.Credito.list() });
  const { data: borderos = [] } = useQuery({ queryKey: ['borderos'], queryFn: () => base44.entities.Bordero.list() });
  const { data: todosItensProducao = [] } = useQuery({ queryKey: ['producao_items'], queryFn: () => base44.entities.ProducaoItem.list() });

  // 1. Descobre quem é o cliente logado comparando o e-mail global com o cadastro
  const clienteData = useMemo(() => {
      if (!user?.email || !clientes.length) return null;
      return clientes.find(c => c.email === user.email);
  }, [clientes, user]);

  const meusItensProducao = useMemo(() => {
    if (!clienteData) return [];
    return todosItensProducao.filter(i => i.cliente_codigo === clienteData.codigo);
  }, [todosItensProducao, clienteData]);

  // Filtros e Dados
  const meusPedidos = useMemo(() => {
    if (!clienteData) return { producao: [], transito: [], aPagar: [], pagos: [], cancelados: [] };
    
    let list = pedidos.filter(p => p.cliente_codigo === clienteData.codigo);
    
    // Filtros visuais
    if (filtros.numeroPedido) list = list.filter(p => p.numero_pedido?.toLowerCase().includes(filtros.numeroPedido.toLowerCase()));
    if (filtros.rota) list = list.filter(p => p.rota_codigo?.toLowerCase().includes(filtros.rota.toLowerCase()));
    
    return {
      producao: list.filter(p => p.status === 'em_producao'),
      transito: list.filter(p => p.status === 'aguardando' || p.status === 'em_transito'),
      aPagar: list.filter(p => p.status === 'aberto' || p.status === 'parcial'),
      pagos: list.filter(p => p.status === 'pago'),
      cancelados: list.filter(p => p.status === 'cancelado')
    };
  }, [pedidos, clienteData, filtros]);

  const meusBorderos = useMemo(() => {
    if (!clienteData) return [];
    return borderos.filter(b => b.cliente_codigo === clienteData.codigo);
  }, [borderos, clienteData]);

  const meusCheques = useMemo(() => {
    if (!clienteData) return { aVencer: [], compensados: [], devolvidos: [], pagos: [] };
    let list = cheques.filter(c => c.cliente_codigo === clienteData.codigo);
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    return {
      aVencer: list.filter(c => { const v = new Date(c.data_vencimento); v.setHours(0,0,0,0); return c.status === 'normal' && v > hoje; }),
      compensados: list.filter(c => { const v = new Date(c.data_vencimento); v.setHours(0,0,0,0); return c.status === 'normal' && v <= hoje; }),
      devolvidos: list.filter(c => c.status === 'devolvido'),
      pagos: list.filter(c => c.status === 'pago')
    };
  }, [cheques, clienteData]);

  const meusCreditos = useMemo(() => {
    if (!clienteData) return [];
    return creditos.filter(c => c.cliente_codigo === clienteData.codigo && c.status === 'disponivel');
  }, [creditos, clienteData]);

  const totais = useMemo(() => {
    const totalPedidosAPagar = meusPedidos.aPagar.reduce((sum, p) => sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0);
    
    // Passivo de Cheques (A Vencer na Semana + Devolvidos)
    const hoje = new Date();
    const inicioSemana = startOfWeek(hoje);
    const fimSemana = endOfWeek(hoje);
    
    const chequesSemana = meusCheques.aVencer.filter(c => 
        isWithinInterval(parseISO(c.data_vencimento), { start: inicioSemana, end: fimSemana })
    ).reduce((sum, c) => sum + c.valor, 0);
    
    const chequesDevolvidos = meusCheques.devolvidos.reduce((sum, c) => sum + c.valor, 0);
    
    return {
      totalAPagar: totalPedidosAPagar + chequesDevolvidos,
      creditos: meusCreditos.reduce((sum, c) => sum + c.valor, 0),
      passivoCheques: chequesSemana + chequesDevolvidos
    };
  }, [meusPedidos, meusCheques, meusCreditos]);

  const handleSolicitarAcesso = () => {
    const msg = encodeURIComponent(`Olá! Solicito acesso ao Portal. Email: ${user?.email}`);
    window.open(`https://wa.me/5511994931958?text=${msg}`, '_blank');
  };

  const handleViewBordero = (bordero) => {
    setBorderoModal({ open: true, bordero });
  };

  const handleSaveCliente = async (data) => {
    await base44.entities.Cliente.update(clienteData.id, data);
    queryClient.invalidateQueries({ queryKey: ['clientes'] });
    toast.success('Cadastro atualizado com sucesso!');
    setShowEditModal(false);
  };

  // ── LOADING GLOBAL ────────────────────────────────────────────────────────
  if (authLoading || clientesLoading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
            <Loader2 className="animate-spin w-10 h-10 text-blue-400 mb-4" />
            <p className="text-slate-400">A carregar os seus dados...</p>
        </div>
    );
  }

  // ── ERRO DE ACESSO (Usuário logado, mas não é um Cliente) ────────────────
  if (!clienteData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="border-yellow-200 bg-yellow-50 max-w-lg w-full">
          <CardContent className="p-8 space-y-4">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-10 h-10 text-yellow-600" />
              <div><h3 className="font-bold text-yellow-800 text-xl">Acesso não vinculado</h3><p className="text-yellow-700 text-sm">Email: {user?.email}</p></div>
            </div>
            <p className="text-slate-700">Não encontramos um cadastro ativo com este e-mail.</p>
            <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => signOut()} className="flex-1 gap-2"><LogOut className="w-4 h-4" /> Sair</Button>
                <Button onClick={handleSolicitarAcesso} className="flex-1 gap-2 bg-green-600 hover:bg-green-700"><Send className="w-4 h-4" /> Solicitar Acesso</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── PORTAL PRINCIPAL ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-white shadow-md shrink-0">
              {clienteData.logo_url && <AvatarImage src={clienteData.logo_url} className="object-cover" />}
              <AvatarFallback className="bg-blue-600 text-white text-xl font-bold">
                {(clienteData.nome_fantasia || clienteData.nome || '').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Olá, <span className="text-blue-600">{clienteData.nome}</span></h1>
              <p className="text-slate-500">Bem-vindo ao seu portal financeiro</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowDetailsModal(true)} className="gap-2 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300">
              <Eye className="w-4 h-4" /> Meus Dados
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)} className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300">
              <Edit className="w-4 h-4" /> Editar Cadastro
            </Button>
            <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-slate-400 hover:text-red-600 hover:bg-red-50" title="Sair do Portal">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-red-600"><TrendingDown className="w-5 h-5" /><span className="font-semibold text-sm uppercase tracking-wide">Total a Pagar</span></div>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">{formatCurrency(totais.totalAPagar)}</p>
              <p className="text-slate-400 text-xs mt-2">Soma de pedidos pendentes e devoluções</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-emerald-600"><DollarSign className="w-5 h-5" /><span className="font-semibold text-sm uppercase tracking-wide">Crédito Disponível</span></div>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">{formatCurrency(totais.creditos)}</p>
              <p className="text-slate-400 text-xs mt-2">{meusCreditos.length} créditos ativos</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-purple-600"><Clock className="w-5 h-5" /><span className="font-semibold text-sm uppercase tracking-wide">Passivo Cheques (Semana)</span></div>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">{formatCurrency(totais.passivoCheques)}</p>
              <p className="text-slate-400 text-xs mt-2">Vencendo esta semana + Devolvidos</p>
            </div>
          </div>
        </div>

        {/* --- SEÇÃO DE PEDIDOS --- */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><FileText className="w-5 h-5 text-blue-500" /> Meus Pedidos</h2>
          </div>

          <div className="flex gap-3">
            {meusPedidos.aPagar.length > 0 && (
              <Button onClick={() => setShowLiquidacaoModal(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <DollarSign className="w-4 h-4" /> Solicitar Liquidação
              </Button>
            )}
          </div>

          {/* Abas de Navegação */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <TabButton 
              active={abaPedidos === 'producao'} onClick={() => setAbaPedidos('producao')} 
              icon={Factory} label="Em Produção" count={meusPedidos.producao.length} 
              colorClass="text-indigo-500" bgActive="bg-indigo-50" borderActive="border-indigo-200" 
            />
            <TabButton 
              active={abaPedidos === 'transito'} onClick={() => setAbaPedidos('transito')} 
              icon={Truck} label="Em Trânsito" count={meusPedidos.transito.length} 
              colorClass="text-amber-500" bgActive="bg-amber-50" borderActive="border-amber-200" 
            />
            <TabButton 
              active={abaPedidos === 'aPagar'} onClick={() => setAbaPedidos('aPagar')} 
              icon={Clock} label="A Pagar" count={meusPedidos.aPagar.length} 
              colorClass="text-red-500" bgActive="bg-red-50" borderActive="border-red-200" 
            />
            <TabButton 
              active={abaPedidos === 'pagos'} onClick={() => setAbaPedidos('pagos')} 
              icon={CheckCircle} label="Pagos" count={meusPedidos.pagos.length} 
              colorClass="text-emerald-500" bgActive="bg-emerald-50" borderActive="border-emerald-200" 
            />
            <TabButton 
              active={abaPedidos === 'cancelados'} onClick={() => setAbaPedidos('cancelados')} 
              icon={XCircle} label="Cancelados" count={meusPedidos.cancelados.length} 
              colorClass="text-slate-500" bgActive="bg-slate-100" borderActive="border-slate-200" 
            />
          </div>

          {/* CONTEÚDO DAS ABAS */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* LÓGICA ESPECIAL PARA ABA PAGOS */}
            {abaPedidos === 'pagos' ? (
                <div className="p-4">
                    <Tabs value={subAbaPagos} onValueChange={setSubAbaPagos} className="w-full">
                        <TabsList className="bg-slate-100 p-1 rounded-lg w-full sm:w-auto mb-4">
                            <TabsTrigger value="borderos" className="flex-1 sm:flex-none">📑 Borderôs (Agrupados)</TabsTrigger>
                            <TabsTrigger value="pedidos" className="flex-1 sm:flex-none">📦 Pedidos Individuais</TabsTrigger>
                        </TabsList>

                        <div className="mt-2">
                            {subAbaPagos === 'borderos' ? (
                                meusBorderos.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {meusBorderos.map(b => (
                                            <div key={b.id} onClick={() => handleViewBordero(b)} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all bg-slate-50/50 cursor-pointer group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <Badge variant="outline" className="font-mono bg-white">#{b.numero_bordero}</Badge>
                                                    <span className="text-xs text-slate-500">{format(new Date(b.created_date), 'dd/MM/yyyy')}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 mb-2">{b.pedidos_ids?.length || 0} pedidos vinculados</p>
                                                <p className="text-lg font-bold text-emerald-600">{formatCurrency(b.valor_total)}</p>
                                                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end"><Eye className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" /></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <div className="text-center py-10 text-slate-400">Nenhum borderô encontrado.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Pedido</TableHead>
                                            <TableHead>Data Pagto</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {meusPedidos.pagos.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-mono font-medium">#{p.numero_pedido}</TableCell>
                                                <TableCell>{p.data_pagamento ? format(new Date(p.data_pagamento), 'dd/MM/yyyy') : '-'}</TableCell>
                                                <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(p.valor_pedido)}</TableCell>
                                                <TableCell className="text-center"><Badge className="bg-emerald-100 text-emerald-700">Pago</Badge></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </Tabs>
                </div>
            ) : (
                /* TABELA PADRÃO PARA OUTRAS ABAS */
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Data Prevista</TableHead>
                            <TableHead>Nº Pedido</TableHead>
                            <TableHead>Rota</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                            {abaPedidos === 'aPagar' && <TableHead className="text-right">Saldo Devedor</TableHead>}
                            <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {meusPedidos[abaPedidos].length > 0 ? meusPedidos[abaPedidos].map(p => {
                            const diasAtraso = calcularDiasAtraso(p.data_entrega);
                            return (
                            <TableRow key={p.id} className="hover:bg-slate-50/50">
                                <TableCell className="text-sm text-slate-600">
                                    {p.data_entrega ? format(new Date(p.data_entrega), 'dd/MM/yyyy') : '-'}
                                </TableCell>
                                <TableCell className="font-mono font-medium">#{p.numero_pedido}</TableCell>
                                <TableCell><Badge variant="outline" className="font-normal text-slate-600">{p.rota_codigo || 'N/A'}</Badge></TableCell>
                                <TableCell className="text-right">{formatCurrency(p.valor_pedido)}</TableCell>
                                {abaPedidos === 'aPagar' && (
                                    <TableCell className="text-right font-bold text-red-600">
                                        {formatCurrency(p.saldo_restante || (p.valor_pedido - (p.total_pago || 0)))}
                                    </TableCell>
                                )}
                                <TableCell className="text-center">
                                    <Badge className={cn(
                                        "text-xs",
                                        abaPedidos === 'producao' && "bg-indigo-100 text-indigo-700",
                                        abaPedidos === 'transito' && "bg-amber-100 text-amber-700",
                                        abaPedidos === 'cancelados' && "bg-slate-100 text-slate-600",
                                        diasAtraso > 0 && abaPedidos === 'aPagar' && "bg-red-100 text-red-700",
                                        diasAtraso === 0 && abaPedidos === 'aPagar' && "bg-blue-50 text-blue-700"
                                    )}>
                                        {diasAtraso > 0 && abaPedidos === 'aPagar' ? `${diasAtraso}d Atraso` : 
                                         abaPedidos === 'producao' ? 'Em Produção' :
                                         abaPedidos === 'transito' ? 'Em Trânsito' :
                                         p.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        )}) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                                    Nenhum pedido encontrado nesta categoria.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}
          </div>
        </div>

        {/* --- SEÇÃO: ITENS EM PRODUÇÃO --- */}
        {meusItensProducao.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Factory className="w-5 h-5 text-indigo-500" /> Itens em Produção
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Nº Pedido</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-center">Qtde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meusItensProducao.map((item, idx) => (
                    <TableRow key={item.id || idx} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono font-bold text-slate-700">#{item.numero_pedido}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{item.produto_codigo}</TableCell>
                      <TableCell className="font-medium text-slate-800">{item.descricao}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-indigo-100 text-indigo-700">{item.quantidade}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* --- SEÇÃO DE CHEQUES --- */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <CreditCard className="w-5 h-5 text-yellow-500" /> Meus Cheques
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TabButton active={abaCheques === 'aVencer'} onClick={() => setAbaCheques('aVencer')} icon={Clock} label="A Vencer" count={meusCheques.aVencer.length} colorClass="text-yellow-600" bgActive="bg-yellow-50" borderActive="border-yellow-200"/>
            <TabButton active={abaCheques === 'compensados'} onClick={() => setAbaCheques('compensados')} icon={CheckCircle} label="Compensados" count={meusCheques.compensados.length} colorClass="text-green-600" bgActive="bg-green-50" borderActive="border-green-200"/>
            <TabButton active={abaCheques === 'devolvidos'} onClick={() => setAbaCheques('devolvidos')} icon={AlertCircle} label="Devolvidos" count={meusCheques.devolvidos.length} colorClass="text-red-600" bgActive="bg-red-50" borderActive="border-red-200"/>
            <TabButton active={abaCheques === 'pagos'} onClick={() => setAbaCheques('pagos')} icon={CheckCircle} label="Pagos" count={meusCheques.pagos.length} colorClass="text-blue-600" bgActive="bg-blue-50" borderActive="border-blue-200"/>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
             {meusCheques[abaCheques].length > 0 ? (
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Nº Cheque</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Banco</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {meusCheques[abaCheques].map(c => (
                            <TableRow key={c.id}>
                                <TableCell className="font-mono">{c.numero_cheque}</TableCell>
                                <TableCell>{format(new Date(c.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{c.banco}</TableCell>
                                <TableCell className="text-right font-bold text-slate-700">{formatCurrency(c.valor)}</TableCell>
                                <TableCell className="text-center"><Badge variant="outline">{c.status}</Badge></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             ) : (
                <div className="p-12 text-center text-slate-400"><p>Nenhum cheque encontrado.</p></div>
             )}
          </div>
        </div>

      </div>

      <ModalContainer open={showChequeModal} onClose={() => setShowChequeModal(false)} title="Detalhes do Cheque">
        {chequeDetalhe && <ChequeDetails cheque={chequeDetalhe} onEdit={() => {}} onClose={() => setShowChequeModal(false)} />}
      </ModalContainer>

      <ModalContainer open={showLiquidacaoModal} onClose={() => setShowLiquidacaoModal(false)} title="Solicitar Liquidação" size="xl">
        <LiquidacaoSelfService pedidos={meusPedidos.aPagar} clienteCodigo={clienteData?.codigo} clienteNome={clienteData?.nome} onSuccess={() => { setShowLiquidacaoModal(false); toast.success('Solicitação enviada com sucesso!'); }} onCancel={() => setShowLiquidacaoModal(false)} />
      </ModalContainer>

      <BorderoDetailsModal 
        open={borderoModal.open} 
        onClose={() => setBorderoModal({ open: false, bordero: null })} 
        bordero={borderoModal.bordero} 
        pedidos={pedidos}
      />

      {/* Modal Meus Dados */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5 text-slate-600" /> Meus Dados Cadastrais
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            {clienteData && (
              <ClienteDetails
                cliente={clienteData}
                stats={{}}
                creditos={meusCreditos}
                onEdit={() => { setShowDetailsModal(false); setShowEditModal(true); }}
                onClose={() => setShowDetailsModal(false)}
                onViewPedidos={() => setShowDetailsModal(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Cadastro */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" /> Editar Meu Cadastro
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-2">
            {clienteData && (
              <ClienteForm
                cliente={clienteData}
                isClientMode={true}
                onSave={handleSaveCliente}
                onCancel={() => setShowEditModal(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

  const meusBorderos = useMemo(() => {
    if (!clienteData) return [];
    return borderos.filter(b => b.cliente_codigo === clienteData.codigo);
  }, [borderos, clienteData]);

  const meusCheques = useMemo(() => {
    if (!clienteData) return { aVencer: [], compensados: [], devolvidos: [], pagos: [] };
    let list = cheques.filter(c => c.cliente_codigo === clienteData.codigo);
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    return {
      aVencer: list.filter(c => { const v = new Date(c.data_vencimento); v.setHours(0,0,0,0); return c.status === 'normal' && v > hoje; }),
      compensados: list.filter(c => { const v = new Date(c.data_vencimento); v.setHours(0,0,0,0); return c.status === 'normal' && v <= hoje; }),
      devolvidos: list.filter(c => c.status === 'devolvido'),
      pagos: list.filter(c => c.status === 'pago')
    };
  }, [cheques, clienteData]);

  const meusCreditos = useMemo(() => {
    if (!clienteData) return [];
    return creditos.filter(c => c.cliente_codigo === clienteData.codigo && c.status === 'disponivel');
  }, [creditos, clienteData]);

  const totais = useMemo(() => {
    const totalPedidosAPagar = meusPedidos.aPagar.reduce((sum, p) => sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0);
    
    // Passivo de Cheques (A Vencer na Semana + Devolvidos)
    const hoje = new Date();
    const inicioSemana = startOfWeek(hoje);
    const fimSemana = endOfWeek(hoje);
    
    const chequesSemana = meusCheques.aVencer.filter(c => 
        isWithinInterval(parseISO(c.data_vencimento), { start: inicioSemana, end: fimSemana })
    ).reduce((sum, c) => sum + c.valor, 0);
    
    const chequesDevolvidos = meusCheques.devolvidos.reduce((sum, c) => sum + c.valor, 0);
    
    return {
      totalAPagar: totalPedidosAPagar + chequesDevolvidos,
      creditos: meusCreditos.reduce((sum, c) => sum + c.valor, 0),
      passivoCheques: chequesSemana + chequesDevolvidos
    };
  }, [meusPedidos, meusCheques, meusCreditos]);

  const handleSolicitarAcesso = () => {
    const msg = encodeURIComponent(`Olá! Solicito acesso ao Portal. Email: ${user?.email}`);
    window.open(`https://wa.me/5511994931958?text=${msg}`, '_blank');
  };

  const handleViewBordero = (bordero) => {
    setBorderoModal({ open: true, bordero });
  };

  const handleSaveCliente = async (data) => {
    await base44.entities.Cliente.update(clienteData.id, data);
    queryClient.invalidateQueries({ queryKey: ['clientes'] });
    toast.success('Cadastro atualizado com sucesso!');
    setShowEditModal(false);
  };

  const handleViewPedido = (pedido) => {
      // Aqui você pode adicionar um modal de detalhes do pedido se quiser, ou expandir a linha
      console.log("Ver pedido", pedido);
  };

  // --- GATEWAY DE PIN ---
  if (loadingPin) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900"><div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!pinOk && registroCliente) {
    return <PinGateway perfil="cliente" registroPreIdentificado={registroCliente} onIdentificado={handlePinOk} onVoltar={() => window.history.back()} />;
  }

  if (!clienteData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="border-yellow-200 bg-yellow-50 max-w-lg w-full">
          <CardContent className="p-8 space-y-4">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-10 h-10 text-yellow-600" />
              <div><h3 className="font-bold text-yellow-800 text-xl">Acesso não vinculado</h3><p className="text-yellow-700 text-sm">Email: {user?.email}</p></div>
            </div>
            <p className="text-slate-700">Não encontramos um cadastro ativo.</p>
            <div className="flex gap-3 pt-4"><Button onClick={handleSolicitarAcesso} className="flex-1 gap-2 bg-green-600 hover:bg-green-700"><Send className="w-4 h-4" /> Solicitar Acesso</Button></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-white shadow-md shrink-0">
              {clienteData.logo_url && <AvatarImage src={clienteData.logo_url} className="object-cover" />}
              <AvatarFallback className="bg-blue-600 text-white text-xl font-bold">
                {(clienteData.nome_fantasia || clienteData.nome || '').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Olá, <span className="text-blue-600">{clienteData.nome}</span></h1>
              <p className="text-slate-500">Bem-vindo ao seu portal financeiro</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowDetailsModal(true)} className="gap-2 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300">
              <Eye className="w-4 h-4" /> Meus Dados
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)} className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300">
              <Edit className="w-4 h-4" /> Editar Cadastro
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-red-600"><TrendingDown className="w-5 h-5" /><span className="font-semibold text-sm uppercase tracking-wide">Total a Pagar</span></div>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">{formatCurrency(totais.totalAPagar)}</p>
              <p className="text-slate-400 text-xs mt-2">Soma de pedidos pendentes e devoluções</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-emerald-600"><DollarSign className="w-5 h-5" /><span className="font-semibold text-sm uppercase tracking-wide">Crédito Disponível</span></div>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">{formatCurrency(totais.creditos)}</p>
              <p className="text-slate-400 text-xs mt-2">{meusCreditos.length} créditos ativos</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-purple-600"><Clock className="w-5 h-5" /><span className="font-semibold text-sm uppercase tracking-wide">Passivo Cheques (Semana)</span></div>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">{formatCurrency(totais.passivoCheques)}</p>
              <p className="text-slate-400 text-xs mt-2">Vencendo esta semana + Devolvidos</p>
            </div>
          </div>
        </div>

        {/* --- SEÇÃO DE PEDIDOS --- */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><FileText className="w-5 h-5 text-blue-500" /> Meus Pedidos</h2>
          </div>

          <div className="flex gap-3">
            {meusPedidos.aPagar.length > 0 && (
              <Button onClick={() => setShowLiquidacaoModal(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <DollarSign className="w-4 h-4" /> Solicitar Liquidação
              </Button>
            )}
          </div>

          {/* Abas de Navegação - NOVA ORDEM */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <TabButton 
              active={abaPedidos === 'producao'} onClick={() => setAbaPedidos('producao')} 
              icon={Factory} label="Em Produção" count={meusPedidos.producao.length} 
              colorClass="text-indigo-500" bgActive="bg-indigo-50" borderActive="border-indigo-200" 
            />
            <TabButton 
              active={abaPedidos === 'transito'} onClick={() => setAbaPedidos('transito')} 
              icon={Truck} label="Em Trânsito" count={meusPedidos.transito.length} 
              colorClass="text-amber-500" bgActive="bg-amber-50" borderActive="border-amber-200" 
            />
            <TabButton 
              active={abaPedidos === 'aPagar'} onClick={() => setAbaPedidos('aPagar')} 
              icon={Clock} label="A Pagar" count={meusPedidos.aPagar.length} 
              colorClass="text-red-500" bgActive="bg-red-50" borderActive="border-red-200" 
            />
            <TabButton 
              active={abaPedidos === 'pagos'} onClick={() => setAbaPedidos('pagos')} 
              icon={CheckCircle} label="Pagos" count={meusPedidos.pagos.length} 
              colorClass="text-emerald-500" bgActive="bg-emerald-50" borderActive="border-emerald-200" 
            />
            <TabButton 
              active={abaPedidos === 'cancelados'} onClick={() => setAbaPedidos('cancelados')} 
              icon={XCircle} label="Cancelados" count={meusPedidos.cancelados.length} 
              colorClass="text-slate-500" bgActive="bg-slate-100" borderActive="border-slate-200" 
            />
          </div>

          {/* CONTEÚDO DAS ABAS */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            
            {/* LÓGICA ESPECIAL PARA ABA PAGOS */}
            {abaPedidos === 'pagos' ? (
                <div className="p-4">
                    <Tabs value={subAbaPagos} onValueChange={setSubAbaPagos} className="w-full">
                        <TabsList className="bg-slate-100 p-1 rounded-lg w-full sm:w-auto mb-4">
                            <TabsTrigger value="borderos" className="flex-1 sm:flex-none">📑 Borderôs (Agrupados)</TabsTrigger>
                            <TabsTrigger value="pedidos" className="flex-1 sm:flex-none">📦 Pedidos Individuais</TabsTrigger>
                        </TabsList>

                        <div className="mt-2">
                            {subAbaPagos === 'borderos' ? (
                                meusBorderos.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {meusBorderos.map(b => (
                                            <div key={b.id} onClick={() => handleViewBordero(b)} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all bg-slate-50/50 cursor-pointer group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <Badge variant="outline" className="font-mono bg-white">#{b.numero_bordero}</Badge>
                                                    <span className="text-xs text-slate-500">{format(new Date(b.created_date), 'dd/MM/yyyy')}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 mb-2">{b.pedidos_ids?.length || 0} pedidos vinculados</p>
                                                <p className="text-lg font-bold text-emerald-600">{formatCurrency(b.valor_total)}</p>
                                                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end"><Eye className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" /></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <div className="text-center py-10 text-slate-400">Nenhum borderô encontrado.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Pedido</TableHead>
                                            <TableHead>Data Pagto</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {meusPedidos.pagos.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-mono font-medium">#{p.numero_pedido}</TableCell>
                                                <TableCell>{p.data_pagamento ? format(new Date(p.data_pagamento), 'dd/MM/yyyy') : '-'}</TableCell>
                                                <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(p.valor_pedido)}</TableCell>
                                                <TableCell className="text-center"><Badge className="bg-emerald-100 text-emerald-700">Pago</Badge></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </Tabs>
                </div>
            ) : (
                /* TABELA PADRÃO PARA OUTRAS ABAS */
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Data Prevista</TableHead>
                            <TableHead>Nº Pedido</TableHead>
                            <TableHead>Rota</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                            {abaPedidos === 'aPagar' && <TableHead className="text-right">Saldo Devedor</TableHead>}
                            <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {meusPedidos[abaPedidos].length > 0 ? meusPedidos[abaPedidos].map(p => {
                            const diasAtraso = calcularDiasAtraso(p.data_entrega);
                            return (
                            <TableRow key={p.id} className="hover:bg-slate-50/50">
                                <TableCell className="text-sm text-slate-600">
                                    {p.data_entrega ? format(new Date(p.data_entrega), 'dd/MM/yyyy') : '-'}
                                </TableCell>
                                <TableCell className="font-mono font-medium">#{p.numero_pedido}</TableCell>
                                <TableCell><Badge variant="outline" className="font-normal text-slate-600">{p.rota_codigo || 'N/A'}</Badge></TableCell>
                                <TableCell className="text-right">{formatCurrency(p.valor_pedido)}</TableCell>
                                {abaPedidos === 'aPagar' && (
                                    <TableCell className="text-right font-bold text-red-600">
                                        {formatCurrency(p.saldo_restante || (p.valor_pedido - (p.total_pago || 0)))}
                                    </TableCell>
                                )}
                                <TableCell className="text-center">
                                    <Badge className={cn(
                                        "text-xs",
                                        abaPedidos === 'producao' && "bg-indigo-100 text-indigo-700",
                                        abaPedidos === 'transito' && "bg-amber-100 text-amber-700",
                                        abaPedidos === 'cancelados' && "bg-slate-100 text-slate-600",
                                        diasAtraso > 0 && abaPedidos === 'aPagar' && "bg-red-100 text-red-700", // Atraso destaque
                                        diasAtraso === 0 && abaPedidos === 'aPagar' && "bg-blue-50 text-blue-700"
                                    )}>
                                        {diasAtraso > 0 && abaPedidos === 'aPagar' ? `${diasAtraso}d Atraso` : 
                                         abaPedidos === 'producao' ? 'Em Produção' :
                                         abaPedidos === 'transito' ? 'Em Trânsito' :
                                         p.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        )}) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                                    Nenhum pedido encontrado nesta categoria.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}
          </div>
        </div>

        {/* --- SEÇÃO: ITENS EM PRODUÇÃO (Neo) --- */}
        {meusItensProducao.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Factory className="w-5 h-5 text-indigo-500" /> Itens em Produção
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Nº Pedido</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-center">Qtde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meusItensProducao.map((item, idx) => (
                    <TableRow key={item.id || idx} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono font-bold text-slate-700">#{item.numero_pedido}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{item.produto_codigo}</TableCell>
                      <TableCell className="font-medium text-slate-800">{item.descricao}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-indigo-100 text-indigo-700">{item.quantidade}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* --- SEÇÃO DE CHEQUES --- */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <CreditCard className="w-5 h-5 text-yellow-500" /> Meus Cheques
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TabButton active={abaCheques === 'aVencer'} onClick={() => setAbaCheques('aVencer')} icon={Clock} label="A Vencer" count={meusCheques.aVencer.length} colorClass="text-yellow-600" bgActive="bg-yellow-50" borderActive="border-yellow-200"/>
            <TabButton active={abaCheques === 'compensados'} onClick={() => setAbaCheques('compensados')} icon={CheckCircle} label="Compensados" count={meusCheques.compensados.length} colorClass="text-green-600" bgActive="bg-green-50" borderActive="border-green-200"/>
            <TabButton active={abaCheques === 'devolvidos'} onClick={() => setAbaCheques('devolvidos')} icon={AlertCircle} label="Devolvidos" count={meusCheques.devolvidos.length} colorClass="text-red-600" bgActive="bg-red-50" borderActive="border-red-200"/>
            <TabButton active={abaCheques === 'pagos'} onClick={() => setAbaCheques('pagos')} icon={CheckCircle} label="Pagos" count={meusCheques.pagos.length} colorClass="text-blue-600" bgActive="bg-blue-50" borderActive="border-blue-200"/>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
             {meusCheques[abaCheques].length > 0 ? (
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Nº Cheque</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Banco</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {meusCheques[abaCheques].map(c => (
                            <TableRow key={c.id}>
                                <TableCell className="font-mono">{c.numero_cheque}</TableCell>
                                <TableCell>{format(new Date(c.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{c.banco}</TableCell>
                                <TableCell className="text-right font-bold text-slate-700">{formatCurrency(c.valor)}</TableCell>
                                <TableCell className="text-center"><Badge variant="outline">{c.status}</Badge></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             ) : (
                <div className="p-12 text-center text-slate-400"><p>Nenhum cheque encontrado.</p></div>
             )}
          </div>
        </div>

      </div>

      <ModalContainer open={showChequeModal} onClose={() => setShowChequeModal(false)} title="Detalhes do Cheque">
        {chequeDetalhe && <ChequeDetails cheque={chequeDetalhe} onEdit={() => {}} onClose={() => setShowChequeModal(false)} />}
      </ModalContainer>

      <ModalContainer open={showLiquidacaoModal} onClose={() => setShowLiquidacaoModal(false)} title="Solicitar Liquidação" size="xl">
        <LiquidacaoSelfService pedidos={meusPedidos.aPagar} clienteCodigo={clienteData.codigo} clienteNome={clienteData.nome} onSuccess={() => { setShowLiquidacaoModal(false); toast.success('Solicitação enviada com sucesso!'); }} onCancel={() => setShowLiquidacaoModal(false)} />
      </ModalContainer>

      {/* Modal de Detalhes do Borderô (NOVO) */}
      <BorderoDetailsModal 
        open={borderoModal.open} 
        onClose={() => setBorderoModal({ open: false, bordero: null })} 
        bordero={borderoModal.bordero} 
        pedidos={pedidos}
      />

      {/* Modal Meus Dados (Details - Read-Only) */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5 text-slate-600" /> Meus Dados Cadastrais
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            {clienteData && (
              <ClienteDetails
                cliente={clienteData}
                stats={{}}
                creditos={meusCreditos}
                onEdit={() => { setShowDetailsModal(false); setShowEditModal(true); }}
                onClose={() => setShowDetailsModal(false)}
                onViewPedidos={() => setShowDetailsModal(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Cadastro */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" /> Editar Meu Cadastro
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-2">
            {clienteData && (
              <ClienteForm
                cliente={clienteData}
                isClientMode={true}
                onSave={handleSaveCliente}
                onCancel={() => setShowEditModal(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}