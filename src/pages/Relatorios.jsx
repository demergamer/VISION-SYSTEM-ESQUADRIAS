import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  ArrowLeft, Calendar, TrendingUp, AlertTriangle, DollarSign, 
  Users, Package, MapPin, MessageCircle, Download, Filter, TrendingDown
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PermissionGuard from "@/components/PermissionGuard";
import { 
  differenceInDays, format, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, subMonths, isSameDay, parseISO, isWithinInterval 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState('diario');
  const [periodo, setPeriodo] = useState({
    inicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    fim: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const { data: pedidos = [] } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });
  const { data: cheques = [] } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
  const { data: representantes = [] } = useQuery({ queryKey: ['representantes'], queryFn: () => base44.entities.Representante.list() });
  const { data: borderos = [] } = useQuery({ queryKey: ['borderos'], queryFn: () => base44.entities.Bordero.list() });

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // --- FILTRO DE DATA APLICADO ---
  const filtrarPorPeriodo = (dataStr) => {
    if (!dataStr) return false;
    const data = parseISO(dataStr.split('T')[0]);
    return isWithinInterval(data, { 
      start: parseISO(periodo.inicio), 
      end: parseISO(periodo.fim) 
    });
  };

  // --- DADOS DIÁRIOS (FOCO EM CAIXA) ---
  const dadosDiario = useMemo(() => {
    const hoje = new Date();
    const borderosPeriodo = borderos.filter(b => filtrarPorPeriodo(b.created_date));

    const recebimentos = { dinheiro: 0, cheque: 0, pix: 0, outros: 0 };
    borderosPeriodo.forEach(b => {
      const forma = b.forma_pagamento?.toLowerCase() || '';
      if (forma.includes('dinheiro')) recebimentos.dinheiro += b.valor_total || 0;
      else if (forma.includes('cheque')) recebimentos.cheque += b.valor_total || 0;
      else if (forma.includes('pix')) recebimentos.pix += b.valor_total || 0;
      else recebimentos.outros += b.valor_total || 0;
    });

    const venciamos = pedidos.filter(p => {
      if (p.status === 'pago' || p.status === 'cancelado') return false;
      return p.data_entrega && parseISO(p.data_entrega) < hoje;
    }).sort((a,b) => differenceInDays(hoje, parseISO(b.data_entrega)) - differenceInDays(hoje, parseISO(a.data_entrega)));

    return { recebimentos, venciamos: venciamos.slice(0, 6) };
  }, [borderos, pedidos, periodo]);

  // --- DADOS ESTRATÉGICOS (MENSAL/GLOBAL) ---
  const dadosEstrategicos = useMemo(() => {
    // 1. Receita por Representante
    const porRep = representantes.map(rep => ({
      name: rep.nome.split(' ')[0],
      total: pedidos
        .filter(p => p.representante_codigo === rep.codigo && p.status === 'pago' && filtrarPorPeriodo(p.data_pagamento || p.updated_date))
        .reduce((sum, p) => sum + (p.valor_pedido || 0), 0)
    })).filter(r => r.total > 0).sort((a, b) => b.total - a.total);

    // 2. Saúde Financeira (A Receber vs Vencido)
    const totalAberto = pedidos
      .filter(p => p.status === 'aberto' || p.status === 'parcial')
      .reduce((sum, p) => sum + (p.saldo_restante || 0), 0);
    
    const totalVencido = pedidos
      .filter(p => (p.status === 'aberto' || p.status === 'parcial') && p.data_entrega && parseISO(p.data_entrega) < new Date())
      .reduce((sum, p) => sum + (p.saldo_restante || 0), 0);

    return { porRep, saude: [
      { name: 'Em Dia', valor: totalAberto - totalVencido },
      { name: 'Vencido', valor: totalVencido }
    ]};
  }, [pedidos, representantes, periodo]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <PermissionGuard setor="Relatorios">
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* HEADER COM FILTRO DE DATA */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}><Button variant="ghost" size="icon" className="rounded-full border"><ArrowLeft className="w-5 h-5" /></Button></Link>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">BI & RELATÓRIOS</h1>
                <p className="text-sm text-slate-500 font-medium">Análise de performance e saúde financeira</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border">
                <Calendar className="w-4 h-4 text-slate-500 ml-2" />
                <Input type="date" value={periodo.inicio} onChange={(e) => setPeriodo({...periodo, inicio: e.target.value})} className="h-8 border-none bg-transparent text-xs font-bold w-32" />
                <span className="text-slate-400">até</span>
                <Input type="date" value={periodo.fim} onChange={(e) => setPeriodo({...periodo, fim: e.target.value})} className="h-8 border-none bg-transparent text-xs font-bold w-32" />
              </div>
              <Button variant="outline" size="sm" className="gap-2 h-11"><Download className="w-4 h-4"/> Exportar</Button>
            </div>
          </div>

          {/* INDICADORES RÁPIDOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 flex items-center gap-4 border-none shadow-sm">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><DollarSign/></div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Receita no Período</p>
                    <p className="text-xl font-black text-slate-800">{formatCurrency(dadosDiario.recebimentos.dinheiro + dadosDiario.recebimentos.pix + dadosDiario.recebimentos.cheque)}</p>
                  </div>
              </Card>
              <Card className="p-4 flex items-center gap-4 border-none shadow-sm">
                  <div className="p-3 bg-red-100 text-red-600 rounded-2xl"><AlertTriangle/></div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Inadimplente</p>
                    <p className="text-xl font-black text-red-600">{formatCurrency(dadosEstrategicos.saude[1].valor)}</p>
                  </div>
              </Card>
              <Card className="p-4 flex items-center gap-4 border-none shadow-sm">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><TrendingUp/></div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Ticket Médio</p>
                    <p className="text-xl font-black text-slate-800">R$ 4.250</p>
                  </div>
              </Card>
              <Card className="p-4 flex items-center gap-4 border-none shadow-sm">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><Package/></div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Volume Pedidos</p>
                    <p className="text-xl font-black text-slate-800">{pedidos.length}</p>
                  </div>
              </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUNA 1 & 2: GRÁFICOS */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp className="text-blue-600"/> Vendas por Representante</h3>
                  <Badge variant="outline">Top Performance</Badge>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosEstrategicos.porRep} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip formatter={(v) => formatCurrency(v)} cursor={{fill: '#f1f5f9'}} />
                      <Bar dataKey="total" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><CreditCard className="text-emerald-600"/> Mix de Pagamentos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Dinheiro', value: dadosDiario.recebimentos.dinheiro },
                            { name: 'PIX', value: dadosDiario.recebimentos.pix },
                            { name: 'Cheque', value: dadosDiario.recebimentos.cheque },
                            { name: 'Outros', value: dadosDiario.recebimentos.outros }
                          ].filter(d => d.value > 0)}
                          innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value"
                        >
                          {COLORS.map((col, i) => <Cell key={i} fill={col} stroke="none" />)}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    {['Dinheiro', 'PIX', 'Cheque', 'Outros'].map((label, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i]}} />
                          <span className="text-sm font-medium text-slate-600">{label}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800">
                          {formatCurrency(Object.values(dadosDiario.recebimentos)[i])}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* COLUNA 3: SIDEBAR DE ALERTAS E SAÚDE */}
            <div className="space-y-6">
              <Card className="p-6 bg-slate-900 text-white border-none shadow-2xl">
                 <h3 className="font-bold text-indigo-300 mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">Saúde do Contas a Receber</h3>
                 <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                            data={dadosEstrategicos.saude}
                            innerRadius={50} outerRadius={70} dataKey="valor"
                          >
                             <Cell fill="#10b981" />
                             <Cell fill="#ef4444" />
                          </Pie>
                          <Tooltip />
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="flex justify-between mt-4">
                    <div className="text-center">
                       <p className="text-[10px] text-slate-400 font-bold">EM DIA</p>
                       <p className="text-emerald-400 font-bold">{formatCurrency(dadosEstrategicos.saude[0].valor)}</p>
                    </div>
                    <div className="text-center">
                       <p className="text-[10px] text-slate-400 font-bold">VENCIDO</p>
                       <p className="text-red-400 font-bold">{formatCurrency(dadosEstrategicos.saude[1].valor)}</p>
                    </div>
                 </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><AlertTriangle className="text-red-600 w-5 h-5"/> Cobrança Urgente</h3>
                <div className="space-y-3">
                  {dadosDiario.venciamos.map(p => (
                    <div key={p.id} className="p-3 bg-white border rounded-xl hover:shadow-md transition-all">
                       <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{p.cliente_nome}</p>
                          <Badge className="text-[9px] bg-red-100 text-red-700 border-none">+{differenceInDays(new Date(), parseISO(p.data_entrega))} dias</Badge>
                       </div>
                       <div className="flex justify-between items-center">
                          <p className="text-sm font-black text-slate-700">{formatCurrency(p.saldo_restante)}</p>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 rounded-full hover:bg-emerald-50" onClick={() => window.open(`https://wa.me/?text=Olá, somos da Vision Esquadrias...`, '_blank')}>
                            <MessageCircle className="w-4 h-4"/>
                          </Button>
                       </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}

const isPast = (date) => date < new Date();
