import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Save, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function GerarCreditoManual({ clientes, onSave, onCancel }) {
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    cliente_codigo: '',
    valor: '',
    justificativa: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.cliente_codigo || !form.valor || !form.justificativa) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      const cliente = clientes.find(c => c.codigo === form.cliente_codigo);
      const todosCreditos = await base44.entities.Credito.list();
      const proximoNumero = todosCreditos.length > 0 
        ? Math.max(...todosCreditos.map(c => c.numero_credito || 0)) + 1 
        : 1;

      await base44.entities.Credito.create({
        numero_credito: proximoNumero,
        cliente_codigo: form.cliente_codigo,
        cliente_nome: cliente?.nome || '',
        valor: parseFloat(form.valor),
        origem: `Gerado Manualmente`,
        justificativa: form.justificativa,
        tipo_geracao: 'manual',
        status: 'disponivel'
      });

      toast.success('Crédito manual gerado com sucesso!');
      onSave();
    } catch (error) {
      toast.error('Erro ao gerar crédito');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cliente">Cliente *</Label>
          <Select value={form.cliente_codigo} onValueChange={(v) => setForm({...form, cliente_codigo: v})}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map(c => (
                <SelectItem key={c.codigo} value={c.codigo}>
                  {c.codigo} - {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="valor">Valor do Crédito (R$) *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="valor"
              type="number"
              min="0.01"
              step="0.01"
              value={form.valor}
              onChange={(e) => setForm({...form, valor: e.target.value})}
              className="pl-10"
              placeholder="0,00"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="justificativa">Justificativa * <span className="text-red-500">(Obrigatório)</span></Label>
          <Textarea
            id="justificativa"
            value={form.justificativa}
            onChange={(e) => setForm({...form, justificativa: e.target.value})}
            placeholder="Explique o motivo da geração manual deste crédito..."
            rows={4}
            required
            className="resize-none"
          />
          <p className="text-xs text-slate-500">Esta justificativa será registrada no histórico do pedido quando o crédito for utilizado.</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Gerar Crédito
            </>
          )}
        </Button>
      </div>

      {isSaving && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800">Gerando Crédito</h3>
              <p className="text-sm text-slate-500">Registrando no sistema...</p>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}