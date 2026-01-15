import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { 
  Users, UserCheck, ShoppingCart, CreditCard, TrendingUp,
  AlertTriangle, DollarSign, FileText, PieChart, Wallet,
  Building2, BarChart3, ArrowRight, Activity, Ban
} from "lucide-react";

import PermissionGuard from "@/components/PermissionGuard";

// --- Componente Interno: Widget de Estatística (Novo Design) ---
const StatWidget = ({ title, value, subtitle, icon: Icon, colorTheme, onClick }) => {
  // Mapas de cores pastéis modernas
  const themes = {
    blue:   { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100", iconBg: "bg-blue-100" },
    red:    { bg: "bg-red-50", text: "text-red-600", border: "border-red-100", iconBg: "bg-red-100" },
    green:  { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", iconBg: "bg-emerald-100" },
    purple: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-100", iconBg: "bg-violet-100" },
    amber:  { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100", iconBg: "bg-amber-100" },
    slate:  { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-100", iconBg: "bg-slate-100" },
  };

  const theme = themes[colorTheme] || themes.slate;

  return (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group cursor-default ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">{value}</h3>
          {subtitle && (
            <p className={`text-xs font-medium mt-2 flex items-center gap-1 ${theme.text}`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${theme.iconBg} ${theme.text} group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={24} />
        </div>
      </div>
      {/* Barra decorativa inferior */}
      <div className={`absolute bottom-0 left-0 w-full h-1 ${theme.bg.replace('bg-', 'bg-gradient-to-r from-white via-')}${theme.text.replace('text-', '')} to-white opacity-50`} />
    </div>
  );
};

// --- Componente Interno: Card de Módulo (Novo Design) ---
const ModuleCard = ({ title, description, icon: Icon, color, onClick, badge }) => {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white",
    green: "text-emerald-600 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white",
    purple: "text-violet-600 bg-violet-50 group-hover:bg-violet-600 group-hover:text-white",
    amber: "text-amber-600 bg-amber-50 group-hover:bg-amber-600 group-hover:text-white",
    red: "text-red-600 bg-red-50 group-hover:bg-red-600 group-hover:text-white",
    slate: "text-slate-600 bg-slate-50 group-hover:bg-slate-600 group-hover:text-white",
    yellow: "text-yellow-600 bg-yellow-50 group-hover:bg-yellow-500 group-hover:text-white",
  };

  return (
    <button 
      onClick={onClick}
      className="group flex items-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left w-full relative overflow-hidden"
    >
      <div className={`p-4 rounded-xl mr-4 transition-colors duration-300 ${colorClasses[color] || colorClasses.slate}`}>
        <Icon size={24} />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-slate-800 group-hover:text-blue-900 transition-colors">{title}</h3>
        <p className="text-sm text-slate-500 leading-tight mt-1">{description}</p>
      </div>
      
      {badge > 0 && (
        <span className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          {badge}
        </span>
      )}
      
      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300">
        <ArrowRight size={20} />
      </div>
    </button>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();

  // --- Fetch Data (Mantido igual) ---
  const { data: representantes = [] } = useQuery({ queryKey: ['representantes'], queryFn: () => base44.entities.Representante.list() });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
  const { data: pedidos = [] } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });
  const { data: creditos = [] } = useQuery({ queryKey: ['creditos'], queryFn: () => base44.entities.Credito.list() });

  // --- Statistics Logic (Mantido igual) ---
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

    // Representantes stats
    const repsAtivos = representantes.filter(rep => {
      return pedidos.some(p => p.representante_codigo === rep.codigo && new Date(p.data_entrega) >= sixtyDaysAgo);
    }).length;

    const repsCom30k = representantes.filter(rep => {
      const vendas = pedidos
        .filter(p => p.representante_codigo === rep.codigo && new Date(p.data_entrega) >= thirtyDaysAgo)
        .reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
      return vendas >= 30000;
    }).length;

    // Clientes stats
    const clientesAtivos = clientes.filter(cli => {
      return pedidos.some(p => p.cliente_codigo === cli.codigo && new Date(p.data_entrega) >= sixtyDaysAgo);
    }).length;

    const clientesCom30k = clientes.filter(cli => {
      const compras = pedidos
        .filter(p => p.cliente_codigo === cli.codigo && new Date(p.data_entrega) >= thirtyDaysAgo)
        .reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
      return compras >= 30000;
    }).length;

    const clientesBloqueados = clientes.filter(cli => {
      if (cli.bloqueado_manual) return true;
      const pedidosCliente = pedidos.filter(p => p.cliente_codigo === cli.codigo && (p.status === 'aberto' || p.status === 'parcial'));
      const temAtraso = pedidosCliente.some(p => new Date(p.data_entrega) < fifteenDaysAgo);
      const totalAberto = pedidosCliente.reduce((sum, p) => sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0);
      return temAtraso || totalAberto > (cli.limite_credito || 0);
    }).length;

    const clientesInativos = clientes.length - clientesAtivos;

    // Pedidos stats
    const pedidosAbertos = pedidos.filter(p => p.status === 'aberto' || p.status === 'parcial');
    const totalAReceber = pedidosAbertos.reduce((sum, p) => sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0);

    const pedidosAtrasados = pedidosAbertos.filter(p => new Date(p.data_entrega) < twentyDaysAgo);
    const totalAtrasado = pedidosAtrasados.reduce((sum, p) => sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0);

    // Créditos stats
    const creditosDisponiveis = creditos.filter(c => c.status === 'disponivel');
    const totalCreditosDisponiveis = creditosDisponiveis.reduce((sum, c) => sum + c.valor, 0);

    return {
      representantes: { total: representantes.length, ativos: repsAtivos, com30k: repsCom30k },
      clientes: { total: clientes.length, ativos: clientesAtivos, inativos: clientesInativos, com30k: clientesCom30k, bloqueados: clientesBloqueados },
      pedidos: { abertos: pedidosAbertos.length, atrasados: pedidosAtrasados.length, totalAReceber, totalAtrasado },
      creditos: { disponiveis: creditosDisponiveis.length, totalDisponiveis: totalCreditosDisponiveis }
    };
  }, [representantes, clientes, pedidos, creditos]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
  };

  const modules = [
    { title: "Pedidos", description: "Gerenciar pedidos e recebimentos", icon: ShoppingCart, color: "purple", page: "Pedidos", badge: stats.pedidos.abertos },
    { title: "Clientes", description: "Cadastro e gestão de clientes", icon: Building2, color: "green", page: "Clientes", badge: stats.clientes.total },
    { title: "Representantes", description: "Gestão de equipe de vendas", icon: Users, color: "blue", page: "Representation", badge: stats.representantes.total },
    { title: "Créditos a Pagar", description: "Controle de créditos", icon: Wallet, color: "green", page: "Creditos", badge: stats.creditos.disponiveis },
    { title: "Cheques", description: "Controle de cheques a vencer", icon: CreditCard, color: "amber", page: "Cheques" },
    { title: "Comissões", description: "Cálculo de comissões", icon: DollarSign, color: "yellow", page: "Comissoes" },
    { title: "Balanço", description: "Visão geral de débitos", icon: BarChart3, color: "red", page: "Balanco" },
    { title: "Relatórios", description: "Gráficos gerenciais", icon: PieChart, color: "slate", page: "Relatorios" }
  ];

  return (
    <PermissionGuard setor="Dashboard">
      <div className="min-h-screen bg-slate-50/50 pb-12">
        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-10">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
              <p className="text-slate-500 mt-1">Visão geral financeira e operacional</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              Sistema Online
            </div>
          </div>

          {/* SEÇÃO 1: FINANCEIRO (Cards Grandes) */}
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 ml-1">Resumo Financeiro</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatWidget
                title="Total a Receber"
                value={formatCurrency(stats.pedidos.totalAReceber)}
                icon={DollarSign}
                colorTheme="blue"
                subtitle={`${stats.pedidos.abertos} pedidos em aberto`}
              />
              <StatWidget
                title="Em Atraso"
                value={formatCurrency(stats.pedidos.totalAtrasado)}
                icon={AlertTriangle}
                colorTheme="red"
                subtitle={`${stats.pedidos.atrasados} pedidos atrasados`}
              />
              <StatWidget
                title="Créditos Disponíveis"
                value={formatCurrency(stats.creditos.totalDisponiveis)}
                icon={Wallet}
                colorTheme="green"
                subtitle={`${stats.creditos.disponiveis} para uso`}
              />
              <StatWidget
                title="Representantes +30k"
                value={stats.representantes.com30k}
                icon={TrendingUp}
                colorTheme="purple"
                subtitle="Alta performance"
              />
            </div>
          </div>

          {/* SEÇÃO 2: OPERACIONAL (Cards Compactos) */}
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 ml-1">Visão Operacional</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatWidget
                title="Clientes Ativos"
                value={stats.clientes.ativos}
                icon={UserCheck}
                colorTheme="green"
                subtitle={`Total: ${stats.clientes.total}`}
              />
              <StatWidget
                title="Clientes Inativos"
                value={stats.clientes.inativos}
                icon={Users}
                colorTheme="slate"
                subtitle="Sem compra recente"
              />
               <StatWidget
                title="Clientes Bloqueados"
                value={stats.clientes.bloqueados}
                icon={Ban}
                colorTheme="red"
                subtitle="Restrição financeira"
              />
              <StatWidget
                title="Reps. Ativos"
                value={stats.representantes.ativos}
                icon={Activity}
                colorTheme="blue"
                subtitle={`Equipe: ${stats.representantes.total}`}
              />
            </div>
          </div>

          {/* SEÇÃO 3: MÓDULOS DE NAVEGAÇÃO */}
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 ml-1">Acesso Rápido</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {modules.map((module) => (
                <ModuleCard
                  key={module.page}
                  {...module}
                  onClick={() => navigate(createPageUrl(module.page))}
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </PermissionGuard>
  );
}