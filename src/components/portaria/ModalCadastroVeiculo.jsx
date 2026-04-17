import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CombustivelSelect } from './PorteiroSelect';
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Camera, Upload, X } from 'lucide-react';

export default function ModalCadastroVeiculo({ open, onClose, veiculo: veiculoEdit }) {
  const qc = useQueryClient();
  const fotoRef = useRef();
  const cameraRef = useRef();
  const [form, setForm] = useState(() => veiculoEdit ? { ...veiculoEdit } : {
    placa: '', modelo: '', tipo: '', km_atual: '', nivel_combustivel: '', foto_url: '', crlv_documento: '', status: 'Na Empresa'
  });
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('foto_url', file_url);
      toast.success('Foto enviada!');
    } catch {
      toast.error('Erro ao enviar foto.');
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.placa || !form.modelo || !form.tipo) {
      toast.error('Placa, Modelo e Tipo são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      const data = { ...form, km_atual: parseFloat(form.km_atual) || 0 };
      if (veiculoEdit) {
        await base44.entities.Veiculo.update(veiculoEdit.id, data);
        toast.success('Veículo atualizado!');
      } else {
        await base44.entities.Veiculo.create(data);
        toast.success('Veículo cadastrado!');
      }
      qc.invalidateQueries({ queryKey: ['veiculos'] });
      onClose();
    } catch {
      toast.error('Erro ao salvar veículo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{veiculoEdit ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Foto */}
          <div>
            <Label>Foto do Veículo</Label>
            <div className="mt-1 flex gap-2">
              {form.foto_url ? (
                <div className="relative w-full">
                  <img src={form.foto_url} alt="Veículo" className="w-full h-40 object-cover rounded-lg border" />
                  <button onClick={() => set('foto_url', '')} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 w-full">
                  <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => fotoRef.current?.click()} disabled={uploadingFoto}>
                    {uploadingFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => cameraRef.current?.click()} disabled={uploadingFoto}>
                    <Camera className="w-4 h-4" /> Câmera
                  </Button>
                  <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Placa *</Label>
              <Input value={form.placa} onChange={e => set('placa', e.target.value.toUpperCase())} placeholder="ABC-1234" />
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => set('tipo', v)}>
                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Carro">🚗 Carro</SelectItem>
                  <SelectItem value="Caminhao">🚚 Caminhão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Modelo *</Label>
            <Input value={form.modelo} onChange={e => set('modelo', e.target.value)} placeholder="Ex: Fiat Strada" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>KM Atual</Label>
              <Input type="number" value={form.km_atual} onChange={e => set('km_atual', e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Combustível</Label>
              <CombustivelSelect value={form.nivel_combustivel} onValueChange={v => set('nivel_combustivel', v)} />
            </div>
          </div>
          <div>
            <Label>Dados CRLV / Observações do Documento</Label>
            <Input value={form.crlv_documento} onChange={e => set('crlv_documento', e.target.value)} placeholder="Nº do CRLV, validade, etc." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Veículo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}