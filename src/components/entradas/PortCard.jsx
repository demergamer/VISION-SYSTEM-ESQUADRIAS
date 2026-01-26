import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Hash, User, ShoppingCart, DollarSign, Eye, RefreshCcw, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig = {
  aguardando_vinculo: { label: 'Aguardando Vínculo', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  em_separacao: { label: 'Em Separação', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  aguardando_liquidacao: { label: 'Aguardando Liquidação', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  parcialmente_usado: { label: 'Parcialmente Usado', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  finalizado: { label: 'Finalizado', color: 'bg-green-100 text-green-700 border-green-300' },
  devolvido: { label: 'Devolvido', color: 'bg-red-100 text-red-700 border-red-300' }
};

export default function PortCard({ port, onDetalhes, onDevolver }) {
  const config = statusConfig[port.status] || statusConfig.aguardando_vinculo;
  const qtdVinculados = port.itens_port?.filter(i => i.vinculado).length || 0;
  const qtdTotal = port.itens_port?.length || 0;

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-slate-500" />
            <span className="font-bold text-xl text-slate-800">PORT {port.numero_port}</span>
          </div>
          <Badge className={cn("border", config.color)}>
            {config.label}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-700">{port.cliente_nome}</span>
          </div>

          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">
              {qtdTotal} pedido(s): {port.itens_port?.map(i => i.numero_pedido_manual).join(', ')}
            </span>
          </div>

          {qtdVinculados > 0 && (
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600 font-medium">
                {qtdVinculados}/{qtdTotal} vinculado(s)
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-emerald-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(port.valor_total_sinal)}
            </span>
          </div>

          {port.saldo_disponivel !== port.valor_total_sinal && (
            <div className="text-xs text-slate-500 ml-6">
              Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(port.saldo_disponivel)}
            </div>
          )}

          <div className="text-xs text-slate-500">
            {port.forma_pagamento?.tipo || '-'} | {new Date(port.data_entrada || port.created_date).toLocaleDateString('pt-BR')}
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onDetalhes(port)}>
            <Eye className="w-4 h-4 mr-2" />
            Detalhes
          </Button>
          {port.status !== 'devolvido' && port.status !== 'finalizado' && (
            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => onDevolver(port)}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Devolver
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}