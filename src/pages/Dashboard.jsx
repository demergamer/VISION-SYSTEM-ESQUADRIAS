import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { 
  Users, 
  UserCheck, 
  ShoppingCart, 
  CreditCard,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  FileText,
  PieChart,
  Wallet,
  Building2,
  BarChart3
} from "lucide-react";

import StatCard from "@/components/dashboard/StatCard";
import NavigationCard from "@/components/dashboard/NavigationCard";
import PermissionGuard from "@/components/PermissionGuard";

export default function Dashboard() {
  const navigate = useNavigate();

  // Fetch all data
  const { data: representantes = [] } = useQuery({
    queryKey: ['representantes'],
    queryFn: () => base44.entities.Representante.list()
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list()
  });

  const { data: creditos = [] } = useQuery({
    queryKey: ['creditos'],
    queryFn: () => base44.entities.Credito.list()
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

    // Representantes stats
    const repsAtivos = representantes.filter(rep => {
      return pedidos.some(p => 
        p.representante_codigo === rep.codigo && 
        new Date(p.data_entrega) >= sixtyDaysAgo
      );
    }).length;

    const repsCom30k = representantes.filter(rep => {
      const vendas = pedidos
        .filter(p => p.representante_codigo === rep.codigo && new Date(p.data_entrega) >= thirtyDaysAgo)
        .reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
      return vendas >= 30000;
    }).length;

    // Clientes stats
    const clientesAtivos = clientes.filter(cli => {
      return pedidos.some(p => 
        p.cliente_codigo === cli.codigo && 
        new Date(p.data_entrega) >= sixtyDaysAgo
      );
    }).length;

    const clientesCom30k = clientes.filter(cli => {
      const compras = pedidos
        .filter(p => p.cliente_codigo === cli.codigo && new Date(p.data_entrega) >= thirtyDaysAgo)
        .reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
      return compras >= 30000;
    }).length;

    const clientesBloqueados = clientes.filter(cli => {
      if (cli.bloqueado_manual) return true;
      // Bloqueado automaticamente se tem pedidos > 15 dias ou ultrapassou limite
      const pedidosCliente = pedidos.filter(p => 
        p.cliente_codigo === cli.codigo && 
        (p.status === 'aberto' || p.status === 'parcial')
      );
      const temAtraso = pedidosCliente.some(p => new Date(p.data_entrega) < fifteenDaysAgo);
      const totalAberto = pedidosCliente.reduce((sum, p) => sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0);
      return temAtraso || totalAberto > (cli.limite_credito || 0);
    }).length;

    const clientesInativos = clientes.length - clientesAtivos;

    // Pedidos stats
    const pedidosAbertos = pedidos.filter(p => p.status === 'aberto' || p.status === 'parcial');
    const totalAReceber = pedidosAbertos.reduce((sum, p) => 
      sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0
    );

    const pedidosAtrasados = pedidosAbertos.filter(p => 
      new Date(p.data_entrega) < twentyDaysAgo
    );
    const totalAtrasado = pedidosAtrasados.reduce((sum, p) => 
      sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0
    );

    // Créditos stats
    const creditosDisponiveis = creditos.filter(c => c.status === 'disponivel');
    const totalCreditosDisponiveis = creditosDisponiveis.reduce((sum, c) => sum + c.valor, 0);

    return {
      representantes: {
        total: representantes.length,
        ativos: repsAtivos,
        com30k: repsCom30k
      },
      clientes: {
        total: clientes.length,
        ativos: clientesAtivos,
        inativos: clientesInativos,
        com30k: clientesCom30k,
        bloqueados: clientesBloqueados
      },
      pedidos: {
        abertos: pedidosAbertos.length,
        atrasados: pedidosAtrasados.length,
        totalAReceber,
        totalAtrasado
      },
      creditos: {
        disponiveis: creditosDisponiveis.length,
        totalDisponiveis: totalCreditosDisponiveis
      }
    };
  }, [representantes, clientes, pedidos, creditos]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const modules = [
    {
      title: "Representantes",
      description: "Cadastro e gestão de representantes",
      icon: Users,
      color: "blue",
      page: "Representation",
      badge: stats.representantes.total
    },
    {
      title: "Clientes",
      description: "Cadastro e gestão de clientes",
      icon: Building2,
      color: "green",
      page: "Clientes",
      badge: stats.clientes.total
    },
    {
      title: "Pedidos",
      description: "Gerenciar pedidos e recebimentos",
      icon: ShoppingCart,
      color: "purple",
      page: "Pedidos",
      badge: stats.pedidos.abertos
    },
    {
      title: "Créditos a Pagar",
      description: "Controle de créditos de clientes",
      icon: Wallet,
      color: "green",
      page: "Creditos",
      badge: stats.creditos.disponiveis
    },
    {
      title: "Cheques",
      description: "Controle de cheques a vencer",
      icon: CreditCard,
      color: "amber",
      page: "Cheques"
    },
    {
      title: "Comissões",
      description: "Cálculo e relatórios de comissões",
      icon: Wallet,
      color: "yellow",
      page: "Comissoes"
    },
    {
      title: "Balanço de Débitos",
      description: "Visão geral de débitos por cliente",
      icon: BarChart3,
      color: "red",
      page: "Balanco"
    },
    {
      title: "Relatórios",
      description: "Relatórios e gráficos gerenciais",
      icon: PieChart,
      color: "slate",
      page: "Relatorios"
    }
  ];

  return (
    <PermissionGuard setor="Dashboard">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            Controle Financeiro
          </h1>
          <p className="text-slate-500">
            Dashboard principal - Visão geral do sistema
          </p>
        </div>

        {/* Quick Stats - Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            title="Total a Receber"
            value={formatCurrency(stats.pedidos.totalAReceber)}
            icon={DollarSign}
            color="blue"
          />
          <StatCard
            title="Em Atraso"
            value={formatCurrency(stats.pedidos.totalAtrasado)}
            icon={AlertTriangle}
            color="red"
          />
          <StatCard
            title="Créditos a Pagar"
            value={formatCurrency(stats.creditos.totalDisponiveis)}
            subtitle={`${stats.creditos.disponiveis} disponível(is)`}
            icon={Wallet}
            color="green"
          />
          <StatCard
            title="Pedidos Abertos"
            value={stats.pedidos.abertos}
            icon={FileText}
            color="purple"
          />
          <StatCard
            title="Pedidos Atrasados"
            value={stats.pedidos.atrasados}
            icon={AlertTriangle}
            color="red"
          />
        </div>

        {/* Quick Stats - Row 2 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            title="Representantes"
            value={stats.representantes.total}
            icon={Users}
            color="blue"
            subtitle={`${stats.representantes.ativos} ativos`}
          />
          <StatCard
            title="Clientes"
            value={stats.clientes.total}
            icon={Building2}
            color="green"
            subtitle={`${stats.clientes.ativos} ativos`}
          />
          <StatCard
            title="Clientes Inativos"
            value={stats.clientes.inativos}
            icon={UserCheck}
            color="slate"
          />
          <StatCard
            title="Clientes Bloqueados"
            value={stats.clientes.bloqueados}
            icon={AlertTriangle}
            color="red"
          />
          <StatCard
            title="Reps +30k"
            value={stats.representantes.com30k}
            icon={TrendingUp}
            color="purple"
          />
        </div>

        {/* Navigation Modules */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-700">Módulos do Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => (
              <NavigationCard
                key={module.page}
                title={module.title}
                description={module.description}
                icon={module.icon}
                color={module.color}
                badge={module.badge}
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