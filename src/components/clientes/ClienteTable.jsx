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
import { Edit, Eye, Phone, MapPin, User, ShoppingCart, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ClienteTable({ 
  clientes, 
  stats,
  onEdit, 
  onView,
  onViewPedidos,
  onInvite,
  isLoading 
}) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!clientes || clientes.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        Nenhum cliente cadastrado
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="font-semibold">Código</TableHead>
            <TableHead className="font-semibold">Nome</TableHead>
            <TableHead className="font-semibold">Região</TableHead>
            <TableHead className="font-semibold">Representante</TableHead>
            <TableHead className="font-semibold text-center">Comissão</TableHead>
            <TableHead className="font-semibold">Telefone</TableHead>
            <TableHead className="font-semibold text-center">Score</TableHead>
            <TableHead className="font-semibold text-right">Limite</TableHead>
            <TableHead className="font-semibold text-right">Pedidos Abertos</TableHead>
            <TableHead className="font-semibold text-right">Cheques a Vencer</TableHead>
            <TableHead className="font-semibold text-center">Status</TableHead>
            <TableHead className="font-semibold text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map((cli) => {
            const cliStats = stats[cli.codigo] || {
              totalPedidosAbertos: 0,
              totalChequesVencer: 0,
              bloqueadoAuto: false,
              compras30k: false,
              ativo: false
            };

            const isBloqueado = cli.bloqueado_manual || cliStats.bloqueadoAuto;

            return (
              <TableRow key={cli.id} className="hover:bg-slate-50/50">
                <TableCell className="font-mono text-sm">{cli.codigo}</TableCell>
                <TableCell className="font-medium">{cli.nome}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <MapPin className="w-3.5 h-3.5" />
                    {cli.regiao || '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <User className="w-3.5 h-3.5" />
                    {cli.representante_nome || cli.representante_codigo || '-'}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {cli.porcentagem_comissao || 5}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5" />
                    {cli.telefone || '-'}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-medium">{cli.score || '-'}</span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(cli.limite_credito)}
                </TableCell>
                <TableCell className="text-right font-medium text-amber-600">
                  {formatCurrency(cliStats.totalPedidosAbertos)}
                </TableCell>
                <TableCell className="text-right font-medium text-purple-600">
                  {formatCurrency(cliStats.totalChequesVencer)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 justify-center">
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      isBloqueado 
                        ? "bg-red-50 text-red-600 border-red-200" 
                        : "bg-emerald-50 text-emerald-600 border-emerald-200"
                    )}>
                      {isBloqueado ? 'Bloqueado' : 'Liberado'}
                    </Badge>
                    {cliStats.compras30k && (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                        +30k
                      </Badge>
                    )}
                    {cliStats.ativo && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                        Ativo
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onView(cli)}
                      className="h-8 w-8 p-0"
                      title="Ver detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(cli)}
                      className="h-8 w-8 p-0"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewPedidos(cli)}
                      className="h-8 w-8 p-0"
                      title="Ver pedidos"
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onInvite(cli)}
                      className="h-8 w-8 p-0"
                      title="Convidar para o portal"
                      disabled={!cli.email}
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}