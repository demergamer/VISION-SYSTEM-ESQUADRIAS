import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import AnexosUpload from "./AnexosUpload";

export default function EditarValeModal({ vale, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    funcionario: vale?.funcionario || '',
    valor: vale?.valor || '',
    classificacao: vale?.classificacao || 'outro',
    motivo: vale?.motivo || '',
    data_lancamento: vale?.data_lancamento || '',
    data_uso: vale?.data_uso || '',
  });
  const [anexos, setAnexos] = useState(vale?.anexos_complexos || []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const agora = format(new Date(), "dd/MM/yyyy HH:mm");
    const campos = [];
    if (form.funcionario !== vale.funcionario) campos.push(`Funcionário: "${vale.funcionario}" → "${form.funcionario}"`);
    if (parseFloat(form.valor) !== vale.valor) campos.push(`Valor: ${vale.valor} → ${form.valor}`);
    if (form.motivo !== vale.motivo) campos.push(`Motivo atualizado`);
    if (form.data_lancamento !== vale.data_lancamento) campos.push(`Data lançamento: ${vale.data_lancamento} → ${form.data_lancamento}`);
    if (form.data_uso !== vale.data_uso) campos.push(`Data uso: ${vale.data_uso} → ${form.data_uso}`);

    const logEdicao = campos.length > 0
      ? `\n[Edição ${agora}]: ${campos.join(' | ')}`
      : '';

    onSave({
      ...form,
      valor: parseFloat(form.valor) || vale.valor,
      anexos_complexos: anexos,
      observacoes: (vale.observacoes || '') + logEdicao,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
        Vale Nº <strong>#{vale?.ticket_id}</strong> — alterações serão registradas automaticamente nas observações.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs">Funcionário *</Label>
          <Input value={form.funcionario} onChange={e => set('funcionario', e.target.value)} required />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Valor (R$) *</Label>
          <Input type="number" step="0.01" min="0.01" value={form.valor} onChange={e => set('valor', e.target.value)} required />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Classificação</Label>
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
          <Label className="text-xs">Motivo</Label>
          <Textarea value={form.motivo} onChange={e => set('motivo', e.target.value)} rows={2} />
        </div>
      </div>

      <AnexosUpload anexos={anexos} onChange={setAnexos} label="Anexos do Vale" />

      {vale?.observacoes && (
        <div className="p-3 bg-slate-50 border rounded-xl">
          <p className="text-xs font-semibold text-slate-600 mb-1">📋 Histórico de Edições</p>
          <pre className="text-xs text-slate-500 whitespace-pre-wrap font-mono">{vale.observacoes}</pre>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-3 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
        <Button type="submit" disabled={isLoading} className="gap-2">
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Save className="w-4 h-4" />Salvar Alterações</>}
        </Button>
      </div>
    </form>
  );
}