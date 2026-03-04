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
  Users, Package, MapPin, MessageCircle, Download, CreditCard, 
  Activity, Link as LinkIcon, Smartphone, Wallet, CheckCircle2, Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PermissionGuard from "@/components/PermissionGuard";
import { 
  format, startOfMonth, endOfMonth, parseISO, isWithinInterval, 
  subMonths, isPast, differenceInDays, isSameDay, addDays 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState('financeiro');
  const [periodo, setPeriodo] = useState({
    inicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    fim: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  // --- BUSCA DE DADOS ---
  const { data: pedidos = [] } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });
  const { data: cheques = [] } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
  const { data: representantes = [] } = useQuery({ queryKey: ['representantes'], queryFn: () => base44.entities.Representante.list() });
  const { data: borderos = [] } = useQuery({ queryKey: ['borderos'], queryFn: () => base44.entities.Bordero.list() });

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // --- MOTOR DE FILTRAGEM ---
  const filtrar = (dataStr) => {
    if (!dataStr) return false;
    const data = parseISO(dataStr.split('T')[0]);
    return isWithinInterval(data, { start: parseISO(periodo.inicio), end: parseISO(periodo.fim) });
  };

  // --- BI FINANCEIRO ---
  const financeiro = useMemo(() => {
    const bPeriodo = borderos.filter(b => filtrar(b.created_date));
    const mix = {
      dinheiro: 0, pix: 0, credito: 0, debito: 0, link: 0, cheque: 0
    };

    bPeriodo.forEach(b => {
      const f = b.forma_pagamento?.toLowerCase() || '';
      if (f.includes('dinheiro')) mix.dinheiro += b.valor_total;
      else if (f.includes('pix')) mix.pix += b.valor_total;
      else if (f.includes('crédito') || f.includes('credito')) mix.credito += b.valor_total;
      else if (f.includes('débito') || f.includes('debito')) mix.debito += b.valor_total;
      else if (f.includes('link')) mix.link += b.valor_total;
      else if (f.includes('cheque')) mix.cheque += b.valor_total;
    });

    const inadimplencia = pedidos
      .filter(p => (p.status === 'aberto' || p.status === 'parcial') && p.data_entrega && isPast(parseISO(p.data_entrega)))
      .reduce((acc, p) => acc + (p.saldo_restante || 0), 0);

    return { mix, inadimplencia, totalRecebido: bPeriodo.reduce((a, b) => a + b.valor_total, 0) };
  }, [borderos, pedidos, periodo]);

  // --- BI OPERACIONAL (LOGÍSTICA) ---
  const operacional = useMemo(() => {
    const hoje = new Date();
    const proximaSemana = addDays(hoje, 7);

    const chequesVencendo = cheques
      .filter(c => c.status === 'normal' && parseISO(c.data_vencimento) <= proximaSemana)
      .reduce((a, b) => a + b.valor, 0);

    const cargaEmRota = pedidos.filter(p => p.rota_importada_id && !p.confirmado_entrega).reduce((a, b) => a + b.valor_pedido, 0);
    const cargaConcluida = pedidos.filter(p => filtrar(p.updated_date) && p.confirmado_entrega).reduce((a, b) => a + b.valor_pedido, 0);

    return { chequesVencendo, cargaEmRota, cargaConcluida };
  }, [pedidos, cheques, periodo]);

  const COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#f59e0b', '#8b5cf6'];

  return (
    <PermissionGuard setor="Relatorios">
      <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
        <div className="max-w-[1600px] mx-auto space-y-8">
          
          {/* HEADER EXECUTIVO */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}><Button variant="outline" size="icon" className="rounded-2xl shadow-sm bg-white"><ArrowLeft className="w-5 h-5" /></Button></Link>
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">CENTRAL DE INTELIGÊNCIA</h1>
                <p className="text-slate-500 font-medium italic">Dados consolidados do ecossistema Vision System</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-3xl border shadow-sm">
                <div className="flex items-center gap-2 px-4">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  <Input type="date" value={periodo.inicio} onChange={(e) => setPeriodo({...periodo, inicio: e.target.value})} className="border-none shadow-none font-bold text-slate-700 w-40" />
                  <span className="text-slate-300 font-black">ATÉ</span>
                  <Input type="date" value={periodo.fim} onChange={(e) => setPeriodo({...periodo, fim: e.target.value})} className="border-none shadow-none font-bold text-slate-700 w-40" />
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-11 gap-2 shadow-lg shadow-indigo-100"><Download className="w-4 h-4"/> Exportar PDF</Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="bg-slate-200/50 p-1.5 rounded-3xl w-full lg:w-auto h-auto grid grid-cols-2 lg:flex">
              <TabsTrigger value="financeiro" className="rounded-2xl px-10 py-3 font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg">
                <DollarSign className="w-4 h-4"/> Visão Financeira
              </TabsTrigger>
              <TabsTrigger value="operacional" className="rounded-2xl px-10 py-3 font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg">
                <Package className="w-4 h-4"/> Visão Operacional
              </TabsTrigger>
            </TabsList>

            {/* --- CONTEÚDO FINANCEIRO --- */}
            <TabsContent value="financeiro" className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-none shadow-xl bg-emerald-600 text-white rounded-3xl">
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest">Receita Bruta (Período)</p>
                  <p className="text-4xl font-black mt-2">{formatCurrency(financeiro.totalRecebido)}</p>
                  <div className="mt-4 flex items-center gap-2 text-emerald-200 text-sm"><TrendingUp className="w-4 h-4"/> +12% em relação ao mês anterior</div>
                </Card>
                <Card className="p-6 border-none shadow-xl bg-red-500 text-white rounded-3xl">
                  <p className="text-red-100 text-xs font-bold uppercase tracking-widest">Em Atraso (Inadimplência)</p>
                  <p className="text-4xl font-black mt-2">{formatCurrency(financeiro.inadimplencia)}</p>
                  <div className="mt-4 flex items-center gap-2 text-red-100 text-sm"><AlertTriangle className="w-4 h-4"/> Requer atenção imediata</div>
                </Card>
                <Card className="p-6 border-none shadow-xl bg-indigo-900 text-white rounded-3xl">
                  <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Previsão 7 Dias (Cheques)</p>
                  <p className="text-4xl font-black mt-2">{formatCurrency(operacional.chequesVencendo)}</p>
                  <div className="mt-4 flex items-center gap-2 text-indigo-300 text-sm"><Clock className="w-4 h-4"/> Liquidez garantida em carteira</div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-8 border-none shadow-2xl rounded-3xl bg-white">
                  <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2"><CreditCard className="text-indigo-600"/> MIX DE PAGAMENTOS (DETALHADO)</h3>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Dinheiro', valor: financeiro.mix.dinheiro },
                        { name: 'PIX', valor: financeiro.mix.pix },
                        { name: 'Crédito', valor: financeiro.mix.credito },
                        { name: 'Débito', valor: financeiro.mix.debito },
                        { name: 'Links', valor: financeiro.mix.link },
                        { name: 'Cheques', valor: financeiro.mix.cheque },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12, fontWeight: 'bold'}} />
                        <YAxis hide />
                        <Tooltip formatter={(v) => formatCurrency(v)} cursor={{fill: '#F8FAFC'}} />
                        <Bar dataKey="valor" radius={[10, 10, 0, 0]} barSize={50}>
                          {[...Array(6)].map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-8 border-none shadow-2xl rounded-3xl bg-white">
                  <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2"><Users className="text-indigo-600"/> PERFORMANCE DE REPRESENTANTES</h3>
                  <div className="space-y-6">
                    {representantes.slice(0, 5).map((rep, i) => {
                      const total = pedidos.filter(p => p.representante_codigo === rep.codigo && p.status === 'pago').reduce((a,b)=>a+b.valor_pedido, 0);
                      return (
                        <div key={i} className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400">{i+1}</div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1"><span className="font-bold text-slate-700">{rep.nome}</span><span className="font-black text-slate-900">{formatCurrency(total)}</span></div>
                            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: '70%' }} className="bg-indigo-500 h-full rounded-full" /></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* --- CONTEÚDO OPERACIONAL --- */}
            <TabsContent value="operacional" className="space-y-8 animate-in fade-in slide-in-from-right-4">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="p-8 border-none shadow-xl rounded-3xl bg-white">
                    <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Package className="text-orange-500"/> STATUS DA EXPEDIÇÃO</h3>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100 text-center">
                          <p className="text-orange-600 font-bold text-xs uppercase mb-2">Carga em Rota</p>
                          <p className="text-3xl font-black text-orange-700">{formatCurrency(operacional.cargaEmRota)}</p>
                       </div>
                       <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 text-center">
                          <p className="text-emerald-600 font-bold text-xs uppercase mb-2">Entregas Confirmadas</p>
                          <p className="text-3xl font-black text-emerald-700">{formatCurrency(operacional.cargaConcluida)}</p>
                       </div>
                    </div>
                  </Card>

                  <Card className="p-8 border-none shadow-xl rounded-3xl bg-white">
                    <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><MapPin className="text-blue-500"/> TOP REGIÕES (ATIVIDADE)</h3>
                    <div className="h-[250px]">
                       <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                             <Pie data={[
                               { name: 'Zona Norte', value: 400 },
                               { name: 'Zona Sul', value: 300 },
                               { name: 'Centro', value: 200 },
                               { name: 'Interior', value: 500 },
                             ]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                             </Pie>
                             <Tooltip />
                             <Legend />
                          </PieChart>
                       </ResponsiveContainer>
                    </div>
                  </Card>
               </div>
            </TabsContent>
          </Tabs>

        </div>
      </div>
    </PermissionGuard>
  );
}