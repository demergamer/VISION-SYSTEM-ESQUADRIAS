import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Bell, CheckCheck, Trash2, ShoppingCart, AlertCircle,
  TrendingUp, Star, Check, Clock, XCircle, RefreshCw,
  Users, Package, MessageSquare, Filter, X, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { useWorkspace } from '@/components/workspace/WindowManager';
import { usePreferences } from '@/components/hooks/usePreferences';

export const iconMap = {
  novo_pedido: ShoppingCart,
  liquidacao_pendente: AlertCircle,
  liquidacao_aprovada: Check,
  liquidacao_rejeitada: XCircle,
  pedido_atrasado: Clock,
  meta_atingida: TrendingUp,
  cliente_vip: Star,
  sincronizacao_comissoes: RefreshCw,
  novo_cliente: Users,
  estoque_baixo: Package,
  mensagem_interna: MessageSquare,
};

export const colorMap = {
  novo_pedido: "text-blue-600 bg-blue-50",
  liquidacao_pendente: "text-amber-600 bg-amber-50",
  liquidacao_aprovada: "text-green-600 bg-green-50",
  liquidacao_rejeitada: "text-red-600 bg-red-50",
  pedido_atrasado: "text-orange-600 bg-orange-50",
  meta_atingida: "text-purple-600 bg-purple-50",
  cliente_vip: "text-yellow-600 bg-yellow-50",
  sincronizacao_comissoes: "text-indigo-600 bg-indigo-50",
  novo_cliente: "text-teal-600 bg-teal-50",
  estoque_baixo: "text-rose-600 bg-rose-50",
  mensagem_interna: "text-cyan-600 bg-cyan-50",
};

const FILTER_OPTIONS = [
  { key: 'todas', label: 'Todas' },
  { key: 'nao_lidas', label: 'Não lidas' },
  { key: 'novo_pedido', label: 'Pedidos' },
  { key: 'liquidacao_pendente', label: 'Liquidações' },
  { key: 'novo_cliente', label: 'Clientes' },
  { key: 'pedido_atrasado', label: 'Alertas' },
  { key: 'mensagem_interna', label: 'Mensagens' },
];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  return `${days}d atrás`;
}

export default function NotificationCenter({ onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const workspace = useWorkspace();
  const { preferences } = usePreferences();
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('todas');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: notificacoes = [] } = useQuery({
    queryKey: ['notificacoes', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const todas = await base44.entities.Notificacao.list('-created_date', 80);
      return todas.filter(n => n.destinatario_email === user.email);
    },
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.email) return;
    const unsub = base44.entities.Notificacao.subscribe((event) => {
      if (event.data?.destinatario_email === user.email || event.type !== 'create') {
        queryClient.invalidateQueries(['notificacoes', user.email]);
        queryClient.invalidateQueries(['notificacoes_bell', user.email]);
      }
    });
    return unsub;
  }, [user?.email, queryClient]);

  const marcarLida = useMutation({
    mutationFn: (id) => base44.entities.Notificacao.update(id, { lida: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notificacoes']);
      queryClient.invalidateQueries(['notificacoes_bell']);
    }
  });

  const excluir = useMutation({
    mutationFn: (id) => base44.entities.Notificacao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notificacoes']);
      queryClient.invalidateQueries(['notificacoes_bell']);
    }
  });

  const marcarTodasLidas = useMutation({
    mutationFn: async () => {
      const naoLidas = notificacoes.filter(n => !n.lida);
      await Promise.all(naoLidas.map(n => base44.entities.Notificacao.update(n.id, { lida: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notificacoes']);
      queryClient.invalidateQueries(['notificacoes_bell']);
    }
  });

  const limparLidas = useMutation({
    mutationFn: async () => {
      const lidas = notificacoes.filter(n => n.lida);
      await Promise.all(lidas.map(n => base44.entities.Notificacao.delete(n.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notificacoes']);
      queryClient.invalidateQueries(['notificacoes_bell']);
    }
  });

  const handleClick = (notif) => {
    if (!notif.lida) marcarLida.mutate(notif.id);
    if (notif.link) {
      const page = notif.link.replace('/', '');
      if (preferences?.ui_mode === 'os' && workspace?.openWindow) {
        workspace.openWindow(page);
      } else {
        navigate(notif.link);
      }
      onClose?.();
    }
  };

  const filtered = notificacoes.filter(n => {
    if (filter === 'todas') return true;
    if (filter === 'nao_lidas') return !n.lida;
    return n.tipo === filter;
  });

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  return (
    <div className="flex flex-col" style={{ width: 360, maxHeight: 560 }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-slate-800 text-sm">Notificações</h3>
            {naoLidas > 0 && (
              <Badge className="bg-red-500 text-white text-[10px] h-4 min-w-[16px] px-1">{naoLidas}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {naoLidas > 0 && (
              <Button size="sm" variant="ghost" onClick={() => marcarTodasLidas.mutate()}
                className="h-6 text-[10px] gap-1 px-2 text-slate-500 hover:text-blue-600">
                <CheckCheck className="w-3 h-3" /> Ler todas
              </Button>
            )}
            {notificacoes.some(n => n.lida) && (
              <Button size="sm" variant="ghost" onClick={() => limparLidas.mutate()}
                className="h-6 text-[10px] gap-1 px-2 text-slate-400 hover:text-red-500">
                <Trash2 className="w-3 h-3" /> Limpar lidas
              </Button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 overflow-x-auto hide-scrollbar">
          {FILTER_OPTIONS.map(opt => {
            const count = opt.key === 'todas' ? notificacoes.length
              : opt.key === 'nao_lidas' ? naoLidas
              : notificacoes.filter(n => n.tipo === opt.key).length;
            if (count === 0 && opt.key !== 'todas' && opt.key !== 'nao_lidas') return null;
            return (
              <button key={opt.key} onClick={() => setFilter(opt.key)}
                className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 transition-colors",
                  filter === opt.key
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}>
                {opt.label} {count > 0 && <span className="ml-0.5 opacity-75">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin' }}>
        {filtered.length === 0 ? (
          <div className="py-10 text-center">
            <Bell className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhuma notificação</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((notif) => {
              const Icon = iconMap[notif.tipo] || Bell;
              const colorClass = colorMap[notif.tipo] || "text-slate-600 bg-slate-50";
              return (
                <div key={notif.id} onClick={() => handleClick(notif)}
                  className={cn(
                    "flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 relative group",
                    !notif.lida && "bg-blue-50/40"
                  )}>
                  {/* unread dot */}
                  {!notif.lida && (
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}

                  <div className={cn("p-2 rounded-lg h-fit shrink-0 mt-0.5", colorClass)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-xs font-semibold leading-snug", notif.lida ? "text-slate-500" : "text-slate-800")}>
                        {notif.titulo}
                      </p>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.lida && (
                          <button onClick={e => { e.stopPropagation(); marcarLida.mutate(notif.id); }}
                            className="p-0.5 text-slate-400 hover:text-blue-500" title="Marcar como lida">
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        <button onClick={e => { e.stopPropagation(); excluir.mutate(notif.id); }}
                          className="p-0.5 text-slate-400 hover:text-red-500" title="Excluir">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className={cn("text-xs mt-0.5 leading-relaxed", notif.lida ? "text-slate-400" : "text-slate-600")}>
                      {notif.mensagem}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-slate-400">{timeAgo(notif.created_date)}</span>
                      {notif.prioridade === 'alta' && (
                        <span className="text-[9px] font-bold uppercase text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Urgente</span>
                      )}
                      {notif.link && (
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}