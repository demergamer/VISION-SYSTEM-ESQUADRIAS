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
    // Adicionando correção de fuso horário simples se necessário, ou apenas formatando
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = () => {
    const badges = {
      'pago': { text: 'Pago', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      'parcial': { text: 'Parcial', color: 'bg-amber-100 text-amber-700 border-amber-200' },
      'aberto': { text: 'Aberto', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      'aguardando': { text: 'Aguardando', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      'cancelado': { text: 'Cancelado', color: 'bg-slate-100 text-slate-700 border-slate-200' }
    };
    const badge = badges[pedido.status] || badges.aberto;
    return <Badge variant="outline" className={`${badge.color} px-3 py-1 text-xs font-semibold rounded-full border`}>{badge.text}</Badge>;
  };

  // Calcular desconto dado (se houver)
  // Assumindo que: Valor Original = Saldo + Pago + Desconto
  // Logo: Desconto = Valor Original - Saldo - Pago
  const descontoCalculado = (pedido.valor_pedido || 0) - (pedido.saldo_restante || 0) - (pedido.total_pago || 0);
  // Pequena margem para erro de ponto flutuante
  const temDesconto = descontoCalculado > 0.05; 

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{pedido.cliente_nome}</h2>
            <p className="text-slate-500 text-sm font-medium">Pedido #{pedido.numero_pedido}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Info Grid - Layout similar à imagem fornecida */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Região */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <MapPin className="w-3.5 h-3.5" />
            Região
          </div>
          <p className="font-bold text-slate-800 text-base">{pedido.cliente_regiao || 'N/A'}</p>
        </div>

        {/* Data de Entrega */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5" />
            Data de Entrega
          </div>
          <p className="font-bold text-slate-800 text-base">{formatDate(pedido.data_entrega)}</p>
        </div>

        {/* Representante */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <User className="w-3.5 h-3.5" />
            Representante
          </div>
          <p className="font-bold text-slate-800 text-base truncate" title={pedido.representante_nome}>
            {pedido.representante_nome || 'N/A'}
          </p>
        </div>

        {/* Comissão */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Comissão
          </div>
          <p className="font-bold text-slate-800 text-base">{pedido.porcentagem_comissao || 0}%</p>
        </div>

        {/* Código Cliente */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <FileText className="w-3.5 h-3.5" />
            Código Cliente
          </div>
          <p className="font-bold text-slate-800 text-base">{pedido.cliente_codigo || 'N/A'}</p>
        </div>

        {/* Data Pagamento (Condicional) */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5" />
            Data Pagamento
          </div>
          <p className="font-bold text-slate-800 text-base">{pedido.data_pagamento ? formatDate(pedido.data_pagamento) : '-'}</p>
        </div>
      </div>

      {/* Financial Cards (Coloridos) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {/* Valor do Pedido - Azul */}
        <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">
            <CreditCard className="w-4 h-4" />
            Valor do Pedido
          </div>
          <p className="text-2xl font-extrabold text-blue-700 relative z-10">
            {formatCurrency(pedido.valor_pedido)}
          </p>
          {/* Decoração de fundo opcional */}
          <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-blue-100/50 to-transparent -skew-x-12 transform translate-x-4" />
        </div>

        {/* Total Pago - Verde */}
        <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">
            <DollarSign className="w-4 h-4" />
            Total Pago
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 relative z-10">
            {formatCurrency(pedido.total_pago || 0)}
          </p>
          <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-emerald-100/50 to-transparent -skew-x-12 transform translate-x-4" />
        </div>

        {/* Saldo Restante - Cinza ou Amarelo se > 0 */}
        <div className={`p-5 rounded-2xl shadow-sm relative overflow-hidden border ${
          pedido.saldo_restante > 0 
            ? 'bg-amber-50 border-amber-100' 
            : 'bg-slate-50 border-slate-100'
        }`}>
          <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2 relative z-10 ${
            pedido.saldo_restante > 0 ? 'text-amber-600' : 'text-slate-500'
          }`}>
            <BarChart3 className="w-4 h-4" />
            Saldo Restante
          </div>
          <p className={`text-2xl font-extrabold relative z-10 ${
            pedido.saldo_restante > 0 ? 'text-amber-700' : 'text-slate-700'
          }`}>
            {formatCurrency(pedido.saldo_restante || 0)}
          </p>
          {pedido.saldo_restante > 0 && (
             <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-amber-100/50 to-transparent -skew-x-12 transform translate-x-4" />
          )}
        </div>
      </div>

      {/* Card de Desconto (Se houver) */}
      {temDesconto && (
        <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl shadow-sm flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                 <Percent className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                 <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Desconto Aplicado</p>
                 <p className="text-sm text-orange-800 opacity-80">Valor abatido do total original</p>
              </div>
           </div>
           <p className="text-xl font-bold text-orange-700">{formatCurrency(descontoCalculado)}</p>
        </div>
      )}

      {/* Outras Informações (Full Width) */}
      {(pedido.observacao || pedido.outras_informacoes) && (
        <div className="space-y-4 pt-2">
          {pedido.outras_informacoes && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Outras Informações / Histórico</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed font-mono bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                {pedido.outras_informacoes}
              </p>
            </div>
          )}
          
          {pedido.observacao && (
            <div className="bg-yellow-50/50 border border-yellow-100 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-yellow-700 mb-2 uppercase tracking-wide flex items-center gap-2">
                 <FileText className="w-4 h-4" /> Observação do Pedido
              </h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed italic">
                "{pedido.observacao}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}