import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, FileText, CreditCard, TrendingDown, CheckCircle, 
  XCircle, Clock, DollarSign, Search, Eye, Filter, ChevronDown, ChevronUp, ArrowRight,
  Package, Truck // Importei novos ícones
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import ModalContainer from "@/components/modals/ModalContainer";
import ChequeDetails from "@/components/cheques/ChequeDetails";
import LiquidacaoSelfService from "@/components/portais/LiquidacaoSelfService";
import { Badge } from "@/components/ui/badge";
import { Lock, Send } from "lucide-react";

export default function PortalCliente() {
  // --- Estados de Controle Visual ---
  const [showFiltrosPedidos, setShowFiltrosPedidos] = useState(false);
  const [showFiltrosCheques, setShowFiltrosCheques] = useState(false);

  // --- Estados de Filtros ---
  const [filtros, setFiltros] = useState({
    numeroPedido: '', rota: '', dataEntregaInicio: '', dataEntregaFim: '',
    dataPagamentoInicio: '', dataPagamentoFim: '', valorMin: '', valorMax: ''
  });

  const [filtrosCheques, setFiltrosCheques] = useState({
    numeroCheque: '', banco: '', dataVencimentoInicio: '', dataVencimentoFim: '',
    valorMin: '', valorMax: ''
  });

  // Mudei o padrão para 'aguardando' ou 'aPagar' conforme sua preferência
  const [abaPedidos, setAbaPedidos] = useState('aguardando'); 
  const [abaCheques, setAbaCheques] = useState('aVencer');
  const [chequeDetalhe, setChequeDetalhe] = useState(null);
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [showLiquidacaoModal, setShowLiquidacaoModal] = useState(false);
  const [showSolicitarAcessoModal, setShowSolicitarAcessoModal] = useState(false);

  // --- Queries de Dados ---
  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
  const { data: pedidos = [] } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });
  const { data: cheques = [] } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });
  const { data: creditos = [] } = useQuery({ queryKey: ['creditos'], queryFn: () => base44.entities.Credito.list() });

  // --- Lógica de Negócio ---
  const clienteData = useMemo(() => clientes.find(c => c.email === user?.email), [clientes, user]);

  const meusPedidos = useMemo(() => {
    // SEGURANÇA: Se não achou cliente, retorna vazio
    if (!clienteData) return { aguardando: [], aPagar: [], pagos: [], cancelados: [] };
    
    // SEGURANÇA: Filtra apenas pedidos deste cliente
    let list = pedidos.filter(p => p.cliente_codigo === clienteData.codigo);
    
    // Filtros visuais
    if (filtros.numeroPedido) list = list.filter(p => p.numero_pedido?.toLowerCase().includes(filtros.numeroPedido.toLowerCase()));
    if (filtros.rota) list = list.filter(p => p.rota_codigo?.toLowerCase().includes(filtros.rota.toLowerCase()));
    if (filtros.dataEntregaInicio) list = list.filter(p => new Date(p.data_entrega) >= new Date(filtros.dataEntregaInicio));
    if (filtros.dataEntregaFim) list = list.filter(p => new Date(p.data_entrega) <= new Date(filtros.dataEntregaFim));
    if (filtros.valorMin) list = list.filter(p => p.valor_pedido >= parseFloat(filtros.valorMin));
    if (filtros.valorMax) list = list.filter(p => p.valor_pedido <= parseFloat(filtros.valorMax));

    return {
      // NOVA CATEGORIA: Status 'aguardando'
      aguardando: list.filter(p => p.status === 'aguardando'),
      aPagar: list.filter(p => p.status === 'aberto' || p.status === 'parcial'),
      pagos: list.filter(p => p.status === 'pago'),
      cancelados: list.filter(p => p.status === 'cancelado')
    };
  }, [pedidos, clienteData, filtros]);

  const meusCheques = useMemo(() => {
    if (!clienteData) return { aVencer: [], compensados: [], devolvidos: [], pagos: [] };
    let list = cheques.filter(c => c.cliente_codigo === clienteData.codigo);
    
    // Filtros Cheques (mesma lógica anterior)
    if (filtrosCheques.numeroCheque) list = list.filter(c => c.numero_cheque?.toLowerCase().includes(filtrosCheques.numeroCheque.toLowerCase()));
    if (filtrosCheques.banco) list = list.filter(c => c.banco?.toLowerCase().includes(filtrosCheques.banco.toLowerCase()));
    if (filtrosCheques.dataVencimentoInicio) list = list.filter(c => new Date(c.data_vencimento) >= new Date(filtrosCheques.dataVencimentoInicio));
    if (filtrosCheques.dataVencimentoFim) list = list.filter(c => new Date(c.data_vencimento) <= new Date(filtrosCheques.dataVencimentoFim));
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    return {
      aVencer: list.filter(c => { const v = new Date(c.data_vencimento); v.setHours(0,0,0,0); return c.status === 'normal' && v > hoje; }),
      compensados: list.filter(c => { const v = new Date(c.data_vencimento); v.setHours(0,0,0,0); return c.status === 'normal' && v <= hoje; }),
      devolvidos: list.filter(c => c.status === 'devolvido'),
      pagos: list.filter(c => c.status === 'pago')
    };
  }, [cheques, clienteData, filtrosCheques]);

  const meusCreditos = useMemo(() => {
    if (!clienteData) return [];
    return creditos.filter(c => c.cliente_codigo === clienteData.codigo && c.status === 'disponivel');
  }, [creditos, clienteData]);

  const totais = useMemo(() => {
    const totalPedidosAPagar = meusPedidos.aPagar.reduce((sum, p) => sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0);
    const totalChequesDevolvidos = meusCheques.devolvidos.reduce((sum, c) => sum + c.valor, 0);
    return {
      pedidosAPagar: totalPedidosAPagar,
      pedidosPagos: meusPedidos.pagos.reduce((sum, p) => sum + p.valor_pedido, 0),
      chequesAVencer: meusCheques.aVencer.reduce((sum, c) => sum + c.valor, 0),
      chequesDevolvidos: totalChequesDevolvidos,
      creditos: meusCreditos.reduce((sum, c) => sum + c.valor, 0),
      totalAPagar: totalPedidosAPagar + totalChequesDevolvidos
    };
  }, [meusPedidos, meusCheques, meusCreditos]);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  const formatNumero = (num) => num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '';
  const calcularDiasAtraso = (data) => {
    const diff = Math.floor((new Date() - new Date(data)) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const TabButton = ({ active, onClick, icon: Icon, label, count, colorClass, bgActive, borderActive }) => (
    <button 
      onClick={onClick}
      className={`flex-1 relative overflow-hidden group p-4 rounded-xl transition-all duration-300 border text-left
        ${active 
          ? `${bgActive} ${borderActive} shadow-sm` 
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
        <p className={`text-sm font-medium ${active ? 'text-slate-800' : 'text-slate-500'}`}>{label}</p>
      </div>
    </button>
  );

  const handleSolicitarAcesso = () => {
    const mensagem = encodeURIComponent(
      `Olá! Gostaria de solicitar acesso ao Portal do Cliente.\n\n` +
      `Nome: ${user?.full_name || ''}\n` +
      `Email: ${user?.email || ''}\n` +
      `Código do Cliente: (Preencher se souber)`
    );
    window.open(`https://wa.me/5511994931958?text=${mensagem}`, '_blank');
  };

  if (!clienteData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="border-yellow-200 bg-yellow-50 max-w-lg w-full">
          <CardContent className="p-8 space-y-4">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-10 h-10 text-yellow-600" />
              <div>
                <h3 className="font-bold text-yellow-800 text-xl">Acesso não vinculado</h3>
                <p className="text-yellow-700 text-sm">Email: {user?.email}</p>
              </div>
            </div>
            <p className="text-slate-700">Não encontramos um cadastro ativo com este email.</p>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSolicitarAcesso} className="flex-1 gap-2 bg-green-600 hover:bg-green-700">
                <Send className="w-4 h-4" />
                Solicitar Acesso via WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Olá, <span className="text-blue-600">{clienteData.nome}</span>
            </h1>
            <p className="text-slate-500 text-lg">Bem-vindo ao seu portal financeiro</p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Última atualização</p>
            <p className="text-sm text-slate-600">{format(new Date(), "dd 'de' MMMM, HH:mm")}</p>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-red-50 rounded-full -mr-20 -mt-20 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-red-600">
                <TrendingDown className="w-5 h-5" />
                <span className="font-semibold text-sm uppercase tracking-wide">Total a Pagar</span>
              </div>
              <p className="text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
                {formatCurrency(totais.totalAPagar)}
              </p>
              <p className="text-slate-400 text-sm mt-2">Soma de pedidos pendentes e devoluções</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-50 rounded-full -mr-20 -mt-20 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-emerald-600">
                <DollarSign className="w-5 h-5" />
                <span className="font-semibold text-sm uppercase tracking-wide">Crédito Disponível</span>
              </div>
              <p className="text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
                {formatCurrency(totais.creditos)}
              </p>
              <p className="text-slate-400 text-sm mt-2">{meusCreditos.length} créditos ativos em sua conta</p>
            </div>
          </div>
        </div>

        {/* --- SEÇÃO DE PEDIDOS --- */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <FileText className="w-5 h-5 text-blue-500" />
              Meus Pedidos
            </h2>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3">
            {meusPedidos.aPagar.length > 0 && (
              <Button onClick={() => setShowLiquidacaoModal(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <DollarSign className="w-4 h-4" />
                Solicitar Liquidação
              </Button>
            )}
            <Button variant="outline" className="gap-2" disabled>
              <Lock className="w-4 h-4" />
              Orçamentos (Em Breve)
            </Button>
          </div>

          {/* Abas de Navegação */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* --- NOVA ABA: AGUARDANDO --- */}
            <TabButton 
              active={abaPedidos === 'aguardando'} 
              onClick={() => setAbaPedidos('aguardando')}
              icon={Package} // Ícone de pacote
              label="Aguardando Entrega" 
              count={meusPedidos.aguardando.length}
              colorClass="text-amber-500"
              bgActive="bg-amber-50"
              borderActive="border-amber-200"
            />
            {/* ----------------------------- */}

            <TabButton 
              active={abaPedidos === 'aPagar'} 
              onClick={() => setAbaPedidos('aPagar')}
              icon={Clock} 
              label="A Pagar" 
              count={meusPedidos.aPagar.length}
              colorClass="text-red-500"
              bgActive="bg-red-50"
              borderActive="border-red-200"
            />
            <TabButton 
              active={abaPedidos === 'pagos'} 
              onClick={() => setAbaPedidos('pagos')}
              icon={CheckCircle} 
              label="Pagos" 
              count={meusPedidos.pagos.length}
              colorClass="text-emerald-500"
              bgActive="bg-emerald-50"
              borderActive="border-emerald-200"
            />
            <TabButton 
              active={abaPedidos === 'cancelados'} 
              onClick={() => setAbaPedidos('cancelados')}
              icon={XCircle} 
              label="Cancelados" 
              count={meusPedidos.cancelados.length}
              colorClass="text-slate-500"
              bgActive="bg-slate-100"
              borderActive="border-slate-200"
            />
          </div>

          {/* Filtros Rebatíveis */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <button 
              onClick={() => setShowFiltrosPedidos(!showFiltrosPedidos)}
              className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2 text-slate-600">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filtrar Pedidos</span>
              </div>
              {showFiltrosPedidos ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            <AnimatePresence>
              {showFiltrosPedidos && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 pt-0 bg-slate-50/50 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Input placeholder="Nº Pedido" value={filtros.numeroPedido} onChange={(e) => setFiltros({...filtros, numeroPedido: e.target.value})} className="bg-white" />
                    <Input placeholder="Rota" value={filtros.rota} onChange={(e) => setFiltros({...filtros, rota: e.target.value})} className="bg-white" />
                    <div className="space-y-1">
                       <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Data Entrega</label>
                       <div className="flex gap-2">
                          <Input type="date" value={filtros.dataEntregaInicio} onChange={(e) => setFiltros({...filtros, dataEntregaInicio: e.target.value})} className="bg-white text-xs" />
                          <Input type="date" value={filtros.dataEntregaFim} onChange={(e) => setFiltros({...filtros, dataEntregaFim: e.target.value})} className="bg-white text-xs" />
                       </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lista de Pedidos */}
            <div className="border-t border-slate-100">
              {meusPedidos[abaPedidos].length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {meusPedidos[abaPedidos].map(pedido => {
                    const saldo = pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0));
                    const diasAtraso = calcularDiasAtraso(pedido.data_entrega);
                    
                    return (
                      <div key={pedido.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          
                          {/* LINHA DO NÚMERO DO PEDIDO */}
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-bold text-slate-800">
                                #{formatNumero(pedido.numero_pedido)}
                            </span>
                            
                            {/* Tag de Aguardando */}
                            {abaPedidos === 'aguardando' && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide rounded-full flex items-center gap-1">
                                    <Package className="w-3 h-3" />
                                    Em Separação
                                </span>
                            )}

                            {diasAtraso > 0 && abaPedidos === 'aPagar' && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold uppercase tracking-wide rounded-full">
                                {diasAtraso} dias atraso
                              </span>
                            )}
                          </div>
                          
                          {/* LINHA DA ROTA (SOLICITADO) */}
                          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                              <Truck className="w-4 h-4 text-slate-400" />
                              <span className="font-medium">Rota:</span>
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                                  {pedido.rota_codigo || 'N/A'}
                              </span>
                          </div>

                          <div className="text-sm text-slate-500">
                            <span>Previsão: <span className="text-slate-700 font-medium">{format(new Date(pedido.data_entrega), 'dd/MM/yyyy')}</span></span>
                          </div>
                        </div>
                        
                        {/* VALOR (SOLICITADO) */}
                        <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                          <div className="text-right">
                             <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Valor Total</p>
                             <p className="text-xl font-bold text-slate-900">
                               {/* Se estiver aguardando, mostra o valor total. Se for a pagar, mostra o saldo. */}
                               {abaPedidos === 'aPagar' ? formatCurrency(saldo) : formatCurrency(pedido.valor_pedido)}
                             </p>
                          </div>
                          {abaPedidos !== 'aguardando' && (
                            <div className="p-2 bg-slate-100 rounded-full text-slate-400">
                                <ArrowRight className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400">
                  <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                     {abaPedidos === 'aguardando' ? <Package className="w-6 h-6 text-amber-300" /> : <Search className="w-6 h-6 text-slate-300" />}
                  </div>
                  <p>
                      {abaPedidos === 'aguardando' 
                        ? 'Nenhum pedido aguardando entrega no momento.' 
                        : 'Nenhum pedido encontrado nesta categoria.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- SEÇÃO DE CHEQUES (MANTIDA IGUAL) --- */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <CreditCard className="w-5 h-5 text-yellow-500" />
              Meus Cheques
            </h2>
          </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TabButton active={abaCheques === 'aVencer'} onClick={() => setAbaCheques('aVencer')} icon={Clock} label="A Vencer" count={meusCheques.aVencer.length} colorClass="text-yellow-600" bgActive="bg-yellow-50" borderActive="border-yellow-200"/>
            <TabButton active={abaCheques === 'compensados'} onClick={() => setAbaCheques('compensados')} icon={CheckCircle} label="Compensados" count={meusCheques.compensados.length} colorClass="text-green-600" bgActive="bg-green-50" borderActive="border-green-200"/>
            <TabButton active={abaCheques === 'devolvidos'} onClick={() => setAbaCheques('devolvidos')} icon={AlertCircle} label="Devolvidos" count={meusCheques.devolvidos.length} colorClass="text-red-600" bgActive="bg-red-50" borderActive="border-red-200"/>
            <TabButton active={abaCheques === 'pagos'} onClick={() => setAbaCheques('pagos')} icon={CheckCircle} label="Pagos" count={meusCheques.pagos.length} colorClass="text-blue-600" bgActive="bg-blue-50" borderActive="border-blue-200"/>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
             <button onClick={() => setShowFiltrosCheques(!showFiltrosCheques)} className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2 text-slate-600">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filtrar Cheques</span>
              </div>
              {showFiltrosCheques ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            <AnimatePresence>
              {showFiltrosCheques && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                  <div className="p-6 pt-0 bg-slate-50/50 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Input placeholder="Nº Cheque" value={filtrosCheques.numeroCheque} onChange={(e) => setFiltrosCheques({...filtrosCheques, numeroCheque: e.target.value})} className="bg-white" />
                    <Input placeholder="Banco" value={filtrosCheques.banco} onChange={(e) => setFiltrosCheques({...filtrosCheques, banco: e.target.value})} className="bg-white" />
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Vencimento</label>
                      <div className="flex gap-2">
                        <Input type="date" value={filtrosCheques.dataVencimentoInicio} onChange={(e) => setFiltrosCheques({...filtrosCheques, dataVencimentoInicio: e.target.value})} className="bg-white text-xs" />
                        <Input type="date" value={filtrosCheques.dataVencimentoFim} onChange={(e) => setFiltrosCheques({...filtrosCheques, dataVencimentoFim: e.target.value})} className="bg-white text-xs" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

             <div className="border-t border-slate-100">
              {meusCheques[abaCheques].length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {meusCheques[abaCheques].map(cheque => (
                    <div key={cheque.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                         <div className="flex items-center gap-3 mb-1">
                            <span className="text-lg font-bold text-slate-800">#{formatNumero(cheque.numero_cheque)}</span>
                            <span className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{cheque.banco}</span>
                          </div>
                          <p className="text-sm text-slate-500">Vence em: <span className="font-medium text-slate-700">{format(new Date(cheque.data_vencimento), 'dd/MM/yyyy')}</span></p>
                      </div>
                      <div className="flex items-center gap-4">
                         <p className="text-lg font-bold text-slate-900">{formatCurrency(cheque.valor)}</p>
                         <Button size="icon" variant="ghost" onClick={() => { setChequeDetalhe(cheque); setShowChequeModal(true); }}>
                           <Eye className="w-5 h-5 text-slate-400 hover:text-blue-600 transition-colors" />
                         </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400">
                  <p>Nenhum cheque encontrado.</p>
                </div>
              )}
             </div>
          </div>
        </div>

        {/* --- SEÇÃO DE CRÉDITOS (MANTIDA) --- */}
        {meusCreditos.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Créditos Detalhados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {meusCreditos.map(credito => (
                <div key={credito.id} className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm flex justify-between items-center relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400" />
                  <div>
                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Crédito #{credito.numero_credito}</p>
                    <p className="text-sm text-slate-500">{credito.origem}</p>
                  </div>
                  <p className="text-xl font-bold text-emerald-700">{formatCurrency(credito.valor)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ModalContainer open={showChequeModal} onClose={() => setShowChequeModal(false)} title="Detalhes do Cheque">
        {chequeDetalhe && <ChequeDetails cheque={chequeDetalhe} onEdit={() => {}} onClose={() => setShowChequeModal(false)} />}
      </ModalContainer>

      <ModalContainer open={showLiquidacaoModal} onClose={() => setShowLiquidacaoModal(false)} title="Solicitar Liquidação" size="xl">
        <LiquidacaoSelfService
          pedidos={meusPedidos.aPagar}
          clienteCodigo={clienteData.codigo}
          clienteNome={clienteData.nome}
          onSuccess={() => {
            setShowLiquidacaoModal(false);
            toast.success('Solicitação enviada com sucesso!');
          }}
          onCancel={() => setShowLiquidacaoModal(false)}
        />
      </ModalContainer>
    </div>
  );
}