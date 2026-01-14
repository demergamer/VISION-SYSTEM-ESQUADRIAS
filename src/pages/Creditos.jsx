import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Search, 
  ArrowLeft,
  Eye,
  Wallet,
  TrendingUp,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import StatCard from "@/components/dashboard/StatCard";
import ModalContainer from "@/components/modals/ModalContainer";
import CreditoDetails from "@/components/creditos/CreditoDetails";

export default function Creditos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCredito, setSelectedCredito] = useState(null);

  const { data: creditos = [], isLoading } = useQuery({
    queryKey: ['creditos'],
    queryFn: () => base44.entities.Credito.list('-created_date')
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const stats = useMemo(() => {
    const disponiveis = creditos.filter(c => c.status === 'disponivel');
    const usados = creditos.filter(c => c.status === 'usado');
    const devolvidos = creditos.filter(c => c.status === 'devolvido');

    return {
      totalDisponivel: disponiveis.reduce((sum, c) => sum + c.valor, 0),
      totalUsado: usados.reduce((sum, c) => sum + c.valor, 0),
      totalDevolvido: devolvidos.reduce((sum, c) => sum + c.valor, 0),
      quantidade: creditos.length
    };
  }, [creditos]);

  const filteredCreditos = useMemo(() => {
    return creditos.filter(c =>
      c.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cliente_codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [creditos, searchTerm]);

  const handleView = (credito) => {
    setSelectedCredito(credito);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status) => {
    const config = {
      disponivel: { label: 'Disponível', class: 'bg-green-100 text-green-700' },
      usado: { label: 'Usado', class: 'bg-blue-100 text-blue-700' },
      devolvido: { label: 'Devolvido', class: 'bg-slate-100 text-slate-700' }
    };
    return config[status] || config.disponivel;
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
              <h1 className="text-2xl font-bold text-slate-800">Créditos de Clientes</h1>
              <p className="text-slate-500">Gestão de créditos disponíveis, usados e devolvidos</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Créditos Disponíveis"
            value={formatCurrency(stats.totalDisponivel)}
            icon={Wallet}
            color="green"
          />
          <StatCard
            title="Créditos Usados"
            value={formatCurrency(stats.totalUsado)}
            icon={CheckCircle}
            color="blue"
          />
          <StatCard
            title="Créditos Devolvidos"
            value={formatCurrency(stats.totalDevolvido)}
            icon={DollarSign}
            color="purple"
          />
          <StatCard
            title="Total de Registros"
            value={stats.quantidade}
            icon={TrendingUp}
            color="yellow"
          />
        </div>

        {/* Lista */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-white">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por cliente ou código..."
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
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Nº</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Cliente</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Código</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Valor</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Origem</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Data</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-500">
                      Carregando...
                    </td>
                  </tr>
                ) : filteredCreditos.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-500">
                      Nenhum crédito encontrado
                    </td>
                  </tr>
                ) : (
                  filteredCreditos.map((credito) => {
                    const statusConfig = getStatusBadge(credito.status);
                    return (
                      <tr key={credito.id} className="hover:bg-slate-50">
                        <td className="p-4">
                          <p className="font-bold text-slate-700">#{credito.numero_credito || '-'}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-medium">{credito.cliente_nome}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-mono text-sm">{credito.cliente_codigo}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-green-600">{formatCurrency(credito.valor)}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-slate-600 max-w-xs truncate">{credito.origem}</p>
                        </td>
                        <td className="p-4">
                          <Badge className={statusConfig.class}>
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <p className="text-sm">
                            {new Date(credito.created_date).toLocaleDateString('pt-BR')}
                          </p>
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(credito)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Details Modal */}
        <ModalContainer
          open={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCredito(null);
          }}
          title="Detalhes do Crédito"
          description="Informações completas do crédito"
        >
          {selectedCredito && (
            <CreditoDetails 
              credito={selectedCredito}
              onClose={() => {
                setShowDetailsModal(false);
                setSelectedCredito(null);
              }}
            />
          )}
        </ModalContainer>
      </div>
    </div>
  );
}