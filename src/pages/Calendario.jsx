import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, ChevronRight, Plus, Calendar, Loader2, 
  Users, User, ArrowLeft, Trash2, CheckCircle2, Circle, Bell,
  CheckSquare, Inbox
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, parseISO, addDays, addWeeks, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from '@/components/providers/AuthContext';
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import NovaTarefaModal from '@/components/calendario/NovaTarefaModal';
import InboxPanel from '@/components/calendario/InboxPanel';
import TarefaDetalheModal from '@/components/calendario/TarefaDetalheModal';

const CORES = {
  tarefa_geral: 'bg-blue-500',
  tarefa_individual: 'bg-purple-500',
  lembrete_geral: 'bg-amber-400',
  lembrete_individual: 'bg-orange-400',
};

function corTarefa(t) {
  const tipo = t.tipo_evento || 'tarefa';
  const escopo = t.escopo || t.tipo || 'geral';
  return CORES[`${tipo}_${escopo}`] || 'bg-slate-400';
}

function calcularProximaData(data, regra) {
  const d = parseISO(data);
  if (regra === 'diaria') return format(addDays(d, 1), 'yyyy-MM-dd');
  if (regra === 'semanal') return format(addWeeks(d, 1), 'yyyy-MM-dd');
  if (regra === 'mensal') return format(addMonths(d, 1), 'yyyy-MM-dd');
  return null;
}

export default function Calendario() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const [mesAtual, setMesAtual] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [showNovaModal, setShowNovaModal] = useState(false);
  const [tarefaDetalhes, setTarefaDetalhes] = useState(null);
  const [viewMode, setViewMode] = useState('meu'); // 'meu' | 'geral'
  const [activeTab, setActiveTab] = useState('calendario'); // 'calendario' | 'inbox'

  // Bloqueia não-admins
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-600">Acesso Restrito</h2>
          <p className="text-slate-400 mt-2">O Calendário é exclusivo para Administradores.</p>
          <Link to={createPageUrl('Dashboard')}><Button className="mt-4" variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button></Link>
        </div>
      </div>
    );
  }

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ['tarefas_calendario'],
    queryFn: () => base44.entities.Tarefa.list('-created_date', 500)
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios_admin'],
    queryFn: () => base44.entities.User.list()
  });

  const admins = useMemo(() => usuarios.filter(u => u.role === 'admin'), [usuarios]);

  // Filtra por view
  const tarefasVisiveis = useMemo(() => {
    return tarefas.filter(t => {
      const escopo = t.escopo || t.tipo || 'geral';
      if (viewMode === 'geral') return escopo === 'geral';
      // Meu calendário: minhas tarefas aceitas + lembretes individuais meus + gerais
      const isGeral = escopo === 'geral';
      const isMeu = t.dono_id === user?.email || t.criador_id === user?.email;
      const statusOk = !['recusada', 'pendente_aceite'].includes(t.status);
      return (isGeral || isMeu) && statusOk;
    });
  }, [tarefas, viewMode, user]);

  const diasDoMes = useMemo(() => eachDayOfInterval({ start: startOfMonth(mesAtual), end: endOfMonth(mesAtual) }), [mesAtual]);
  const primeiroDia = getDay(startOfMonth(mesAtual));

  const tarefasPorDia = (dia) => tarefasVisiveis.filter(t => {
    const d = t.data_vencimento || t.data;
    if (!d) return false;
    try { return isSameDay(parseISO(d), dia); } catch { return false; }
  });

  const tarefasDiaSelecionado = useMemo(() => {
    if (!diaSelecionado) return [];
    return tarefasVisiveis.filter(t => {
      const d = t.data_vencimento || t.data;
      if (!d) return false;
      try { return isSameDay(parseISO(d), diaSelecionado); } catch { return false; }
    });
  }, [diaSelecionado, tarefasVisiveis]);

  const criarMutation = useMutation({
    mutationFn: async (data) => {
      // Se for tarefa geral, inicializa conclusoes_gerais com todos os admins
      if ((data.escopo === 'geral' || data.tipo === 'geral') && data.tipo_evento === 'tarefa') {
        data.conclusoes_gerais = admins.map(a => ({
          admin_id: a.email,
          admin_nome: a.preferred_name || a.full_name || a.email,
          status: 'pendente',
          data_conclusao: null,
        }));
      }
      return base44.entities.Tarefa.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas_calendario'] });
      setShowNovaModal(false);
      toast.success('Tarefa criada!');
    }
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => base44.entities.Tarefa.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tarefas_calendario'] })
  });

  const concluirMutation = useMutation({
    mutationFn: async (tarefa) => {
      const novoStatus = tarefa.status === 'concluida' ? 'aceita' : 'concluida';
      await base44.entities.Tarefa.update(tarefa.id, { status: novoStatus });

      // Recorrência: se concluiu E tem regra ativa, cria próxima instância
      if (novoStatus === 'concluida' && tarefa.regra_recorrencia && tarefa.recorrencia_ativa !== false) {
        const proximaData = calcularProximaData(tarefa.data_vencimento || tarefa.data, tarefa.regra_recorrencia);
        if (proximaData) {
          const nova = {
            ...tarefa,
            id: undefined,
            data_vencimento: proximaData,
            data: proximaData,
            status: 'pendente',
            tarefa_mestre_id: tarefa.tarefa_mestre_id || tarefa.id,
            conclusoes_gerais: tarefa.conclusoes_gerais?.map(c => ({ ...c, status: 'pendente', data_conclusao: null })),
          };
          await base44.entities.Tarefa.create(nova);
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tarefas_calendario'] })
  });

  const inboxCount = tarefas.filter(t => t.dono_id === user?.email && t.criador_id !== user?.email && t.status === 'pendente_aceite').length;

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Calendar className="w-6 h-6 text-blue-600" /> Calendário</h1>
              <p className="text-slate-500 text-sm">Tarefas, lembretes e delegações</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="relative" onClick={() => setActiveTab('inbox')}>
              <Inbox className="w-4 h-4 mr-2" /> Inbox
              {inboxCount > 0 && <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 min-w-0">{inboxCount}</Badge>}
            </Button>
            <Button onClick={() => setShowNovaModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
            </Button>
          </div>
        </div>

        {/* Toggle Meu Calendário / Geral */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 w-fit shadow-sm">
          <button
            onClick={() => setViewMode('meu')}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all", viewMode === 'meu' ? "bg-purple-600 text-white shadow" : "text-slate-500 hover:bg-slate-100")}
          >
            <User className="w-4 h-4" /> Meu Calendário
          </button>
          <button
            onClick={() => setViewMode('geral')}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all", viewMode === 'geral' ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:bg-slate-100")}
          >
            <Users className="w-4 h-4" /> Calendário Geral
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-100">
            <TabsTrigger value="calendario"><Calendar className="w-4 h-4 mr-1" />Calendário</TabsTrigger>
            <TabsTrigger value="inbox" className="relative">
              <Inbox className="w-4 h-4 mr-1" />Inbox
              {inboxCount > 0 && <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{inboxCount}</span>}
            </TabsTrigger>
          </TabsList>

          {/* ABA CALENDÁRIO */}
          <TabsContent value="calendario" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Grade do mês */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" size="icon" onClick={() => setMesAtual(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <h2 className="font-bold text-slate-800 capitalize text-lg">
                        {format(mesAtual, 'MMMM yyyy', { locale: ptBR })}
                      </h2>
                      <Button variant="ghost" size="icon" onClick={() => setMesAtual(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {weekDays.map(d => <div key={d} className="text-center text-xs font-bold text-slate-400 py-1">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e-${i}`} />)}
                      {diasDoMes.map(dia => {
                        const td = tarefasPorDia(dia);
                        const hoje = isToday(dia);
                        const sel = diaSelecionado && isSameDay(dia, diaSelecionado);
                        return (
                          <div
                            key={dia.toISOString()}
                            onClick={() => setDiaSelecionado(sel ? null : dia)}
                            className={cn(
                              "min-h-[64px] p-1 rounded-lg border cursor-pointer transition-all",
                              hoje && "border-blue-400 bg-blue-50",
                              sel && "border-blue-600 bg-blue-100 shadow-md",
                              !hoje && !sel && "border-slate-100 bg-white hover:border-blue-300"
                            )}
                          >
                            <span className={cn("text-xs font-bold block text-right", hoje ? "text-blue-600" : "text-slate-500")}>{dia.getDate()}</span>
                            <div className="space-y-0.5 mt-0.5">
                              {td.slice(0, 3).map(t => (
                                <div key={t.id} className={cn("text-[9px] text-white px-1 py-0.5 rounded truncate", corTarefa(t), t.status === 'concluida' && 'opacity-40 line-through')}>
                                  {(t.tipo_evento === 'lembrete' ? '🔔 ' : '') + t.titulo}
                                </div>
                              ))}
                              {td.length > 3 && <div className="text-[9px] text-slate-400">+{td.length - 3}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Legenda */}
                <div className="flex flex-wrap gap-3 mt-3 px-1">
                  {[
                    { cor: 'bg-blue-500', label: 'Tarefa Geral' },
                    { cor: 'bg-purple-500', label: 'Tarefa Individual' },
                    { cor: 'bg-amber-400', label: 'Lembrete Geral' },
                    { cor: 'bg-orange-400', label: 'Lembrete Individual' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                      <div className={cn("w-2.5 h-2.5 rounded-full", l.cor)} /> {l.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Painel lateral */}
              <div className="space-y-4">
                {diaSelecionado ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-slate-700 flex items-center justify-between">
                        <span>{format(diaSelecionado, "dd 'de' MMMM", { locale: ptBR })}</span>
                        {isToday(diaSelecionado) && <Badge className="bg-blue-100 text-blue-700 text-[10px]">Hoje</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {tarefasDiaSelecionado.length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-4">Sem eventos neste dia.</p>
                      ) : (
                        <div className="space-y-2">
                          {tarefasDiaSelecionado.map(t => (
                            <TarefaItemLateral
                              key={t.id}
                              tarefa={t}
                              userEmail={user?.email}
                              onConcluir={() => concluirMutation.mutate(t)}
                              onDelete={() => deletarMutation.mutate(t.id)}
                              onDetalhe={() => setTarefaDetalhes(t)}
                              isAdmin={isAdmin}
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-slate-50 border-dashed">
                    <CardContent className="py-10 text-center text-slate-400 text-sm">
                      Clique em um dia para ver as tarefas
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ABA INBOX */}
          <TabsContent value="inbox" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <InboxPanel tarefas={tarefas} userEmail={user?.email} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <NovaTarefaModal
        open={showNovaModal}
        onClose={() => setShowNovaModal(false)}
        onCriar={criarMutation.mutate}
        usuarios={usuarios}
        userAtual={user}
        isPending={criarMutation.isPending}
      />

      {tarefaDetalhes && (
        <TarefaDetalheModal
          tarefa={tarefaDetalhes}
          onClose={() => setTarefaDetalhes(null)}
          userEmail={user?.email}
          onDelete={(id) => deletarMutation.mutate(id)}
        />
      )}
    </div>
  );
}

function TarefaItemLateral({ tarefa, userEmail, onConcluir, onDelete, onDetalhe, isAdmin }) {
  const concluida = tarefa.status === 'concluida';
  const isLembrete = tarefa.tipo_evento === 'lembrete';
  const isGeral = tarefa.escopo === 'geral' || tarefa.tipo === 'geral';

  // Para tarefa geral, o check é feito no modal de detalhes
  const meuCheck = isGeral && !isLembrete
    ? (tarefa.conclusoes_gerais || []).find(c => c.admin_id === userEmail)?.status === 'concluida'
    : concluida;

  return (
    <div
      className={cn("flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all hover:border-blue-300 hover:shadow-sm", meuCheck ? "bg-slate-50 opacity-60" : "bg-white")}
      onClick={onDetalhe}
    >
      {!isLembrete ? (
        <button
          onClick={e => { e.stopPropagation(); onConcluir(); }}
          className={cn("mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
            meuCheck ? "bg-emerald-500 border-emerald-500" : "border-slate-300 hover:border-emerald-400"
          )}
        >
          {meuCheck && <CheckCircle2 className="w-3 h-3 text-white" />}
        </button>
      ) : (
        <Bell className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium text-slate-700", meuCheck && "line-through text-slate-400")}>{tarefa.titulo}</p>
        {tarefa.descricao && <p className="text-xs text-slate-400 truncate">{tarefa.descricao}</p>}
        <div className="flex items-center gap-1 mt-1">
          <div className={cn("w-1.5 h-1.5 rounded-full", corTarefa(tarefa))} />
          <span className="text-[10px] text-slate-400">{isGeral ? 'Geral' : `de ${tarefa.criador_nome || tarefa.dono_nome}`}</span>
        </div>
      </div>
      {isAdmin && (
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="text-red-300 hover:text-red-500 p-0.5 shrink-0">
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}