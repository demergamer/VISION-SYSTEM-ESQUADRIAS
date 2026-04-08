import React from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Edit, Eye, DollarSign, RotateCcw, Truck,
  ArrowUpDown, ArrowUp, ArrowDown, X, MoreHorizontal, RepeatIcon, UserCheck,
  AlertTriangle, Package
} from "lucide-react";

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const SortableHead = ({ label, sortKey, currentSort, onSort, className }) => {
  const isActive = currentSort?.key === sortKey;
  const DirectionIcon = isActive 
    ? (currentSort.direction === 'asc' ? ArrowUp : ArrowDown) 
    : ArrowUpDown;

  const isRight = className?.includes('text-right');

  return (
    <TableHead 
      className={cn("cursor-pointer hover:bg-slate-50 transition-colors select-none group", className)} 
      onClick={() => onSort && onSort(sortKey)}
    >
      <div className={cn("flex items-center gap-1.5", isRight && "justify-end")}>
        {label}
        <DirectionIcon className={cn(
          "w-3.5 h-3.5 transition-opacity",
          isActive ? "text-blue-600 opacity-100" : "text-slate-400 opacity-0 group-hover:opacity-50"
        )} />
      </div>
    </TableHead>
  );
};

// dateMode: 'entrega' (padrão) | 'importado' | 'entregue' | 'pagamento' | 'data_entrega'
export default function PedidoTable({ 
  pedidos = [], 
  onEdit, 
  onView, 
  onLiquidar, 
  onCancelar, 
  onReverter,
  onMudarStatus,
  onEntregarManual,
  onCadastrarCliente,
  onConfirmarEntrega,
  isLoading,
  showBorderoRef = false,
  dateMode = 'entrega',
  isTransito = false,
  sortConfig = { key: null, direction: null }, 
  onSort 
}) {
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const getDateLabel = () => {
    if (dateMode === 'importado') return 'Importado';
    if (dateMode === 'entregue') return 'Data Entregue';
    if (dateMode === 'pagamento') return 'Data Pagamento';
    return 'Entrega';
  };

  const getDateValue = (pedido) => {
    let val;
    if (dateMode === 'importado') val = pedido.data_importado;
    else if (dateMode === 'entregue') val = pedido.data_entregue || pedido.data_entrega;
    else if (dateMode === 'pagamento') val = pedido.data_pagamento;
    else val = pedido.data_entrega;
    if (!val) return '-';
    const d = new Date(val);
    return isNaN(d.getTime()) ? '-' : format(d, 'dd/MM/yyyy');
  };

  const getTotalItens = (pedido) => {
    if (!Array.isArray(pedido.itens_pedido) || pedido.itens_pedido.length === 0) return null;
    const total = pedido.itens_pedido.reduce((s, item) => s + (parseFloat(item.quantidade) || 0), 0);
    return total > 0 ? total : null;
  };

  const getStatusBadge = (pedido) => {
    if (pedido.status === 'pago') return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Liquidado</Badge>;
    if (pedido.status === 'cancelado') return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200">Cancelado</Badge>;
    if (pedido.status === 'aguardando') return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Em Trânsito</Badge>;
    if (pedido.status === 'troca') return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">Troca</Badge>;
    if (pedido.status === 'representante_recebe') return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">Rep. Recebe</Badge>;
    
    const now = new Date();
    now.setHours(0,0,0,0);
    const dataRef = pedido.data_entrega ? parseISO(pedido.data_entrega) : new Date();
    const dias = differenceInDays(now, dataRef);
    const label = pedido.status === 'parcial' ? 'Parcial' : 'Aberto';
    
    if (dias > 15) { 
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
            <SortableHead label={getDateLabel()} sortKey="data_entrega" currentSort={sortConfig} onSort={onSort} />
            {dateMode === 'importado' && <TableHead className="text-center w-[80px]">Peças</TableHead>}
            <SortableHead label="Valor Total" sortKey="valor_pedido" currentSort={sortConfig} onSort={onSort} className="text-right" />
            <SortableHead label="Pago" sortKey="total_pago" currentSort={sortConfig} onSort={onSort} className="text-right hidden md:table-cell" />
            <SortableHead label="Saldo" sortKey="saldo_restante" currentSort={sortConfig} onSort={onSort} className="text-right" />
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
              <TableCell className="text-sm text-slate-600">{getDateValue(pedido)}</TableCell>
              {dateMode === 'importado' && (
                <TableCell className="text-center">
                  {getTotalItens(pedido) !== null ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      <Package className="w-3 h-3" />{getTotalItens(pedido)}
                    </span>
                  ) : <span className="text-slate-300">—</span>}
                </TableCell>
              )}
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
                {/* ── MODO TRÂNSITO: botão de ticagem em destaque ── */}
                {isTransito && !pedido.cliente_pendente ? (
                  <div className="flex items-center justify-end gap-1">
                    {onConfirmarEntrega && (
                      <Button
                        size="sm"
                        className="h-9 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        onClick={() => onConfirmarEntrega(pedido)}
                      >
                        ✔ TICAR
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[99999]">
                        <DropdownMenuLabel>Mais ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onView(pedido)} className="gap-2 cursor-pointer">
                          <Eye className="w-4 h-4 text-blue-500" /> Ver Detalhes
                        </DropdownMenuItem>
                        {onCancelar && (
                          <DropdownMenuItem onClick={() => onCancelar(pedido)} className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                            <X className="w-4 h-4" /> Cancelar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                <div className="flex items-center justify-end gap-1">
                  
                  {pedido.cliente_pendente && onCadastrarCliente ? (
                    <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white px-2 gap-1" onClick={() => onCadastrarCliente(pedido)} title="Cadastrar Cliente">
                      <AlertTriangle className="w-3 h-3" /> Cadastrar
                    </Button>
                  ) : (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => onView(pedido)} title="Ver Detalhes">
                    <Eye className="w-4 h-4" />
                  </Button>
                  )}

                  {!pedido.cliente_pendente && <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700" title="Mais ações">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[99999]">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      {pedido.status !== 'pago' && pedido.status !== 'cancelado' && onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(pedido)} className="gap-2 cursor-pointer">
                          <Edit className="w-4 h-4 text-blue-500" /> Editar
                        </DropdownMenuItem>
                      )}
                      {pedido.status !== 'pago' && pedido.status !== 'cancelado' && onLiquidar && (
                        <DropdownMenuItem onClick={() => onLiquidar(pedido)} className="gap-2 cursor-pointer">
                          <DollarSign className="w-4 h-4 text-emerald-500" /> Liquidar
                        </DropdownMenuItem>
                      )}
                      {pedido.status !== 'pago' && pedido.status !== 'cancelado' && onCancelar && (
                        <DropdownMenuItem onClick={() => onCancelar(pedido)} className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                          <X className="w-4 h-4" /> Cancelar
                        </DropdownMenuItem>
                      )}

                      {onEntregarManual && (
                        <DropdownMenuItem onClick={() => onEntregarManual(pedido)} className="gap-2 cursor-pointer">
                          <Truck className="w-4 h-4 text-emerald-500" /> Entregar Manualmente
                        </DropdownMenuItem>
                      )}

                      {pedido.status === 'pago' && onReverter && (
                        <DropdownMenuItem onClick={() => onReverter(pedido)} className="gap-2 cursor-pointer">
                          <RotateCcw className="w-4 h-4 text-amber-500" /> Reverter
                        </DropdownMenuItem>
                      )}

                      {onMudarStatus && pedido.status !== 'pago' && pedido.status !== 'cancelado' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs text-slate-400">Alterar Natureza</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onMudarStatus(pedido, 'troca')} className="gap-2 cursor-pointer">
                            <RepeatIcon className="w-4 h-4 text-orange-500" /> Pedido de Troca
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onMudarStatus(pedido, 'representante_recebe')} className="gap-2 cursor-pointer">
                            <UserCheck className="w-4 h-4 text-purple-500" /> Representante Recebe
                          </DropdownMenuItem>
                          {(pedido.status === 'troca' || pedido.status === 'representante_recebe') && (
                            <DropdownMenuItem onClick={() => onMudarStatus(pedido, 'aberto')} className="gap-2 text-slate-600 cursor-pointer">
                              <X className="w-4 h-4" /> Reverter para Aberto
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>}
                </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}