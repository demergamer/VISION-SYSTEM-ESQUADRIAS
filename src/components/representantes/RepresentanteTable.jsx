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
import { Edit, Eye, Phone, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/components/hooks/usePermissions";

export default function RepresentanteTable({ 
  representantes, 
  stats,
  onEdit, 
  onView,
  isLoading 
}) {
  const { canDo } = usePermissions();
  
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

  if (!representantes || representantes.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        Nenhum representante cadastrado
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
            <TableHead className="font-semibold">Telefone</TableHead>
            <TableHead className="font-semibold text-center">Clientes</TableHead>
            <TableHead className="font-semibold text-center">Ativos</TableHead>
            <TableHead className="font-semibold text-center">Inativos</TableHead>
            <TableHead className="font-semibold text-center">Em Atraso</TableHead>
            <TableHead className="font-semibold text-right">Débitos em Dia</TableHead>
            <TableHead className="font-semibold text-right">Débitos Atrasados</TableHead>
            <TableHead className="font-semibold text-center">Status</TableHead>
            <TableHead className="font-semibold text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {representantes.map((rep) => {
            const repStats = stats[rep.codigo] || {
              totalClientes: 0,
              clientesAtivos: 0,
              clientesInativos: 0,
              clientesEmAtraso: 0,
              debitosEmDia: 0,
              debitosAtrasados: 0,
              vendas30k: false,
              ativo: false,
              devedor: false
            };

            return (
              <TableRow key={rep.id} className="hover:bg-slate-50/50">
                <TableCell className="font-mono text-sm">{rep.codigo}</TableCell>
                <TableCell className="font-medium">{rep.nome}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <MapPin className="w-3.5 h-3.5" />
                    {rep.regiao || '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5" />
                    {rep.telefone || '-'}
                  </div>
                </TableCell>
                <TableCell className="text-center">{repStats.totalClientes}</TableCell>
                <TableCell className="text-center">
                  <span className="text-emerald-600 font-medium">{repStats.clientesAtivos}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-slate-500">{repStats.clientesInativos}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={cn(
                    "font-medium",
                    repStats.clientesEmAtraso > 0 ? "text-red-600" : "text-slate-400"
                  )}>
                    {repStats.clientesEmAtraso}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium text-emerald-600">
                  {formatCurrency(repStats.debitosEmDia)}
                </TableCell>
                <TableCell className="text-right font-medium text-red-600">
                  {formatCurrency(repStats.debitosAtrasados)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 justify-center">
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      rep.bloqueado ? "bg-red-50 text-red-600 border-red-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"
                    )}>
                      {rep.bloqueado ? 'Bloqueado' : 'Liberado'}
                    </Badge>
                    {repStats.vendas30k && (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                        +30k
                      </Badge>
                    )}
                    {repStats.ativo && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                        Ativo
                      </Badge>
                    )}
                    {repStats.devedor && (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                        Devedor
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    {canDo('Representantes', 'visualizar') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onView(rep)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {canDo('Representantes', 'editar') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(rep)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
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