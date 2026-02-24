import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Clock, Inbox, Send, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function StatusBadge({ status }) {
  const map = {
    pendente_aceite: { label: 'Aguardando', color: 'bg-amber-100 text-amber-700', icon: Clock },
    aceita: { label: 'Aceita', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
    recusada: { label: 'Recusada', color: 'bg-red-100 text-red-700', icon: XCircle },
  };
  const cfg = map[status] || { label: status, color: 'bg-slate-100 text-slate-600', icon: Clock };
  const Icon = cfg.icon;
  return (
    <Badge className={cn("text-[10px] px-2 flex items-center gap-1 w-fit", cfg.color)}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </Badge>
  );
}

export default function InboxPanel({ tarefas, userEmail }) {
  const queryClient = useQueryClient();
  const [recusandoId, setRecusandoId] = useState(null);
  const [justificativa, setJustificativa] = useState('');

  const recebidas = tarefas.filter(t => t.dono_id === userEmail && t.criador_id !== userEmail && t.status === 'pendente_aceite');
  const enviadas = tarefas.filter(t => t.criador_id === userEmail && t.dono_id !== userEmail && ['pendente_aceite', 'aceita', 'recusada'].includes(t.status));

  const aceitarMutation = useMutation({
    mutationFn: (id) => base44.entities.Tarefa.update(id, { status: 'aceita' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas_calendario'] });
      toast.success('Tarefa aceita!');
    }
  });

  const recusarMutation = useMutation({
    mutationFn: ({ id, justificativa }) => base44.entities.Tarefa.update(id, { status: 'recusada', justificativa_recusa: justificativa }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas_calendario'] });
      setRecusandoId(null);
      setJustificativa('');
      toast.success('Tarefa recusada.');
    }
  });

  const handleRecusar = () => {
    if (!justificativa.trim()) { toast.error('Informe a justificativa.'); return; }
    recusarMutation.mutate({ id: recusandoId, justificativa });
  };

  return (
    <div className="space-y-6">
      {/* Recebidas */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
          <Inbox className="w-4 h-4 text-blue-600" /> Recebidas
          {recebidas.length > 0 && <Badge className="bg-red-500 text-white text-[10px]">{recebidas.length}</Badge>}
        </h3>
        {recebidas.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Nenhuma tarefa aguardando sua resposta.</p>
        ) : (
          <div className="space-y-3">
            {recebidas.map(t => (
              <div key={t.id} className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="font-semibold text-slate-800 text-sm">{t.titulo}</p>
                {t.descricao && <p className="text-xs text-slate-500 mt-0.5">{t.descricao}</p>}
                <p className="text-xs text-slate-400 mt-1">De: {t.criador_nome || t.criador_id} · {t.data_vencimento || t.data}</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={() => aceitarMutation.mutate(t.id)} disabled={aceitarMutation.isPending}>
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Aceitar
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-red-600 border-red-200 hover:bg-red-50 text-xs" onClick={() => { setRecusandoId(t.id); setJustificativa(''); }}>
                    <XCircle className="w-3 h-3 mr-1" /> Recusar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enviadas */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
          <Send className="w-4 h-4 text-purple-600" /> Enviadas
        </h3>
        {enviadas.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Nenhuma tarefa delegada.</p>
        ) : (
          <div className="space-y-3">
            {enviadas.map(t => (
              <div key={t.id} className="p-3 bg-white border border-slate-200 rounded-xl">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{t.titulo}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Para: {t.dono_nome || t.dono_id} · {t.data_vencimento || t.data}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                {t.status === 'recusada' && t.justificativa_recusa && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700">{t.justificativa_recusa}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Recusar */}
      <Dialog open={!!recusandoId} onOpenChange={() => { setRecusandoId(null); setJustificativa(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" /> Recusar Tarefa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Informe o motivo da recusa (obrigatório):</p>
            <Textarea
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              placeholder="Ex: Estou com outras prioridades neste dia..."
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setRecusandoId(null); setJustificativa(''); }}>Cancelar</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleRecusar} disabled={recusarMutation.isPending}>
                {recusarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Confirmar Recusa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}