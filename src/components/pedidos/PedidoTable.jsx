import React from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Edit, Trash2, Eye, DollarSign, RotateCcw, 
  ArrowUpDown, ArrowUp, ArrowDown, X 
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

// Componente auxiliar para Cabeçalho Ordenável
const SortableHead = ({ label, sortKey, currentSort, onSort, className }) => {
  const isActive = currentSort?.key === sortKey;
  const DirectionIcon = isActive 
    ? (currentSort.direction === 'asc' ? ArrowUp : ArrowDown) 
    : ArrowUpDown;

  return (
    <TableHead 
      className={cn("cursor-pointer hover:bg-slate-50 transition-colors select-none group", className)} 
      onClick={() => onSort && onSort(sortKey)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <DirectionIcon className={cn(
          "w-3.5 h-3.5 transition-opacity",
          isActive ? "text-blue-600 opacity-100" : "text-slate-400 opacity-0 group-hover:opacity-50"
        )} />
      </div>
    </TableHead>
  );
};

export default function PedidoTable({ 
  pedidos = [], 
  onEdit, 
  onView, 
  onLiquidar, 
  onCancelar, 
  onReverter,
  isLoading,
  showBorderoRef = false,
  sortConfig = { key: null, direction: null }, // Novo Prop
  onSort // Novo Prop
}) {
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const getStatusBadge = (pedido) => {
    if (pedido.status === 'pago') return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Liquidado</Badge>;
    if (pedido.status === 'cancelado') return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200">Cancelado</Badge>;
    if (pedido.status === 'aguardando') return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Em Trânsito</Badge>;
    
    // Aberto/Parcial com verificação de atraso
    const dias = pedido.data_entrega ? differenceInDays(new Date(), new Date(pedido.data_entrega)) : 0;
    const label = pedido.status === 'parcial' ? 'Parcial' : 'Aberto';
    
    if (dias > 0) {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">{label} ({dias}d atraso)</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">{label}</Badge>;
  };

  if (isLoading) {
    return <div className="py-10 text-center text-slate-500">Carregando pedidos...</div>;
  }

  if (pedidos.length === 0) {
    return <div className="py-10 text-center text-slate-500 border rounded-lg bg-slate-50">Nenhum pedido encontrado com os filtros atuais.</div>;
  }

  return (
    <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/80">
          <TableRow>
            <SortableHead label="Nº Pedido" sortKey="numero_pedido" currentSort={sortConfig} onSort={onSort} className="w-[100px]" />
            <SortableHead label="Cliente / Região" sortKey="cliente_nome" currentSort={sortConfig} onSort={onSort} />
            <SortableHead label="Entrega" sortKey="data_entrega" currentSort={sortConfig} onSort={onSort} />
            <SortableHead label="Valor Total" sortKey="valor_pedido" currentSort={sortConfig} onSort={onSort} className="text-right justify-end" />
            <SortableHead label="Pago" sortKey="total_pago" currentSort={sortConfig} onSort={onSort} className="text-right justify-end hidden md:table-cell" />
            <SortableHead label="Saldo" sortKey="saldo_restante" currentSort={sortConfig} onSort={onSort} className="text-right justify-end" />
            <TableHead className="text-center w-[120px]">Status</TableHead>
            <TableHead className="text-right w-[140px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pedidos.map((pedido) => (
            <TableRow key={pedido.id} className="hover:bg-slate-50/50 transition-colors">
              <TableCell className="font-mono font-medium text-slate-700">#{pedido.numero_pedido}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-slate-800 line-clamp-1">{pedido.cliente_nome}</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    {pedido.cliente_regiao || 'Sem região'} 
                    {showBorderoRef && pedido.bordero_numero && <span className="text-emerald-600 font-mono ml-1">• BORD #{pedido.bordero_numero}</span>}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-slate-600">
                {pedido.data_entrega ? format(new Date(pedido.data_entrega), 'dd/MM/yyyy') : '-'}
              </TableCell>
              <TableCell className="text-right font-medium text-slate-700">
                {formatCurrency(pedido.valor_pedido)}
              </TableCell>
              <TableCell className="text-right text-slate-500 hidden md:table-cell">
                {pedido.total_pago > 0 ? <span className="text-emerald-600">{formatCurrency(pedido.total_pago)}</span> : '-'}
              </TableCell>
              <TableCell className="text-right font-bold text-slate-800">
                <span className={cn(
                  pedido.saldo_restante > 0 ? "text-amber-600" : "text-emerald-600"
                )}>
                  {formatCurrency(pedido.saldo_restante !== undefined ? pedido.saldo_restante : (pedido.valor_pedido - pedido.total_pago))}
                </span>
              </TableCell>
              <TableCell className="text-center">
                {getStatusBadge(pedido)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => onView(pedido)} title="Ver Detalhes">
                    <Eye className="w-4 h-4" />
                  </Button>
                  
                  {pedido.status === 'pago' && onReverter && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-amber-600" onClick={() => onReverter(pedido)} title="Reverter">
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}

                  {pedido.status !== 'pago' && pedido.status !== 'cancelado' && (
                    <>
                      {onEdit && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => onEdit(pedido)} title="Editar">
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {onLiquidar && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600" onClick={() => onLiquidar(pedido)} title="Liquidar">
                          <DollarSign className="w-4 h-4" />
                        </Button>
                      )}
                      {onCancelar && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => onCancelar(pedido)} title="Cancelar">
                          <X className="w-4 h-4" /> { /* XIcon foi importado como X no PedidoTable se necessário, aqui usei a convenção simples */ }
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
  );
}