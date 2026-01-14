import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Phone, 
  MapPin, 
  User,
  Percent,
  Calendar,
  CreditCard,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Edit,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function ClienteDetails({ cliente, stats, creditos, onEdit, onClose, onViewPedidos }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const cliStats = stats || {
    totalPedidosAbertos: 0,
    totalChequesVencer: 0,
    bloqueadoAuto: false,
    compras30k: false,
    ativo: false
  };

  const isBloqueado = cliente.bloqueado_manual || cliStats.bloqueadoAuto;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{cliente.nome}</h2>
            <p className="text-slate-500 font-mono">{cliente.codigo}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className={cn(
            "text-sm px-3 py-1",
            isBloqueado 
              ? "bg-red-50 text-red-600 border-red-200" 
              : "bg-emerald-50 text-emerald-600 border-emerald-200"
          )}>
            {isBloqueado ? 'Bloqueado' : 'Liberado'}
          </Badge>
          {cliStats.ativo && (
            <Badge variant="outline" className="text-sm px-3 py-1 bg-blue-50 text-blue-600 border-blue-200">
              Ativo
            </Badge>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 uppercase">Região</p>
              <p className="font-medium text-slate-800">{cliente.regiao || 'Não informada'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 uppercase">Telefone</p>
              <p className="font-medium text-slate-800">{cliente.telefone || 'Não informado'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 uppercase">Representante</p>
              <p className="font-medium text-slate-800">{cliente.representante_nome || cliente.representante_codigo}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <Percent className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 uppercase">Comissão</p>
              <p className="font-medium text-slate-800">{cliente.porcentagem_comissao || 5}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 uppercase">Score</p>
              <p className="font-medium text-slate-800">{cliente.score || 'Não consultado'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 uppercase">Última Consulta</p>
              <p className="font-medium text-slate-800">
                {cliente.data_consulta ? format(new Date(cliente.data_consulta), 'dd/MM/yyyy') : 'Nunca'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-blue-100 bg-blue-50/30">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-700 font-medium">Limite de Crédito</p>
          </div>
          <p className="text-3xl font-bold text-blue-700">{formatCurrency(cliente.limite_credito)}</p>
        </Card>
        <Card className="p-5 border-amber-100 bg-amber-50/30">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingCart className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-700 font-medium">Pedidos em Aberto</p>
          </div>
          <p className="text-3xl font-bold text-amber-700">{formatCurrency(cliStats.totalPedidosAbertos)}</p>
        </Card>
        <Card className="p-5 border-purple-100 bg-purple-50/30">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-purple-700 font-medium">Cheques a Vencer</p>
          </div>
          <p className="text-3xl font-bold text-purple-700">{formatCurrency(cliStats.totalChequesVencer)}</p>
        </Card>
        <Card className="p-5 border-green-100 bg-green-50/30">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-700 font-medium">Créditos Disponíveis</p>
          </div>
          <p className="text-3xl font-bold text-green-700">
            {formatCurrency((creditos || []).reduce((sum, c) => c.status === 'disponivel' ? sum + c.valor : sum, 0))}
          </p>
        </Card>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {cliStats.compras30k && (
          <Badge className="bg-purple-100 text-purple-700 border-purple-200">
            Mais de R$ 30.000 em compras
          </Badge>
        )}
        {cliStats.bloqueadoAuto && (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            Bloqueado automaticamente
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          <X className="w-4 h-4 mr-2" />
          Fechar
        </Button>
        <Button variant="outline" onClick={onViewPedidos}>
          <ShoppingCart className="w-4 h-4 mr-2" />
          Ver Pedidos
        </Button>
        <Button onClick={onEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Editar Cliente
        </Button>
      </div>
    </div>
  );
}