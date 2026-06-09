import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Package } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const EMPTY = { codigo: '', nome: '', preco_custo: '', estoque_minimo: '', fornecedores: ['', '', ''] };

export default function InsumoModal({ open, onClose, insumo, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (insumo) {
      const forn = Array.isArray(insumo.fornecedores) ? [...insumo.fornecedores] : [];
      while (forn.length < 3) forn.push('');
      setForm({ ...insumo, fornecedores: forn, preco_custo: insumo.preco_custo ?? '', estoque_minimo: insumo.estoque_minimo ?? '' });
    } else {
      setForm(EMPTY);
    }
  }, [insumo, open]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const setForn = (idx, value) => setForm(f => {
    const arr = [...f.fornecedores];
    arr[idx] = value;
    return { ...f, fornecedores: arr };
  });

  const handleSave = async () => {
    if (!form.codigo.trim() || !form.nome.trim()) {
      toast.error('Código e Nome são obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        codigo: form.codigo.trim(),
        nome: form.nome.trim(),
        fornecedores: form.fornecedores.filter(f => f.trim()),
        preco_custo: parseFloat(form.preco_custo) || 0,
        estoque_minimo: parseFloat(form.estoque_minimo) || 0,
      };
      if (insumo?.id) {
        await base44.entities.Insumo.update(insumo.id, payload);
        toast.success('Insumo atualizado!');
      } else {
        await base44.entities.Insumo.create(payload);
        toast.success('Insumo cadastrado!');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            {insumo ? 'Editar Insumo' : 'Novo Insumo'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-600">Código *</Label>
              <Input value={form.codigo} onChange={e => set('codigo', e.target.value)} placeholder="Ex: ALU-001" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600">Preço de Custo (R$)</Label>
              <Input type="number" min="0" step="0.01" value={form.preco_custo} onChange={e => set('preco_custo', e.target.value)} placeholder="0,00" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600">Nome *</Label>
            <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome do insumo" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600">
              Estoque Mínimo{' '}
              <span className="text-slate-400 font-normal">(Deixe 0 para ignorar alertas)</span>
            </Label>
            <Input type="number" min="0" value={form.estoque_minimo} onChange={e => set('estoque_minimo', e.target.value)} placeholder="0" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 block mb-2">Fornecedores Habituais</Label>
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <Input key={i} value={form.fornecedores[i]} onChange={e => setForn(i, e.target.value)} placeholder={`Fornecedor ${i + 1}`} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {insumo ? 'Salvar Alterações' : 'Cadastrar Insumo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}