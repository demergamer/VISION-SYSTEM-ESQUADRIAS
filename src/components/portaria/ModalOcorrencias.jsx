import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Camera, Upload, AlertTriangle, Wrench, FileText } from 'lucide-react';
import { format } from 'date-fns';

const TIPO_ICONS = { Multa: '🚦', 'Manutenção': '🔧', Avaria: '💥', Outros: '📝' };
const TIPO_COLORS = { Multa: 'bg-red-100 text-red-700', 'Manutenção': 'bg-yellow-100 text-yellow-700', Avaria: 'bg-orange-100 text-orange-700', Outros: 'bg-slate-100 text-slate-700' };

function safeFormat(d) {
  try { const dt = new Date(d); if (isNaN(dt)) return '-'; return format(dt, 'dd/MM/yyyy'); } catch { return '-'; }
}

export default function ModalOcorrencias({ open, onClose, veiculo }) {
  const qc = useQueryClient();
  const fotoRef = useRef();
  const cameraRef = useRef();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [form, setForm] = useState({ tipo_ocorrencia: '', data_ocorrencia: '', valor: '', motorista_responsavel: '', descricao: '', foto_url: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: ocorrencias = [] } = useQuery({
    queryKey: ['ocorrencias', veiculo?.id],
    queryFn: () => base44.entities.OcorrenciaVeiculo.filter({ veiculo_id: veiculo.id }),
    enabled: !!veiculo?.id && open,
  });

  const handleFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('foto_url', file_url);
      toast.success('Foto enviada!');
    } catch { toast.error('Erro ao enviar foto.'); }
    finally { setUploadingFoto(false); }
  };

  const handleSubmit = async () => {
    if (!form.tipo_ocorrencia || !form.data_ocorrencia || !form.descricao) {
      toast.error('Tipo, Data e Descrição são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      await base44.entities.OcorrenciaVeiculo.create({
        veiculo_id: veiculo.id, veiculo_placa: veiculo.placa,
        tipo_ocorrencia: form.tipo_ocorrencia, data_ocorrencia: form.data_ocorrencia,
        valor: form.valor ? parseFloat(form.valor) : undefined,
        motorista_responsavel: form.motorista_responsavel, descricao: form.descricao, foto_url: form.foto_url,
      });
      qc.invalidateQueries({ queryKey: ['ocorrencias', veiculo.id] });
      toast.success('Ocorrência registrada!');
      setForm({ tipo_ocorrencia: '', data_ocorrencia: '', valor: '', motorista_responsavel: '', descricao: '', foto_url: '' });
      setShowForm(false);
    } catch { toast.error('Erro ao registrar.'); }
    finally { setSaving(false); }
  };

  if (!veiculo) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>📋 Ocorrências — {veiculo.placa} ({veiculo.modelo})</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          <div className="flex justify-end">
            <Button onClick={() => setShowForm(v => !v)} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Nova Ocorrência
            </Button>
          </div>

          {showForm && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo *</Label>
                  <Select value={form.tipo_ocorrencia} onValueChange={v => set('tipo_ocorrencia', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {['Multa', 'Manutenção', 'Avaria', 'Outros'].map(t => <SelectItem key={t} value={t}>{TIPO_ICONS[t]} {t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data *</Label>
                  <Input type="date" value={form.data_ocorrencia} onChange={e => set('data_ocorrencia', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input type="number" value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="Opcional" />
                </div>
                <div>
                  <Label>Motorista Responsável</Label>
                  <Input value={form.motorista_responsavel} onChange={e => set('motorista_responsavel', e.target.value)} placeholder="Nome do motorista" />
                </div>
              </div>
              <div>
                <Label>Descrição *</Label>
                <Textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={2} placeholder="Descreva a ocorrência..." />
              </div>
              <div>
                <Label>Foto</Label>
                <div className="flex gap-2 mt-1">
                  {form.foto_url ? (
                    <img src={form.foto_url} alt="" className="h-20 w-auto rounded border object-cover" />
                  ) : (
                    <>
                      <Button type="button" variant="outline" size="sm" onClick={() => fotoRef.current?.click()} disabled={uploadingFoto}>
                        {uploadingFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()} disabled={uploadingFoto}>
                        <Camera className="w-4 h-4" /> Câmera
                      </Button>
                      <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
                      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleSubmit} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
            </div>
          )}

          {ocorrencias.length === 0 ? (
            <div className="text-center py-10 text-slate-400">Nenhuma ocorrência registrada.</div>
          ) : (
            <div className="space-y-3">
              {[...ocorrencias].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(o => (
                <div key={o.id} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4">
                  {o.foto_url && <img src={o.foto_url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0 border" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={TIPO_COLORS[o.tipo_ocorrencia]}>{TIPO_ICONS[o.tipo_ocorrencia]} {o.tipo_ocorrencia}</Badge>
                      <span className="text-xs text-slate-400">{safeFormat(o.data_ocorrencia)}</span>
                      {o.valor > 0 && <span className="text-xs font-bold text-red-600 ml-auto">R$ {o.valor.toFixed(2)}</span>}
                    </div>
                    <p className="text-sm text-slate-700">{o.descricao}</p>
                    {o.motorista_responsavel && <p className="text-xs text-slate-400 mt-1">Motorista: {o.motorista_responsavel}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}