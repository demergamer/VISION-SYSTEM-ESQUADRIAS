import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { History, RefreshCw, Loader2, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const STATUS_CONFIG = {
  aguardando:   { label: 'Aguardando',   color: 'bg-yellow-100 text-yellow-700' },
  aberto:       { label: 'Aberto',       color: 'bg-blue-100 text-blue-700' },
  parcial:      { label: 'Parcial',      color: 'bg-orange-100 text-orange-700' },
  pago:         { label: 'Pago',         color: 'bg-green-100 text-green-700' },
  cancelado:    { label: 'Cancelado',    color: 'bg-red-100 text-red-700' },
  em_producao:  { label: 'Em Produção',  color: 'bg-purple-100 text-purple-700' },
  entregue:     { label: 'Entregue',     color: 'bg-emerald-100 text-emerald-700' },
};

export default function ComprasModal({ open, onClose, userEmail, onRecomprar }) {
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos_historico', userEmail],
    queryFn: () => base44.entities.Pedido.filter({ cliente_email: userEmail }),
    enabled: open && !!userEmail,
  });

  const pedidosValidos = pedidos.filter(p => p.status !== 'cancelado');

  const handleRecomprar = (pedido) => {
    onRecomprar(pedido);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 rounded-2xl overflow-hidden max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <History className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-slate-800 text-base">Histórico de Compras</h3>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : pedidosValidos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="w-12 h-12 text-slate-200 mb-3" />
              <p className="font-semibold text-slate-400">Nenhum pedido encontrado</p>
              <p className="text-xs text-slate-300 mt-1">Seus pedidos aparecerão aqui.</p>
            </div>
          ) : pedidosValidos.map(pedido => {
            const cfg = STATUS_CONFIG[pedido.status] || { label: pedido.status, color: 'bg-slate-100 text-slate-600' };
            return (
              <div key={pedido.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Pedido #{pedido.numero_pedido}</p>
                    {pedido.data_entrega && (
                      <p className="text-xs text-slate-400">{new Date(pedido.data_entrega).toLocaleDateString('pt-BR')}</p>
                    )}
                  </div>
                  <Badge className={cn("border-0 text-xs shrink-0", cfg.color)}>{cfg.label}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-blue-700">{fmt(pedido.valor_pedido)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                    onClick={() => handleRecomprar(pedido)}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Comprar Novamente
                  </Button>
                </div>

                {pedido.observacao && (
                  <p className="text-xs text-slate-400 line-clamp-1">{pedido.observacao}</p>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}