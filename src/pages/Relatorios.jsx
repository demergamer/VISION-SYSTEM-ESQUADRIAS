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
  Users, Package, MapPin, MessageCircle, Download, CreditCard, Activity, Link as LinkIcon 
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PermissionGuard from "@/components/PermissionGuard";
import { 
  format, startOfMonth, endOfMonth, parseISO, isWithinInterval, subMonths, isPast, differenceInDays, isSameDay 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState('financeiro');
  const [periodo, setPeriodo] = useState({
    inicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    fim: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  // --- QUERIES ---
  const { data: pedidos = [] } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });
  const { data: cheques = [] } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
  const { data: representantes = [] } = useQuery({ queryKey: ['representantes'], queryFn: () => base44.entities.Representante.list() });
  const { data: borderos = [] } = useQuery({ queryKey: ['borderos'], queryFn: () => base44.entities.Bordero.list() });

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // --- FILTRO DE PERÍODO ---
  const filtrar = (dataStr) => {
    if (!dataStr) return false;
    const data = parseISO(dataStr.split('T')[0]);
    return isWithinInterval(data, { 
      start: parseISO(periodo.inicio), 
      end: parseISO(periodo.fim) 
    });
  };

  // --- ANALYTICS FINANCEIRO ---
  const analytics = useMemo(() => {
    const borderosPeriodo = borderos.filter(b => filtrar(b.created_date));
    
    const mix = {
      dinheiro: { label: 'Dinheiro', valor: 0, color: '#10b981' },
      pix: { label: 'PIX', valor: 0, color: '#06b6d4' },
      cartao: { label: 'Cartões', valor: 0, color: '#3b82f6' },
      cheque: { label: 'Cheques', valor: 0, color: '#8b5cf6' }
    };

    borderosPeriodo.forEach(b => {
      const f = b.forma_pagamento?.toLowerCase() || '';
      if (f.includes('dinheiro')) mix.dinheiro.valor += b.valor_total;
      else if (f.includes('pix')) mix.pix.valor += b.valor_total;
      else if (f.includes('cartao') || f.includes('cartão') || f.includes('link')) mix.cartao.valor += b.valor_total;
      else if (f.includes('cheque')) mix.cheque.valor += b.valor_total;
    });

    const totalAberto = pedidos
      .filter(p => p.status === 'aberto' || p.status === 'parcial')
      .reduce((sum, p) => sum + (p.saldo_restante || 0), 0);

    const totalVencido = pedidos
      .filter(p => (p.status === 'aberto' || p.status === 'parcial') && p.data_entrega && isPast(parseISO(p.data_entrega)))
      .reduce((sum, p) => sum + (p.saldo_restante || 0), 0);

    const porRep = representantes.map(rep => ({
      name: rep.nome.split(' ')[0],
      total: pedidos
        .filter(p => p.representante_codigo === rep.codigo && p.status === 'pago' && filtrar(p.updated_date || p.data_pagamento))
        .reduce((sum, p) => sum + (p.valor_pedido || 0), 0)
    })).filter(r => r.total > 0).sort((a, b) => b.total - a.total);

    return { mix, totalAberto, totalVencido, porRep, faturamentoTotal: Object.values(mix).reduce((a,b) => a + b.valor, 0) };
  }, [borderos, pedidos, periodo, representantes]);

  return (
    <PermissionGuard setor="Relatorios">
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* HEADER CONTROL PANEL */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}><Button variant="ghost" size="icon" className="rounded-full border"><ArrowLeft className="w-5 h-5" /></Button></Link>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Dashboard Inteligente</h1>
                <p className="text-sm text-slate-500 font-medium">Análise de dados: {format(parseISO(periodo.inicio), 'dd/MM')} à {format(parseISO(periodo.fim), 'dd/MM')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl border">
                <Calendar className="w-4 h-4 text-slate-500 ml-2" />
                <Input type="date" value={periodo.inicio} onChange={(e) => setPeriodo({...periodo, inicio: e.target.value})} className="h-8 border-none bg-transparent text-xs font-bold w-32" />
                <Input type="date" value={periodo.fim} onChange={(e) => setPeriodo({...periodo, fim: e.target.value})} className="h-8 border-none bg-transparent text-xs font-bold w-32" />
              </div>
              <Button variant="outline" className="rounded-xl h-12 gap-2"><Download className="w-4 h-4"/> Exportar BI</Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-200/50 p-1 rounded-2xl w-fit">
              <TabsTrigger value="financeiro" className="rounded-xl px-8 font-bold gap-2">Financeiro</TabsTrigger>
              <TabsTrigger value="vendas" className="rounded-xl px-8 font-bold gap-2">Vendas & Ranking</TabsTrigger>
            </TabsList>

            <TabsContent value="financeiro" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* MIX DE RECEBIMENTOS */}
                <Card className="p-6 border-none shadow-xl rounded-3xl lg:col-span-2">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><CreditCard className="text-blue-600 w-5 h-5"/> Mix de Recebimento no Período</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={Object.values(analytics.mix).filter(m => m.valor > 0)}
                            innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="valor"
                          >
                            {Object.values(analytics.mix).map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                          </Pie>
                          <Tooltip formatter={(v) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-4 flex flex-col justify-center">
                        {Object.values(analytics.mix).map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}} />
                                    {item.label}
                                </span>
                                <span className="font-black text-slate-800">{formatCurrency(item.valor)}</span>
                            </div>
                        ))}
                    </div>
                  </div>
                </Card>

                {/* SAÚDE DO CAIXA */}
                <Card className="p-6 bg-slate-900 text-white border-none shadow-2xl rounded-3xl flex flex-col justify-between">
                   <div>
                     <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-6">Saúde do Contas a Receber</h3>
                     <div className="space-y-6">
                        <div>
                            <p className="text-xs text-slate-400 font-bold mb-1 uppercase">Total em Aberto</p>
                            <p className="text-3xl font-black text-white">{formatCurrency(analytics.totalAberto)}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-xs text-red-400 font-bold mb-1 uppercase">Vencido (Atraso)</p>
                            <p className="text-2xl font-black text-red-400">{formatCurrency(analytics.totalVencido)}</p>
                            <p className="text-[10px] text-slate-400 mt-1">Representa {((analytics.totalVencido / (analytics.totalAberto || 1)) * 100).toFixed(1)}% do total</p>
                        </div>
                     </div>
                   </div>
                   <Button className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">Ver Inadimplentes</Button>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="vendas" className="space-y-6">
               <Card className="p-6 border-none shadow-xl rounded-3xl">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp className="text-emerald-600 w-5 h-5"/> Ranking de Performance por Representante</h3>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.porRep}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Tooltip formatter={(v) => formatCurrency(v)} cursor={{fill: '#f8fafc'}} />
                            <Bar dataKey="total" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                  </div>
               </Card>
            </TabsContent>
          </Tabs>

        </div>
      </div>
    </PermissionGuard>
  );
}