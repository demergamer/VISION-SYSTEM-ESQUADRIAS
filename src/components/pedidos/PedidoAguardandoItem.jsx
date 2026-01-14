import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PedidoAguardandoItem({ 
  pedido, 
  onConfirmar, 
  onCancelar,
  onCadastrarCliente 
}) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const handleConfirmar = () => {
    if (pedido.cliente_pendente) {
      if (onCadastrarCliente) {
        onCadastrarCliente(pedido);
      } else {
        alert('Cliente não cadastrado. Cadastre o cliente primeiro.');
      }
      return;
    }
    onConfirmar(pedido);
  };

  const handleCancelar = () => {
    if (pedido.cliente_pendente) {
      alert('Cliente não cadastrado. Cadastre o cliente primeiro para cancelar o pedido.');
      return;
    }
    onCancelar(pedido);
  };

  return (
    <Card className={cn(
      "p-4",
      pedido.cliente_pendente && "bg-amber-50 border-amber-200"
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 grid grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-slate-500">Nº Pedido</p>
            <p className="font-mono text-sm font-medium">{pedido.numero_pedido}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Cliente</p>
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{pedido.cliente_nome}</p>
              {pedido.cliente_pendente && (
                <Badge 
                  variant="outline" 
                  className="bg-amber-50 text-amber-600 border-amber-200 text-xs cursor-pointer hover:bg-amber-100"
                  onClick={() => onCadastrarCliente(pedido)}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Cadastrar
                </Badge>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500">Código Cliente</p>
            <p className="text-sm">{pedido.cliente_codigo || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Data Entrega</p>
            <p className="text-sm">
              {pedido.data_entrega ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR') : '-'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Valor</p>
            <p className="font-bold text-sm">{formatCurrency(pedido.valor_pedido)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
            onClick={handleConfirmar}
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirmar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            onClick={handleCancelar}
          >
            <XCircle className="w-4 h-4" />
            Cancelar
          </Button>
        </div>
      </div>
    </Card>
  );
}