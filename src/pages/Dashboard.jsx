import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { 
  Users, UserCheck, ShoppingCart, CreditCard, TrendingUp,
  AlertTriangle, DollarSign, FileText, PieChart, Wallet,
  Building2, BarChart3, ArrowRight, Activity, Ban,
  ChevronDown, ChevronRight, Lock, Layers, Landmark
} from "lucide-react";
import { toast } from "sonner";

import PermissionGuard from "@/components/PermissionGuard";

// --- Componente: Widget de Estatística (Mantido) ---
const StatWidget = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
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
    <div className={`relative overflow-hidden bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group`}>
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
      <div className={`absolute bottom-0 left-0 w-full h-1 ${theme.bg.replace('bg-', 'bg-gradient-to-r from-white via-')}${theme.text.replace('text-', '')} to-white opacity-50`} />
    </div>
  );
};

// --- Componente: Botão de Módulo (Mantido) ---
const ModuleButton = ({ title, description, icon: Icon, onClick, isDev }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-4 p-4 w-full bg-white hover:bg-slate-50 border border-slate-100 rounded-xl transition-all duration-200 group text-left ${isDev ? 'opacity-70' : ''}`}
  >
    <div className={`p-2 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors`}>
      <Icon size={20} />
    </div>
    <div className="flex-1">
      <h4 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">{title}</h4>
      <p className="text-xs text-slate-500 line-clamp-1">{description}</p>
    </div>
    {isDev ? <Lock className="w-4 h-4 text-amber-500" /> : <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400" />}
  </button>
);

// --- Componente: Card de Setor Expansível (Mantido) ---
const SectorCard = ({ title, description, icon: Icon, color, modules, isOpen, onToggle }) => {
  const themes = {
    blue:   { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    green:  { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
    purple: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-200" },
    amber:  { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
    red:    { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    slate:  { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
  };
  const theme = themes[color] || themes.slate;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm transition-all duration-300 overflow-hidden ${isOpen ? `ring-2 ring-offset-2 ${theme.border.replace('border', 'ring')}` : 'border-slate-100 hover:border-slate-300'}`}>
      <button 
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between text-left focus:outline-none"
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${theme.bg} ${theme.text}`}>
            <Icon size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} text-slate-400`}>
          <ChevronDown size={24} />
        </div>
      </button>
      
      <div className={`grid gap-3 px-6 transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] pb-6 opacity-100' : 'max-h-0 pb-0 opacity-0'}`}>
        <div className="h-px bg-slate-100 w-full mb-2" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {modules.map((mod, idx) => (
            <ModuleButton key={idx} {...mod} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [openSector, setOpenSector] = useState(null);

  // --- Fetch Data ---
  const { data: representantes = [] } = useQuery({ queryKey: ['representantes'], queryFn: () => base44.entities.Representante.list() });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
  const { data: pedidos = [] } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });
  const { data: creditos = [] } = useQuery({ queryKey: ['creditos'], queryFn: () => base44.entities.Credito.list() });

  // --- Statistics Logic (Mantida) ---
  const stats = useMemo(() => {
    const now = new Date();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    
    const pedidosAbertos = pedidos.filter(p => p.status === 'aberto' || p.status === 'parcial');
    const totalAReceber = pedidosAbertos.reduce((sum, p) => sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0);
    const pedidosAtrasados = pedidosAbertos.filter(p => new Date(p.data_entrega) < twentyDaysAgo);
    const totalAtrasado = pedidosAtrasados.reduce((sum, p) => sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0);
    const creditosDisponiveis = creditos.filter(c => c.status === 'disponivel');
    const totalCreditos = creditosDisponiveis.reduce((sum, c) => sum + c.valor, 0);

    return {
      financeiro: { aReceber: totalAReceber, atrasado: totalAtrasado, creditos: totalCreditos },
      operacional: { pedidosAbertos: pedidosAbertos.length, pedidosAtrasados: pedidosAtrasados.length, clientes: clientes.length }
    };
  }, [pedidos, clientes, creditos, representantes]);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);

  const handleDevClick = () => {
    toast.info("Módulo em Desenvolvimento", {
      description: "Esta funcionalidade estará disponível em breve.",
      icon: <Lock className="w-4 h-4 text-amber-500" />
    });
  };

  // --- Configuração dos Setores ---
  const sectors = [
    {
      id: 'cadastros',
      title: "Cadastros",
      description: "Gerencie clientes, representantes e usuários",
      icon: Users,
      color: "blue",
      modules: [
        { title: "Clientes", description: "Base de clientes", icon: Building2, onClick: () => navigate(createPageUrl('Clientes')) },
        { title: "Representantes", description: "Equipe de vendas", icon: Users, onClick: () => navigate(createPageUrl('Representation')) },
        { title: "Fornecedores", description: "Gestão de fornecedores", icon: TrendingUp, onClick: () => navigate(createPageUrl('CadastroFornecedor')) },
        { title: "Formas de Pagamento", description: "Configurar pagamentos", icon: CreditCard, onClick: () => navigate(createPageUrl('FormasPagamento')) },
      ]
    },
    {
      id: 'vendas',
      title: "Vendas",
      description: "Gestão comercial e orçamentos",
      icon: ShoppingCart,
      color: "purple",
      modules: [
        { title: "Solicitação de Cadastro", description: "Novos clientes", icon: UserCheck, onClick: () => navigate(createPageUrl('SolicitacaoCadastro')) },
        { title: "Orçamentos", description: "Propostas comerciais", icon: FileText, onClick: () => navigate(createPageUrl('Orcamentos')) },
        { title: "Cadastro de Peças", description: "Produtos e preços", icon: Building2, onClick: () => navigate(createPageUrl('CadastroPecas')) },
        { title: "Agrupar Orçamentos", description: "Consolidar propostas", icon: Layers, onClick: () => navigate(createPageUrl('AgruparOrcamentos')) },
      ]
    },
    {
      id: 'receber',
      title: "A Receber",
      description: "Controle de entradas, pedidos e créditos",
      icon:  TrendingUp,
      color: "green",
      modules: [
        { title: "Pedidos", description: "Gestão de vendas", icon: ShoppingCart, onClick: () => navigate(createPageUrl('Pedidos')) },
        { title: "Cheques", description: "Custódia de cheques", icon: CreditCard, onClick: () => navigate(createPageUrl('Cheques')) },
        { title: "Créditos", description: "Créditos de clientes", icon: Wallet, onClick: () => navigate(createPageUrl('Creditos')) },
      ]
    },
    {
      id: 'pagar',
      title: "A Pagar",
      description: "Gestão de saídas e caixa",
      icon: DollarSign,
      color: "amber",
      modules: [
        // NOVOS MÓDULOS AQUI
        { title: "Contas a Pagar", description: "Gestão de pagamentos", icon: CreditCard, onClick: () => navigate(createPageUrl('Pagamentos')) },
        { title: "Caixa Diário", description: "Movimentações do dia", icon: Landmark, onClick: () => navigate(createPageUrl('CaixaDiario')) },
        { title: "Comissões", description: "Pagamento de vendedores", icon: Wallet, onClick: () => navigate(createPageUrl('Comissoes')) },
      ]
    },
    {
      id: 'feedback',
      title: "Feedback",
      description: "Relatórios gerenciais e balanços",
      icon: PieChart,
      color: "purple",
      modules: [
        { title: "Relatórios", description: "Análise de dados", icon: FileText, onClick: () => navigate(createPageUrl('Relatorios')) },
        { title: "Balanço", description: "Visão geral financeira", icon: BarChart3, onClick: () => navigate(createPageUrl('Balanco')) },
      ]
    }
  ];

  const toggleSector = (id) => {
    setOpenSector(openSector === id ? null : id);
  };

  return (
    <PermissionGuard setor="Dashboard">
      <div className="min-h-screen bg-slate-50/50 pb-12">
        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-10">
          
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatWidget title="A Receber" value={formatCurrency(stats.financeiro.aReceber)} icon={DollarSign} colorTheme="blue" subtitle="Total em aberto" />
            <StatWidget title="Em Atraso" value={formatCurrency(stats.financeiro.atrasado)} icon={AlertTriangle} colorTheme="red" subtitle="Atenção requerida" />
            <StatWidget title="Créditos Disp." value={formatCurrency(stats.financeiro.creditos)} icon={Wallet} colorTheme="green" subtitle="Saldo de clientes" />
            <StatWidget title="Pedidos Abertos" value={stats.operacional.pedidosAbertos} icon={ShoppingCart} colorTheme="purple" subtitle="Aguardando liquidação" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 ml-1">Módulos do Sistema</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sectors.map((sector) => (
                <SectorCard 
                  key={sector.id}
                  {...sector}
                  isOpen={openSector === sector.id}
                  onToggle={() => toggleSector(sector.id)}
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </PermissionGuard>
  );
}