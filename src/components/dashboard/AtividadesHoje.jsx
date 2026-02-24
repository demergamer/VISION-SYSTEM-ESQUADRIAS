import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckSquare, Check, Calendar, User, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AtividadesHoje({ user }) {
  const queryClient = useQueryClient();
  const hoje = format(new Date(), 'yyyy-MM-dd');

  const { data: tarefas = [] } = useQuery({
    queryKey: ['tarefas'],
    queryFn: () => base44.entities.Tarefa.list(),
    enabled: !!user
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Tarefa.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tarefas'] })
  });

  const tarefasHoje = tarefas.filter(t => {
    const ehHoje = t.data === hoje;
    const pendente = t.status === 'pendente';
    const visivel = t.tipo === 'geral' || t.dono_id === user?.email || t.criador_id === user?.email;
    return ehHoje && pendente && visivel;
  });

  if (tarefasHoje.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/60 ring-1 ring-amber-200">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-bold text-amber-800 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            Atividades de Hoje ({tarefasHoje.length})
          </span>
          <Link to={createPageUrl('Calendario')}>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-amber-600 hover:bg-amber-100 px-2">
              Ver tudo <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {tarefasHoje.map(t => (
          <div key={t.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-100 shadow-sm">
            <button
              onClick={() => toggleMutation.mutate({ id: t.id, status: 'concluida' })}
              className="w-5 h-5 rounded-full border-2 border-amber-400 flex items-center justify-center shrink-0 hover:bg-emerald-100 hover:border-emerald-400 transition-all"
            >
              <Check className="w-3 h-3 text-amber-400 hover:text-emerald-500" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{t.titulo}</p>
              {t.descricao && <p className="text-xs text-slate-400 truncate">{t.descricao}</p>}
            </div>
            <Badge className={cn("text-[9px] px-1.5 shrink-0", t.tipo === 'geral' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
              {t.tipo}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}