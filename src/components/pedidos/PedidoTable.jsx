import React from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, DollarSign, XCircle, MapPin, Calendar, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { usePermissions } from "@/components/UserNotRegisteredError";

export default function PedidoTable({ 
  pedidos, 
  onEdit, 
  onView,
  onLiquidar,
  onCancelar,
  onReverter,
  isLoading,
  showBorderoRef = false
}) {
  const { canDo } = usePermissions();
  
  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const getStatusBadge = (pedido) => {
    const now = new Date();
    const dataEntrega = new Date(pedido.data_entrega);
    const diasAtraso = differenceInDays(now, dataEntrega);

    switch (pedido.status) {
      case 'aguardando':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200 shadow-sm">🚚 Em Trânsito</Badge>;
      case 'pago':
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200 shadow-sm">Liquidado</Badge>;
      case 'cancelado':
        return <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300">Cancelado</Badge>;
      case 'parcial':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200 shadow-sm">Parcial</Badge>;
      default: // aberto
        if (diasAtraso > 20) {
          return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 shadow-sm">Atrasado ({diasAtraso}d)</Badge>;
        }
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200 shadow-sm">Aberto</Badge>;
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;
  if (!pedidos || pedidos.length === 0) return <div className="text-center py-20 text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">Nenhum pedido encontrado</div>;

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
      <div className="overflow-x-auto max-h-[600px]">
        <Table>
          <TableHeader className="bg-slate-100 sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[100px] font-bold text-slate-700">Nº Pedido</TableHead>
              <TableHead className="min-w-[200px] font-bold text-slate-700">Cliente / Região</TableHead>
              <TableHead className="font-bold text-slate-700">Entrega</TableHead>
              {showBorderoRef && <TableHead className="font-bold text-center text-slate-700">Borderô</TableHead>}
              <TableHead className="text-right font-bold text-slate-700">Valor Total</TableHead>
              <TableHead className="text-right font-bold text-slate-700">Pago</TableHead>
              <TableHead className="text-right font-bold text-slate-700">Saldo</TableHead>
              <TableHead className="text-center font-bold text-slate-700">Status</TableHead>
              <TableHead className="text-center font-bold text-slate-700 w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedidos.map((pedido) => (
              <TableRow key={pedido.id} className="hover:bg-blue-50/30 transition-colors border-b border-slate-100 last:border-0 group">
                <TableCell className="font-mono font-medium text-slate-700">{pedido.numero_pedido}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 line-clamp-1" title={pedido.cliente_nome}>{pedido.cliente_nome}</span>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                        <span className="font-mono">{pedido.cliente_codigo}</span>
                        {pedido.cliente_regiao && (
                            <>
                                <span className="text-slate-300">•</span>
                                <MapPin className="w-3 h-3" /> {pedido.cliente_regiao}
                            </>
                        )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {pedido.data_entrega ? format(new Date(pedido.data_entrega), 'dd/MM/yyyy') : '-'}
                    </div>
                </TableCell>
                {showBorderoRef && (
                  <TableCell className="text-center">
                    {pedido.bordero_numero ? (
                      <Badge variant="outline" className="font-mono text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50">#{pedido.bordero_numero}</Badge>
                    ) : <span className="text-slate-300">-</span>}
                  </TableCell>
                )}
                <TableCell className="text-right font-medium text-slate-700">{formatCurrency(pedido.valor_pedido)}</TableCell>
                <TableCell className="text-right text-emerald-600">{pedido.total_pago > 0 ? formatCurrency(pedido.total_pago) : '-'}</TableCell>
                <TableCell className="text-right">
                    <span className={cn("font-bold", (pedido.saldo_restante || 0) > 0 ? "text-amber-600" : "text-slate-400")}>
                        {formatCurrency(pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0)))}
                    </span>
                </TableCell>
                <TableCell className="text-center">{getStatusBadge(pedido)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    {canDo('Pedidos', 'visualizar') && (
                      <Button size="sm" variant="ghost" onClick={() => onView(pedido)} className="h-8 w-8 p-0 rounded-full hover:bg-blue-100 hover:text-blue-600" title="Ver detalhes">
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {pedido.status === 'pago' && onReverter && canDo('Pedidos', 'liquidar') && (
                      <Button size="sm" variant="ghost" onClick={() => onReverter(pedido)} className="h-8 w-8 p-0 rounded-full hover:bg-amber-100 hover:text-amber-600" title="Reverter liquidação">
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                    {pedido.status !== 'pago' && pedido.status !== 'cancelado' && (
                      <>
                        {canDo('Pedidos', 'editar') && (
                          <Button size="sm" variant="ghost" onClick={() => onEdit(pedido)} className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 hover:text-slate-800" title="Editar">
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {canDo('Pedidos', 'liquidar') && (
                          <Button size="sm" variant="ghost" onClick={() => onLiquidar(pedido)} className="h-8 w-8 p-0 rounded-full hover:bg-emerald-100 hover:text-emerald-600" title="Liquidar">
                            <DollarSign className="w-4 h-4" />
                          </Button>
                        )}
                        {canDo('Pedidos', 'editar') && (
                          <Button size="sm" variant="ghost" onClick={() => onCancelar(pedido)} className="h-8 w-8 p-0 rounded-full hover:bg-red-100 hover:text-red-600" title="Cancelar">
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}