import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  RefreshCw,
  DollarSign,
  AlertTriangle,
  FileText,
  ArrowLeft,
  Filter
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import StatCard from "@/components/dashboard/StatCard";
import ModalContainer from "@/components/modals/ModalContainer";
import PedidoForm from "@/components/pedidos/PedidoForm";
import PedidoTable from "@/components/pedidos/PedidoTable";
import LiquidacaoForm from "@/components/pedidos/LiquidacaoForm";

export default function Pedidos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLiquidarModal, setShowLiquidarModal] = useState(false);
  const [showCancelarDialog, setShowCancelarDialog] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);

  // Get URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const clienteCodigo = urlParams.get('cliente');
    if (clienteCodigo) {
      setSearchTerm(clienteCodigo);
    }
  }, []);

  // Fetch data
  const { data: pedidos = [], isLoading: loadingPedidos, refetch: refetchPedidos } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list()
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  // Estatísticas
  const stats = useMemo(() => {
    const now = new Date();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    
    const pedidosAbertos = pedidos.filter(p => p.status === 'aberto' || p.status === 'parcial');
    const pedidosAtrasados = pedidosAbertos.filter(p => new Date(p.data_entrega) < twentyDaysAgo);
    
    const totalAReceber = pedidosAbertos.reduce((sum, p) => 
      sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0
    );
    
    const totalAtrasado = pedidosAtrasados.reduce((sum, p) => 
      sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0
    );

    return {
      abertos: pedidosAbertos.length,
      atrasados: pedidosAtrasados.length,
      totalAReceber,
      totalAtrasado
    };
  }, [pedidos]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Pedido.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      setShowAddModal(false);
      toast.success('Pedido cadastrado com sucesso!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Pedido.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      setShowEditModal(false);
      setShowLiquidarModal(false);
      setSelectedPedido(null);
      toast.success('Pedido atualizado com sucesso!');
    }
  });

  const cancelarMutation = useMutation({
    mutationFn: (id) => base44.entities.Pedido.update(id, { status: 'cancelado' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      setShowCancelarDialog(false);
      setSelectedPedido(null);
      toast.success('Pedido cancelado!');
    }
  });

  // Filtrar pedidos
  const filteredPedidos = useMemo(() => {
    return pedidos.filter(pedido => {
      const matchSearch = 
        pedido.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.cliente_codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.numero_pedido?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === 'todos' || pedido.status === statusFilter;
      
      return matchSearch && matchStatus;
    });
  }, [pedidos, searchTerm, statusFilter]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const handleEdit = (pedido) => {
    setSelectedPedido(pedido);
    setShowEditModal(true);
  };

  const handleView = (pedido) => {
    setSelectedPedido(pedido);
    setShowEditModal(true);
  };

  const handleLiquidar = (pedido) => {
    setSelectedPedido(pedido);
    setShowLiquidarModal(true);
  };

  const handleCancelar = (pedido) => {
    setSelectedPedido(pedido);
    setShowCancelarDialog(true);
  };

  const handleRefresh = () => {
    refetchPedidos();
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
              <h1 className="text-2xl font-bold text-slate-800">Pedidos a Receber</h1>
              <p className="text-slate-500">Gerenciamento de pedidos e recebimentos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Pedido
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total a Receber"
            value={formatCurrency(stats.totalAReceber)}
            icon={DollarSign}
            color="blue"
          />
          <StatCard
            title="Em Atraso"
            value={formatCurrency(stats.totalAtrasado)}
            icon={AlertTriangle}
            color="red"
          />
          <StatCard
            title="Pedidos Abertos"
            value={stats.abertos}
            icon={FileText}
            color="purple"
          />
          <StatCard
            title="Pedidos Atrasados"
            value={stats.atrasados}
            icon={AlertTriangle}
            color="red"
          />
        </div>

        {/* Filters and Table */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-white flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por cliente ou número do pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aberto">Abertos</SelectItem>
                  <SelectItem value="parcial">Parciais</SelectItem>
                  <SelectItem value="pago">Pagos</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <PedidoTable
            pedidos={filteredPedidos}
            onEdit={handleEdit}
            onView={handleView}
            onLiquidar={handleLiquidar}
            onCancelar={handleCancelar}
            isLoading={loadingPedidos}
          />
        </Card>

        {/* Add Modal */}
        <ModalContainer
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Novo Pedido"
          description="Cadastre um novo pedido a receber"
          size="lg"
        >
          <PedidoForm
            clientes={clientes}
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
            setSelectedPedido(null);
          }}
          title="Editar Pedido"
          description="Atualize os dados do pedido"
          size="lg"
        >
          <PedidoForm
            pedido={selectedPedido}
            clientes={clientes}
            onSave={(data) => updateMutation.mutate({ id: selectedPedido.id, data })}
            onCancel={() => {
              setShowEditModal(false);
              setSelectedPedido(null);
            }}
            isLoading={updateMutation.isPending}
          />
        </ModalContainer>

        {/* Liquidar Modal */}
        <ModalContainer
          open={showLiquidarModal}
          onClose={() => {
            setShowLiquidarModal(false);
            setSelectedPedido(null);
          }}
          title="Liquidação de Pedido"
          description="Registre o pagamento do pedido"
        >
          {selectedPedido && (
            <LiquidacaoForm
              pedido={selectedPedido}
              onSave={(data) => updateMutation.mutate({ id: selectedPedido.id, data })}
              onCancel={() => {
                setShowLiquidarModal(false);
                setSelectedPedido(null);
              }}
              isLoading={updateMutation.isPending}
            />
          )}
        </ModalContainer>

        {/* Cancelar Dialog */}
        <AlertDialog open={showCancelarDialog} onOpenChange={setShowCancelarDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar Pedido?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja cancelar o pedido {selectedPedido?.numero_pedido}? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Não, manter</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => cancelarMutation.mutate(selectedPedido.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Sim, cancelar pedido
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}