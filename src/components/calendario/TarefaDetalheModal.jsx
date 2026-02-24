import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Bell, CheckSquare, Users, User, Repeat, Trash2, Loader2, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function AdminRow({ entrada, isMe, onCheck }) {
  const concluida = entrada.status === 'concluida';
  return (
    <div className={cn("flex items-center gap-3 p-2 rounded-lg border", concluida ? "bg-emerald-50 border-emerald-100" : "bg-white border-slate-200")}>
      <button
        onClick={isMe && !concluida ? onCheck : undefined}
        disabled={!isMe || concluida}
        className={cn("shrink-0 transition-all", isMe && !concluida && "hover:scale-110")}
      >
        {concluida
          ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          : <Circle className={cn("w-5 h-5", isMe ? "text-slate-300 hover:text-emerald-400" : "text-slate-200")} />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", concluida ? "text-emerald-700" : "text-slate-700")}>{entrada.admin_nome}</p>
        {concluida && entrada.data_conclusao && (
          <p className="text-[10px] text-emerald-500">Concluído {new Date(entrada.data_conclusao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
        )}
      </div>
      {isMe && <Badge className="text-[10px] bg-blue-100 text-blue-600">Você</Badge>}
    </div>
  );
}

const RECORRENCIA_LABELS = { diaria: 'Diária', semanal: 'Semanal', mensal: 'Mensal' };

export default function TarefaDetalheModal({ tarefa, onClose, userEmail, onDelete }) {
  const queryClient = useQueryClient();

  const checkAdminMutation = useMutation({
    mutationFn: async () => {
      const novasConc = (tarefa.conclusoes_gerais || []).map(c =>
        c.admin_id === userEmail
          ? { ...c, status: 'concluida', data_conclusao: new Date().toISOString() }
          : c
      );
      // Se todos concluíram → tarefa concluída
      const todosConc = novasConc.every(c => c.status === 'concluida');
      return base44.entities.Tarefa.update(tarefa.id, {
        conclusoes_gerais: novasConc,
        ...(todosConc ? { status: 'concluida' } : {})
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas_calendario'] });
      toast.success('Sua conclusão registrada!');
    }
  });

  const pararRecorrenciaMutation = useMutation({
    mutationFn: () => base44.entities.Tarefa.update(tarefa.id, { recorrencia_ativa: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas_calendario'] });
      toast.success('Recorrência parada.');
      onClose();
    }
  });

  if (!tarefa) return null;
  const isGeral = tarefa.escopo === 'geral' || tarefa.tipo === 'geral';
  const isTarefa = tarefa.tipo_evento === 'tarefa';
  const minhaConc = (tarefa.conclusoes_gerais || []).find(c => c.admin_id === userEmail);
  const jaConcluiuGeral = minhaConc?.status === 'concluida';

  return (
    <Dialog open={!!tarefa} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isTarefa
              ? <CheckSquare className="w-5 h-5 text-blue-600" />
              : <Bell className="w-5 h-5 text-amber-500" />
            }
            {tarefa.titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className={isTarefa ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>
              {isTarefa ? 'Tarefa' : 'Lembrete'}
            </Badge>
            <Badge className={isGeral ? "bg-indigo-100 text-indigo-700" : "bg-purple-100 text-purple-700"}>
              {isGeral ? <><Users className="w-3 h-3 mr-1 inline" />Geral</> : <><User className="w-3 h-3 mr-1 inline" />Individual</>}
            </Badge>
            {tarefa.regra_recorrencia && (
              <Badge className="bg-emerald-100 text-emerald-700">
                <Repeat className="w-3 h-3 mr-1 inline" /> {RECORRENCIA_LABELS[tarefa.regra_recorrencia]}
                {tarefa.recorrencia_ativa === false && ' (pausada)'}
              </Badge>
            )}
          </div>

          {/* Descrição */}
          {tarefa.descricao && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{tarefa.descricao}</p>
          )}

          {/* Data */}
          <p className="text-xs text-slate-400">
            📅 {tarefa.data_vencimento || tarefa.data}
            {tarefa.criador_nome && ` · Criado por ${tarefa.criador_nome}`}
          </p>

          {/* Checklist de Admins (apenas para tarefa geral) */}
          {isTarefa && isGeral && tarefa.conclusoes_gerais?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-600">Progresso dos administradores:</p>
              {tarefa.conclusoes_gerais.map(c => (
                <AdminRow
                  key={c.admin_id}
                  entrada={c}
                  isMe={c.admin_id === userEmail}
                  onCheck={() => !jaConcluiuGeral && checkAdminMutation.mutate()}
                />
              ))}
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-2">
            {tarefa.regra_recorrencia && tarefa.recorrencia_ativa !== false && (
              <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={() => pararRecorrenciaMutation.mutate()} disabled={pararRecorrenciaMutation.isPending}>
                <StopCircle className="w-3.5 h-3.5 mr-1" /> Parar Recorrência
              </Button>
            )}
            <div className="flex-1" />
            {onDelete && (
              <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => { onDelete(tarefa.id); onClose(); }}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}