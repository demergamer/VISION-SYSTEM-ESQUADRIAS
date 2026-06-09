import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowUpCircle, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const hoje = () => new Date().toISOString().split('T')[0];
const MOTIVOS = ['Produção', 'Revenda', 'Perda', 'Uso Interno', 'Outros'];
const EMPTY = { insumo_id: '', data_movimentacao: hoje(), quantidade: '', motivo: '' };

export default function SaidaModal({ open, onClose, insumos, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) setForm({ ...EMPTY, data_movimentacao: hoje() }); }, [open]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const insumoSel = insumos.find(i => i.id === form.insumo_id);
  const qtd = parseFloat(form.quantidade) || 0;
  const estoqueInsuficiente = insumoSel && qtd > (insumoSel.quantidade_estoque || 0);

  const handleSave = async () => {
    if (!form.insumo_id || !form.quantidade || qtd <= 0) {
      toast.error('Selecione o insumo e informe uma quantidade válida.');
      return;
    }
    if (!form.motivo) {
      toast.error('Selecione o motivo da saída.');
      return;
    }
    setLoading(true);
    try {
      const insumo = insumos.find(i => i.id === form.insumo_id);
      await base44.entities.MovimentacaoAlmoxarifado.create({
        data_movimentacao: form.data_movimentacao,
        insumo_id: form.insumo_id,
        insumo_nome: insumo?.nome || '',
        tipo: 'saida',
        quantidade: qtd,
        motivo: form.motivo,
        valor_unitario: 0,
        valor_total: 0,
      });
      const novoEstoque = (insumo?.quantidade_estoque || 0) - qtd;
      await base44.entities.Insumo.update(form.insumo_id, { quantidade_estoque: novoEstoque });
      toast.success(`Saída registada! Novo estoque: ${novoEstoque}`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error('Erro: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-rose-600" />
            Nova Saída de Estoque
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-semibold text-slate-600">Insumo *</Label>
            <Select value={form.insumo_id} onValueChange={v => set('insumo_id', v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar insumo..." /></SelectTrigger>
              <SelectContent>
                {insumos.map(i => (
                  <SelectItem key={i.id} value={i.id}>
                    <span className="font-medium">{i.nome}</span>
                    <span className="text-xs text-slate-400 ml-2">Estoque: {i.quantidade_estoque ?? 0}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {insumoSel && (
              <p className="text-xs text-slate-500 mt-1">
                Estoque atual: <span className="font-bold text-slate-700">{insumoSel.quantidade_estoque ?? 0}</span>
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-600">Data *</Label>
              <Input type="date" value={form.data_movimentacao} onChange={e => set('data_movimentacao', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600">Quantidade Retirada *</Label>
              <Input type="number" min="0.01" step="0.01" value={form.quantidade} onChange={e => set('quantidade', e.target.value)} placeholder="0" className="mt-1" />
            </div>
          </div>
          {estoqueInsuficiente && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-700 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Atenção: quantidade maior que o estoque atual ({insumoSel.quantidade_estoque}). O estoque ficará negativo.
            </div>
          )}
          <div>
            <Label className="text-xs font-semibold text-slate-600">Motivo da Saída *</Label>
            <Select value={form.motivo} onValueChange={v => set('motivo', v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar motivo..." /></SelectTrigger>
              <SelectContent>
                {MOTIVOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-rose-600 hover:bg-rose-700">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Registar Saída
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}