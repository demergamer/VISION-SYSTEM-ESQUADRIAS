import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/components/workspace/WindowManager';
import { usePreferences } from '@/components/hooks/usePreferences';
import {
  ShoppingCart, AlertCircle, Check, XCircle, Clock,
  TrendingUp, Star, RefreshCw, Users, Package, MessageSquare, Bell
} from 'lucide-react';

const iconMap = {
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

const priorityToastType = {
  alta: 'error',
  media: 'info',
  baixa: 'success',
};

export default function NotificationToastManager() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const workspace = useWorkspace();
  const { preferences } = usePreferences();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.email) return;

    const unsub = base44.entities.Notificacao.subscribe((event) => {
      if (event.type !== 'create') {
        queryClient.invalidateQueries(['notificacoes', user.email]);
        queryClient.invalidateQueries(['notificacoes_bell', user.email]);
        return;
      }

      const notif = event.data;
      if (notif?.destinatario_email !== user.email) return;

      queryClient.invalidateQueries(['notificacoes', user.email]);
      queryClient.invalidateQueries(['notificacoes_bell', user.email]);

      const Icon = iconMap[notif.tipo] || Bell;
      const toastFn = notif.prioridade === 'alta' ? toast.error
        : notif.prioridade === 'baixa' ? toast.success
        : toast.info;

      toastFn(notif.titulo, {
        description: notif.mensagem,
        duration: notif.prioridade === 'alta' ? 8000 : 5000,
        icon: <Icon className="w-4 h-4" />,
        action: notif.link ? {
          label: 'Ver →',
          onClick: () => {
            const page = notif.link.replace('/', '');
            if (preferences?.ui_mode === 'os' && workspace?.openWindow) {
              workspace.openWindow(page);
            } else {
              navigate(notif.link);
            }
          }
        } : undefined,
      });
    });

    return unsub;
  }, [user?.email, queryClient, navigate, workspace, preferences?.ui_mode]);

  return null; // purely side-effect
}