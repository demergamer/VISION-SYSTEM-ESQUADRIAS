import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  User,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function RotasList({ rotas, onSelectRota, isLoading }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getStatusConfig = (status, confirmados, total) => {
    if (status === 'concluida' || (confirmados === total && total > 0)) {
      return {
        label: 'Concluída',
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        bgCard: 'border-l-4 border-l-emerald-500',
        icon: CheckCircle2,
        iconColor: 'text-emerald-600'
      };
    }
    if (status === 'parcial' || (confirmados > 0 && confirmados < total)) {
      return {
        label: 'Parcial',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        bgCard: 'border-l-4 border-l-amber-500',
        icon: Clock,
        iconColor: 'text-amber-600'
      };
    }
    return {
      label: 'Pendente',
      color: 'bg-red-100 text-red-700 border-red-200',
      bgCard: 'border-l-4 border-l-red-500',
      icon: AlertCircle,
      iconColor: 'text-red-600'
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!rotas || rotas.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Truck className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p>Nenhuma rota importada</p>
        <p className="text-sm">Importe uma planilha para começar</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rotas.map((rota) => {
        const statusConfig = getStatusConfig(rota.status, rota.pedidos_confirmados, rota.total_pedidos);
        const StatusIcon = statusConfig.icon;

        return (
          <Card 
            key={rota.id}
            className={cn(
              "p-4 cursor-pointer hover:shadow-md transition-all",
              statusConfig.bgCard
            )}
            onClick={() => onSelectRota(rota)}
          >
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl bg-slate-100", statusConfig.iconColor)}>
                <Truck className="w-6 h-6" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">{rota.codigo_rota}</h3>
                  <Badge variant="outline" className={statusConfig.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(rota.data_importacao), 'dd/MM/yyyy')}
                  </div>
                  {rota.motorista_nome && (
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {rota.motorista_nome}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-slate-500">Pedidos</p>
                <p className="font-bold text-lg">
                  <span className={statusConfig.iconColor}>{rota.pedidos_confirmados}</span>
                  <span className="text-slate-400">/{rota.total_pedidos}</span>
                </p>
                <p className="text-sm font-medium text-slate-600">
                  {formatCurrency(rota.valor_total)}
                </p>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          </Card>
        );
      })}
    </div>
  );
}