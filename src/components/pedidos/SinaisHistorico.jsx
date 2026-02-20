import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Upload, Eye, FileCheck, Loader2, CreditCard } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AdicionarChequeModal from './AdicionarChequeModal';

const TIPOS_PAGAMENTO = ['PIX', 'Dinheiro', 'Transferência', 'TED/DOC', 'Cheque', 'Cartão'];

function generateId() {
  return `sinal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function SinalDropzone({ sinalId, comprovante_url, onUpload, onRemove, uploading }) {
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) onUpload(files[0]);
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500">Comprovante</Label>
      {comprovante_url ? (
        <div className="flex items-center gap-2 bg-white border border-green-200 rounded-lg px-3 py-2">
          <FileCheck className="w-4 h-4 text-green-600 shrink-0" />
          <span className="text-xs text-slate-600 truncate flex-1">Comprovante enviado</span>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(comprovante_url, '_blank')}>
            <Eye className="w-3 h-3 text-blue-600" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
            <Trash2 className="w-3 h-3 text-red-500" />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all",
            uploading ? "bg-blue-50 border-blue-300" : "bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
          )}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} disabled={uploading} />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Enviando...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <Upload className="w-4 h-4" />
              <span className="text-xs">Arraste ou clique</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SinaisHistorico({ sinais = [], onChange }) {
  const [uploadingId, setUploadingId] = useState(null);

  const addSinal = () => {
    const novo = {
      id: generateId(),
      tipo_pagamento: 'PIX',
      valor: 0,
      comprovante_url: '',
      usado: false,
      data_inclusao: new Date().toISOString().split('T')[0]
    };
    onChange([...sinais, novo]);
  };

  const updateSinal = (id, field, value) => {
    onChange(sinais.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSinal = (id) => {
    onChange(sinais.filter(s => s.id !== id));
  };

  const handleUpload = async (id, file) => {
    setUploadingId(id);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      updateSinal(id, 'comprovante_url', result.file_url);
      toast.success('Comprovante enviado!');
    } catch {
      toast.error('Erro ao enviar comprovante');
    } finally {
      setUploadingId(null);
    }
  };

  const totalSinais = sinais.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0);

  return (
    <div className="space-y-3">
      {sinais.map((sinal, idx) => (
        <Card key={sinal.id} className={cn("p-4 border", sinal.usado ? "bg-slate-50 border-slate-200 opacity-70" : "bg-white border-blue-100")}>
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs font-bold text-slate-400 mt-1 shrink-0">#{idx + 1}</span>
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Tipo de Pagamento</Label>
                <Select value={sinal.tipo_pagamento} onValueChange={(v) => updateSinal(sinal.id, 'tipo_pagamento', v)} disabled={sinal.usado}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_PAGAMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Valor (R$)</Label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                  <Input
                    type="number" min="0" step="0.01"
                    value={sinal.valor}
                    onChange={(e) => updateSinal(sinal.id, 'valor', parseFloat(e.target.value) || 0)}
                    disabled={sinal.usado}
                    className="h-9 pl-8 text-sm font-bold text-blue-700"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <SinalDropzone
                  sinalId={sinal.id}
                  comprovante_url={sinal.comprovante_url}
                  uploading={uploadingId === sinal.id}
                  onUpload={(file) => handleUpload(sinal.id, file)}
                  onRemove={() => updateSinal(sinal.id, 'comprovante_url', '')}
                />
              </div>
            </div>
            {!sinal.usado && (
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0" onClick={() => removeSinal(sinal.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            {sinal.usado && (
              <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full shrink-0 self-start mt-1">Usado</span>
            )}
          </div>
        </Card>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addSinal} className="w-full border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 gap-2">
        <Plus className="w-4 h-4" /> Adicionar Sinal / Adiantamento
      </Button>

      {sinais.length > 0 && (
        <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-lg px-4 py-2">
          <span className="text-sm font-medium text-blue-700">Total dos Sinais:</span>
          <span className="font-bold text-blue-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSinais)}
          </span>
        </div>
      )}
    </div>
  );
}