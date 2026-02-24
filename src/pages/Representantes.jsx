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
  UserCheck,
  ArrowLeft,
  ChevronRight,
  Filter
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import ModalContainer from "@/components/modals/ModalContainer";
import RepresentanteForm from "@/components/representantes/RepresentanteForm";
import RepresentanteTable from "@/components/representantes/RepresentanteTable";
import RepresentanteDetails from "@/components/representantes/RepresentanteDetails";
import PermissionGuard from "@/components/PermissionGuard";
import { usePermissions } from "@/components/hooks/usePermissions";
import PaginacaoTabela from "@/components/ui/PaginacaoTabela";

// --- WIDGET ESTILO IOS ---
const IOSWidget = ({ title, value, subtitle, icon: Icon, colorClass }) => (
  <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-white/50 flex flex-col justify-between h-full hover:scale-[1.02] transition-transform duration-300 ease-out">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${colorClass}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {/* Indicador visual opcional */}
      <div className="bg-slate-50 p-1.5 rounded-full">
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </div>
    </div>
    <div>
      <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
      <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wide">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>}
    </div>
  </div>
);

export default function Representantes() {
  const queryClient = useQueryClient();
  const { canDo } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRepresentante, setSelectedRepresentante] = useState(null);

  // --- QUERIES ---
  const { data: representantes = [], isLoading: loadingReps, refetch: refetchReps } = useQuery({
    queryKey: ['representantes'],
    queryFn: () => base44.entities.Representante.list()
  });

  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
  const { data: pedidos = [] } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });

  // --- CÁLCULOS (Mantidos iguais, apenas a visualização muda) ---
  const repStats = useMemo(() => {
    const stats = {};
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

    representantes.forEach(rep => {
      const repClientes = clientes.filter(c => c.representante_codigo === rep.codigo);
      const repPedidos = pedidos.filter(p => p.representante_codigo === rep.codigo && p.status !== 'cancelado');
      
      const clientesComPedidosRecentes = new Set();
      repPedidos.forEach(p => {
        if (new Date(p.data_entrega) >= thirtyDaysAgo) clientesComPedidosRecentes.add(p.cliente_codigo);
      });

      const clientesEmAtraso = new Set();
      repPedidos.forEach(p => {
        if ((p.status === 'aberto' || p.status === 'parcial') && new Date(p.data_entrega) < twentyDaysAgo) {
          clientesEmAtraso.add(p.cliente_codigo);
        }
      });

      let debitosEmDia = 0;
      let debitosAtrasados = 0;
      repPedidos.forEach(p => {
        if (p.status === 'aberto' || p.status === 'parcial') {
          const saldo = p.saldo_restante || (p.valor_pedido - (p.total_pago || 0));
          if (new Date(p.data_entrega) < twentyDaysAgo) debitosAtrasados += saldo;
          else debitosEmDia += saldo;
        }
      });

      const vendasUltimos30Dias = repPedidos
        .filter(p => new Date(p.data_entrega) >= thirtyDaysAgo)
        .reduce((sum, p) => sum + (p.valor_pedido || 0), 0);

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

  const generalStats = useMemo(() => {
    const ativos = representantes.filter(r => repStats[r.codigo]?.ativo).length;
    const com30k = representantes.filter(r => repStats[r.codigo]?.vendas30k).length;
    return { total: representantes.length, ativos, com30k };
  }, [representantes, repStats]);

  // --- MUTATIONS ---
  const createMutation = useMutation({
    mutationFn: async (data) => base44.entities.Representante.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representantes'] });
      setShowAddModal(false);
      toast.success('Representante criado com sucesso!');
    },
    onError: (error) => toast.error('Erro ao criar: ' + error.message)
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.Representante.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representantes'] });
      setShowEditModal(false);
      setSelectedRepresentante(null);
      toast.success('Atualizado com sucesso!');
    },
    onError: (error) => toast.error('Erro ao atualizar: ' + error.message)
  });

  // --- FILTROS ---
  const filteredRepresentantes = representantes.filter(rep =>
    rep.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rep.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rep.regiao?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const paginatedRepresentantes = filteredRepresentantes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleEdit = (rep) => { setSelectedRepresentante(rep); setShowEditModal(true); };
  const handleView = (rep) => { setSelectedRepresentante(rep); setShowDetailsModal(true); };
  const handleRefresh = () => {
    refetchReps();
    queryClient.invalidateQueries({ queryKey: ['clientes'] });
    queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    toast.success('Sincronizando dados...');
  };

  return (
    <PermissionGuard setor="Representantes">
      {/* Fundo estilo Apple Gray */}
      <div className="min-h-screen bg-[#F2F2F7] font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 pb-20">
        
        {/* Navbar "Frosted Glass" Fixa */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5 px-6 py-4 flex items-center justify-between transition-all">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5 w-10 h-10">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Equipe</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleRefresh} className="rounded-full hover:bg-black/5 text-slate-600">
              <RefreshCw className="w-5 h-5" />
            </Button>
            {canDo('Representantes', 'adicionar') && (
              <Button 
                onClick={() => setShowAddModal(true)} 
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 px-6 font-medium transition-all hover:scale-105 active:scale-95"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            )}
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8">
          
          {/* Título Grande Estilo iOS */}
          <div className="space-y-1 px-2">
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">Representantes</h2>
            <p className="text-lg text-slate-500 font-medium">Visão geral da performance comercial</p>
          </div>

          {/* Widgets / Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <IOSWidget 
              title="Total de Equipe" 
              value={generalStats.total} 
              subtitle="Cadastros ativos"
              icon={Users} 
              colorClass="bg-blue-500 shadow-blue-200"
            />
            <IOSWidget 
              title="Alta Performance" 
              value={generalStats.ativos} 
              subtitle="Ativos nos últimos 60 dias"
              icon={UserCheck} 
              colorClass="bg-emerald-500 shadow-emerald-200"
            />
            <IOSWidget 
              title="Vendas +30k" 
              value={generalStats.com30k} 
              subtitle="Meta mensal batida"
              icon={TrendingUp} 
              colorClass="bg-indigo-500 shadow-indigo-200"
            />
          </div>

          {/* Área Principal (Tabela) */}
          <div className="bg-white rounded-[32px] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.06)] overflow-hidden border border-black/5">
            
            {/* Toolbar da Tabela */}
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-white/50">
              <div className="relative w-full md:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  placeholder="Buscar representantes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 rounded-2xl bg-slate-100/70 border-transparent focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all text-base"
                />
              </div>
              <div className="flex gap-2">
                 <Button variant="outline" className="rounded-xl border-slate-200 text-slate-600 h-10 px-4 hover:bg-slate-50">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtrar
                 </Button>
              </div>
            </div>

            {/* A Tabela */}
            <div className="p-0">
              <RepresentanteTable
                representantes={paginatedRepresentantes}
                stats={repStats}
                onEdit={handleEdit}
                onView={handleView}
                isLoading={loadingReps}
              />
            </div>
            
            {/* Rodapé da Tabela */}
            <PaginacaoTabela
              currentPage={currentPage}
              totalItems={filteredRepresentantes.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
            />
          </div>

        </div>

        {/* MODAIS (Estilo Limpo) */}
        <ModalContainer
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Novo Representante"
          description="Preencha os dados abaixo."
        >
          <RepresentanteForm
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setShowAddModal(false)}
            isLoading={createMutation.isPending}
          />
        </ModalContainer>

        <ModalContainer
          open={showEditModal}
          onClose={() => { setShowEditModal(false); setSelectedRepresentante(null); }}
          title="Editar Representante"
          description="Altere as informações necessárias."
        >
          <RepresentanteForm
            representante={selectedRepresentante}
            onSave={(data) => updateMutation.mutate({ id: selectedRepresentante.id, data })}
            onCancel={() => { setShowEditModal(false); setSelectedRepresentante(null); }}
            isLoading={updateMutation.isPending}
          />
        </ModalContainer>

        <ModalContainer
          open={showDetailsModal}
          onClose={() => { setShowDetailsModal(false); setSelectedRepresentante(null); }}
          title="Detalhes do Perfil"
          size="lg"
        >
          {selectedRepresentante && (
            <RepresentanteDetails
              representante={selectedRepresentante}
              stats={repStats[selectedRepresentante.codigo]}
              onEdit={() => { setShowDetailsModal(false); setShowEditModal(true); }}
              onClose={() => { setShowDetailsModal(false); setSelectedRepresentante(null); }}
            />
          )}
        </ModalContainer>

      </div>
    </PermissionGuard>
  );
}