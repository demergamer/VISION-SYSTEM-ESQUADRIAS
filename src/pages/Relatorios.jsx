import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  ArrowLeft, Calendar, TrendingUp, AlertTriangle, DollarSign, 
  Users, Package, MapPin, Activity, ShieldAlert, Target, HeartPulse, Download, Crown, Ghost
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PermissionGuard from "@/components/PermissionGuard";
import { 
  differenceInDays, format, subMonths, isPast, parseISO, addDays, startOfMonth, endOfMonth
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState('ceo');

  // --- QUERIES ---
  const { data: pedidos = [] } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });
  const { data: cheques = [] } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
  const { data: representantes = [] } = useQuery({ queryKey: ['representantes'], queryFn: () => base44.entities.Representante.list() });
  const { data: borderos = [] } = useQuery({ queryKey: ['borderos'], queryFn: () => base44.entities.Bordero.list() });

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const hoje = new Date();

  // ============================================================================
  // 🧠 MOTOR DE PROCESSAMENTO DE BI
  // ============================================================================

  // 1. FINANCEIRO AVANÇADO E INADIMPLÊNCIA
  const financeiro = useMemo(() => {
    // 1.1 Curva de Crescimento (12 meses)
    const curva12Meses = Array.from({ length: 12 }, (_, i) => {
        const dataRef = subMonths(hoje, 11 - i);
        const mesAnoStr = format(dataRef, 'yyyy-MM');
        const faturamento = borderos
            .filter(b => b.created_date && b.created_date.startsWith(mesAnoStr))
            .reduce((sum, b) => sum + (b.valor_total || 0), 0);
        return { mes: format(dataRef, 'MMM/yy', { locale: ptBR }), faturamento };
    });

    // Projeção Simples (Média dos últimos 3 meses para o próximo mês)
    const ultimos3 = curva12Meses.slice(-3).reduce((a, b) => a + b.faturamento, 0) / 3;
    curva12Meses.push({ mes: 'Projeção', faturamento: ultimos3, isProjection: true });

    // 1.3 Inadimplência em Buckets
    const buckets = { ate30: 0, ate60: 0, ate90: 0, mais90: 0 };
    const clientesDevedoresMap = {};

    pedidos.filter(p => (p.status === 'aberto' || p.status === 'parcial') && p.data_entrega && isPast(parseISO(p.data_entrega))).forEach(p => {
        const diasAtraso = differenceInDays(hoje, parseISO(p.data_entrega));
        const saldo = parseFloat(p.saldo_restante || (p.valor_pedido - (p.total_pago || 0)));

        if (diasAtraso <= 30) buckets.ate30 += saldo;
        else if (diasAtraso <= 60) buckets.ate60 += saldo;
        else if (diasAtraso <= 90) buckets.ate90 += saldo;
        else buckets.mais90 += saldo;

        if (!clientesDevedoresMap[p.cliente_codigo]) clientesDevedoresMap[p.cliente_codigo] = { nome: p.cliente_nome, valor: 0, dias: diasAtraso };
        clientesDevedoresMap[p.cliente_codigo].valor += saldo;
        if (diasAtraso > clientesDevedoresMap[p.cliente_codigo].dias) clientesDevedoresMap[p.cliente_codigo].dias = diasAtraso;
    });

    const grafInadimplencia = [
        { name: '1-30 dias', value: buckets.ate30, color: '#facc15' },
        { name: '31-60 dias', value: buckets.ate60, color: '#fb923c' },
        { name: '61-90 dias', value: buckets.ate90, color: '#ef4444' },
        { name: '+90 dias', value: buckets.mais90, color: '#991b1b' },
    ];

    const topDevedores = Object.values(clientesDevedoresMap).sort((a,b) => b.valor - a.valor).slice(0, 5);

    return { curva12Meses, grafInadimplencia, topDevedores, totalAtrasado: Object.values(buckets).reduce((a,b)=>a+b,0) };
  }, [borderos, pedidos]);

  // 2. OPERACIONAL E LOGÍSTICO
  const operacional = useMemo(() => {
      // 2.1 Eficiência e 2.3 Gargalos
      let pedidosComTempo = 0;
      let somaDiasEntrega = 0;
      const gargalos = [];

      pedidos.forEach(p => {
          if (p.confirmado_entrega && p.data_entrega && p.created_date) {
              somaDiasEntrega += differenceInDays(parseISO(p.data_entrega), parseISO(p.created_date));
              pedidosComTempo++;
          }
          if ((p.status === 'aberto' || p.status === 'parcial') && !p.rota_importada_id && p.created_date) {
              const diasParado = differenceInDays(hoje, parseISO(p.created_date));
              if (diasParado > 7) gargalos.push({ ...p, diasParado }); // Mais de 7 dias sem rota
          }
      });

      const mediaEntrega = pedidosComTempo > 0 ? (somaDiasEntrega / pedidosComTempo).toFixed(1) : 0;
      const topGargalos = gargalos.sort((a,b) => b.diasParado - a.diasParado).slice(0, 5);

      return { mediaEntrega, topGargalos, totalGargalos: gargalos.length };
  }, [pedidos]);

  // 3. COMERCIAL E LTV
  const comercial = useMemo(() => {
      // 3.1 Ranking Representantes com Formula Avançada
      const rankingMap = {};
      representantes.forEach(r => rankingMap[r.codigo] = { nome: r.nome, vol: 0, qtd: 0, inadimplencia: 0 });

      pedidos.forEach(p => {
          if (!rankingMap[p.representante_codigo]) return;
          const rep = rankingMap[p.representante_codigo];
          rep.vol += p.valor_pedido;
          rep.qtd += 1;
          
          if ((p.status === 'aberto' || p.status === 'parcial') && p.data_entrega && isPast(parseISO(p.data_entrega))) {
              rep.inadimplencia += parseFloat(p.saldo_restante || p.valor_pedido);
          }
      });

      // Aplica Score: (Volume * 0.4) + (Ticket Médio * 0.3) - (Inadimplência * 0.3)
      // Normalizando valores para a fórmula ter sentido real
      const maxVol = Math.max(...Object.values(rankingMap).map(r => r.vol)) || 1;
      
      const repRanking = Object.values(rankingMap).map(r => {
          const ticket = r.qtd > 0 ? r.vol / r.qtd : 0;
          const score = ((r.vol / maxVol) * 100 * 0.4) + ((ticket / 10000) * 100 * 0.3) - ((r.inadimplencia / maxVol) * 100 * 0.3);
          return { ...r, ticket, score };
      }).filter(r => r.vol > 0).sort((a,b) => b.score - a.score);

      // 1.4 e 3.3 LTV e Curva ABC
      const ltvMap = {};
      pedidos.forEach(p => {
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
          const perc = (acc / totalGlobal) * 100;
          let classe = 'C';
          if (perc <= 80) classe = 'A';
          else if (perc <= 95) classe = 'B';
          return { ...c, classe, ticket: c.ltv / c.qtd };
      });

      // 5.3 Churn (Perdidos há mais de 90 dias que compravam muito)
      const churn = curvaABC.filter(c => (c.classe === 'A' || c.classe === 'B') && differenceInDays(hoje, c.lastOrder) > 90);

      return { repRanking, curvaABC, topLTV: curvaABC.slice(0, 10), churn };
  }, [pedidos, representantes]);

  // 4. FLUXO DE CAIXA
  const fluxoCaixa = useMemo(() => {
      // 4.1 Projeção 30/60/90
      const proj = { trinta: 0, sessenta: 0, noventa: 0 };
      
      const somaProjecao = (dataVenc, valor) => {
          if (!dataVenc) return;
          const diasFuturo = differenceInDays(parseISO(dataVenc), hoje);
          if (diasFuturo >= 0 && diasFuturo <= 30) proj.trinta += valor;
          else if (diasFuturo > 30 && diasFuturo <= 60) proj.sessenta += valor;
          else if (diasFuturo > 60 && diasFuturo <= 90) proj.noventa += valor;
      };

      cheques.filter(c => c.status === 'normal' || c.status === 'repassado').forEach(c => somaProjecao(c.data_vencimento, c.valor));
      pedidos.filter(p => p.status === 'aberto' || p.status === 'parcial').forEach(p => somaProjecao(p.data_entrega, parseFloat(p.saldo_restante || p.valor_pedido)));

      const grafProjecao = [
          { periodo: '0-30 Dias', Entrada: proj.trinta },
          { periodo: '31-60 Dias', Entrada: proj.sessenta },
          { periodo: '61-90 Dias', Entrada: proj.noventa }
      ];

      // 4.2 Dependência de Recebimento
      let mixTotal = 0;
      const depend = { cheque: 0, pix: 0, cartao: 0, dinheiro: 0 };
      borderos.forEach(b => {
          mixTotal += b.valor_total;
          const f = b.forma_pagamento?.toLowerCase() || '';
          if (f.includes('cheque')) depend.cheque += b.valor_total;
          else if (f.includes('pix')) depend.pix += b.valor_total;
          else if (f.includes('cartao') || f.includes('cartão') || f.includes('link')) depend.cartao += b.valor_total;
          else depend.dinheiro += b.valor_total;
      });

      const perCheque = mixTotal > 0 ? (depend.cheque / mixTotal) * 100 : 0;

      return { grafProjecao, depend, perCheque, projTotal: proj.trinta + proj.sessenta + proj.noventa };
  }, [pedidos, cheques, borderos]);

  // 5. ÍNDICE DE SAÚDE (Score Geral da Empresa)
  const saudeGeral = useMemo(() => {
      let score = 100;
      let alertas = [];

      if (fluxoCaixa.perCheque > 30) { score -= 15; alertas.push("Dependência perigosa de cheques (>30%)"); }
      if (financeiro.totalAtrasado > fluxoCaixa.projTotal * 0.2) { score -= 20; alertas.push("Inadimplência corroendo fluxo futuro"); }
      if (operacional.totalGargalos > 10) { score -= 10; alertas.push("Gargalo logístico: Muitos pedidos parados sem rota"); }
      if (comercial.churn.length > 5) { score -= 15; alertas.push("Churn Elevado: Clientes curva A/B pararam de comprar"); }

      let status = '🟢 Saudável';
      let cor = 'text-emerald-500 bg-emerald-50 border-emerald-200';
      if (score < 60) { status = '🔴 Risco Crítico'; cor = 'text-red-600 bg-red-50 border-red-200'; }
      else if (score < 80) { status = '🟡 Atenção'; cor = 'text-amber-600 bg-amber-50 border-amber-200'; }

      return { score, status, cor, alertas };
  }, [financeiro, operacional, comercial, fluxoCaixa]);

  // --- RENDERIZADORES DE TABELA ---
  const COLORS_INADIMPLENCIA = ['#facc15', '#fb923c', '#ef4444', '#991b1b'];

  return (
    <PermissionGuard setor="Relatorios">
      <div className="min-h-screen bg-[#F1F5F9] p-4 md:p-8 font-sans">
        <div className="max-w-[1600px] mx-auto space-y-6">
          
          {/* HEADER DA DIRETORIA */}
          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 pointer-events-none"><Activity className="w-96 h-96" /></div>
            <div className="flex items-center gap-6 relative z-10">
              <Link to={createPageUrl('Dashboard')}><Button variant="outline" size="icon" className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20"><ArrowLeft className="w-5 h-5" /></Button></Link>
              <div>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight uppercase">Dashboard Executivo</h1>
                <p className="text-slate-400 font-medium mt-1">Análise Macro, Previsões e KPIs Estratégicos</p>
              </div>
            </div>
            <div className="relative z-10 flex gap-4">
                <div className={cn("px-6 py-3 rounded-2xl border-2 flex flex-col items-center justify-center backdrop-blur-md", saudeGeral.cor)}>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Saúde do Negócio</span>
                    <span className="text-xl font-black">{saudeGeral.score}/100 - {saudeGeral.status}</span>
                </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white/60 p-1.5 rounded-2xl border w-full md:w-auto h-auto flex flex-wrap shadow-sm">
              <TabsTrigger value="ceo" className="rounded-xl px-6 py-2.5 font-bold"><Target className="w-4 h-4 mr-2"/> 6. Visão CEO</TabsTrigger>
              <TabsTrigger value="fin" className="rounded-xl px-6 py-2.5 font-bold"><DollarSign className="w-4 h-4 mr-2"/> 1. Financeiro</TabsTrigger>
              <TabsTrigger value="ope" className="rounded-xl px-6 py-2.5 font-bold"><Package className="w-4 h-4 mr-2"/> 2. Operacional</TabsTrigger>
              <TabsTrigger value="com" className="rounded-xl px-6 py-2.5 font-bold"><Users className="w-4 h-4 mr-2"/> 3. Comercial</TabsTrigger>
              <TabsTrigger value="fluxo" className="rounded-xl px-6 py-2.5 font-bold"><Activity className="w-4 h-4 mr-2"/> 4. Fluxo de Caixa</TabsTrigger>
              <TabsTrigger value="est" className="rounded-xl px-6 py-2.5 font-bold"><HeartPulse className="w-4 h-4 mr-2"/> 5. Estratégico</TabsTrigger>
            </TabsList>

            {/* ============================================================================== */}
            {/* 6. VISÃO CEO (RESUMO GERAL) */}
            {/* ============================================================================== */}
            <TabsContent value="ceo" className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-6 border-l-4 border-l-emerald-500 shadow-sm">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">Receita (Mês Atual)</p>
                        <p className="text-3xl font-black text-slate-800">{formatCurrency(financeiro.curva12Meses[11]?.faturamento || 0)}</p>
                        <Badge className="bg-emerald-100 text-emerald-700 mt-2">Em andamento</Badge>
                    </Card>
                    <Card className="p-6 border-l-4 border-l-red-500 shadow-sm">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">Passivo de Risco (Inadimplência)</p>
                        <p className="text-3xl font-black text-red-600">{formatCurrency(financeiro.totalAtrasado)}</p>
                        <Badge className="bg-red-100 text-red-700 mt-2">Capital retido na rua</Badge>
                    </Card>
                    <Card className="p-6 border-l-4 border-l-blue-500 shadow-sm">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">Ticket Médio Global</p>
                        <p className="text-3xl font-black text-slate-800">{formatCurrency(pedidos.length > 0 ? pedidos.reduce((a,b)=>a+(b.valor_pedido||0),0)/pedidos.length : 0)}</p>
                        <Badge className="bg-blue-100 text-blue-700 mt-2">Por pedido gerado</Badge>
                    </Card>
                    <Card className="p-6 border-l-4 border-l-purple-500 shadow-sm">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">Projeção de Entrada (30 Dias)</p>
                        <p className="text-3xl font-black text-purple-700">{formatCurrency(fluxoCaixa.projTotal)}</p>
                        <Badge className="bg-purple-100 text-purple-700 mt-2">Garantido em papel/sistema</Badge>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="p-6 lg:col-span-2 shadow-sm border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp className="text-indigo-600"/> Evolução e Projeção de Faturamento (12 Meses)</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={financeiro.curva12Meses}>
                                    <defs>
                                        <linearGradient id="colorFatur" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="mes" tick={{fontSize: 12}} />
                                    <YAxis tickFormatter={(val) => `R$ ${(val/1000).toFixed(0)}k`} />
                                    <Tooltip formatter={(v) => formatCurrency(v)} />
                                    <Area type="monotone" dataKey="faturamento" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFatur)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="p-6 shadow-sm border-slate-200 bg-red-50/30">
                        <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2"><ShieldAlert /> Alertas do Sistema</h3>
                        <div className="space-y-3">
                            {saudeGeral.alertas.length === 0 ? (
                                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold text-center">Nenhum risco detectado na operação.</div>
                            ) : (
                                saudeGeral.alertas.map((alerta, i) => (
                                    <div key={i} className="p-3 bg-white border border-red-200 rounded-xl text-sm font-medium text-slate-700 flex gap-3 shadow-sm">
                                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0"/> {alerta}
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </TabsContent>

            {/* ============================================================================== */}
            {/* 1. FINANCEIRO (INADIMPLÊNCIA E TICKETS) */}
            {/* ============================================================================== */}
            <TabsContent value="fin" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h3 className="font-bold text-slate-800 mb-6">Inadimplência Inteligente (Envelhecimento)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={financeiro.grafInadimplencia.filter(d=>d.value>0)} innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                                            {financeiro.grafInadimplencia.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip formatter={(v) => formatCurrency(v)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-3">
                                {financeiro.grafInadimplencia.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center p-2 rounded bg-slate-50">
                                        <span className="text-sm font-bold flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}/> {item.name}</span>
                                        <span className="font-black text-slate-800">{formatCurrency(item.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="font-bold text-slate-800 mb-6">Top 5 Clientes Críticos (Devedores)</h3>
                        <div className="space-y-4">
                            {financeiro.topDevedores.map((dev, i) => (
                                <div key={i} className="flex justify-between items-center p-3 border border-red-100 bg-red-50/50 rounded-xl">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{dev.nome}</p>
                                        <p className="text-xs text-red-600 font-medium">Atraso max: {dev.dias} dias</p>
                                    </div>
                                    <span className="font-black text-red-700 text-lg">{formatCurrency(dev.valor)}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </TabsContent>

            {/* ============================================================================== */}
            {/* 2. OPERACIONAL */}
            {/* ============================================================================== */}
            <TabsContent value="ope" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 flex flex-col items-center justify-center text-center border-blue-200 bg-blue-50">
                        <Clock className="w-8 h-8 text-blue-500 mb-2"/>
                        <p className="text-xs font-bold text-blue-600 uppercase">Tempo Médio de Entrega</p>
                        <p className="text-4xl font-black text-blue-900 mt-2">{operacional.mediaEntrega} <span className="text-lg">dias</span></p>
                    </Card>
                    <Card className="p-6 flex flex-col items-center justify-center text-center border-orange-200 bg-orange-50">
                        <Package className="w-8 h-8 text-orange-500 mb-2"/>
                        <p className="text-xs font-bold text-orange-600 uppercase">Pedidos Parados (Gargalo)</p>
                        <p className="text-4xl font-black text-orange-900 mt-2">{operacional.totalGargalos}</p>
                        <p className="text-xs text-orange-700 mt-1">Mais de 7 dias s/ rota</p>
                    </Card>
                    <Card className="p-6 flex flex-col items-center justify-center text-center border-emerald-200 bg-emerald-50">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2"/>
                        <p className="text-xs font-bold text-emerald-600 uppercase">Eficiência de Rota (Volume)</p>
                        <p className="text-2xl font-black text-emerald-900 mt-2">{formatCurrency(operacional.cargaConcluida)}</p>
                        <p className="text-xs text-emerald-700 mt-1">Entregas Ticadas vs {formatCurrency(operacional.cargaEmRota)} em Rota</p>
                    </Card>
                </div>
            </TabsContent>

            {/* ============================================================================== */}
            {/* 3. COMERCIAL (RANKING E LTV) */}
            {/* ============================================================================== */}
            <TabsContent value="com" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Crown className="text-yellow-500"/> Ranking de Representantes (Score Engine)</h3>
                        <p className="text-xs text-slate-500 mb-6">O Score penaliza inadimplência e premia volume e ticket médio.</p>
                        <div className="space-y-4">
                            {comercial.repRanking.map((rep, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${i===0?'bg-yellow-400':i===1?'bg-slate-400':i===2?'bg-amber-600':'bg-slate-300'}`}>{i+1}</div>
                                    <div className="flex-1">
                                        <div className="flex justify-between"><span className="font-bold text-slate-800">{rep.nome}</span><span className="font-black text-indigo-600">Score: {rep.score.toFixed(0)}</span></div>
                                        <div className="text-xs text-slate-500 flex gap-3 mt-1">
                                            <span>Vol: {formatCurrency(rep.vol)}</span>
                                            <span>TK: {formatCurrency(rep.ticket)}</span>
                                            <span className="text-red-500">Inad: {formatCurrency(rep.inadimplencia)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="font-bold text-slate-800 mb-2">LTV & Curva ABC (Top Clientes Ouro)</h3>
                        <p className="text-xs text-slate-500 mb-6">Clientes classe A representam os 80% do faturamento histórico.</p>
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
                </div>
            </TabsContent>

            {/* ============================================================================== */}
            {/* 4. FLUXO DE CAIXA E 5. ESTRATÉGICO (MISTO) */}
            {/* ============================================================================== */}
            <TabsContent value="fluxo" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h3 className="font-bold text-slate-800 mb-6">Projeção de Caixa Futuro (30/60/90)</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={fluxoCaixa.grafProjecao}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="periodo" />
                                    <YAxis tickFormatter={(val) => `R$ ${(val/1000).toFixed(0)}k`} />
                                    <Tooltip formatter={(v) => formatCurrency(v)} />
                                    <Bar dataKey="Entrada" fill="#10b981" radius={[6,6,0,0]} barSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="font-bold text-slate-800 mb-2">Dependência de Método de Pagamento</h3>
                        {fluxoCaixa.perCheque > 30 && <Badge className="bg-red-100 text-red-700 mb-4">Risco: Alta exposição a papel (Cheques)</Badge>}
                        <div className="space-y-4 mt-6">
                            <div className="flex justify-between text-sm"><span className="font-bold">Cheques (Risco Alto)</span><span>{fluxoCaixa.perCheque.toFixed(1)}%</span></div>
                            <div className="w-full bg-slate-100 h-3 rounded-full"><div className="bg-red-500 h-full rounded-full" style={{width: `${fluxoCaixa.perCheque}%`}}/></div>
                            
                            <div className="flex justify-between text-sm mt-4"><span className="font-bold">PIX / Dinheiro (Imediato)</span><span>{(( (fluxoCaixa.depend.pix + fluxoCaixa.depend.dinheiro) / (fluxoCaixa.depend.pix + fluxoCaixa.depend.dinheiro + fluxoCaixa.depend.cartao + fluxoCaixa.depend.cheque || 1) ) * 100).toFixed(1)}%</span></div>
                            <div className="w-full bg-slate-100 h-3 rounded-full"><div className="bg-emerald-500 h-full rounded-full" style={{width: `${((fluxoCaixa.depend.pix + fluxoCaixa.depend.dinheiro)/(fluxoCaixa.depend.pix + fluxoCaixa.depend.dinheiro + fluxoCaixa.depend.cartao + fluxoCaixa.depend.cheque || 1))*100}%`}}/></div>
                        </div>
                    </Card>
                </div>
            </TabsContent>

            <TabsContent value="est" className="space-y-6">
                <Card className="p-6 border-red-200">
                    <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Ghost className="text-slate-400"/> Churn Alert (Galinha dos Ovos de Ouro Perdidas)</h3>
                    <p className="text-xs text-slate-500 mb-6">Clientes Classe A ou B que não compram há mais de 90 dias.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {comercial.churn.length === 0 ? (
                            <p className="text-emerald-600 font-bold p-4">Nenhum cliente importante perdido recentemente!</p>
                        ) : (
                            comercial.churn.map((c, i) => (
                                <div key={i} className="p-4 border border-slate-200 rounded-xl bg-white flex flex-col justify-between">
                                    <div>
                                        <p className="font-bold text-slate-800">{c.nome}</p>
                                        <p className="text-xs text-red-500 mt-1 font-medium">Inativo há {differenceInDays(hoje, c.lastOrder)} dias</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                        <span className="text-xs text-slate-500">LTV: {formatCurrency(c.ltv)}</span>
                                        <Button size="sm" variant="outline" className="h-7 text-xs border-indigo-200 text-indigo-600">Reativar</Button>
                                    </div>
                                </div>
                            ))
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