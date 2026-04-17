import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PorteiroSelect, CombustivelSelect } from './PorteiroSelect';
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

export default function ModalRetorno({ open, onClose, veiculo, movimentacao }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ porteiro_entrada: '', km_entrada: '', combustivel_entrada: '', observacoes: '' });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.porteiro_entrada || !form.km_entrada || !form.combustivel_entrada) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    const km = parseFloat(form.km_entrada);
    const kmSaida = movimentacao?.km_saida || veiculo?.km_atual || 0;
    if (km < kmSaida) {
      toast.error(`KM inválido! KM de saída foi ${kmSaida}. Valor de entrada não pode ser menor.`);
      return;
    }

    setSaving(true);
    try {
      await base44.entities.MovimentacaoPortaria.update(movimentacao.id, {
        porteiro_entrada: form.porteiro_entrada,
        km_entrada: km,
        combustivel_entrada: form.combustivel_entrada,
        observacoes: form.observacoes || movimentacao.observacoes,
        data_entrada: new Date().toISOString(),
        status: 'Fechado',
      });
      await base44.entities.Veiculo.update(veiculo.id, {
        status: 'Na Empresa',
        km_atual: km,
        nivel_combustivel: form.combustivel_entrada,
      });
      qc.invalidateQueries({ queryKey: ['veiculos'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
      toast.success('Retorno registrado com sucesso!');
      setForm({ porteiro_entrada: '', km_entrada: '', combustivel_entrada: '', observacoes: '' });
      onClose();
    } catch (e) {
      toast.error('Erro ao registrar retorno.');
    } finally {
      setSaving(false);
    }
  };

  if (!veiculo) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>🏁 Registrar Retorno — {veiculo.placa}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 space-y-1">
            <p><span className="font-medium">Motorista:</span> {movimentacao?.motorista_nome}</p>
            <p><span className="font-medium">Destino:</span> {movimentacao?.destino}</p>
            <p><span className="font-medium">KM Saída:</span> {movimentacao?.km_saida}</p>
          </div>
          <div>
            <Label>Porteiro Responsável *</Label>
            <PorteiroSelect value={form.porteiro_entrada} onValueChange={v => set('porteiro_entrada', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>KM Entrada *</Label>
              <Input type="number" value={form.km_entrada} onChange={e => set('km_entrada', e.target.value)} placeholder={`Mín: ${movimentacao?.km_saida || 0}`} />
            </div>
            <div>
              <Label>Combustível *</Label>
              <CombustivelSelect value={form.combustivel_entrada} onValueChange={v => set('combustivel_entrada', v)} />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} placeholder="Opcional..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '✅ Confirmar Retorno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}