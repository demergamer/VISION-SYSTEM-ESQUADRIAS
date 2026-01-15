import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Building2, 
  UserPlus, 
  Search, 
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  UserCheck,
  ArrowLeft,
  Ban,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import StatCard from "@/components/dashboard/StatCard";
import ModalContainer from "@/components/modals/ModalContainer";
import ClienteForm from "@/components/clientes/ClienteForm";
import ClienteTable from "@/components/clientes/ClienteTable";
import ClienteDetails from "@/components/clientes/ClienteDetails";
import PermissionGuard from "@/components/PermissionGuard";
import { usePermissions } from "@/components/UserNotRegisteredError";

export default function Clientes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canDo } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);

  // Fetch data
  const { data: clientes = [], isLoading: loadingClientes, refetch: refetchClientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  const { data: representantes = [] } = useQuery({
    queryKey: ['representantes'],
    queryFn: () => base44.entities.Representante.list()
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list()
  });

  const { data: creditos = [] } = useQuery({
    queryKey: ['creditos'],
    queryFn: () => base44.entities.Credito.list()
  });

  const { data: cheques = [] } = useQuery({
    queryKey: ['cheques'],
    queryFn: () => base44.entities.Cheque.list()
  });

  // Calcular estatísticas por cliente
  const clienteStats = useMemo(() => {
    const stats = {};
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

    clientes.forEach(cli => {
      const cliPedidos = pedidos.filter(p => p.cliente_codigo === cli.codigo);
      const pedidosAbertos = cliPedidos.filter(p => p.status === 'aberto' || p.status === 'parcial');
      
      const totalPedidosAbertos = pedidosAbertos.reduce((sum, p) => 
        sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0
      );

      // Compras nos últimos 30 dias
      const compras30Dias = cliPedidos
        .filter(p => new Date(p.data_entrega) >= thirtyDaysAgo)
        .reduce((sum, p) => sum + (p.valor_pedido || 0), 0);

      // Ativo (comprou nos últimos 60 dias)
      const ativo = cliPedidos.some(p => new Date(p.data_entrega) >= sixtyDaysAgo);

      // Bloqueado automaticamente (pedidos > 15 dias ou ultrapassou limite)
      const temAtraso = pedidosAbertos.some(p => new Date(p.data_entrega) < fifteenDaysAgo);
      const ultrapassouLimite = totalPedidosAbertos > (cli.limite_credito || 0);
      const bloqueadoAuto = temAtraso || ultrapassouLimite;

      // Calcular cheques a vencer (status normal e vencimento > hoje)
      const chequesAVencer = cheques.filter(ch => {
        if (ch.cliente_codigo !== cli.codigo) return false;
        if (ch.status !== 'normal') return false;
        const vencimento = new Date(ch.data_vencimento);
        vencimento.setHours(0, 0, 0, 0);
        return vencimento > now;
      });
      const totalChequesVencer = chequesAVencer.reduce((sum, ch) => sum + (ch.valor || 0), 0);

      stats[cli.codigo] = {
        totalPedidosAbertos,
        totalChequesVencer,
        bloqueadoAuto,
        compras30k: compras30Dias >= 30000,
        ativo
      };
    });

    return stats;
  }, [clientes, pedidos, cheques]);

  // Estatísticas gerais
  const generalStats = useMemo(() => {
    const ativos = clientes.filter(c => clienteStats[c.codigo]?.ativo).length;
    const inativos = clientes.length - ativos;
    const com30k = clientes.filter(c => clienteStats[c.codigo]?.compras30k).length;
    const bloqueados = clientes.filter(c => 
      c.bloqueado_manual || clienteStats[c.codigo]?.bloqueadoAuto
    ).length;
    
    return {
      total: clientes.length,
      ativos,
      inativos,
      com30k,
      bloqueados
    };
  }, [clientes, clienteStats]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Cliente.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setShowAddModal(false);
      toast.success('Cliente cadastrado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar cliente:', error);
      toast.error('Erro ao cadastrar cliente: ' + (error.message || 'Tente novamente'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Cliente.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setShowEditModal(false);
      setSelectedCliente(null);
      toast.success('Cliente atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar cliente:', error);
      toast.error('Erro ao atualizar cliente: ' + (error.message || 'Tente novamente'));
    }
  });

  // Filtrar clientes
  const filteredClientes = clientes.filter(cli =>
    cli.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cli.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cli.regiao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cli.representante_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (cli) => {
    setSelectedCliente(cli);
    setShowEditModal(true);
  };

  const handleView = (cli) => {
    setSelectedCliente(cli);
    setShowDetailsModal(true);
  };

  const handleViewPedidos = (cli) => {
    navigate(createPageUrl('Pedidos') + `?cliente=${cli.codigo}`);
  };

  const handleRefresh = () => {
    refetchClientes();
    queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    toast.success('Informações atualizadas!');
  };

  const handleInvite = async (cli) => {
    if (!cli.email) {
      toast.error('Cliente não possui email cadastrado');
      return;
    }

    try {
      await base44.users.inviteUser(cli.email, 'user');
      toast.success(`Convite enviado para ${cli.email}`);
    } catch (error) {
      toast.error('Erro ao enviar convite: ' + (error.message || 'Tente novamente'));
    }
  };

  return (
    <PermissionGuard setor="Clientes">
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
              <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
              <p className="text-slate-500">Cadastro e gestão de clientes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
            {canDo('Clientes', 'adicionar') && (
              <Button onClick={() => setShowAddModal(true)} className="gap-2">
                <UserPlus className="w-4 h-4" />
                Novo Cliente
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            title="Total Cadastrados"
            value={generalStats.total}
            icon={Building2}
            color="blue"
          />
          <StatCard
            title="Ativos (60 dias)"
            value={generalStats.ativos}
            icon={UserCheck}
            color="green"
          />
          <StatCard
            title="Inativos"
            value={generalStats.inativos}
            icon={Users}
            color="slate"
          />
          <StatCard
            title="+ R$ 30k Compras"
            value={generalStats.com30k}
            icon={TrendingUp}
            color="purple"
          />
          <StatCard
            title="Bloqueados"
            value={generalStats.bloqueados}
            icon={Ban}
            color="red"
          />
        </div>

        {/* Search and Table */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-white">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, código, região ou representante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <ClienteTable
            clientes={filteredClientes}
            stats={clienteStats}
            onEdit={handleEdit}
            onView={handleView}
            onViewPedidos={handleViewPedidos}
            onInvite={handleInvite}
            isLoading={loadingClientes}
          />
        </Card>

        {/* Add Modal */}
        <ModalContainer
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Novo Cliente"
          description="Preencha os dados para cadastrar um novo cliente"
          size="lg"
        >
          <ClienteForm
            representantes={representantes}
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
            setSelectedCliente(null);
          }}
          title="Editar Cliente"
          description="Atualize os dados do cliente"
          size="lg"
        >
          <ClienteForm
            cliente={selectedCliente}
            representantes={representantes}
            onSave={(data) => updateMutation.mutate({ id: selectedCliente.id, data })}
            onCancel={() => {
              setShowEditModal(false);
              setSelectedCliente(null);
            }}
            isLoading={updateMutation.isPending}
          />
        </ModalContainer>

        {/* Details Modal */}
        <ModalContainer
          open={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCliente(null);
          }}
          title="Detalhes do Cliente"
          size="lg"
        >
          {selectedCliente && (
            <ClienteDetails
              cliente={selectedCliente}
              stats={clienteStats[selectedCliente.codigo]}
              creditos={creditos.filter(c => c.cliente_codigo === selectedCliente.codigo)}
              onEdit={() => {
                setShowDetailsModal(false);
                setShowEditModal(true);
              }}
              onClose={() => {
                setShowDetailsModal(false);
                setSelectedCliente(null);
              }}
              onViewPedidos={() => handleViewPedidos(selectedCliente)}
            />
          )}
        </ModalContainer>
      </div>
    </div>
    </PermissionGuard>
  );
}