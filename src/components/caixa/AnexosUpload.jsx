import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, CheckCircle, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Componente reutilizável de upload com Drag & Drop e observação por arquivo.
 * Props:
 *   anexos: Array<{url, observacao, nome}>
 *   onChange: (novaLista) => void
 *   label: string (opcional)
 */
export default function AnexosUpload({ anexos = [], onChange, label = "Anexos" }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploads = await Promise.all(
        Array.from(files).map(file =>
          base44.integrations.Core.UploadFile({ file }).then(r => ({
            url: r.file_url,
            observacao: '',
            nome: file.name
          }))
        )
      );
      onChange([...anexos, ...uploads]);
      toast.success(`${uploads.length} arquivo(s) adicionado(s)!`);
    } catch {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    uploadFiles(e.dataTransfer.files);
  }, [anexos]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const updateObservacao = (idx, obs) => {
    onChange(anexos.map((a, i) => i === idx ? { ...a, observacao: obs } : a));
  };

  const removeAnexo = (idx) => {
    onChange(anexos.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-600">📎 {label}</p>

      <div
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 min-h-16 px-4 py-3 rounded-xl border-2 border-dashed transition-all cursor-pointer",
          isDragging ? "border-blue-500 bg-blue-50 scale-[1.01]" : "border-slate-300 bg-white hover:border-blue-400"
        )}
        onClick={() => document.getElementById(`upload-${label.replace(/\s/g, '')}`)?.click()}
      >
        {uploading ? (
          <><Loader2 className="w-5 h-5 animate-spin text-blue-600" /><span className="text-sm text-blue-700">Enviando...</span></>
        ) : (
          <><Upload className="w-5 h-5 text-slate-400" /><span className="text-sm text-slate-500">Arraste ou clique para anexar</span><span className="text-xs text-slate-400">PDF, Imagens, Excel</span></>
        )}
      </div>
      <input
        id={`upload-${label.replace(/\s/g, '')}`}
        type="file"
        multiple
        accept="image/*,.pdf,.xlsx,.xls"
        onChange={e => uploadFiles(e.target.files)}
        className="hidden"
      />

      {anexos.length > 0 && (
        <div className="space-y-2">
          {anexos.map((anexo, idx) => (
            <div key={idx} className="flex items-start gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600 mt-1 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <a href={anexo.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate flex-1">
                    <FileText className="w-3 h-3 inline mr-1" />{anexo.nome || `Anexo ${idx + 1}`}
                  </a>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeAnexo(idx)} className="text-red-500 h-5 w-5 p-0 shrink-0">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <Input
                  value={anexo.observacao}
                  onChange={e => updateObservacao(idx, e.target.value)}
                  placeholder="Nota interna sobre este arquivo..."
                  className="h-6 text-xs border-green-200"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}