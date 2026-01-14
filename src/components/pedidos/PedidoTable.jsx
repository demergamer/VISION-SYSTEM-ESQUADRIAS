import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, DollarSign, XCircle, MapPin, Calendar, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";

export default function PedidoTable({ 
  pedidos, 
  onEdit, 
  onView,
  onLiquidar,
  onCancelar,
  onReverter,
  isLoading 
}) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getStatusBadge = (pedido) => {
    const now = new Date();
    const dataEntrega = new Date(pedido.data_entrega);
    const diasAtraso = differenceInDays(now, dataEntrega);

    switch (pedido.status) {
      case 'aguardando':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Aguardando</Badge>;
      case 'pago':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Pago</Badge>;
      case 'cancelado':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Cancelado</Badge>;
      case 'parcial':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Parcial</Badge>;
      default:
        if (diasAtraso > 20) {
          return <Badge className="bg-red-100 text-red-700 border-red-200">Atrasado ({diasAtraso}d)</Badge>;
        }
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Aberto</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!pedidos || pedidos.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        Nenhum pedido encontrado
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="font-semibold">Cód. Cliente</TableHead>
            <TableHead className="font-semibold">Cliente</TableHead>
            <TableHead className="font-semibold">Região</TableHead>
            <TableHead className="font-semibold">Data Entrega</TableHead>
            <TableHead className="font-semibold">Nº Pedido</TableHead>
            <TableHead className="font-semibold text-right">Valor</TableHead>
            <TableHead className="font-semibold text-right">Pago</TableHead>
            <TableHead className="font-semibold text-right">Saldo</TableHead>
            <TableHead className="font-semibold text-center">Status</TableHead>
            <TableHead className="font-semibold text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pedidos.map((pedido) => (
            <TableRow key={pedido.id} className="hover:bg-slate-50/50">
              <TableCell className="font-mono text-sm">{pedido.cliente_codigo}</TableCell>
              <TableCell className="font-medium">{pedido.cliente_nome}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <MapPin className="w-3.5 h-3.5" />
                  {pedido.cliente_regiao || '-'}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Calendar className="w-3.5 h-3.5" />
                  {pedido.data_entrega ? format(new Date(pedido.data_entrega), 'dd/MM/yyyy') : '-'}
                </div>
              </TableCell>
              <TableCell className="font-mono">{pedido.numero_pedido}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(pedido.valor_pedido)}
              </TableCell>
              <TableCell className="text-right font-medium text-emerald-600">
                {formatCurrency(pedido.total_pago)}
              </TableCell>
              <TableCell className="text-right font-medium text-amber-600">
                {formatCurrency(pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0)))}
              </TableCell>
              <TableCell className="text-center">
                {getStatusBadge(pedido)}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onView(pedido)}
                    className="h-8 w-8 p-0"
                    title="Ver detalhes"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {pedido.status === 'pago' && onReverter && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onReverter(pedido)}
                      className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                      title="Reverter liquidação"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                  {pedido.status !== 'pago' && pedido.status !== 'cancelado' && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(pedido)}
                        className="h-8 w-8 p-0"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onLiquidar(pedido)}
                        className="h-8 w-8 p-0 text-emerald-600"
                        title="Liquidar"
                      >
                        <DollarSign className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onCancelar(pedido)}
                        className="h-8 w-8 p-0 text-red-600"
                        title="Cancelar"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}