import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const statusColors = {
  aberto: 'bg-blue-100 text-blue-700',
  pago: 'bg-emerald-100 text-emerald-700',
  parcial: 'bg-amber-100 text-amber-700',
  cancelado: 'bg-red-100 text-red-700',
  aguardando: 'bg-slate-100 text-slate-600',
};

export default function PedidosRecentesWidget() {
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos_recentes_widget'],
    queryFn: () => base44.entities.Pedido.list('-created_date', 8),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Carregando...</div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingCart className="w-4 h-4 text-blue-600" />
        <span className="font-bold text-slate-700 text-sm">Pedidos Recentes</span>
        <span className="ml-auto text-xs text-slate-400">{pedidos.length} registros</span>
      </div>
      {pedidos.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Nenhum pedido encontrado.</p>}
      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
        {pedidos.map(p => (
          <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700 truncate">#{p.numero_pedido} — {p.cliente_nome}</p>
              <p className="text-[10px] text-slate-400">
                {p.created_date ? format(new Date(p.created_date), 'dd/MM/yyyy') : '—'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", statusColors[p.status] || 'bg-slate-100 text-slate-600')}>
                {p.status}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold">
                {p.valor_pedido?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}