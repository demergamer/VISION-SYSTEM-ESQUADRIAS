import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckSquare, Bell, Users, User, Repeat, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function NovaTarefaModal({ open, onClose, onCriar, usuarios, userAtual, isPending }) {
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    data_vencimento: '',
    tipo_evento: 'tarefa',
    escopo: 'geral',
    dono_id: '',
    dono_nome: '',
    regra_recorrencia: '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleCriar = () => {
    if (!form.titulo.trim()) { toast.error('Informe o título.'); return; }
    if (!form.data_vencimento) { toast.error('Informe a data.'); return; }

    const isDelegado = form.escopo === 'individual' && form.dono_id && form.dono_id !== userAtual?.email;
    onCriar({
      ...form,
      // Compatibilidade legada
      data: form.data_vencimento,
      tipo: form.escopo,
      criador_id: userAtual?.email,
      criador_nome: userAtual?.preferred_name || userAtual?.full_name || userAtual?.email,
      dono_id: form.escopo === 'individual' ? (form.dono_id || userAtual?.email) : userAtual?.email,
      dono_nome: form.escopo === 'individual' && form.dono_id
        ? form.dono_nome
        : (userAtual?.preferred_name || userAtual?.full_name),
      status: isDelegado ? 'pendente_aceite' : (form.escopo === 'geral' ? 'pendente' : 'aceita'),
      regra_recorrencia: form.regra_recorrencia || null,
      recorrencia_ativa: true,
    });
    setForm({ titulo: '', descricao: '', data_vencimento: '', tipo_evento: 'tarefa', escopo: 'geral', dono_id: '', dono_nome: '', regra_recorrencia: '' });
  };

  const isDelegando = form.escopo === 'individual' && form.dono_id && form.dono_id !== userAtual?.email;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" /> Nova Tarefa / Lembrete
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo Evento */}
          <div>
            <Label className="text-xs mb-2 block">Tipo *</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: 'tarefa', icon: CheckSquare, label: 'Tarefa', desc: 'Com checklist de conclusão', color: 'blue' },
                { v: 'lembrete', icon: Bell, label: 'Lembrete', desc: 'Apenas informativo', color: 'amber' },
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => set('tipo_evento', opt.v)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all",
                    form.tipo_evento === opt.v
                      ? `border-${opt.color}-500 bg-${opt.color}-50`
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <opt.icon className={cn("w-4 h-4 mb-1", form.tipo_evento === opt.v ? `text-${opt.color}-600` : "text-slate-400")} />
                  <p className="text-sm font-semibold text-slate-700">{opt.label}</p>
                  <p className="text-[10px] text-slate-400">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Escopo */}
          <div>
            <Label className="text-xs mb-2 block">Escopo *</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: 'geral', icon: Users, label: 'Geral', desc: 'Visível para todos os admins' },
                { v: 'individual', icon: User, label: 'Individual', desc: 'Específico para uma pessoa' },
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => set('escopo', opt.v)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all",
                    form.escopo === opt.v
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <opt.icon className={cn("w-4 h-4 mb-1", form.escopo === opt.v ? "text-purple-600" : "text-slate-400")} />
                  <p className="text-sm font-semibold text-slate-700">{opt.label}</p>
                  <p className="text-[10px] text-slate-400">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div>
            <Label className="text-xs">Título *</Label>
            <Input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Nome da tarefa" className="mt-1" />
          </div>

          {/* Descrição */}
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={2} className="mt-1" />
          </div>

          {/* Data */}
          <div>
            <Label className="text-xs">Data *</Label>
            <Input type="date" value={form.data_vencimento} onChange={e => set('data_vencimento', e.target.value)} className="mt-1" />
          </div>

          {/* Delegar (individual) */}
          {form.escopo === 'individual' && (
            <div>
              <Label className="text-xs">Executar por</Label>
              <Select value={form.dono_id || userAtual?.email} onValueChange={v => {
                const u = usuarios.find(u => u.email === v);
                set('dono_id', v);
                set('dono_nome', u?.preferred_name || u?.full_name || v);
              }}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {usuarios.map(u => (
                    <SelectItem key={u.id} value={u.email}>{u.preferred_name || u.full_name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isDelegando && (
                <p className="text-xs text-amber-600 mt-1">⚠️ A tarefa será enviada para aceite do destinatário.</p>
              )}
            </div>
          )}

          {/* Recorrência */}
          <div>
            <Label className="text-xs flex items-center gap-1"><Repeat className="w-3 h-3" /> Recorrência</Label>
            <Select value={form.regra_recorrencia || 'nenhuma'} onValueChange={v => set('regra_recorrencia', v === 'nenhuma' ? '' : v)}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Sem recorrência</SelectItem>
                <SelectItem value="diaria">Diária</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleCriar} disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Criar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}