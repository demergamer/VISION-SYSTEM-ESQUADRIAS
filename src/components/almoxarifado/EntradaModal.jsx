import React, { useState, useEffect } from 'react';
import ModalContainer from '@/components/modals/ModalContainer';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const hoje = () => new Date().toISOString().split('T')[0];
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const EMPTY = { insumo_id: '', data_movimentacao: hoje(), quantidade: '', fornecedor: '', valor_unitario: '' };

export default function EntradaModal({ open, onClose, insumos, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) setForm({ ...EMPTY, data_movimentacao: hoje() }); }, [open]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const qtd = parseFloat(form.quantidade) || 0;
  const vUnit = parseFloat(form.valor_unitario) || 0;
  const valorTotal = qtd * vUnit;

  const insumoSel = insumos.find(i => i.id === form.insumo_id);
  const fornecedoresOpts = (insumoSel?.fornecedores || []).filter(Boolean);

  const handleSave = async () => {
    if (!form.insumo_id || !form.quantidade || parseFloat(form.quantidade) <= 0) {
      toast.error('Selecione o insumo e informe uma quantidade válida.');
      return;
    }
    setLoading(true);
    try {
      const insumo = insumos.find(i => i.id === form.insumo_id);
      await base44.entities.MovimentacaoAlmoxarifado.create({
        data_movimentacao: form.data_movimentacao,
        insumo_id: form.insumo_id,
        insumo_nome: insumo?.nome || '',
        tipo: 'entrada',
        quantidade: qtd,
        fornecedor: form.fornecedor || '',
        valor_unitario: vUnit,
        valor_total: valorTotal,
      });
      const novoEstoque = (insumo?.quantidade_estoque || 0) + qtd;
      await base44.entities.Insumo.update(form.insumo_id, { quantidade_estoque: novoEstoque });
      toast.success(`Entrada registada! Novo estoque: ${novoEstoque}`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error('Erro: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalContainer
      open={open}
      onClose={onClose}
      title="Nova Entrada de Estoque"
      description="Registar recebimento de insumos no almoxarifado"
      size="default"
    >
      <div className="space-y-4">
        <div>
          <Label className="text-xs font-semibold text-slate-600">Insumo *</Label>
          <Select value={form.insumo_id} onValueChange={v => set('insumo_id', v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar insumo..." /></SelectTrigger>
            <SelectContent>
              {insumos.map(i => (
                <SelectItem key={i.id} value={i.id}>
                  <span className="font-medium">{i.nome}</span>
                  <span className="text-xs text-slate-400 ml-2">({i.codigo})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold text-slate-600">Data *</Label>
            <Input type="date" value={form.data_movimentacao} onChange={e => set('data_movimentacao', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600">Quantidade Recebida *</Label>
            <Input type="number" min="0.01" step="0.01" value={form.quantidade} onChange={e => set('quantidade', e.target.value)} placeholder="0" className="mt-1" />
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-600">Fornecedor</Label>
          {fornecedoresOpts.length > 0 ? (
            <Select value={form.fornecedor} onValueChange={v => set('fornecedor', v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar fornecedor..." /></SelectTrigger>
              <SelectContent>
                {fornecedoresOpts.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                <SelectItem value="__outro">Outro...</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input value={form.fornecedor} onChange={e => set('fornecedor', e.target.value)} placeholder="Nome do fornecedor" className="mt-1" />
          )}
          {form.fornecedor === '__outro' && (
            <Input value="" onChange={e => set('fornecedor', e.target.value)} placeholder="Nome do fornecedor" className="mt-2" />
          )}
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-600">Valor Unitário de Compra (R$)</Label>
          <Input type="number" min="0" step="0.01" value={form.valor_unitario} onChange={e => set('valor_unitario', e.target.value)} placeholder="0,00" className="mt-1" />
        </div>
        {valorTotal > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
            <p className="text-xs text-emerald-600 font-medium">Valor Total do Pedido</p>
            <p className="text-2xl font-black text-emerald-700">{fmt(valorTotal)}</p>
            <p className="text-xs text-slate-400 mt-1">{qtd} un × {fmt(vUnit)}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Registar Entrada
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
}