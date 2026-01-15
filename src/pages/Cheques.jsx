import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Search, 
  ArrowLeft,
  Plus,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import StatCard from "@/components/dashboard/StatCard";
import ModalContainer from "@/components/modals/ModalContainer";
import ChequeForm from "@/components/cheques/ChequeForm";
import ChequeDetails from "@/components/cheques/ChequeDetails";

export default function Cheques() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCheque, setSelectedCheque] = useState(null);

  const { data: cheques = [], isLoading } = useQuery({
    queryKey: ['cheques'],
    queryFn: () => base44.entities.Cheque.list('-data_vencimento')
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Cheque.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques'] });
      setShowAddModal(false);
      toast.success('Cheque cadastrado!');
    },
    onError: (error) => {
      toast.error('Erro ao cadastrar: ' + (error.message || 'Tente novamente'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cheque.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques'] });
      setShowEditModal(false);
      setSelectedCheque(null);
      toast.success('Cheque atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + (error.message || 'Tente novamente'));
    }
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const stats = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Normais são os que não foram devolvidos nem pagos
    const normais = cheques.filter(c => c.status === 'normal');
    const devolvidos = cheques.filter(c => c.status === 'devolvido');
    const pagos = cheques.filter(c => c.status === 'pago');
    
    // A vencer: cheques normais com vencimento futuro
    const aVencer = normais.filter(c => {
      const venc = new Date(c.data_vencimento);
      venc.setHours(0, 0, 0, 0);
      return venc >= hoje;
    });
    
    // Compensados: cheques normais com vencimento passado (automático)
    const compensados = normais.filter(c => {
      const venc = new Date(c.data_vencimento);
      venc.setHours(0, 0, 0, 0);
      return venc < hoje;
    });

    return {
      totalPendentes: normais.reduce((sum, c) => sum + c.valor, 0),
      quantidadePendentes: normais.length,
      totalAVencer: aVencer.reduce((sum, c) => sum + c.valor, 0),
      totalCompensados: compensados.reduce((sum, c) => sum + c.valor, 0),
      totalDevolvidos: devolvidos.reduce((sum, c) => sum + c.valor, 0),
      totalPagos: pagos.reduce((sum, c) => sum + c.valor, 0)
    };
  }, [cheques]);

  const filteredCheques = useMemo(() => {
    return cheques.filter(c =>
      c.numero_cheque?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.emitente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.banco?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [cheques, searchTerm]);

  const getStatusBadge = (status) => {
    const config = {
      normal: { label: 'Normal', class: 'bg-blue-100 text-blue-700', icon: Clock },
      devolvido: { label: 'Devolvido', class: 'bg-red-100 text-red-700', icon: XCircle },
      pago: { label: 'Pago', class: 'bg-green-100 text-green-700', icon: CheckCircle }
    };
    return config[status] || config.normal;
  };

  const handleView = (cheque) => {
    setSelectedCheque(cheque);
    setShowDetailsModal(true);
  };

  const handleEdit = (cheque) => {
    setSelectedCheque(cheque);
    setShowEditModal(true);
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
              <h1 className="text-2xl font-bold text-slate-800">Cheques</h1>
              <p className="text-slate-500">Controle de cheques recebidos</p>
            </div>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Cheque
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            title="Normais"
            value={formatCurrency(stats.totalPendentes)}
            subtitle={`${stats.quantidadePendentes} cheque(s)`}
            icon={Clock}
            color="blue"
          />
          <StatCard
            title="A Vencer"
            value={formatCurrency(stats.totalAVencer)}
            icon={CreditCard}
            color="yellow"
          />
          <StatCard
            title="Compensados"
            value={formatCurrency(stats.totalCompensados)}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Devolvidos"
            value={formatCurrency(stats.totalDevolvidos)}
            icon={XCircle}
            color="red"
          />
          <StatCard
            title="Pagos"
            value={formatCurrency(stats.totalPagos)}
            icon={CheckCircle}
            color="purple"
          />
        </div>

        {/* Lista */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-white">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por número, cliente, emitente ou banco..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Nº Cheque</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Banco</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Cliente</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Valor</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Vencimento</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Status</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500">
                      Carregando...
                    </td>
                  </tr>
                ) : filteredCheques.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500">
                      Nenhum cheque encontrado
                    </td>
                  </tr>
                ) : (
                  filteredCheques.map((cheque) => {
                    const statusConfig = getStatusBadge(cheque.status);
                    const StatusIcon = statusConfig.icon;
                    const vencido = cheque.status === 'normal' && new Date(cheque.data_vencimento) < new Date();
                    
                    return (
                      <tr key={cheque.id} className="hover:bg-slate-50">
                        <td className="p-4">
                          <p className="font-mono font-medium">{cheque.numero_cheque}</p>
                          {cheque.cheque_substituto_numero && (
                            <p className="text-xs text-blue-600">Substituído por: {cheque.cheque_substituto_numero}</p>
                          )}
                          {cheque.cheque_substituido_numero && (
                            <p className="text-xs text-purple-600">Substituição de: {cheque.cheque_substituido_numero}</p>
                          )}
                        </td>
                        <td className="p-4">
                          <p className="text-sm">{cheque.banco}</p>
                          <p className="text-xs text-slate-500">{cheque.agencia}/{cheque.conta}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-medium">{cheque.cliente_nome || cheque.emitente}</p>
                          {cheque.cliente_codigo && (
                            <p className="text-xs text-slate-500 font-mono">{cheque.cliente_codigo}</p>
                          )}
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-green-600">{formatCurrency(cheque.valor)}</p>
                        </td>
                        <td className="p-4">
                          <p className={vencido ? 'text-red-600 font-medium' : ''}>
                            {new Date(cheque.data_vencimento).toLocaleDateString('pt-BR')}
                          </p>
                          {vencido && <p className="text-xs text-red-600">Vencido</p>}
                        </td>
                        <td className="p-4">
                          <Badge className={statusConfig.class}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleView(cheque)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(cheque)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Add Modal */}
        <ModalContainer
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Novo Cheque"
          description="Preencha os dados do cheque recebido"
          size="lg"
        >
          <ChequeForm
            clientes={clientes}
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setShowAddModal(false)}
          />
        </ModalContainer>

        {/* Edit Modal */}
        <ModalContainer
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCheque(null);
          }}
          title="Editar Cheque"
          description="Atualize os dados do cheque"
          size="lg"
        >
          {selectedCheque && (
            <ChequeForm
              cheque={selectedCheque}
              clientes={clientes}
              onSave={(data) => updateMutation.mutate({ id: selectedCheque.id, data })}
              onCancel={() => {
                setShowEditModal(false);
                setSelectedCheque(null);
              }}
            />
          )}
        </ModalContainer>

        {/* Details Modal */}
        <ModalContainer
          open={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCheque(null);
          }}
          title="Detalhes do Cheque"
          size="lg"
        >
          {selectedCheque && (
            <ChequeDetails
              cheque={selectedCheque}
              onEdit={() => {
                setShowDetailsModal(false);
                setShowEditModal(true);
              }}
              onClose={() => {
                setShowDetailsModal(false);
                setSelectedCheque(null);
              }}
            />
          )}
        </ModalContainer>
      </div>
    </div>
  );
}