import React, { useMemo, useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  ArrowLeft, Calendar, TrendingUp, AlertTriangle, DollarSign, 
  Users, Activity, Target, Download, Crown, PieChart as PieChartIcon, 
  List, ChevronLeft, ChevronRight, Ghost
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PermissionGuard from "@/components/PermissionGuard";
import { 
  differenceInDays, format, subMonths, isPast, parseISO, startOfMonth, endOfMonth, isWithinInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState('ceo');
  
  // Filtro de Data Global
  const [periodo, setPeriodo] = useState({
    inicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    fim: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const [viewMixMode, setViewMixMode] = useState('chart');
  
  // Paginação Clientes
  const [clientPage, setClientPage] = useState(1);
  const [clientItemsPerPage, setClientItemsPerPage] = useState(10);

  // Paginação Representantes
  const [repPage, setRepPage] = useState(1);
  const [repItemsPerPage, setRepItemsPerPage] = useState(5);

  // Resetar a paginação ao mudar a data
  useEffect(() => {
    setClientPage(1);
    setRepPage(1);
  }, [periodo]);

  // --- QUERIES E LOADING STATE ---
  const { data: pedidos = [], isLoading: loadPedidos } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });
  const { data: cheques = [], isLoading: loadCheques } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });
  const { data: clientes = [], isLoading: loadClientes } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
  const { data: representantes = [], isLoading: loadReps } = useQuery({ queryKey: ['representantes'], queryFn: () => base44.entities.Representante.list() });
  const { data: borderos = [], isLoading: loadBorderos } = useQuery({ queryKey: ['borderos'], queryFn: () => base44.entities.Bordero.list() });

  const isLoadingGlobal = loadPedidos || loadCheques || loadClientes || loadReps || loadBorderos;

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const hoje = new Date();

  // ============================================================================
  // 🧹 PURGA DE DADOS INTERNOS (EXPURGA FORMA DE PAGAMENTO "SERVIÇO")
  // ============================================================================
  const isPagamentoServico = (forma) => {
      if (!forma) return false;
      const str = String(forma).toLowerCase();
      return str.includes('serviç') || str.includes('servic');
  };

  // Usa essas listas validadas em todos os cálculos do sistema
  const pedidosValidos = useMemo(() => pedidos.filter(p => !isPagamentoServico(p.forma_pagamento)), [pedidos]);
  const borderosValidos = useMemo(() => borderos.filter(b => !isPagamentoServico(b.forma_pagamento)), [borderos]);

  // --- HELPERS E FILTROS INTELIGENTES ---
  const datasFiltro = useMemo(() => ({
    start: parseISO(periodo.inicio),
    end: parseISO(periodo.fim)
  }), [periodo]);

  const filtrar = (dataStr) => {
    if (!dataStr) return false;
    const data = parseISO(dataStr.split('T')[0]);
    return isWithinInterval(data, datasFiltro);
  };

  const getVencimentoReal = (p) => {
    // A data programada protege o pedido de constar como atrasado caso tenha sido adiado
    return p.data_programada ? p.data_programada : p.data_entrega;
  };

  const isDevedor = (p) => {
    if (!['aberto', 'parcial', 'representante_recebe'].includes(p.status)) return false;
    const vencimento = getVencimentoReal(p);
    if (!vencimento) return false;
    // Garante matematicamente que só soma se o atraso for de 1 dia ou mais (jamais soma "a receber")
    return differenceInDays(hoje, parseISO(vencimento)) > 0;
  };

  const getDiasAtraso = (p) => {
      const vencimento = getVencimentoReal(p);
      return differenceInDays(hoje, parseISO(vencimento));
  };

  // ============================================================================
  // 🧠 MOTORES DE PROCESSAMENTO DE BI
  // ============================================================================

  // --- VISÃO CEO ---
  const visaoCEO = useMemo(() => {
      const pedidosNoPeriodo = pedidosValidos.filter(p => filtrar(p.created_date));
      const totalReceita = pedidosNoPeriodo.reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
      const qtdPedidos = pedidosNoPeriodo.length;
      const ticketMedio = qtdPedidos > 0 ? totalReceita / qtdPedidos : 0;

      // Curva de Crescimento Múltipla (12 meses)
      const curva12Meses = Array.from({ length: 12 }, (_, i) => {
          const dataRef = subMonths(hoje, 11 - i);
          const mesAnoStr = format(dataRef, 'yyyy-MM');
          
          // 1. Entregues: Baseado na data de entrega (exclui orçamentos e cancelados)
          const pedEntregues = pedidosValidos.filter(p => 
              (p.data_entrega?.startsWith(mesAnoStr) || (!p.data_entrega && p.created_date?.startsWith(mesAnoStr))) 
              && p.status !== 'cancelado' && p.status !== 'orcamento'
          );
          const faturamentoEntregues = pedEntregues.reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
          const qtdEntregues = pedEntregues.length;
          const ticket = qtdEntregues > 0 ? faturamentoEntregues / qtdEntregues : 0;

          // 2. Cancelados: Baseado na data do sistema
          const pedCancelados = pedidosValidos.filter(p => p.created_date?.startsWith(mesAnoStr) && p.status === 'cancelado');
          const faturamentoCancelados = pedCancelados.reduce((sum, p) => sum + (p.valor_pedido || 0), 0);

          // 3. Pagos (Recebidos): Baseado nos Borderôs liquidados (Entrada real de dinheiro)
          const faturamentoPagos = borderosValidos
              .filter(b => b.created_date && b.created_date.startsWith(mesAnoStr))
              .reduce((sum, b) => sum + (b.valor_total || 0), 0);

          return { 
              mes: format(dataRef, 'MMM/yy', { locale: ptBR }), 
              faturamento: faturamentoEntregues, 
              ticket: ticket,
              cancelados: faturamentoCancelados,
              pagos: faturamentoPagos
          };
      });

      // Projeções Inteligentes (Média dos últimos 3 meses)
      const ultimos3 = curva12Meses.slice(-3);
      curva12Meses.push({ 
          mes: 'Projeção', 
          faturamento: ultimos3.reduce((a, b) => a + b.faturamento, 0) / 3,
          ticket: ultimos3.reduce((a, b) => a + b.ticket, 0) / 3,
          cancelados: ultimos3.reduce((a, b) => a + b.cancelados, 0) / 3,
          pagos: ultimos3.reduce((a, b) => a + b.pagos, 0) / 3
      });

      // Projeção Caixa Futuro
      const proj30d = { trinta: 0 };
      const somaProjecao = (dataVenc, valor) => {
          if (!dataVenc) return;
          const diasFuturo = differenceInDays(parseISO(dataVenc), hoje);
          if (diasFuturo >= 0 && diasFuturo <= 30) proj30d.trinta += valor;
      };
      cheques.filter(c => c.status === 'normal' || c.status === 'repassado').forEach(c => somaProjecao(c.data_vencimento, c.valor));
      pedidosValidos.filter(p => p.status === 'aberto' || p.status === 'parcial' || p.status === 'representante_recebe').forEach(p => somaProjecao(getVencimentoReal(p), parseFloat(p.saldo_restante || p.valor_pedido)));

      return { totalReceita, qtdPedidos, ticketMedio, curva12Meses, proj30d: proj30d.trinta };
  }, [pedidosValidos, borderosValidos, cheques, datasFiltro]);

  // --- 1. FINANCEIRO (INADIMPLÊNCIA) ---
  const financeiro = useMemo(() => {
    const buckets = { d1_10: 0, d11_15: 0, d16_35: 0, d36_60: 0, d61_90: 0, d90_plus: 0 };
    const clientesDevedoresMap = {};
    let totalAtrasado = 0;

    pedidosValidos.filter(isDevedor).forEach(p => {
        const diasAtraso = getDiasAtraso(p);
        const saldo = parseFloat(p.saldo_restante || (p.valor_pedido - (p.total_pago || 0)));

        if (diasAtraso >= 1 && diasAtraso <= 10) buckets.d1_10 += saldo;
        else if (diasAtraso >= 11 && diasAtraso <= 15) buckets.d11_15 += saldo;
        else if (diasAtraso >= 16 && diasAtraso <= 35) buckets.d16_35 += saldo;
        else if (diasAtraso >= 36 && diasAtraso <= 60) buckets.d36_60 += saldo;
        else if (diasAtraso >= 61 && diasAtraso <= 90) buckets.d61_90 += saldo;
        else if (diasAtraso > 90) buckets.d90_plus += saldo;

        totalAtrasado += saldo;

        if (!clientesDevedoresMap[p.cliente_codigo]) clientesDevedoresMap[p.cliente_codigo] = { nome: p.cliente_nome, valor: 0, dias: diasAtraso };
        clientesDevedoresMap[p.cliente_codigo].valor += saldo;
        if (diasAtraso > clientesDevedoresMap[p.cliente_codigo].dias) clientesDevedoresMap[p.cliente_codigo].dias = diasAtraso;
    });

    const grafInadimplencia = [
        { name: '1-10 dias', value: buckets.d1_10, color: '#3b82f6' },      // Azul (Leve)
        { name: '11-15 dias', value: buckets.d11_15, color: '#10b981' },     // Verde (Seguro)
        { name: '16-35 dias', value: buckets.d16_35, color: '#facc15' },     // Amarelo (Atenção)
        { name: '36-60 dias', value: buckets.d36_60, color: '#f97316' },     // Laranja (Alerta)
        { name: '61-90 dias', value: buckets.d61_90, color: '#ef4444' },     // Vermelho (Crítico)
        { name: '90+ dias', value: buckets.d90_plus, color: '#450a0a' },     // Vermelho Escuro/Preto (Perdido)
    ];

    const topDevedores = Object.values(clientesDevedoresMap).sort((a,b) => b.valor - a.valor).slice(0, 5);

    return { grafInadimplencia, topDevedores, totalAtrasado };
  }, [pedidosValidos]);

  // --- 4. FLUXO DE CAIXA E MIX DE PAGAMENTOS ---
  const fluxoCaixa = useMemo(() => {
      const bPeriodo = borderosValidos.filter(b => filtrar(b.created_date));
      let totalRecebido = 0;
      
      const mixMap = { dinheiro: 0, pix: 0, cdeb: 0, ccred: 0, link: 0, cheque: 0 };
      const topClientesMap = { dinheiro: {}, pix: {}, cdeb: {}, ccred: {}, link: {}, cheque: {} };

      bPeriodo.forEach(b => {
          totalRecebido += b.valor_total;
          const f = b.forma_pagamento?.toLowerCase() || '';
          const cliente = b.cliente_nome || 'Cliente Não Informado';

          let chave = 'outros';
          if (f.includes('dinheiro')) chave = 'dinheiro';
          else if (f.includes('pix')) chave = 'pix';
          else if (f.includes('débito') || f.includes('debito')) chave = 'cdeb';
          else if (f.includes('crédito') || f.includes('credito') || f.includes('cartao')) chave = 'ccred';
          else if (f.includes('link')) chave = 'link';
          else if (f.includes('cheque')) chave = 'cheque';

          if(chave !== 'outros') {
             mixMap[chave] += b.valor_total;
             if (!topClientesMap[chave][cliente]) topClientesMap[chave][cliente] = 0;
             topClientesMap[chave][cliente] += b.valor_total;
          }
      });

      const mixArr = [
          { name: 'Dinheiro', valor: mixMap.dinheiro, color: '#10b981' },
          { name: 'PIX', valor: mixMap.pix, color: '#06b6d4' },
          { name: 'Cartão Débito', valor: mixMap.cdeb, color: '#6366f1' },
          { name: 'Cartão Crédito', valor: mixMap.ccred, color: '#3b82f6' },
          { name: 'Link Pagto.', valor: mixMap.link, color: '#f59e0b' },
          { name: 'Cheque', valor: mixMap.cheque, color: '#8b5cf6' }
      ].map(item => ({ ...item, perc: totalRecebido > 0 ? ((item.valor / totalRecebido) * 100).toFixed(1) : 0 }));

      const top5PorForma = {};
      Object.keys(topClientesMap).forEach(k => {
          top5PorForma[k] = Object.entries(topClientesMap[k]).map(([nome, valor]) => ({nome, valor})).sort((a,b)=>b.valor - a.valor).slice(0,5);
      });

      const evolucaoMix = Array.from({ length: 6 }, (_, i) => {
          const dataRef = subMonths(hoje, 5 - i);
          const mesAnoStr = format(dataRef, 'yyyy-MM');
          const bMes = borderosValidos.filter(b => b.created_date && b.created_date.startsWith(mesAnoStr));

          let d=0, p=0, ccd=0, ccc=0, l=0, c=0;
          bMes.forEach(b => {
              const f = b.forma_pagamento?.toLowerCase() || '';
              if (f.includes('dinheiro')) d += b.valor_total;
              else if (f.includes('pix')) p += b.valor_total;
              else if (f.includes('débito') || f.includes('debito')) ccd += b.valor_total;
              else if (f.includes('crédito') || f.includes('credito') || f.includes('cartao')) ccc += b.valor_total;
              else if (f.includes('link')) l += b.valor_total;
              else if (f.includes('cheque')) c += b.valor_total;
          });
          return { mes: format(dataRef, 'MMM/yy', { locale: ptBR }), Dinheiro: d, PIX: p, Debito: ccd, Credito: ccc, Link: l, Cheque: c };
      });

      return { totalRecebido, mixArr, top5PorForma, evolucaoMix };
  }, [borderosValidos, datasFiltro]);

  // --- 3. COMERCIAL (REPRESENTANTES E LTV) ---
  const comercial = useMemo(() => {
      const calcScore = (mapa) => {
          const maxVol = Math.max(...Object.values(mapa).map(x => x.vol)) || 1;
          return Object.values(mapa).map(item => {
              const ticket = item.qtd > 0 ? item.vol / item.qtd : 0;
              const score = ((item.vol / maxVol) * 100 * 0.4) + ((ticket / 10000) * 100 * 0.3) - ((item.inadimplencia / maxVol) * 100 * 0.3);
              return { ...item, ticket, score };
          }).filter(x => x.vol > 0).sort((a,b) => b.score - a.score);
      };

      const repMap = {};
      representantes.forEach(r => repMap[r.codigo] = { nome: r.nome, vol: 0, qtd: 0, inadimplencia: 0 });
      
      const cliMap = {};
      clientes.forEach(c => cliMap[c.codigo] = { nome: c.nome, vol: 0, qtd: 0, inadimplencia: 0 });

      pedidosValidos.filter(p => filtrar(p.created_date)).forEach(p => {
          if (repMap[p.representante_codigo]) {
              repMap[p.representante_codigo].vol += p.valor_pedido;
              repMap[p.representante_codigo].qtd += 1;
              if (isDevedor(p)) repMap[p.representante_codigo].inadimplencia += parseFloat(p.saldo_restante || p.valor_pedido);
          }
          if (cliMap[p.cliente_codigo]) {
              cliMap[p.cliente_codigo].vol += p.valor_pedido;
              cliMap[p.cliente_codigo].qtd += 1;
              if (isDevedor(p)) cliMap[p.cliente_codigo].inadimplencia += parseFloat(p.saldo_restante || p.valor_pedido);
          }
      });

      // LTV Histórico
      const ltvMap = {};
      pedidosValidos.forEach(p => {
          if (!ltvMap[p.cliente_codigo]) ltvMap[p.cliente_codigo] = { nome: p.cliente_nome, ltv: 0, qtd: 0, lastOrder: parseISO(p.created_date) };
          ltvMap[p.cliente_codigo].ltv += p.valor_pedido;
          ltvMap[p.cliente_codigo].qtd += 1;
          const orderDate = parseISO(p.created_date);
          if (orderDate > ltvMap[p.cliente_codigo].lastOrder) ltvMap[p.cliente_codigo].lastOrder = orderDate;
      });

      const ltvList = Object.values(ltvMap).sort((a,b) => b.ltv - a.ltv);
      const totalGlobal = ltvList.reduce((a,b) => a + b.ltv, 0);
      let acc = 0;
      
      const curvaABC = ltvList.map(c => {
          acc += c.ltv;
          const perc = totalGlobal > 0 ? (acc / totalGlobal) * 100 : 0;
          let classe = 'C';
          if (perc <= 80) classe = 'A';
          else if (perc <= 95) classe = 'B';
          return { ...c, classe, ticket: c.qtd > 0 ? c.ltv / c.qtd : 0 };
      });

      const churn = curvaABC.filter(c => (c.classe === 'A' || c.classe === 'B') && differenceInDays(hoje, c.lastOrder) > 90);

      return { repRanking: calcScore(repMap), clientRanking: calcScore(cliMap), topLTV: curvaABC.slice(0, 10), churn };
  }, [pedidosValidos, representantes, clientes, datasFiltro]);

  // Paginação Lógica
  const totalClientPages = Math.ceil(comercial.clientRanking.length / clientItemsPerPage);
  const paginatedClients = comercial.clientRanking.slice((clientPage - 1) * clientItemsPerPage, clientPage * clientItemsPerPage);

  const totalRepPages = Math.ceil(comercial.repRanking.length / repItemsPerPage);
  const paginatedReps = comercial.repRanking.slice((repPage - 1) * repItemsPerPage, repPage * repItemsPerPage);

  const MIX_COLORS = { Dinheiro: '#10b981', PIX: '#06b6d4', Debito: '#6366f1', Credito: '#3b82f6', Link: '#f59e0b', Cheque: '#8b5cf6' };

  if (isLoadingGlobal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-bold animate-pulse">Processando inteligência de dados...</p>
      </div>
    );
  }

  return (
    <PermissionGuard setor="Relatorios">
      <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans">
        <div className="max-w-[1600px] mx-auto space-y-6">
          
          {/* HEADER EXECUTIVO & FILTRO DATA GLOBAL */}
          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 pointer-events-none"><Activity className="w-96 h-96" /></div>
            <div className="flex items-center gap-6 relative z-10">
              <Link to={createPageUrl('Dashboard')}><Button variant="outline" size="icon" className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20"><ArrowLeft className="w-5 h-5" /></Button></Link>
              <div>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight uppercase">Dashboard Executivo</h1>
                <p className="text-slate-400 font-medium mt-1">Inteligência de Dados e Previsibilidade Financeira</p>
              </div>
            </div>
            
            <div className="relative z-10 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-2 bg-white/10 p-2 rounded-2xl border border-white/20 backdrop-blur-md">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  <Input type="date" value={periodo.inicio} onChange={(e) => setPeriodo({...periodo, inicio: e.target.value})} className="border-none shadow-none font-bold text-white bg-transparent w-36" style={{colorScheme: 'dark'}} />
                  <span className="text-slate-400 font-black">ATÉ</span>
                  <Input type="date" value={periodo.fim} onChange={(e) => setPeriodo({...periodo, fim: e.target.value})} className="border-none shadow-none font-bold text-white bg-transparent w-36" style={{colorScheme: 'dark'}} />
                </div>

                <div className="w-px h-6 bg-white/20 mx-2 hidden sm:block"></div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white h-10 rounded-2xl"
                >
                  <Download className="w-4 h-4 mr-2" /> Exportar
                </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white/60 p-1.5 rounded-2xl border w-full lg:w-auto h-auto flex flex-nowrap overflow-x-auto whitespace-nowrap shadow-sm no-scrollbar">
              <TabsTrigger value="ceo" className="rounded-xl px-6 py-2.5 font-bold"><Target className="w-4 h-4 mr-2"/> Visão CEO</TabsTrigger>
              <TabsTrigger value="fin" className="rounded-xl px-6 py-2.5 font-bold"><AlertTriangle className="w-4 h-4 mr-2"/> Financeiro & Risco</TabsTrigger>
              <TabsTrigger value="fluxo" className="rounded-xl px-6 py-2.5 font-bold"><DollarSign className="w-4 h-4 mr-2"/> Fluxo de Caixa (Mix)</TabsTrigger>
              <TabsTrigger value="com" className="rounded-xl px-6 py-2.5 font-bold"><Users className="w-4 h-4 mr-2"/> Performance Comercial</TabsTrigger>
            </TabsList>

            {/* ============================================================================== */}
            {/* VISÃO CEO */}
            {/* ============================================================================== */}
            <TabsContent value="ceo" className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-6 border-l-4 border-l-blue-500 shadow-sm">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">Receita Faturada (Período)</p>
                        <p className="text-4xl font-black text-slate-800">{formatCurrency(visaoCEO.totalReceita)}</p>
                        <Badge className="bg-blue-100 text-blue-700 mt-2">{visaoCEO.qtdPedidos} Pedidos gerados</Badge>
                    </Card>
                    <Card className="p-6 border-l-4 border-l-emerald-500 shadow-sm bg-emerald-50/30">
                        <p className="text-emerald-700 text-xs font-bold uppercase mb-1">Ticket Médio Global</p>
                        <p className="text-4xl font-black text-emerald-900">{formatCurrency(visaoCEO.ticketMedio)}</p>
                        <Badge className="bg-emerald-200 text-emerald-800 mt-2 border-none">Geral Todos Clientes</Badge>
                    </Card>
                    <Card className="p-6 border-l-4 border-l-red-500 shadow-sm">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total em Atraso (Vencido)</p>
                        <p className="text-4xl font-black text-red-600">{formatCurrency(financeiro.totalAtrasado)}</p>
                        <Badge className="bg-red-100 text-red-700 mt-2 border-none">Dívida real já vencida</Badge>
                    </Card>
                    <Card className="p-6 border-l-4 border-l-purple-500 shadow-sm">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">Projeção de Entrada (30 Dias)</p>
                        <p className="text-4xl font-black text-purple-700">{formatCurrency(visaoCEO.proj30d)}</p>
                        <Badge className="bg-purple-100 text-purple-700 mt-2 border-none">Garantido em papel/sistema</Badge>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 1. Pedidos Entregues */}
                    <Card className="p-6 shadow-sm border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp className="text-indigo-600"/> Evolução e Projeção: Pedidos Entregues</h3>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={visaoCEO.curva12Meses}>
                                    <defs>
                                        <linearGradient id="colorFatur" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="mes" tick={{fontSize: 12}} />
                                    <YAxis tickFormatter={(val) => `R$ ${(val/1000).toFixed(0)}k`} width={60} />
                                    <Tooltip formatter={(v) => formatCurrency(v)} />
                                    <Area type="monotone" name="Valor Entregue" dataKey="faturamento" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFatur)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* 2. Ticket Médio */}
                    <Card className="p-6 shadow-sm border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Target className="text-emerald-600"/> Evolução e Projeção: Ticket Médio</h3>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={visaoCEO.curva12Meses}>
                                    <defs>
                                        <linearGradient id="colorTicket" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="mes" tick={{fontSize: 12}} />
                                    <YAxis tickFormatter={(val) => `R$ ${(val/1000).toFixed(0)}k`} width={60} />
                                    <Tooltip formatter={(v) => formatCurrency(v)} />
                                    <Area type="monotone" name="Ticket Médio" dataKey="ticket" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTicket)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* 3. Pedidos Cancelados */}
                    <Card className="p-6 shadow-sm border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><AlertTriangle className="text-red-500"/> Evolução e Projeção: Pedidos Cancelados</h3>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={visaoCEO.curva12Meses}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="mes" tick={{fontSize: 12}} />
                                    <YAxis tickFormatter={(val) => `R$ ${(val/1000).toFixed(0)}k`} width={60} />
                                    <Tooltip formatter={(v) => formatCurrency(v)} cursor={{fill: 'transparent'}} />
                                    <Bar name="Valor Cancelado" dataKey="cancelados" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* 4. Comparativo de 3 Linhas */}
                    <Card className="p-6 shadow-sm border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Activity className="text-slate-700"/> Entregues vs Pagos vs Cancelados</h3>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={visaoCEO.curva12Meses}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="mes" tick={{fontSize: 12}} />
                                    <YAxis tickFormatter={(val) => `R$ ${(val/1000).toFixed(0)}k`} width={60} />
                                    <Tooltip formatter={(v) => formatCurrency(v)} />
                                    <Legend verticalAlign="top" height={36} />
                                    <Line type="monotone" name="Entregues" dataKey="faturamento" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                    <Line type="monotone" name="Pagos (Caixa)" dataKey="pagos" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                    <Line type="monotone" name="Cancelados" dataKey="cancelados" stroke="#ef4444" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </TabsContent>

            {/* ============================================================================== */}
            {/* 1. FINANCEIRO (INADIMPLÊNCIA INTELIGENTE) */}
            {/* ============================================================================== */}
            <TabsContent value="fin" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6 shadow-lg border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><AlertTriangle className="text-red-500"/> Inadimplência Inteligente (Envelhecimento)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={financeiro.grafInadimplencia.filter(d=>d.value>0)} innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value">
                                            {financeiro.grafInadimplencia.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                                        </Pie>
                                        <Tooltip formatter={(v) => formatCurrency(v)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-3">
                                {financeiro.grafInadimplencia.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                                        <span className="text-xs font-bold flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}/> {item.name}</span>
                                        <span className="font-black text-slate-800 text-sm">{formatCurrency(item.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 shadow-lg border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-6">Top 5 Clientes Críticos (Devedores)</h3>
                        <div className="space-y-4">
                            {financeiro.topDevedores.map((dev, i) => (
                                <div key={i} className="flex justify-between items-center p-3 border border-red-100 bg-red-50/50 rounded-xl hover:scale-[1.01] transition-all">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{dev.nome}</p>
                                        <p className="text-xs text-red-600 font-bold uppercase mt-1">Atraso max: {dev.dias} dias</p>
                                    </div>
                                    <span className="font-black text-red-700 text-lg">{formatCurrency(dev.valor)}</span>
                                </div>
                            ))}
                            {financeiro.topDevedores.length === 0 && <p className="text-emerald-600 font-bold text-center py-10">Nenhum cliente inadimplente!</p>}
                        </div>
                    </Card>
                </div>
            </TabsContent>

            {/* ============================================================================== */}
            {/* 4. FLUXO DE CAIXA E MIX DE PAGAMENTOS */}
            {/* ============================================================================== */}
            <TabsContent value="fluxo" className="space-y-6">
                <Card className="p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-3xl border-none shadow-xl flex justify-between items-center">
                    <div>
                        <p className="text-emerald-100 text-sm font-bold uppercase tracking-widest mb-1">Total Real Recebido (Borderôs no Período)</p>
                        <p className="text-5xl font-black">{formatCurrency(fluxoCaixa.totalRecebido)}</p>
                    </div>
                    <DollarSign className="w-20 h-20 text-white/20" />
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* MIX DE PAGAMENTOS: TABELA VS GRAFICO */}
                    <Card className="p-6 shadow-lg rounded-3xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800">Composição de Recebimentos</h3>
                            <div className="bg-slate-100 p-1 rounded-lg flex">
                                <Button variant={viewMixMode === 'chart' ? 'default' : 'ghost'} size="sm" onClick={()=>setViewMixMode('chart')} className="h-7"><PieChartIcon className="w-4 h-4"/></Button>
                                <Button variant={viewMixMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={()=>setViewMixMode('table')} className="h-7"><List className="w-4 h-4"/></Button>
                            </div>
                        </div>

                        {viewMixMode === 'chart' ? (
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={fluxoCaixa.mixArr.filter(d=>d.valor>0)} innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="valor">
                                            {fluxoCaixa.mixArr.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                                        </Pie>
                                        <Tooltip formatter={(v) => formatCurrency(v)} />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="border rounded-xl overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50"><TableRow><TableHead>Forma</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">%</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {fluxoCaixa.mixArr.sort((a,b)=>b.valor-a.valor).map((m,i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-bold flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor: m.color}}/> {m.name}</TableCell>
                                                <TableCell className="text-right font-black">{formatCurrency(m.valor)}</TableCell>
                                                <TableCell className="text-right"><Badge variant="outline" className="bg-slate-50">{m.perc}%</Badge></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </Card>

                    {/* GRAFICO COMPARATIVO EVOLUTIVO */}
                    <Card className="p-6 shadow-lg rounded-3xl">
                        <h3 className="font-bold text-slate-800 mb-6">Evolução do Uso de Formas de Pagamento (6 Meses)</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={fluxoCaixa.evolucaoMix}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="mes" tick={{fontSize: 12}} />
                                    <YAxis tickFormatter={(val) => `R$ ${(val/1000).toFixed(0)}k`} width={60} />
                                    <Tooltip formatter={(v) => formatCurrency(v)} />
                                    <Legend />
                                    <Line type="monotone" dataKey="PIX" stroke={MIX_COLORS.PIX} strokeWidth={3} dot={false} />
                                    <Line type="monotone" dataKey="Dinheiro" stroke={MIX_COLORS.Dinheiro} strokeWidth={3} dot={false} />
                                    <Line type="monotone" dataKey="Cheque" stroke={MIX_COLORS.Cheque} strokeWidth={3} dot={false} />
                                    <Line type="monotone" dataKey="Credito" stroke={MIX_COLORS.Credito} strokeWidth={3} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* RANKING TOP 5 POR FORMA DE PAGTO */}
                <h3 className="text-xl font-black text-slate-800 mt-10 mb-4 uppercase tracking-tight">Top 5 Clientes por Modalidade</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.keys(fluxoCaixa.top5PorForma).map((chave) => {
                        const label = fluxoCaixa.mixArr.find(m => m.name.toLowerCase().includes(chave) || chave.includes(m.name.toLowerCase().split(' ')[0]))?.name || chave;
                        const cor = MIX_COLORS[label] || MIX_COLORS.PIX;
                        return (
                            <Card key={chave} className="p-5 shadow-md border-t-4" style={{borderTopColor: cor}}>
                                <h4 className="font-bold text-slate-700 mb-4 uppercase text-xs tracking-widest">{label}</h4>
                                <div className="space-y-3">
                                    {fluxoCaixa.top5PorForma[chave].map((cli, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                            <span className="font-medium text-slate-600 truncate max-w-[150px]">{i+1}. {cli.nome}</span>
                                            <span className="font-black text-slate-800">{formatCurrency(cli.valor)}</span>
                                        </div>
                                    ))}
                                    {fluxoCaixa.top5PorForma[chave].length === 0 && <p className="text-xs text-slate-400 italic">Sem registros no período.</p>}
                                </div>
                            </Card>
                        )
                    })}
                </div>
            </TabsContent>

            {/* ============================================================================== */}
            {/* 3. COMERCIAL (REPRESENTANTES, SCORE CLIENTES E LTV) */}
            {/* ============================================================================== */}
            <TabsContent value="com" className="space-y-6">
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* RANKING REPRESENTANTES (COM PAGINAÇÃO) */}
                    <Card className="p-6 shadow-xl rounded-3xl bg-white border-none flex flex-col h-full">
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Crown className="text-yellow-500"/> Ranking de Representantes (Score Engine)</h3>
                            <p className="text-xs text-slate-500 mb-6">O Score penaliza inadimplência e premia volume e ticket médio.</p>
                            <div className="space-y-4">
                                {paginatedReps.map((rep, i) => {
                                    const rankPos = (repPage - 1) * repItemsPerPage + i + 1;
                                    return (
                                        <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border hover:scale-[1.01] transition-transform">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${rankPos===1?'bg-yellow-400':rankPos===2?'bg-slate-400':rankPos===3?'bg-amber-600':'bg-slate-300'}`}>{rankPos}</div>
                                            <div className="flex-1">
                                                <div className="flex justify-between"><span className="font-bold text-slate-800">{rep.nome}</span><span className="font-black text-indigo-600">Score: {rep.score.toFixed(0)}</span></div>
                                                <div className="text-xs text-slate-500 flex justify-between mt-1">
                                                    <span>Vol: {formatCurrency(rep.vol)}</span>
                                                    <span className="text-red-500">Inad: {formatCurrency(rep.inadimplencia)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* CONTROLES DE PAGINAÇÃO DOS REPRESENTANTES */}
                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span>Exibir:</span>
                                <select value={repItemsPerPage} onChange={(e) => { setRepItemsPerPage(Number(e.target.value)); setRepPage(1); }} className="h-8 rounded-md border-slate-300 px-2 bg-white text-slate-700 outline-none text-sm">
                                    <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
                                </select>
                            </div>
                            {totalRepPages > 1 && (
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setRepPage(p => Math.max(1, p - 1))} disabled={repPage === 1} className="h-8 px-2"><ChevronLeft className="w-4 h-4"/></Button>
                                    <span className="text-xs font-bold">Pág. {repPage}/{totalRepPages}</span>
                                    <Button variant="outline" size="sm" onClick={() => setRepPage(p => Math.min(totalRepPages, p + 1))} disabled={repPage === totalRepPages} className="h-8 px-2"><ChevronRight className="w-4 h-4"/></Button>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* LTV & CHURN */}
                    <div className="space-y-6">
                      <Card className="p-6 shadow-xl rounded-3xl bg-white border-none">
                          <h3 className="font-bold text-slate-800 mb-2">LTV & Curva ABC (Top Clientes Ouro)</h3>
                          <p className="text-xs text-slate-500 mb-6">Clientes classe A representam 80% do faturamento histórico.</p>
                          <div className="space-y-3">
                              {comercial.topLTV.map((cli, i) => (
                                  <div key={i} className="flex justify-between items-center p-3 border-b last:border-0">
                                      <div>
                                          <p className="font-bold text-sm text-slate-700 flex items-center gap-2">
                                              {cli.nome} 
                                              {cli.classe === 'A' && <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Classe A</Badge>}
                                          </p>
                                          <p className="text-xs text-slate-400">Total Comprado: {formatCurrency(cli.ltv)} ({cli.qtd} pedidos)</p>
                                      </div>
                                      <span className="font-black text-slate-800">LTV: {formatCurrency(cli.ltv)}</span>
                                  </div>
                              ))}
                          </div>
                      </Card>

                      <Card className="p-6 border-red-200 shadow-md">
                          <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Ghost className="text-slate-400"/> Churn Alert (Galinhas dos Ovos de Ouro)</h3>
                          <p className="text-xs text-slate-500 mb-4">Clientes Curva A/B inativos há +90 dias.</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {comercial.churn.length === 0 ? (
                                  <p className="text-emerald-600 font-bold p-2">Nenhum cliente importante inativo!</p>
                              ) : (
                                  comercial.churn.slice(0,4).map((c, i) => (
                                      <div key={i} className="p-3 border border-red-100 rounded-xl bg-red-50/30 flex flex-col justify-between">
                                          <div>
                                              <p className="font-bold text-slate-800 text-sm truncate">{c.nome}</p>
                                              <p className="text-xs text-red-500 mt-1 font-medium">Inativo há {differenceInDays(hoje, c.lastOrder)} dias</p>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </Card>
                    </div>
                </div>

                {/* SCORE DE CLIENTES PAGINADO */}
                <Card className="p-6 shadow-xl rounded-3xl bg-white border-none mt-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                        <div>
                            <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><Crown className="text-indigo-500"/> Score Ranking de Clientes (No Período)</h3>
                            <p className="text-xs text-slate-500 mt-1">Medindo rentabilidade e bom pagador de forma automática.</p>
                        </div>
                        <Badge className="bg-indigo-100 text-indigo-800 mt-4 sm:mt-0">{comercial.clientRanking.length} Clientes Ativos</Badge>
                    </div>

                    <div className="border rounded-2xl overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-16 text-center">Rank</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead className="text-right">Volume Faturado</TableHead>
                                    <TableHead className="text-right">Ticket Médio</TableHead>
                                    <TableHead className="text-right text-red-600">Inadimplência</TableHead>
                                    <TableHead className="text-right">Score Final</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedClients.map((cli, i) => (
                                    <TableRow key={i} className="hover:bg-indigo-50/30 transition-colors">
                                        <TableCell className="text-center font-black text-slate-400">#{(clientPage - 1) * clientItemsPerPage + i + 1}</TableCell>
                                        <TableCell className="font-bold text-slate-700">{cli.nome}</TableCell>
                                        <TableCell className="text-right font-black text-emerald-600">{formatCurrency(cli.vol)}</TableCell>
                                        <TableCell className="text-right font-medium text-slate-600">{formatCurrency(cli.ticket)}</TableCell>
                                        <TableCell className="text-right font-bold text-red-500">{formatCurrency(cli.inadimplencia)}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge className={cn("text-xs border-none", cli.score > 80 ? "bg-emerald-100 text-emerald-700" : cli.score > 40 ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700")}>
                                                {cli.score.toFixed(1)}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    
                    {/* CONTROLES DE PAGINAÇÃO DOS CLIENTES */}
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span>Mostrar:</span>
                            <select value={clientItemsPerPage} onChange={(e) => { setClientItemsPerPage(Number(e.target.value)); setClientPage(1); }} className="h-8 rounded-md border-slate-300 px-2 bg-white text-slate-700 outline-none">
                                <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                            </select>
                            <span>linhas</span>
                        </div>
                        
                        {totalClientPages > 1 && (
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setClientPage(p => Math.max(1, p - 1))} disabled={clientPage === 1}><ChevronLeft className="w-4 h-4 mr-1"/> Anterior</Button>
                                <span className="text-sm font-bold px-3">Pág. {clientPage} de {totalClientPages}</span>
                                <Button variant="outline" size="sm" onClick={() => setClientPage(p => Math.min(totalClientPages, p + 1))} disabled={clientPage === totalClientPages}>Próxima <ChevronRight className="w-4 h-4 ml-1"/></Button>
                            </div>
                        )}
                    </div>
                </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </PermissionGuard>
  );
}