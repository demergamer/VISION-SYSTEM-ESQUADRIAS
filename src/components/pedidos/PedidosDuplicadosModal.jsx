import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Crown, Copy, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const formatDate = (v) => { if (!v) return '-'; try { return format(parseISO(v.slice(0,10)), 'dd/MM/yyyy'); } catch { return v; } };

const STATUS_LABELS = {
  aberto: { label: 'Aberto', color: 'bg-blue-100 text-blue-700' },
  parcial: { label: 'Parcial', color: 'bg-purple-100 text-purple-700' },
  pago: { label: 'Pago', color: 'bg-emerald-100 text-emerald-700' },
  cancelado: { label: 'Cancelado', color: 'bg-slate-100 text-slate-500' },
  emproducao: { label: 'Em Produção', color: 'bg-amber-100 text-amber-700' },
  aguardando: { label: 'Em Trânsito', color: 'bg-amber-100 text-amber-700' },
};

export default function PedidosDuplicadosModal({ pedidos, onClose, onRefresh }) {
  const [deletando, setDeletando] = useState(null); // id do pedido sendo deletado
  const [confirmar, setConfirmar] = useState(null); // pedido para confirmar exclusão
  const [expandidos, setExpandidos] = useState({});

  // Agrupar pedidos por numero_pedido normalizado
  const grupos = useMemo(() => {
    const map = {};
    pedidos.forEach(p => {
      const num = (p.numero_pedido || '').toString().replace(/\D/g, '').trim();
      if (!num) return;
      if (!map[num]) map[num] = [];
      map[num].push(p);
    });
    // Filtrar só os que têm duplicatas
    return Object.entries(map)
      .filter(([, lista]) => lista.length > 1)
      .sort((a, b) => b[1].length - a[1].length);
  }, [pedidos]);

  const toggleExpandido = (num) => {
    setExpandidos(prev => ({ ...prev, [num]: !prev[num] }));
  };

  const handleDeletar = async () => {
    if (!confirmar) return;
    setDeletando(confirmar.id);
    try {
      await base44.entities.Pedido.delete(confirmar.id);
      toast.success(`Pedido #${confirmar.numero_pedido} excluído!`);
      setConfirmar(null);
      onRefresh();
    } catch (e) {
      toast.error('Erro ao excluir: ' + e.message);
    } finally {
      setDeletando(null);
    }
  };

  if (grupos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <Crown className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Nenhum duplicado encontrado!</h3>
        <p className="text-slate-500 text-sm">Todos os números de pedidos são únicos.</p>
        <Button variant="outline" onClick={onClose} className="mt-6">Fechar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>{grupos.length} número(s)</strong> com versões duplicadas encontrados.
          Analise cada grupo e exclua os que não são o original.
        </p>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {grupos.map(([num, lista]) => {
          const aberto = expandidos[num] !== false; // padrão: expandido
          return (
            <div key={num} className="border border-slate-200 rounded-xl overflow-hidden">
              {/* Header do grupo */}
              <button
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                onClick={() => toggleExpandido(num)}
              >
                <div className="flex items-center gap-2">
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span className="font-bold text-slate-800">Pedido #{num}</span>
                  <Badge className="bg-red-100 text-red-700">{lista.length} versões</Badge>
                </div>
                {aberto ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Tabela de versões */}
              {aberto && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Status</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Total Pago</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Saldo</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Importado</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Entrega</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Rota</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Criado em</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lista.map((p, idx) => {
                        const st = STATUS_LABELS[p.status] || { label: p.status, color: 'bg-slate-100 text-slate-600' };
                        const isFirst = idx === 0;
                        return (
                          <tr key={p.id} className={cn("hover:bg-slate-50 transition-colors", isFirst && "bg-blue-50/40")}>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                {isFirst && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Mais recente" />}
                                <div>
                                  <div className="font-medium text-slate-800 text-xs">{p.cliente_nome}</div>
                                  {p.cliente_codigo && <div className="text-[10px] text-slate-400">Cód: {p.cliente_codigo}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <Badge className={cn("text-[10px]", st.color)}>{st.label}</Badge>
                              {p.bordero_numero && <div className="text-[10px] text-emerald-600 mt-0.5">Borderô #{p.bordero_numero}</div>}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-slate-800">{formatCurrency(p.valor_pedido)}</td>
                            <td className="px-3 py-2 text-right text-emerald-700">{formatCurrency(p.total_pago)}</td>
                            <td className="px-3 py-2 text-right font-bold text-amber-700">{formatCurrency(p.saldo_restante)}</td>
                            <td className="px-3 py-2 text-xs text-slate-500">{p.data_importado || '-'}</td>
                            <td className="px-3 py-2 text-xs text-slate-500">{formatDate(p.data_entrega)}</td>
                            <td className="px-3 py-2 text-xs text-slate-500 max-w-[100px] truncate">{p.rota_entrega || '-'}</td>
                            <td className="px-3 py-2 text-xs text-slate-400">
                              {p.created_date ? format(parseISO(p.created_date), 'dd/MM/yy HH:mm') : '-'}
                            </td>
                            <td className="px-3 py-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600 text-slate-400"
                                onClick={() => setConfirmar(p)}
                                disabled={deletando === p.id}
                                title="Excluir este pedido"
                              >
                                {deletando === p.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <Trash2 className="w-3.5 h-3.5" />
                                }
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dialog de confirmação */}
      <AlertDialog open={!!confirmar} onOpenChange={(open) => { if (!open) setConfirmar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-5 h-5" /> Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-slate-700">
                <p>Você está prestes a excluir permanentemente o pedido:</p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                  <div><strong>Nº:</strong> #{confirmar?.numero_pedido}</div>
                  <div><strong>Cliente:</strong> {confirmar?.cliente_nome}</div>
                  <div><strong>Status:</strong> {confirmar?.status}</div>
                  <div><strong>Valor:</strong> {formatCurrency(confirmar?.valor_pedido)}</div>
                  {confirmar?.bordero_numero && (
                    <div className="text-amber-700 font-semibold">⚠️ Este pedido está vinculado ao Borderô #{confirmar.bordero_numero}</div>
                  )}
                </div>
                <p className="text-red-600 font-medium">Esta ação não pode ser desfeita!</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeletar}>
              Sim, Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}