import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ChevronLeft, ChevronRight, Plus, Calendar, CheckCircle2, Circle, 
  Users, User, Trash2, Loader2, ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Calendario() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [newTask, setNewTask] = useState({ titulo: '', descricao: '', data: '', tipo: 'geral', dono_id: '', dono_nome: '' });

  // --- DATA ---
  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ['tarefas'],
    queryFn: () => base44.entities.Tarefa.list()
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios_lista'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin
  });

  // Tarefas visíveis para o usuário logado
  const tarefasVisiveis = useMemo(() => tarefas.filter(t =>
    t.tipo === 'geral' || t.dono_id === user?.email || t.criador_id === user?.email
  ), [tarefas, user]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Tarefa.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['tarefas']); setShowNewTask(false); setNewTask({ titulo: '', descricao: '', data: '', tipo: 'geral', dono_id: '', dono_nome: '' }); toast.success('Tarefa criada!'); }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Tarefa.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries(['tarefas'])
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Tarefa.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['tarefas']); toast.success('Tarefa removida.'); }
  });

  // Calendário
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = monthStart.getDay(); // dia da semana do primeiro dia
  const allDays = [...Array(startPad).fill(null), ...daysInMonth];

  const tarefasPorDia = (day) => day ? tarefasVisiveis.filter(t => t.data && isSameDay(parseISO(t.data), day)) : [];
  const tarefasDoDia = selectedDay ? tarefasPorDia(selectedDay) : [];

  const handleDayClick = (day) => {
    setSelectedDay(day);
    setShowDayModal(true);
  };

  const handleSaveTask = () => {
    if (!newTask.titulo || !newTask.data) { toast.error('Título e data são obrigatórios.'); return; }
    const payload = {
      ...newTask,
      criador_id: user?.email,
      criador_nome: user?.full_name || user?.email,
      dono_id: newTask.tipo === 'geral' ? '' : (newTask.dono_id || user?.email),
      dono_nome: newTask.tipo === 'geral' ? '' : (newTask.dono_nome || user?.full_name)
    };
    createMutation.mutate(payload);
  };

  const TaskItem = ({ tarefa, compact = false }) => {
    const isDone = tarefa.status === 'concluida';
    return (
      <div className={cn("flex items-start gap-2 p-2 rounded-lg border bg-white transition-all", isDone && "opacity-60", compact ? "py-1" : "")}>
        <button
          onClick={() => toggleMutation.mutate({ id: tarefa.id, status: isDone ? 'pendente' : 'concluida' })}
          className={cn("mt-0.5 rounded-full border-2 w-5 h-5 flex items-center justify-center shrink-0 transition-colors", isDone ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-emerald-400")}
        >
          {isDone && <CheckCircle2 className="w-3 h-3" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium text-slate-700", isDone && "line-through text-slate-400")}>{tarefa.titulo}</p>
          {!compact && tarefa.descricao && <p className="text-xs text-slate-400 mt-0.5">{tarefa.descricao}</p>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className={cn("text-[9px] px-1 py-0", tarefa.tipo === 'geral' ? 'border-blue-200 text-blue-600' : 'border-purple-200 text-purple-600')}>
              {tarefa.tipo === 'geral' ? <Users className="w-2.5 h-2.5 mr-0.5" /> : <User className="w-2.5 h-2.5 mr-0.5" />}
              {tarefa.tipo === 'geral' ? 'Geral' : (tarefa.dono_nome || tarefa.dono_id || 'Individual')}
            </Badge>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => deleteMutation.mutate(tarefa.id)} className="text-slate-300 hover:text-red-400 shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Calendar className="w-6 h-6 text-blue-600" /> Calendário de Tarefas</h1>
              <p className="text-slate-500 text-sm">Organize atividades e compromissos da equipe</p>
            </div>
          </div>
          <Button onClick={() => setShowNewTask(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CALENDÁRIO */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-4 md:p-6">
                {/* Nav do mês */}
                <div className="flex items-center justify-between mb-6">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}><ChevronLeft className="w-5 h-5" /></Button>
                  <h2 className="text-lg font-bold text-slate-800 capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}><ChevronRight className="w-5 h-5" /></Button>
                </div>

                {/* Dias da semana */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {WEEK_DAYS.map(d => <div key={d} className="text-center text-xs font-bold text-slate-400 py-1">{d}</div>)}
                </div>

                {/* Grid de dias */}
                <div className="grid grid-cols-7 gap-1">
                  {allDays.map((day, idx) => {
                    if (!day) return <div key={`pad-${idx}`} />;
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDay && isSameDay(day, selectedDay);
                    const dayTasks = tarefasPorDia(day);
                    const pendentes = dayTasks.filter(t => t.status === 'pendente').length;
                    const concluidas = dayTasks.filter(t => t.status === 'concluida').length;

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => handleDayClick(day)}
                        className={cn(
                          "relative aspect-square rounded-xl flex flex-col items-center justify-start pt-1.5 transition-all hover:bg-blue-50 border",
                          isToday && "bg-blue-600 text-white border-blue-600 hover:bg-blue-700",
                          isSelected && !isToday && "bg-blue-50 border-blue-300",
                          !isToday && !isSelected && "border-transparent"
                        )}
                      >
                        <span className={cn("text-sm font-bold", isToday ? "text-white" : "text-slate-700")}>{day.getDate()}</span>
                        {dayTasks.length > 0 && (
                          <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                            {pendentes > 0 && <span className={cn("w-1.5 h-1.5 rounded-full", isToday ? "bg-yellow-300" : "bg-amber-400")} />}
                            {concluidas > 0 && <span className={cn("w-1.5 h-1.5 rounded-full", isToday ? "bg-white/70" : "bg-emerald-400")} />}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* LISTA DO DIA ATUAL */}
          <div>
            <Card className="h-full">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Circle className="w-4 h-4 text-blue-600" />
                  {format(new Date(), "'Hoje,' dd 'de' MMMM", { locale: ptBR })}
                </h3>
                {isLoading && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-blue-500" /></div>}
                {!isLoading && (() => {
                  const hoje = tarefasVisiveis.filter(t => t.data && isSameDay(parseISO(t.data), new Date()));
                  return hoje.length === 0
                    ? <p className="text-sm text-slate-400 text-center py-4">Nenhuma tarefa para hoje 🎉</p>
                    : hoje.map(t => <TaskItem key={t.id} tarefa={t} />);
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* MODAL: TAREFAS DO DIA SELECIONADO */}
      <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              {selectedDay && format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {tarefasDoDia.length === 0 
              ? <p className="text-sm text-slate-400 text-center py-6">Nenhuma tarefa neste dia.</p>
              : tarefasDoDia.map(t => <TaskItem key={t.id} tarefa={t} />)
            }
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full text-blue-600 border-dashed border-blue-200"
            onClick={() => { setShowDayModal(false); setNewTask(prev => ({ ...prev, data: selectedDay ? format(selectedDay, 'yyyy-MM-dd') : '' })); setShowNewTask(true); }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar tarefa neste dia
          </Button>
        </DialogContent>
      </Dialog>

      {/* MODAL: NOVA TAREFA */}
      <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={newTask.titulo} onChange={e => setNewTask(p => ({ ...p, titulo: e.target.value }))} placeholder="O que precisa ser feito?" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={newTask.descricao} onChange={e => setNewTask(p => ({ ...p, descricao: e.target.value }))} placeholder="Detalhes opcionais..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data *</Label>
                <Input type="date" value={newTask.data} onChange={e => setNewTask(p => ({ ...p, data: e.target.value }))} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={newTask.tipo} onValueChange={v => setNewTask(p => ({ ...p, tipo: v, dono_id: '', dono_nome: '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral (todos)</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {newTask.tipo === 'individual' && isAdmin && (
              <div>
                <Label>Delegar para</Label>
                <Select value={newTask.dono_id} onValueChange={v => {
                  const u = usuarios.find(u => u.email === v);
                  setNewTask(p => ({ ...p, dono_id: v, dono_nome: u?.full_name || v }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar usuário..." /></SelectTrigger>
                  <SelectContent>
                    {usuarios.map(u => <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {newTask.tipo === 'individual' && !isAdmin && (
              <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">Será atribuída a você mesmo.</p>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewTask(false)}>Cancelar</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveTask} disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Plus className="w-4 h-4 mr-2" />} Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}