import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ChevronLeft, ChevronRight, Plus, Calendar, Check, Loader2, 
  Users, User, ArrowLeft, Trash2, CheckCircle2
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from '@/components/providers/AuthContext';
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

const TIPO_CORES = {
  geral: 'bg-blue-500',
  individual: 'bg-purple-500'
};

export default function Calendario() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const [mesAtual, setMesAtual] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [showNovaModal, setShowNovaModal] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState({ titulo: '', descricao: '', data: '', tipo: 'geral', dono_id: '', dono_nome: '' });

  // Busca tarefas
  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ['tarefas'],
    queryFn: () => base44.entities.Tarefa.list()
  });

  // Busca usuários para delegação (apenas admin)
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios_lista'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin
  });

  // Filtra tarefas visíveis
  const tarefasVisiveis = useMemo(() => tarefas.filter(t => {
    if (t.tipo === 'geral') return true;
    return t.dono_id === user?.email || t.criador_id === user?.email;
  }), [tarefas, user]);

  // Dias do mês atual
  const diasDoMes = useMemo(() => {
    const inicio = startOfMonth(mesAtual);
    const fim = endOfMonth(mesAtual);
    return eachDayOfInterval({ start: inicio, end: fim });
  }, [mesAtual]);

  const primeiroDia = getDay(startOfMonth(mesAtual)); // 0=Dom

  // Tarefas por dia
  const tarefasPorDia = (dia) => tarefasVisiveis.filter(t => {
    if (!t.data) return false;
    try { return isSameDay(parseISO(t.data), dia); } catch { return false; }
  });

  // Tarefas do dia selecionado
  const tarefasDiaSelecionado = useMemo(() => {
    if (!diaSelecionado) return [];
    return tarefasVisiveis.filter(t => {
      if (!t.data) return false;
      try { return isSameDay(parseISO(t.data), diaSelecionado); } catch { return false; }
    });
  }, [diaSelecionado, tarefasVisiveis]);

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Tarefa.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tarefas'] })
  });

  const criarTarefaMutation = useMutation({
    mutationFn: (data) => base44.entities.Tarefa.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      setShowNovaModal(false);
      setNovaTarefa({ titulo: '', descricao: '', data: '', tipo: 'geral', dono_id: '', dono_nome: '' });
      toast.success('Tarefa criada!');
    }
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => base44.entities.Tarefa.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tarefas'] })
  });

  const handleCriar = () => {
    if (!novaTarefa.titulo || !novaTarefa.data) { toast.error('Preencha título e data.'); return; }
    criarTarefaMutation.mutate({
      ...novaTarefa,
      criador_id: user?.email,
      criador_nome: user?.full_name || user?.email,
      dono_id: novaTarefa.tipo === 'individual' ? (novaTarefa.dono_id || user?.email) : user?.email,
      dono_nome: novaTarefa.tipo === 'individual' ? (novaTarefa.dono_nome || user?.full_name) : user?.full_name,
      status: 'pendente'
    });
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Calendar className="w-6 h-6 text-blue-600" /> Calendário</h1>
              <p className="text-slate-500 text-sm">Gestão de tarefas e lembretes</p>
            </div>
          </div>
          <Button onClick={() => setShowNovaModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CALENDÁRIO */}
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
                  {Array.from({ length: primeiroDia }).map((_, i) => <div key={`empty-${i}`} />)}
                  {diasDoMes.map(dia => {
                    const tarefasDia = tarefasPorDia(dia);
                    const hoje = isToday(dia);
                    const selecionado = diaSelecionado && isSameDay(dia, diaSelecionado);
                    return (
                      <div
                        key={dia.toISOString()}
                        onClick={() => setDiaSelecionado(selecionado ? null : dia)}
                        className={cn(
                          "min-h-[64px] p-1.5 rounded-lg border cursor-pointer transition-all",
                          hoje && "border-blue-500 bg-blue-50",
                          selecionado && "border-blue-600 bg-blue-100 shadow-md",
                          !hoje && !selecionado && "border-slate-100 bg-white hover:border-blue-300 hover:bg-blue-50/30"
                        )}
                      >
                        <span className={cn("text-xs font-bold block text-right", hoje ? "text-blue-600" : "text-slate-600")}>{dia.getDate()}</span>
                        <div className="space-y-0.5 mt-1">
                          {tarefasDia.slice(0, 3).map(t => (
                            <div key={t.id} className={cn("text-[9px] text-white px-1 py-0.5 rounded truncate", TIPO_CORES[t.tipo] || 'bg-slate-400', t.status === 'concluida' && 'opacity-50 line-through')}>
                              {t.titulo}
                            </div>
                          ))}
                          {tarefasDia.length > 3 && <div className="text-[9px] text-slate-400">+{tarefasDia.length - 3}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PAINEL LATERAL */}
          <div className="space-y-4">
            {/* Dia selecionado */}
            {diaSelecionado ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-700">
                    {format(diaSelecionado, "dd 'de' MMMM", { locale: ptBR })}
                    {isToday(diaSelecionado) && <Badge className="ml-2 bg-blue-100 text-blue-700 text-[10px]">Hoje</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tarefasDiaSelecionado.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">Sem tarefas neste dia.</p>
                  ) : (
                    <div className="space-y-2">
                      {tarefasDiaSelecionado.map(t => (
                        <TarefaItem key={t.id} tarefa={t} onToggle={() => toggleStatusMutation.mutate({ id: t.id, status: t.status === 'concluida' ? 'pendente' : 'concluida' })} onDelete={() => deletarMutation.mutate(t.id)} isAdmin={isAdmin} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-50 border-dashed">
                <CardContent className="py-8 text-center text-slate-400 text-sm">
                  Clique em um dia para ver as tarefas
                </CardContent>
              </Card>
            )}

            {/* Legenda */}
            <Card className="p-3">
              <p className="text-xs font-bold text-slate-600 mb-2">Legenda</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-xs text-slate-600">Tarefa Geral (todos)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500" /><span className="text-xs text-slate-600">Tarefa Individual</span></div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* MODAL NOVA TAREFA */}
      <Dialog open={showNovaModal} onOpenChange={setShowNovaModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Título *</Label>
              <Input value={novaTarefa.titulo} onChange={e => setNovaTarefa(p => ({ ...p, titulo: e.target.value }))} placeholder="Nome da tarefa" />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea value={novaTarefa.descricao} onChange={e => setNovaTarefa(p => ({ ...p, descricao: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data *</Label>
                <Input type="date" value={novaTarefa.data} onChange={e => setNovaTarefa(p => ({ ...p, data: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={novaTarefa.tipo} onValueChange={v => setNovaTarefa(p => ({ ...p, tipo: v, dono_id: '', dono_nome: '' }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral (todos)</SelectItem>
                    {isAdmin && <SelectItem value="individual">Individual</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isAdmin && novaTarefa.tipo === 'individual' && (
              <div>
                <Label className="text-xs">Delegar para</Label>
                <Select value={novaTarefa.dono_id} onValueChange={v => {
                  const u = usuarios.find(u => u.email === v);
                  setNovaTarefa(p => ({ ...p, dono_id: v, dono_nome: u?.full_name || v }));
                }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar usuário" /></SelectTrigger>
                  <SelectContent>
                    {usuarios.map(u => <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowNovaModal(false)}>Cancelar</Button>
              <Button onClick={handleCriar} disabled={criarTarefaMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                {criarTarefaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TarefaItem({ tarefa, onToggle, onDelete, isAdmin }) {
  const concluida = tarefa.status === 'concluida';
  return (
    <div className={cn("flex items-start gap-2 p-2 rounded-lg border transition-all", concluida ? "bg-slate-50 opacity-60" : "bg-white")}>
      <button
        onClick={onToggle}
        className={cn("mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
          concluida ? "bg-emerald-500 border-emerald-500" : "border-slate-300 hover:border-blue-400"
        )}
      >
        {concluida && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium text-slate-700", concluida && "line-through text-slate-400")}>{tarefa.titulo}</p>
        {tarefa.descricao && <p className="text-xs text-slate-400 truncate">{tarefa.descricao}</p>}
        <div className="flex items-center gap-1 mt-1">
          <Badge className={cn("text-[9px] px-1 py-0", tarefa.tipo === 'geral' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
            {tarefa.tipo}
          </Badge>
          {tarefa.dono_nome && tarefa.tipo === 'individual' && (
            <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{tarefa.dono_nome}</span>
          )}
        </div>
      </div>
      {isAdmin && (
        <button onClick={onDelete} className="text-red-300 hover:text-red-500 p-0.5">
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}