import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckSquare, CheckCircle2, Bell, Users, User, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function AtividadesHoje({ user }) {
  const queryClient = useQueryClient();
  const hoje = format(new Date(), 'yyyy-MM-dd');

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ['tarefas_calendario'],
    queryFn: () => base44.entities.Tarefa.list('-created_date', 200),
    enabled: !!user
  });

  const concluirMutation = useMutation({
    mutationFn: async (tarefa) => {
      const isGeral = tarefa.escopo === 'geral' || tarefa.tipo === 'geral';
      const isTarefa = tarefa.tipo_evento === 'tarefa';

      if (isGeral && isTarefa && tarefa.conclusoes_gerais) {
        // Marca apenas o check do usuário atual
        const novasConc = tarefa.conclusoes_gerais.map(c =>
          c.admin_id === user?.email
            ? { ...c, status: 'concluida', data_conclusao: new Date().toISOString() }
            : c
        );
        const todosConc = novasConc.every(c => c.status === 'concluida');
        return base44.entities.Tarefa.update(tarefa.id, {
          conclusoes_gerais: novasConc,
          ...(todosConc ? { status: 'concluida' } : {})
        });
      }
      return base44.entities.Tarefa.update(tarefa.id, { status: 'concluida' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas_calendario'] });
      toast.success('Tarefa concluída!');
    }
  });

  const tarefasHoje = tarefas.filter(t => {
    const data = t.data_vencimento || t.data;
    if (data !== hoje) return false;

    const escopo = t.escopo || t.tipo || 'geral';
    const isGeral = escopo === 'geral';
    const isMeu = t.dono_id === user?.email || t.criador_id === user?.email;
    const visivel = isGeral || isMeu;

    // Verifica se o usuário já concluiu (para tarefas gerais)
    const jaConcluiu = isGeral && t.tipo_evento === 'tarefa' && t.conclusoes_gerais
      ? t.conclusoes_gerais.find(c => c.admin_id === user?.email)?.status === 'concluida'
      : t.status === 'concluida';

    const statusOk = !jaConcluiu && !['recusada', 'pendente_aceite'].includes(t.status);
    return visivel && statusOk;
  });

  if (isLoading) return null;
  if (tarefasHoje.length === 0) return null;

  const tarefas_ = tarefasHoje.filter(t => t.tipo_evento !== 'lembrete');
  const lembretes = tarefasHoje.filter(t => t.tipo_evento === 'lembrete');

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 ring-1 ring-amber-200 shadow-md">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-bold text-amber-800 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            Resumo do Dia — {format(new Date(), "dd 'de' MMMM", { locale: { code: 'pt-BR', formatLong: {}, localize: {}, match: {}, options: { weekStartsOn: 0, firstWeekContainsDate: 1 } } })}
            <Badge className="bg-amber-500 text-white text-[10px]">{tarefasHoje.length}</Badge>
          </span>
          <Link to={createPageUrl('Calendario')}>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-amber-600 hover:bg-amber-100 px-2">
              Ver tudo <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {tarefas_.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">📋 Tarefas</p>
            {tarefas_.map(t => {
              const isGeral = t.escopo === 'geral' || t.tipo === 'geral';
              return (
                <div key={t.id} className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-amber-100 shadow-sm">
                  <button
                    onClick={() => concluirMutation.mutate(t)}
                    disabled={concluirMutation.isPending}
                    className="w-5 h-5 rounded-full border-2 border-amber-400 flex items-center justify-center shrink-0 hover:bg-emerald-100 hover:border-emerald-400 transition-all"
                  >
                    <CheckCircle2 className="w-3 h-3 text-amber-300 hover:text-emerald-500" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{t.titulo}</p>
                    {t.descricao && <p className="text-xs text-slate-400 truncate">{t.descricao}</p>}
                  </div>
                  <Badge className={cn("text-[9px] px-1.5 shrink-0", isGeral ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
                    {isGeral ? <><Users className="w-2.5 h-2.5 mr-0.5 inline" />Geral</> : <><User className="w-2.5 h-2.5 mr-0.5 inline" />Individual</>}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {lembretes.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">🔔 Lembretes</p>
            {lembretes.map(t => (
              <div key={t.id} className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-amber-100 shadow-sm">
                <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{t.titulo}</p>
                  {t.descricao && <p className="text-xs text-slate-400 truncate">{t.descricao}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}