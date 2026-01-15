import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Phone, 
  User, 
  TrendingUp, 
  CreditCard, 
  DollarSign, 
  Package, 
  Calendar,
  FileText,
  BarChart3,
  X,
  Percent
} from "lucide-react";

export default function PedidoDetails({ pedido, onClose }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = () => {
    const badges = {
      'pago': { text: 'Pago', color: 'bg-green-100 text-green-700 border-green-200' },
      'parcial': { text: 'Parcial', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      'aberto': { text: 'Aberto', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      'aguardando': { text: 'Aguardando', color: 'bg-amber-100 text-amber-700 border-amber-200' },
      'cancelado': { text: 'Cancelado', color: 'bg-slate-100 text-slate-700 border-slate-200' }
    };
    const badge = badges[pedido.status] || badges.aberto;
    return <Badge className={`${badge.color} border`}>{badge.text}</Badge>;
  };

  // Calcular desconto dado (se houver)
  const descontoCalculado = pedido.valor_pedido - pedido.saldo_restante - (pedido.total_pago || 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{pedido.cliente_nome}</h2>
            <p className="text-slate-500 text-sm">Pedido #{pedido.numero_pedido}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Região */}
        <Card className="p-3 bg-white hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <MapPin className="w-3 h-3" />
            <span className="uppercase">Região</span>
          </div>
          <p className="font-semibold text-slate-800">{pedido.cliente_regiao || 'N/A'}</p>
        </Card>

        {/* Data de Entrega */}
        <Card className="p-3 bg-white hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Calendar className="w-3 h-3" />
            <span className="uppercase">Data de Entrega</span>
          </div>
          <p className="font-semibold text-slate-800">{formatDate(pedido.data_entrega)}</p>
        </Card>

        {/* Representante */}
        <Card className="p-3 bg-white hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <User className="w-3 h-3" />
            <span className="uppercase">Representante</span>
          </div>
          <p className="font-semibold text-slate-800">{pedido.representante_nome || 'N/A'}</p>
        </Card>

        {/* Comissão */}
        <Card className="p-3 bg-white hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <TrendingUp className="w-3 h-3" />
            <span className="uppercase">Comissão</span>
          </div>
          <p className="font-semibold text-slate-800">{pedido.porcentagem_comissao || 0}%</p>
        </Card>

        {/* Código Cliente */}
        <Card className="p-3 bg-white hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <FileText className="w-3 h-3" />
            <span className="uppercase">Código Cliente</span>
          </div>
          <p className="font-semibold text-slate-800">{pedido.cliente_codigo || 'N/A'}</p>
        </Card>

        {/* Data Pagamento */}
        {pedido.data_pagamento && (
          <Card className="p-3 bg-white hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Calendar className="w-3 h-3" />
              <span className="uppercase">Data Pagamento</span>
            </div>
            <p className="font-semibold text-slate-800">{formatDate(pedido.data_pagamento)}</p>
          </Card>
        )}
      </div>

      {/* Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        {/* Valor do Pedido */}
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-2 text-blue-600 text-xs mb-2">
            <CreditCard className="w-4 h-4" />
            <span className="uppercase font-medium">Valor do Pedido</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">
            {formatCurrency(pedido.valor_pedido)}
          </p>
        </Card>

        {/* Total Pago */}
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-2 text-green-600 text-xs mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="uppercase font-medium">Total Pago</span>
          </div>
          <p className="text-2xl font-bold text-green-700">
            {formatCurrency(pedido.total_pago || 0)}
          </p>
        </Card>

        {/* Desconto Dado */}
        {descontoCalculado > 0.01 && (
          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center gap-2 text-orange-600 text-xs mb-2">
              <Percent className="w-4 h-4" />
              <span className="uppercase font-medium">Desconto Dado</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">
              {formatCurrency(descontoCalculado)}
            </p>
          </Card>
        )}

        {/* Saldo Restante */}
        <Card className={`p-4 bg-gradient-to-br ${
          pedido.saldo_restante > 0 
            ? 'from-amber-50 to-amber-100 border-amber-200' 
            : 'from-slate-50 to-slate-100 border-slate-200'
        }`}>
          <div className={`flex items-center gap-2 text-xs mb-2 ${
            pedido.saldo_restante > 0 ? 'text-amber-600' : 'text-slate-600'
          }`}>
            <BarChart3 className="w-4 h-4" />
            <span className="uppercase font-medium">Saldo Restante</span>
          </div>
          <p className={`text-2xl font-bold ${
            pedido.saldo_restante > 0 ? 'text-amber-700' : 'text-slate-700'
          }`}>
            {formatCurrency(pedido.saldo_restante || 0)}
          </p>
        </Card>
      </div>

      {/* Observações */}
      {(pedido.observacao || pedido.outras_informacoes) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {pedido.observacao && (
            <Card className="p-4 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Observação</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{pedido.observacao}</p>
            </Card>
          )}
          {pedido.outras_informacoes && (
            <Card className="p-4 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Outras Informações</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{pedido.outras_informacoes}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}