import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Filter,
  Upload,
  Truck,
  Clock,
  CheckCircle,
  XCircle
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
import ImportarPedidos from "@/components/pedidos/ImportarPedidos";
import RotasList from "@/components/pedidos/RotasList";
import RotaChecklist from "@/components/pedidos/RotaChecklist";
import AlterarPortadorModal from "@/components/pedidos/AlterarPortadorModal";
import ClienteForm from "@/components/clientes/ClienteForm";
import CancelarPedidoModal from "@/components/pedidos/CancelarPedidoModal";
import LiquidacaoMassa from "@/components/pedidos/LiquidacaoMassa";
import PedidoAguardandoItem from "@/components/pedidos/PedidoAguardandoItem";

export default function Pedidos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [activeTab, setActiveTab] = useState('abertos');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLiquidarModal, setShowLiquidarModal] = useState(false);
  const [showCancelarDialog, setShowCancelarDialog] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRotaModal, setShowRotaModal] = useState(false);
  const [showAlterarPortadorModal, setShowAlterarPortadorModal] = useState(false);
  const [showCadastrarClienteModal, setShowCadastrarClienteModal] = useState(false);
  const [showCancelarPedidoModal, setShowCancelarPedidoModal] = useState(false);
  const [showLiquidacaoMassaModal, setShowLiquidacaoMassaModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [selectedRota, setSelectedRota] = useState(null);
  const [pedidoParaCadastro, setPedidoParaCadastro] = useState(null);
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState(null);

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

  const { data: rotas = [], isLoading: loadingRotas, refetch: refetchRotas } = useQuery({
    queryKey: ['rotas'],
    queryFn: () => base44.entities.RotaImportada.list('-created_date')
  });

  const { data: representantes = [] } = useQuery({
    queryKey: ['representantes'],
    queryFn: () => base44.entities.Representante.list()
  });

  // Estatísticas
  const stats = useMemo(() => {
    const now = new Date();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    
    const aguardando = pedidos.filter(p => p.status === 'aguardando');
    const abertos = pedidos.filter(p => p.status === 'aberto' || p.status === 'parcial');
    const pagos = pedidos.filter(p => p.status === 'pago');
    const cancelados = pedidos.filter(p => p.status === 'cancelado');
    const atrasados = abertos.filter(p => new Date(p.data_entrega) < twentyDaysAgo);
    
    const totalAReceber = abertos.reduce((sum, p) => 
      sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0
    );
    
    const totalAtrasado = atrasados.reduce((sum, p) => 
      sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0
    );

    return {
      aguardando: aguardando.length,
      abertos: abertos.length,
      pagos: pagos.length,
      cancelados: cancelados.length,
      atrasados: atrasados.length,
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

  // Filtrar pedidos por aba e busca
  const filteredPedidos = useMemo(() => {
    let filtered = pedidos;

    // Filtrar por aba
    switch (activeTab) {
      case 'aguardando':
        filtered = filtered.filter(p => p.status === 'aguardando');
        break;
      case 'abertos':
        filtered = filtered.filter(p => p.status === 'aberto' || p.status === 'parcial');
        break;
      case 'pagos':
        filtered = filtered.filter(p => p.status === 'pago');
        break;
      case 'cancelados':
        filtered = filtered.filter(p => p.status === 'cancelado');
        break;
    }

    // Filtrar por busca
    if (searchTerm) {
      filtered = filtered.filter(pedido =>
        pedido.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.cliente_codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.numero_pedido?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [pedidos, activeTab, searchTerm]);

  // Pedidos da rota selecionada
  const pedidosDaRota = useMemo(() => {
    if (!selectedRota) return [];
    return pedidos.filter(p => p.rota_importada_id === selectedRota.id);
  }, [pedidos, selectedRota]);

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
    // Usar modal de cancelamento com motivo
    setPedidoParaCancelar(pedido);
    setShowCancelarPedidoModal(true);
  };

  const handleRefresh = () => {
    refetchPedidos();
    refetchRotas();
    toast.success('Informações atualizadas!');
  };

  const handleImportComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    queryClient.invalidateQueries({ queryKey: ['rotas'] });
    setShowImportModal(false);
    toast.success('Pedidos importados com sucesso!');
  };

  const handleSelectRota = async (rota) => {
    try {
      // Buscar todos os pedidos da rota
      const pedidosDaRotaAtual = pedidos.filter(p => p.rota_importada_id === rota.id);
      const pedidosPendentes = pedidosDaRotaAtual.filter(p => p.cliente_pendente);
      
      let atualizados = 0;
      
      // Verificar e atualizar pedidos com clientes que foram cadastrados
      for (const pedido of pedidosPendentes) {
        // Procurar cliente cadastrado com nome similar (normalizar strings)
        const nomeClientePedido = pedido.cliente_nome?.toLowerCase().trim() || '';
        
        const clienteEncontrado = clientes.find(c => {
          const nomeCliente = c.nome?.toLowerCase().trim() || '';
          // Verificar se os nomes são iguais ou se um contém o outro
          return nomeCliente === nomeClientePedido || 
                 nomeCliente.includes(nomeClientePedido) || 
                 nomeClientePedido.includes(nomeCliente);
        });
        
        if (clienteEncontrado) {
          // Atualizar pedido vinculando ao cliente
          await base44.entities.Pedido.update(pedido.id, {
            cliente_codigo: clienteEncontrado.codigo,
            cliente_regiao: clienteEncontrado.regiao,
            representante_codigo: clienteEncontrado.representante_codigo,
            representante_nome: clienteEncontrado.representante_nome,
            porcentagem_comissao: clienteEncontrado.porcentagem_comissao,
            cliente_pendente: false
          });
          atualizados++;
        }
      }
      
      // Atualizar lista de pedidos se houver atualizações
      if (atualizados > 0) {
        await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        toast.success(`${atualizados} pedido(s) vinculado(s) automaticamente!`);
      }
      
      setSelectedRota(rota);
      setShowRotaModal(true);
    } catch (error) {
      console.error('Erro ao verificar pedidos:', error);
      setSelectedRota(rota);
      setShowRotaModal(true);
    }
  };

  const handleSaveRotaChecklist = async ({ rota: rotaData, pedidos: pedidosData }) => {
    try {
      // Atualizar rota
      await base44.entities.RotaImportada.update(selectedRota.id, rotaData);
      
      // Atualizar pedidos
      for (const pedido of pedidosData) {
        await base44.entities.Pedido.update(pedido.id, {
          confirmado_entrega: pedido.confirmado_entrega,
          status: pedido.status
        });
      }

      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['rotas'] });
      setShowRotaModal(false);
      setSelectedRota(null);
      toast.success('Rota atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar alterações');
    }
  };

  const handleAlterarPortador = (rota) => {
    setSelectedRota(rota);
    setShowAlterarPortadorModal(true);
  };

  const handleSaveAlterarPortador = async (motorista) => {
    try {
      await base44.entities.RotaImportada.update(selectedRota.id, motorista);
      queryClient.invalidateQueries({ queryKey: ['rotas'] });
      setShowAlterarPortadorModal(false);
      setSelectedRota(null);
      toast.success('Portador alterado e PDF gerado!');
    } catch (error) {
      toast.error('Erro ao alterar portador');
    }
  };

  const handleCadastrarCliente = (pedido) => {
    setPedidoParaCadastro(pedido);
    setShowCadastrarClienteModal(true);
  };

  const handleSaveNovoCliente = async (clienteData) => {
    try {
      const novoCliente = await base44.entities.Cliente.create(clienteData);
      
      // Normalizar nome do cliente para comparação
      const nomeNovoCliente = clienteData.nome?.toLowerCase().trim() || '';
      
      // Buscar TODOS os pedidos com o mesmo nome de cliente (comparação mais precisa)
      const pedidosComMesmoCliente = pedidos.filter(p => {
        const nomePedido = p.cliente_nome?.toLowerCase().trim() || '';
        return nomePedido === nomeNovoCliente || 
               nomePedido.includes(nomeNovoCliente) || 
               nomeNovoCliente.includes(nomePedido);
      });
      
      // Atualizar todos os pedidos desse cliente
      for (const pedido of pedidosComMesmoCliente) {
        const updateData = {
          cliente_codigo: novoCliente.codigo,
          cliente_regiao: novoCliente.regiao,
          representante_codigo: novoCliente.representante_codigo,
          representante_nome: novoCliente.representante_nome,
          porcentagem_comissao: novoCliente.porcentagem_comissao,
          cliente_pendente: false
        };
        
        // Se for o pedido que estava sendo cadastrado, confirmar também
        if (pedidoParaCadastro && pedido.id === pedidoParaCadastro.id) {
          updateData.confirmado_entrega = true;
          updateData.status = 'aberto';
        }
        
        await base44.entities.Pedido.update(pedido.id, updateData);
      }

      await queryClient.invalidateQueries({ queryKey: ['clientes'] });
      await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      setShowCadastrarClienteModal(false);
      setPedidoParaCadastro(null);
      toast.success(`Cliente cadastrado! ${pedidosComMesmoCliente.length} pedido(s) vinculado(s) e desbloqueado(s).`);
    } catch (error) {
      console.error('Erro ao cadastrar cliente:', error);
      toast.error('Erro ao cadastrar cliente');
    }
  };

  const handleCancelarPedidoRota = (pedido) => {
    setPedidoParaCancelar(pedido);
    setShowCancelarPedidoModal(true);
  };

  const handleSaveCancelarPedido = async (data) => {
    try {
      await base44.entities.Pedido.update(pedidoParaCancelar.id, data);
      await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      await queryClient.invalidateQueries({ queryKey: ['rotas'] });
      setShowCancelarPedidoModal(false);
      setPedidoParaCancelar(null);
      toast.success('Pedido cancelado com sucesso!');
    } catch (error) {
      toast.error('Erro ao cancelar pedido');
    }
  };

  const handleConfirmarAguardando = async (pedido) => {
    try {
      await base44.entities.Pedido.update(pedido.id, {
        confirmado_entrega: true,
        status: 'aberto'
      });
      await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      await queryClient.invalidateQueries({ queryKey: ['rotas'] });
      toast.success('Pedido confirmado!');
    } catch (error) {
      toast.error('Erro ao confirmar pedido');
    }
  };

  const handleLiquidacaoMassa = async (data) => {
    try {
      const hoje = new Date();
      const mesAno = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

      // Calcular quanto pagar por pedido proporcionalmente
      const totalSaldos = data.pedidos.reduce((sum, p) => sum + p.saldo_original, 0);
      const valorTotalPago = data.totalPago;

      for (const pedidoData of data.pedidos) {
        const pedido = pedidos.find(p => p.id === pedidoData.id);
        if (!pedido) continue;

        const proporcao = pedidoData.saldo_original / totalSaldos;
        const valorPagoPedido = valorTotalPago * proporcao;

        const novoTotalPago = (pedido.total_pago || 0) + valorPagoPedido;
        const novoSaldo = pedido.valor_pedido - novoTotalPago;

        let novoStatus = 'aberto';
        if (novoSaldo <= 0.01) {
          novoStatus = 'pago';
        } else if (novoTotalPago > 0) {
          novoStatus = 'parcial';
        }

        await base44.entities.Pedido.update(pedido.id, {
          total_pago: novoTotalPago,
          saldo_restante: Math.max(0, novoSaldo),
          status: novoStatus,
          ...(novoStatus === 'pago' && {
            data_pagamento: hoje.toISOString().split('T')[0],
            mes_pagamento: mesAno
          })
        });
      }

      // Se gerou crédito, criar registro
      if (data.credito > 0) {
        await base44.entities.Credito.create({
          cliente_codigo: data.pedidos[0]?.cliente_codigo || pedidos.find(p => p.id === data.pedidos[0].id)?.cliente_codigo,
          cliente_nome: pedidos.find(p => p.id === data.pedidos[0].id)?.cliente_nome,
          valor: data.credito,
          origem: `Liquidação em massa - Pagamento excedente de ${data.pedidos.length} pedido(s)`,
          pedido_origem_id: data.pedidos.map(p => p.id).join(', '),
          status: 'disponivel'
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      await queryClient.invalidateQueries({ queryKey: ['creditos'] });
      setShowLiquidacaoMassaModal(false);
      
      if (data.credito > 0) {
        toast.success(`Liquidação concluída! Crédito de ${formatCurrency(data.credito)} registrado.`);
      } else {
        toast.success(`${data.pedidos.length} pedido(s) liquidado(s) com sucesso!`);
      }
    } catch (error) {
      console.error('Erro na liquidação:', error);
      toast.error('Erro ao processar liquidação em massa');
    }
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
              <h1 className="text-2xl font-bold text-slate-800">Pedidos</h1>
              <p className="text-slate-500">Gerenciamento completo de pedidos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)} className="gap-2">
              <Upload className="w-4 h-4" />
              Importar
            </Button>
            <Button variant="outline" onClick={() => setShowLiquidacaoMassaModal(true)} className="gap-2">
              <DollarSign className="w-4 h-4" />
              Liquidação em Massa
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
            title="Aguardando Confirmação"
            value={stats.aguardando}
            icon={Clock}
            color="yellow"
          />
          <StatCard
            title="Pedidos Abertos"
            value={stats.abertos}
            icon={FileText}
            color="purple"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="aguardando" className="gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Aguardando</span>
              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">
                {stats.aguardando}
              </span>
            </TabsTrigger>
            <TabsTrigger value="abertos" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Abertos</span>
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                {stats.abertos}
              </span>
            </TabsTrigger>
            <TabsTrigger value="pagos" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Pagos</span>
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs">
                {stats.pagos}
              </span>
            </TabsTrigger>
            <TabsTrigger value="cancelados" className="gap-2">
              <XCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Cancelados</span>
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs">
                {stats.cancelados}
              </span>
            </TabsTrigger>
            <TabsTrigger value="rotas" className="gap-2">
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline">Rotas</span>
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">
                {rotas.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Rotas */}
          <TabsContent value="rotas" className="mt-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Rotas Importadas</h2>
                <Button onClick={() => setShowImportModal(true)} className="gap-2">
                  <Upload className="w-4 h-4" />
                  Importar Planilha
                </Button>
              </div>
              <RotasList 
                rotas={rotas} 
                onSelectRota={handleSelectRota}
                onAlterarPortador={handleAlterarPortador}
                isLoading={loadingRotas}
              />
            </Card>
          </TabsContent>

          {/* Tab: Aguardando */}
          <TabsContent value="aguardando" className="mt-6">
            <Card className="overflow-hidden">
              <div className="p-4 border-b bg-white">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por cliente ou número do pedido..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="p-6 space-y-3">
                {filteredPedidos.length > 0 ? (
                  filteredPedidos.map((pedido) => (
                    <PedidoAguardandoItem
                      key={pedido.id}
                      pedido={pedido}
                      onConfirmar={handleConfirmarAguardando}
                      onCancelar={(p) => {
                        setPedidoParaCancelar(p);
                        setShowCancelarPedidoModal(true);
                      }}
                      onCadastrarCliente={handleCadastrarCliente}
                    />
                  ))
                ) : (
                  <p className="text-center text-slate-500 py-8">Nenhum pedido aguardando confirmação</p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Tab: Pedidos (outras abas) */}
          {['abertos', 'pagos', 'cancelados'].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-6">
              <Card className="overflow-hidden">
                <div className="p-4 border-b bg-white">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Buscar por cliente ou número do pedido..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
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
            </TabsContent>
          ))}
        </Tabs>

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

        {/* Import Modal */}
        <ModalContainer
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Importar Pedidos"
          description="Importe pedidos de uma planilha Excel"
          size="lg"
        >
          <ImportarPedidos
            clientes={clientes}
            rotas={rotas}
            onImportComplete={handleImportComplete}
            onCancel={() => setShowImportModal(false)}
          />
        </ModalContainer>

        {/* Rota Checklist Modal */}
        <ModalContainer
          open={showRotaModal}
          onClose={() => {
            setShowRotaModal(false);
            setSelectedRota(null);
          }}
          title="Checklist da Rota"
          description="Confirme os pedidos entregues"
          size="lg"
        >
          {selectedRota && (
            <RotaChecklist
              rota={selectedRota}
              pedidos={pedidosDaRota}
              onSave={handleSaveRotaChecklist}
              onCadastrarCliente={handleCadastrarCliente}
              onCancelarPedido={handleCancelarPedidoRota}
              onCancel={() => {
                setShowRotaModal(false);
                setSelectedRota(null);
              }}
            />
          )}
        </ModalContainer>

        {/* Alterar Portador Modal */}
        <ModalContainer
          open={showAlterarPortadorModal}
          onClose={() => {
            setShowAlterarPortadorModal(false);
            setSelectedRota(null);
          }}
          title="Alterar Portador da Rota"
          description="Gere um relatório PDF e altere o motorista responsável"
          size="lg"
        >
          {selectedRota && (
            <AlterarPortadorModal
              rota={selectedRota}
              pedidos={pedidosDaRota}
              onSave={handleSaveAlterarPortador}
              onCancel={() => {
                setShowAlterarPortadorModal(false);
                setSelectedRota(null);
              }}
            />
          )}
        </ModalContainer>

        {/* Cadastrar Cliente Modal */}
        <ModalContainer
          open={showCadastrarClienteModal}
          onClose={() => {
            setShowCadastrarClienteModal(false);
            setPedidoParaCadastro(null);
          }}
          title="Cadastrar Cliente Pendente"
          description={`Cliente: ${pedidoParaCadastro?.cliente_nome || ''}`}
          size="lg"
        >
          <ClienteForm
            cliente={pedidoParaCadastro ? { nome: pedidoParaCadastro.cliente_nome } : null}
            representantes={representantes}
            onSave={handleSaveNovoCliente}
            onCancel={() => {
              setShowCadastrarClienteModal(false);
              setPedidoParaCadastro(null);
            }}
          />
        </ModalContainer>

        {/* Cancelar Pedido Modal */}
        <ModalContainer
          open={showCancelarPedidoModal}
          onClose={() => {
            setShowCancelarPedidoModal(false);
            setPedidoParaCancelar(null);
          }}
          title="Cancelar Pedido"
          description="Informe o motivo do cancelamento"
        >
          {pedidoParaCancelar && (
            <CancelarPedidoModal
              pedido={pedidoParaCancelar}
              onSave={handleSaveCancelarPedido}
              onCancel={() => {
                setShowCancelarPedidoModal(false);
                setPedidoParaCancelar(null);
              }}
            />
          )}
        </ModalContainer>

        {/* Liquidação em Massa Modal */}
        <ModalContainer
          open={showLiquidacaoMassaModal}
          onClose={() => setShowLiquidacaoMassaModal(false)}
          title="Liquidação em Massa"
          description="Selecione e liquide múltiplos pedidos de uma vez"
          size="xl"
        >
          <LiquidacaoMassa
            pedidos={pedidos}
            onSave={handleLiquidacaoMassa}
            onCancel={() => setShowLiquidacaoMassaModal(false)}
          />
        </ModalContainer>
      </div>
    </div>
  );
}