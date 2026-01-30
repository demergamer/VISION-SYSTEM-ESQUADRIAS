import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Package,
  AlertCircle,
  Calendar,
  CreditCard,
  Plus
} from "lucide-react";
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { usePermissions } from "@/components/UserNotRegisteredError";

// --- DADOS MOCK (Simulação - Depois conectamos na API) ---
const chartData = [
  { name: 'Seg', vendas: 4000, custo: 2400 },
  { name: 'Ter', vendas: 3000, custo: 1398 },
  { name: 'Qua', vendas: 2000, custo: 9800 },
  { name: 'Qui', vendas: 2780, custo: 3908 },
  { name: 'Sex', vendas: 1890, custo: 4800 },
  { name: 'Sáb', vendas: 2390, custo: 3800 },
  { name: 'Dom', vendas: 3490, custo: 4300 },
];

const recentSales = [
  { id: 1, cliente: "Depósito São Jorge", valor: 1250.00, status: "Aprovado", data: "Hoje, 10:42" },
  { id: 2, cliente: "ConstruNorte", valor: 3450.50, status: "Pendente", data: "Hoje, 09:15" },
  { id: 3, cliente: "Vila Nova Materiais", valor: 890.00, status: "Aprovado", data: "Ontem" },
  { id: 4, cliente: "Construtora Ideal", valor: 12500.00, status: "Cancelado", data: "Ontem" },
];

const alerts = [
  { id: 1, text: "3 Cheques vencendo hoje", type: "warning" },
  { id: 2, text: "Estoque baixo: Fechadura 90mm", type: "destructive" },
  { id: 3, text: "5 Pedidos aguardando faturamento", type: "info" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { canDo } = usePermissions();
  const [periodo, setPeriodo] = useState('semana');

  // Formatação de Moeda
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Saudação baseada no horário
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      {/* --- HEADER: BOAS VINDAS E AÇÕES --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            {getGreeting()}, {user?.displayName?.split(' ')[0] || 'Usuário'}!
          </h1>
          <p className="text-slate-500 mt-1">
            Aqui está o resumo financeiro e operacional de hoje.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Link to={createPageUrl('Pedidos')}>
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
              <Plus className="w-4 h-4 mr-2" /> Novo Pedido
            </Button>
           </Link>
        </div>
      </div>

      {/* --- KPI CARDS (Indicadores Chave) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Faturamento */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Faturamento (Mês)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">R$ 45.231,89</div>
            <div className="flex items-center text-xs text-emerald-600 mt-1 font-medium">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +20.1% em relação ao mês anterior
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Pedidos */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Pedidos (Semana)
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">+573</div>
            <div className="flex items-center text-xs text-emerald-600 mt-1 font-medium">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +12 novos hoje
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Clientes Ativos */}
        <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Clientes Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">321</div>
            <div className="flex items-center text-xs text-rose-500 mt-1 font-medium">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              -2 inativos nos últimos 30 dias
            </div>
          </CardContent>
        </Card>

        {/* Card 4: À Receber */}
        <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              À Receber (Hoje)
            </CardTitle>
            <CreditCard className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">R$ 12.450,00</div>
            <div className="text-xs text-slate-500 mt-1">
              3 boletos e 2 cheques vencendo
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- SEÇÃO DO MEIO: GRÁFICO + ALERTAS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        
        {/* GRÁFICO PRINCIPAL (Ocupa 4 colunas) */}
        <Card className="lg:col-span-4 border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Visão Geral de Vendas</CardTitle>
                <CardDescription>Performance de vendas vs custo nos últimos 7 dias</CardDescription>
              </div>
              {/* Filtro simples */}
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {['semana', 'mês', 'ano'].map((p) => (
                  <button 
                    key={p}
                    onClick={() => setPeriodo(p)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${periodo === p ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `R$${value/1000}k`} 
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1e293b', fontSize: '12px' }}
                    labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="vendas" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorVendas)" name="Vendas" />
                  <Area type="monotone" dataKey="custo" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorCusto)" name="Custo" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ALERTAS E ATIVIDADES (Ocupa 3 colunas) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Card de Alertas */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Atenção Necessária
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                      alert.type === 'destructive' ? 'bg-red-500' : 
                      alert.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <p className="text-sm text-slate-600 leading-snug">{alert.text}</p>
                  </div>
                ))}
                {alerts.length === 0 && <p className="text-sm text-slate-400 italic">Nenhum alerta pendente.</p>}
              </div>
            </CardContent>
          </Card>

          {/* Últimos Pedidos */}
          <Card className="border-slate-200 shadow-sm h-full max-h-[300px] flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-800">Vendas Recentes</CardTitle>
                <Link to={createPageUrl('Pedidos')} className="text-xs text-blue-600 hover:underline">Ver todas</Link>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto pr-2 custom-scrollbar flex-1">
              <div className="space-y-4">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-slate-100">
                        <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-bold">
                          {sale.cliente.substring(0,2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-slate-800 leading-none group-hover:text-blue-600 transition-colors">{sale.cliente}</p>
                        <p className="text-xs text-slate-400 mt-1">{sale.data}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-700">{formatCurrency(sale.valor)}</p>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 border-0 ${
                        sale.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' :
                        sale.status === 'Pendente' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {sale.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}