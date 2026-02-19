import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, CheckCheck, Trash2, ShoppingCart, AlertCircle, 
  TrendingUp, Star, Check, Clock, XCircle, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

const iconMap = {
  novo_pedido: ShoppingCart,
  liquidacao_pendente: AlertCircle,
  liquidacao_aprovada: Check,
  liquidacao_rejeitada: XCircle,
  pedido_atrasado: Clock,
  meta_atingida: TrendingUp,
  cliente_vip: Star
};

const colorMap = {
  novo_pedido: "text-blue-600 bg-blue-50",
  liquidacao_pendente: "text-amber-600 bg-amber-50",
  liquidacao_aprovada: "text-green-600 bg-green-50",
  liquidacao_rejeitada: "text-red-600 bg-red-50",
  pedido_atrasado: "text-orange-600 bg-orange-50",
  meta_atingida: "text-purple-600 bg-purple-50",
  cliente_vip: "text-yellow-600 bg-yellow-50"
};

export default function NotificationCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: notificacoes = [], refetch } = useQuery({
    queryKey: ['notificacoes', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const todas = await base44.entities.Notificacao.list('-created_date', 50);
      return todas.filter(n => n.destinatario_email === user.email);
    },
    enabled: !!user?.email
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.email) return;
    
    const unsubscribe = base44.entities.Notificacao.subscribe((event) => {
      if (event.type === 'create' && event.data.destinatario_email === user.email) {
        queryClient.invalidateQueries(['notificacoes', user.email]);
        
        // Show toast notification
        toast.info(event.data.titulo, {
          description: event.data.mensagem,
          duration: 5000,
          action: event.data.link ? {
            label: "Ver",
            onClick: () => navigate(event.data.link)
          } : undefined
        });
      }
      
      if (event.type === 'update' || event.type === 'delete') {
        queryClient.invalidateQueries(['notificacoes', user.email]);
      }
    });

    return unsubscribe;
  }, [user?.email, queryClient, navigate]);

  const marcarComoLidaMutation = useMutation({
    mutationFn: (id) => base44.entities.Notificacao.update(id, { lida: true }),
    onSuccess: () => queryClient.invalidateQueries(['notificacoes'])
  });

  const excluirMutation = useMutation({
    mutationFn: (id) => base44.entities.Notificacao.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['notificacoes'])
  });

  const marcarTodasLidasMutation = useMutation({
    mutationFn: async () => {
      const naoLidas = notificacoes.filter(n => !n.lida);
      await Promise.all(naoLidas.map(n => base44.entities.Notificacao.update(n.id, { lida: true })));
    },
    onSuccess: () => queryClient.invalidateQueries(['notificacoes'])
  });

  const handleClick = (notif) => {
    if (!notif.lida) {
      marcarComoLidaMutation.mutate(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  return (
    <div className="w-80">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-slate-600" />
          <h3 className="font-bold text-slate-800">Notificações</h3>
          {naoLidas > 0 && (
            <Badge className="bg-red-500 text-white">{naoLidas}</Badge>
          )}
        </div>
        {naoLidas > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => marcarTodasLidasMutation.mutate()}
            className="h-7 text-xs gap-1"
          >
            <CheckCheck className="w-3 h-3" />
            Marcar todas
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px]">
        {notificacoes.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nenhuma notificação</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notificacoes.map((notif) => {
              const Icon = iconMap[notif.tipo] || Bell;
              const colorClass = colorMap[notif.tipo] || "text-slate-600 bg-slate-50";
              
              return (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={cn(
                    "p-3 hover:bg-slate-50 cursor-pointer transition-colors relative",
                    !notif.lida && "bg-blue-50/30"
                  )}
                >
                  {!notif.lida && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                  
                  <div className="flex gap-3 pl-3">
                    <div className={cn("p-2 rounded-lg h-fit", colorClass)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm font-medium",
                          notif.lida ? "text-slate-600" : "text-slate-800"
                        )}>
                          {notif.titulo}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            excluirMutation.mutate(notif.id);
                          }}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <p className={cn(
                        "text-xs mt-1",
                        notif.lida ? "text-slate-400" : "text-slate-600"
                      )}>
                        {notif.mensagem}
                      </p>
                      
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(notif.created_date).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}