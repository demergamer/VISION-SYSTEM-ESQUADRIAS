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

export default function ModalSaida({ open, onClose, veiculo }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    motorista_nome: '',
    porteiro_saida: '',
    km_saida: '',
    combustivel_saida: '',
    destino: '',
    observacoes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.motorista_nome || !form.porteiro_saida || !form.km_saida || !form.combustivel_saida || !form.destino) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    const km = parseFloat(form.km_saida);
    if (km < (veiculo?.km_atual || 0)) {
      toast.error(`KM inválido! O veículo está em ${veiculo.km_atual} km. Valor não pode ser menor.`);
      return;
    }

    setSaving(true);
    try {
      await base44.entities.MovimentacaoPortaria.create({
        veiculo_id: veiculo.id,
        veiculo_placa: veiculo.placa,
        veiculo_modelo: veiculo.modelo,
        motorista_nome: form.motorista_nome,
        porteiro_saida: form.porteiro_saida,
        km_saida: km,
        combustivel_saida: form.combustivel_saida,
        destino: form.destino,
        observacoes: form.observacoes,
        data_saida: new Date().toISOString(),
        status: 'Aberto',
      });
      await base44.entities.Veiculo.update(veiculo.id, { status: 'Na Rua', km_atual: km, nivel_combustivel: form.combustivel_saida });
      qc.invalidateQueries({ queryKey: ['veiculos'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
      toast.success('Saída registrada com sucesso!');
      setForm({ motorista_nome: '', porteiro_saida: '', km_saida: '', combustivel_saida: '', destino: '', observacoes: '' });
      onClose();
    } catch (e) {
      toast.error('Erro ao registrar saída.');
    } finally {
      setSaving(false);
    }
  };

  if (!veiculo) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>🚗 Registrar Saída — {veiculo.placa}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Motorista *</Label>
            <Input value={form.motorista_nome} onChange={e => set('motorista_nome', e.target.value)} placeholder="Nome do motorista" />
          </div>
          <div>
            <Label>Porteiro Responsável *</Label>
            <PorteiroSelect value={form.porteiro_saida} onValueChange={v => set('porteiro_saida', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>KM Saída * <span className="text-xs text-slate-400">(atual: {veiculo.km_atual || 0})</span></Label>
              <Input type="number" value={form.km_saida} onChange={e => set('km_saida', e.target.value)} placeholder="Ex: 12500" />
            </div>
            <div>
              <Label>Combustível *</Label>
              <CombustivelSelect value={form.combustivel_saida} onValueChange={v => set('combustivel_saida', v)} />
            </div>
          </div>
          <div>
            <Label>Destino *</Label>
            <Input value={form.destino} onChange={e => set('destino', e.target.value)} placeholder="Ex: Zona Sul — Entrega" />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} placeholder="Opcional..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-red-600 hover:bg-red-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '✅ Confirmar Saída'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}