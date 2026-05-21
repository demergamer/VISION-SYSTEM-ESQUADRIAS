import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Ticket, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import AnexosUpload from "./AnexosUpload";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const hoje = () => format(new Date(), 'yyyy-MM-dd');
const amanha = () => format(addDays(new Date(), 1), 'yyyy-MM-dd');

export default function CriarValeModal({ saldoAtual, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    funcionario: '',
    valor: '',
    classificacao: 'outro',
    motivo: '',
    data_lancamento: hoje(),
    data_uso: amanha(),
  });
  const [anexos, setAnexos] = useState([]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const valorNum = parseFloat(form.valor) || 0;
    if (valorNum <= 0) { toast.error('Valor deve ser maior que zero'); return; }
    if (valorNum > saldoAtual) { toast.error('Saldo insuficiente no caixa!'); return; }
    onSave({ ...form, valor: valorNum, anexos_complexos: anexos });
  };

  const valorNum = parseFloat(form.valor) || 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Saída imediata de caixa</p>
          <p className="text-xs text-amber-700">Saldo disponível: <strong>{formatCurrency(saldoAtual)}</strong></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs">Funcionário *</Label>
          <Input value={form.funcionario} onChange={e => set('funcionario', e.target.value)} placeholder="Nome completo" required />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Valor do Vale (R$) *</Label>
          <Input type="number" step="0.01" min="0.01" value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0,00" required />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Classificação *</Label>
          <Select value={form.classificacao} onValueChange={v => set('classificacao', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alimentacao">🍔 Alimentação</SelectItem>
              <SelectItem value="combustivel">⛽ Combustível</SelectItem>
              <SelectItem value="manutencao">🔧 Manutenção</SelectItem>
              <SelectItem value="material">📦 Material</SelectItem>
              <SelectItem value="servico">🛠️ Serviço</SelectItem>
              <SelectItem value="outro">📝 Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Data de Lançamento</Label>
          <Input type="date" value={form.data_lancamento} onChange={e => set('data_lancamento', e.target.value)} />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Data de Uso Previsto</Label>
          <Input type="date" value={form.data_uso} onChange={e => set('data_uso', e.target.value)} />
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs">Motivo / Descrição *</Label>
          <Textarea value={form.motivo} onChange={e => set('motivo', e.target.value)} placeholder="Para que será usado o vale?" rows={2} required />
        </div>
      </div>

      <AnexosUpload anexos={anexos} onChange={setAnexos} label="Comprovantes (opcional)" />

      {valorNum > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-xs text-slate-600">Saldo após vale</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(saldoAtual - valorNum)}</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-3 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
        <Button type="submit" disabled={isLoading} className="gap-2">
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Criando...</> : <><Ticket className="w-4 h-4" />Criar Vale</>}
        </Button>
      </div>
    </form>
  );
}