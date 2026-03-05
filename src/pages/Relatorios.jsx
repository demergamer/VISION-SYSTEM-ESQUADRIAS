import React, { useMemo, useState } from 'react';
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
  Users, Package, Activity, ShieldAlert, Target, HeartPulse, Download, 
  Crown, PieChart as PieChartIcon, List, ChevronLeft, ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PermissionGuard from "@/components/PermissionGuard";
import { 
  differenceInDays, format, subMonths, isPast, parseISO, addDays, startOfMonth, endOfMonth, isWithinInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState('ceo');
  
  // 2. Filtro de Data Global
  const [periodo, setPeriodo] = useState({
    inicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    fim: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const [viewMixMode, setViewMixMode] = useState('chart'); // 'chart' ou 'table'
  
  // Paginação Clientes
  const [clientPage, setClientPage] = useState(1);
  const [clientItemsPerPage, setClientItemsPerPage] = useState(10);

  // --- QUERIES ---
  const { data: pedidos = [] } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });
  const { data: cheques = [] } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
  const { data: representantes = [] } = useQuery({ queryKey: ['representantes'], queryFn: () => base44.entities.Representante.list() });
  const { data: borderos = [] } = useQuery({ queryKey: ['borderos'], queryFn: () => base44.entities.Bordero.list() });

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const hoje = new Date();

  // --- MOTOR DE FILTRAGEM ---
  const filtrar = (dataStr) => {
    if (!dataStr) return false;
    const data = parseISO(dataStr.split('T')[0]);
    return isWithinInterval(data, { start: parseISO(periodo.inicio), end: parseISO(periodo.fim) });
  };

  // ============================================================================
  // 🧠 MOTOR DE PROCESSAMENTO DE BI
  // ============================================================================

  // --- VISÃO CEO & GERAL ---
  const visaoCEO = useMemo(() => {
      const pedidosNoPeriodo = pedidos.filter(p => filtrar(p.created_date));
      const totalReceita = pedidosNoPeriodo.reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
      const qtdPedidos = pedidosNoPeriodo.length;
      const ticketMedio = qtdPedidos > 0 ? totalReceita / qtdPedidos : 0;

      return { totalReceita, qtdPedidos, ticketMedio };
  }, [pedidos, periodo]);

  // --- 1. FINANCEIRO (INADIMPLÊNCIA INTELIGENTE) ---
  const financeiro = useMemo(() => {
    // 3. Formatos Específicos: 1-10, 10-15, 15-35, 35-60, 60-90, 90+
    const buckets = { d1_10: 0, d11_15: 0, d16_35: 0, d36_60: 0, d61_90: 0, d90_plus: 0 };
    const clientesDevedoresMap = {};
    let totalAtrasado = 0;

    pedidos.filter(p => (p.status === 'aberto' || p.status === 'parcial') && p.data_entrega && isPast(parseISO(p.data_entrega))).forEach(p => {
        const diasAtraso = differenceInDays(hoje, parseISO(p.data_entrega));
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
        { name: '1-10 dias', value: buckets.d1_10, color: '#fef08a' },
        { name: '11-15 dias', value: buckets.d11_15, color: '#fde047' },
        { name: '16-35 dias', value: buckets.d16_35, color: '#facc15' },
        { name: '36-60 dias', value: buckets.d36_60, color: '#f97316' },
        { name: '61-90 dias', value: buckets.d61_90, color: '#ef4444' },
        { name: '+90 dias', value: buckets.d90_plus, color: '#991b1b' },
    ];

    const topDevedores = Object.values(clientesDevedoresMap).sort((a,b) => b.valor - a.valor).slice(0, 5);

    return { grafInadimplencia, topDevedores, totalAtrasado };
  }, [pedidos]);

  // --- 4. FLUXO DE CAIXA E MIX DE PAGAMENTOS ---
  const fluxoCaixa = useMemo(() => {
      const bPeriodo = borderos.filter(b => filtrar(b.created_date));
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

      // Formatar Graficos Mix
      const mixArr = [
          { name: 'Dinheiro', valor: mixMap.dinheiro, color: '#10b981' },
          { name: 'PIX', valor: mixMap.pix, color: '#06b6d4' },
          { name: 'Cartão Débito', valor: mixMap.cdeb, color: '#6366f1' },
          { name: 'Cartão Crédito', valor: mixMap.ccred, color: '#3b82f6' },
          { name: 'Link Pagto.', valor: mixMap.link, color: '#f59e0b' },
          { name: 'Cheque', valor: mixMap.cheque, color: '#8b5cf6' }
      ].map(item => ({ ...item, perc: totalRecebido > 0 ? ((item.valor / totalRecebido) * 100).toFixed(1) : 0 }));

      // Formatar Top Clientes
      const top5PorForma = {};
      Object.keys(topClientesMap).forEach(k => {
          top5PorForma[k] = Object.entries(topClientesMap[k]).map(([nome, valor]) => ({nome, valor})).sort((a,b)=>b.valor - a.valor).slice(0,5);
      });

      // 5. Comparativo Evolução 6 Meses
      const evolucaoMix = Array.from({ length: 6 }, (_, i) => {
          const dataRef = subMonths(hoje, 5 - i);
          const mesAnoStr = format(dataRef, 'yyyy-MM');
          const bMes = borderos.filter(b => b.created_date && b.created_date.startsWith(mesAnoStr));

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
  }, [borderos, periodo]);

  // --- 3. COMERCIAL (SCORE DE REPRESENTANTES E CLIENTES) ---
  const comercial = useMemo(() => {
      // Calculador Genérico de Score
      const calcScore = (mapa) => {
          const maxVol = Math.max(...Object.values(mapa).map(x => x.vol)) || 1;
          return Object.values(mapa).map(item => {
              const ticket = item.qtd > 0 ? item.vol / item.qtd : 0;
              const score = ((item.vol / maxVol) * 100 * 0.4) + ((ticket / 10000) * 100 * 0.3) - ((item.inadimplencia / maxVol) * 100 * 0.3);
              return { ...item, ticket, score };
          }).filter(x => x.vol > 0).sort((a,b) => b.score - a.score);
      };

      // Representantes
      const repMap = {};
      representantes.forEach(r => repMap[r.codigo] = { nome: r.nome, vol: 0, qtd: 0, inadimplencia: 0 });
      
      // Clientes (7. Score para Clientes)
      const cliMap = {};
      clientes.forEach(c => cliMap[c.codigo] = { nome: c.nome, vol: 0, qtd: 0, inadimplencia: 0 });

      pedidos.filter(p => filtrar(p.created_date)).forEach(p => {
          // Add to Rep
          if (repMap[p.representante_codigo]) {
              repMap[p.representante_codigo].vol += p.valor_pedido;
              repMap[p.representante_codigo].qtd += 1;
              if ((p.status === 'aberto' || p.status === 'parcial') && p.data_entrega && isPast(parseISO(p.data_entrega))) {
                  repMap[p.representante_codigo].inadimplencia += parseFloat(p.saldo_restante || p.valor_pedido);
              }
          }
          // Add to Client
          if (cliMap[p.cliente_codigo]) {
              cliMap[p.cliente_codigo].vol += p.valor_pedido;
              cliMap[p.cliente_codigo].qtd += 1;
              if ((p.status === 'aberto' || p.status === 'parcial') && p.data_entrega && isPast(parseISO(p.data_entrega))) {
                  cliMap[p.cliente_codigo].inadimplencia += parseFloat(p.saldo_restante || p.valor_pedido);
              }
          }
      });

      return { repRanking: calcScore(repMap), clientRanking: calcScore(cliMap) };
  }, [pedidos, representantes, clientes, periodo]);

  // Paginação Clientes Logic
  const totalClientPages = Math.ceil(comercial.clientRanking.length / clientItemsPerPage);
  const paginatedClients = comercial.clientRanking.slice((clientPage - 1) * clientItemsPerPage, clientPage * clientItemsPerPage);

  const MIX_COLORS = { Dinheiro: '#10b981', PIX: '#06b6d4', Debito: '#6366f1', Credito: '#3b82f6', Link: '#f59e0b', Cheque: '#8b5cf6' };

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
            
            <div className="relative z-10 flex flex-wrap items-center gap-3 bg-white/10 p-2 rounded-2xl border border-white/20 backdrop-blur-md">
                <div className="flex items-center gap-2 px-2">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  <Input type="date" value={periodo.inicio} onChange={(e) => setPeriodo({...periodo, inicio: e.target.value})} className="border-none shadow-none font-bold text-white bg-transparent w-36" style={{colorScheme: 'dark'}} />
                  <span className="text-slate-400 font-black">ATÉ</span>
                  <Input type="date" value={periodo.fim} onChange={(e) => setPeriodo({...periodo, fim: e.target.value})} className="border-none shadow-none font-bold text-white bg-transparent w-36" style={{colorScheme: 'dark'}} />
                </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white/60 p-1.5 rounded-2xl border w-full lg:w-auto h-auto flex flex-wrap shadow-sm">
              <TabsTrigger value="ceo" className="rounded-xl px-6 py-2.5 font-bold"><Target className="w-4 h-4 mr-2"/> Visão CEO</TabsTrigger>
              <TabsTrigger value="fin" className="rounded-xl px-6 py-2.5 font-bold"><AlertTriangle className="w-4 h-4 mr-2"/> Financeiro & Risco</TabsTrigger>
              <TabsTrigger value="fluxo" className="rounded-xl px-6 py-2.5 font-bold"><DollarSign className="w-4 h-4 mr-2"/> Fluxo de Caixa (Mix)</TabsTrigger>
              <TabsTrigger value="com" className="rounded-xl px-6 py-2.5 font-bold"><Users className="w-4 h-4 mr-2"/> Performance Comercial</TabsTrigger>
            </TabsList>

            {/* ============================================================================== */}
            {/* VISÃO CEO */}
            {/* ============================================================================== */}
            <TabsContent value="ceo" className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 border-l-4 border-l-blue-500 shadow-sm">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">Receita Faturada (Período)</p>
                        <p className="text-4xl font-black text-slate-800">{formatCurrency(visaoCEO.totalReceita)}</p>
                        <Badge className="bg-blue-100 text-blue-700 mt-2">{visaoCEO.qtdPedidos} Pedidos gerados</Badge>
                    </Card>
                    <Card className="p-6 border-l-4 border-l-emerald-500 shadow-sm bg-emerald-50/30">
                        <p className="text-emerald-700 text-xs font-bold uppercase mb-1">Ticket Médio (Por Pedido)</p>
                        <p className="text-4xl font-black text-emerald-900">{formatCurrency(visaoCEO.ticketMedio)}</p>
                        <Badge className="bg-emerald-200 text-emerald-800 mt-2 border-none">Valorização de Vendas</Badge>
                    </Card>
                    <Card className="p-6 border-l-4 border-l-red-500 shadow-sm">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">Passivo de Risco (Inadimplência)</p>
                        <p className="text-4xl font-black text-red-600">{formatCurrency(financeiro.totalAtrasado)}</p>
                        <Badge className="bg-red-100 text-red-700 mt-2 border-none">Atenção Imediata</Badge>
                    </Card>
                </div>
            </TabsContent>

            {/* ============================================================================== */}
            {/* 1. FINANCEIRO (INADIMPLÊNCIA) */}
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
                                                <TableCell className="text-right">
                                                    <Badge variant="outline" className="bg-slate-50">{m.perc}%</Badge>
                                                </TableCell>
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
            {/* 3. COMERCIAL (SCORE DE CLIENTES COM PAGINAÇÃO) */}
            {/* ============================================================================== */}
            <TabsContent value="com" className="space-y-6">
                <Card className="p-6 shadow-xl rounded-3xl bg-white border-none">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                        <div>
                            <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><Crown className="text-yellow-500"/> Score Ranking de Clientes</h3>
                            <p className="text-xs text-slate-500 mt-1">Fórmula: (Volume * 0.4) + (Ticket Médio * 0.3) - (Inadimplência * 0.3)</p>
                        </div>
                        <Badge className="bg-indigo-100 text-indigo-800 mt-4 sm:mt-0">{comercial.clientRanking.length} Clientes Ativos</Badge>
                    </div>

                    <div className="border rounded-2xl overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-16 text-center">Rank</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead className="text-right">Volume (Período)</TableHead>
                                    <TableHead className="text-right">Ticket Médio</TableHead>
                                    <TableHead className="text-right text-red-600">Inadimplência</TableHead>
                                    <TableHead className="text-right">Score Final</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedClients.map((cli, i) => (
                                    <TableRow key={i} className="hover:bg-indigo-50/30">
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
                                <Button variant="outline" size="sm" onClick={() => setClientPage(p => Math.min(totalClientPages, p + 1))} disabled={clientPage === totalPages}>Próxima <ChevronRight className="w-4 h-4 ml-1"/></Button>
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