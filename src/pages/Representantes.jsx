import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  UserPlus, 
  Search, 
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  UserCheck,
  ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import StatCard from "@/components/dashboard/StatCard";
import ModalContainer from "@/components/modals/ModalContainer";
import RepresentanteForm from "@/components/representantes/RepresentanteForm";
import RepresentanteTable from "@/components/representantes/RepresentanteTable";
import RepresentanteDetails from "@/components/representantes/RepresentanteDetails";

export default function Representantes() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRepresentante, setSelectedRepresentante] = useState(null);

  // Fetch representantes
  const { data: representantes = [], isLoading: loadingReps, refetch: refetchReps } = useQuery({
    queryKey: ['representantes'],
    queryFn: () => base44.entities.Representante.list()
  });

  // Fetch clientes para estatísticas
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  // Fetch pedidos para estatísticas
  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list()
  });

  // Calcular estatísticas por representante
  const repStats = useMemo(() => {
    const stats = {};
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

    representantes.forEach(rep => {
      const repClientes = clientes.filter(c => c.representante_codigo === rep.codigo);
      const repPedidos = pedidos.filter(p => p.representante_codigo === rep.codigo && p.status !== 'cancelado');
      
      // Clientes ativos (compraram nos últimos 30 dias)
      const clientesComPedidosRecentes = new Set();
      repPedidos.forEach(p => {
        const dataEntrega = new Date(p.data_entrega);
        if (dataEntrega >= thirtyDaysAgo) {
          clientesComPedidosRecentes.add(p.cliente_codigo);
        }
      });

      // Clientes em atraso (pedidos abertos há mais de 20 dias)
      const clientesEmAtraso = new Set();
      repPedidos.forEach(p => {
        if (p.status === 'aberto' || p.status === 'parcial') {
          const dataEntrega = new Date(p.data_entrega);
          if (dataEntrega < twentyDaysAgo) {
            clientesEmAtraso.add(p.cliente_codigo);
          }
        }
      });

      // Débitos em dia e atrasados
      let debitosEmDia = 0;
      let debitosAtrasados = 0;
      repPedidos.forEach(p => {
        if (p.status === 'aberto' || p.status === 'parcial') {
          const saldo = p.saldo_restante || (p.valor_pedido - (p.total_pago || 0));
          const dataEntrega = new Date(p.data_entrega);
          if (dataEntrega < twentyDaysAgo) {
            debitosAtrasados += saldo;
          } else {
            debitosEmDia += saldo;
          }
        }
      });

      // Total de vendas nos últimos 30 dias
      const vendasUltimos30Dias = repPedidos
        .filter(p => new Date(p.data_entrega) >= thirtyDaysAgo)
        .reduce((sum, p) => sum + (p.valor_pedido || 0), 0);

      // Representante ativo (vendeu nos últimos 60 dias)
      const vendeuRecentemente = repPedidos.some(p => new Date(p.data_entrega) >= sixtyDaysAgo);

      stats[rep.codigo] = {
        totalClientes: repClientes.length,
        clientesAtivos: clientesComPedidosRecentes.size,
        clientesInativos: repClientes.length - clientesComPedidosRecentes.size,
        clientesEmAtraso: clientesEmAtraso.size,
        debitosEmDia,
        debitosAtrasados,
        vendas30k: vendasUltimos30Dias >= 30000,
        ativo: vendeuRecentemente,
        devedor: clientesEmAtraso.size > 0
      };
    });

    return stats;
  }, [representantes, clientes, pedidos]);

  // Estatísticas gerais
  const generalStats = useMemo(() => {
    const ativos = representantes.filter(r => repStats[r.codigo]?.ativo).length;
    const com30k = representantes.filter(r => repStats[r.codigo]?.vendas30k).length;
    return {
      total: representantes.length,
      ativos,
      com30k
    };
  }, [representantes, repStats]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Representante.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representantes'] });
      setShowAddModal(false);
      toast.success('Representante cadastrado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar representante:', error);
      toast.error('Erro ao cadastrar representante: ' + (error.message || 'Tente novamente'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Representante.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representantes'] });
      setShowEditModal(false);
      setSelectedRepresentante(null);
      toast.success('Representante atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar representante:', error);
      toast.error('Erro ao atualizar representante: ' + (error.message || 'Tente novamente'));
    }
  });

  // Filtrar representantes
  const filteredRepresentantes = representantes.filter(rep =>
    rep.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rep.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rep.regiao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (rep) => {
    setSelectedRepresentante(rep);
    setShowEditModal(true);
  };

  const handleView = (rep) => {
    setSelectedRepresentante(rep);
    setShowDetailsModal(true);
  };

  const handleRefresh = () => {
    refetchReps();
    queryClient.invalidateQueries({ queryKey: ['clientes'] });
    queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    toast.success('Informações atualizadas!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Representantes</h1>
              <p className="text-slate-500">Gerencie sua equipe de representantes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Novo Representante
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Cadastrados"
            value={generalStats.total}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Ativos (60 dias)"
            value={generalStats.ativos}
            icon={UserCheck}
            color="green"
            subtitle="Venderam recentemente"
          />
          <StatCard
            title="+ R$ 30k em Vendas"
            value={generalStats.com30k}
            icon={TrendingUp}
            color="purple"
            subtitle="Últimos 30 dias"
          />
        </div>

        {/* Search and Table */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-white">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, código ou região..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <RepresentanteTable
            representantes={filteredRepresentantes}
            stats={repStats}
            onEdit={handleEdit}
            onView={handleView}
            isLoading={loadingReps}
          />
        </Card>

        {/* Add Modal */}
        <ModalContainer
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Novo Representante"
          description="Preencha os dados para cadastrar um novo representante"
        >
          <RepresentanteForm
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setShowAddModal(false)}
            isLoading={createMutation.isPending}
          />
        </ModalContainer>

        {/* Edit Modal */}
        <ModalContainer
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRepresentante(null);
          }}
          title="Editar Representante"
          description="Atualize os dados do representante"
        >
          <RepresentanteForm
            representante={selectedRepresentante}
            onSave={(data) => updateMutation.mutate({ id: selectedRepresentante.id, data })}
            onCancel={() => {
              setShowEditModal(false);
              setSelectedRepresentante(null);
            }}
            isLoading={updateMutation.isPending}
          />
        </ModalContainer>

        {/* Details Modal */}
        <ModalContainer
          open={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedRepresentante(null);
          }}
          title="Detalhes do Representante"
          size="lg"
        >
          {selectedRepresentante && (
            <RepresentanteDetails
              representante={selectedRepresentante}
              stats={repStats[selectedRepresentante.codigo]}
              onEdit={() => {
                setShowDetailsModal(false);
                setShowEditModal(true);
              }}
              onClose={() => {
                setShowDetailsModal(false);
                setSelectedRepresentante(null);
              }}
            />
          )}
        </ModalContainer>
      </div>
    </div>
  );
}