import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Video, Image as ImageIcon, FileText, Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ChequeAnexos({ cheque, onUpdate }) {
  const [anexos, setAnexos] = useState({
    video: cheque?.anexo_video_url || null,
    foto: cheque?.anexo_foto_url || null,
    comprovante: cheque?.anexo_comprovante_url || null
  });
  const [uploading, setUploading] = useState({ video: false, foto: false, comprovante: false });

  const handleUpload = async (tipo, file) => {
    if (!file) return;

    setUploading({ ...uploading, [tipo]: true });
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const campo = tipo === 'video' ? 'anexo_video_url' : tipo === 'foto' ? 'anexo_foto_url' : 'anexo_comprovante_url';
      
      await base44.entities.Cheque.update(cheque.id, { [campo]: file_url });
      setAnexos({ ...anexos, [tipo]: file_url });
      
      toast.success('Anexo enviado!');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Erro ao enviar anexo');
    } finally {
      setUploading({ ...uploading, [tipo]: false });
    }
  };

  const handleRemove = async (tipo) => {
    try {
      const campo = tipo === 'video' ? 'anexo_video_url' : tipo === 'foto' ? 'anexo_foto_url' : 'anexo_comprovante_url';
      await base44.entities.Cheque.update(cheque.id, { [campo]: null });
      setAnexos({ ...anexos, [tipo]: null });
      toast.success('Anexo removido');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Erro ao remover anexo');
    }
  };

  const SlotAnexo = ({ tipo, icon: Icon, label, accept }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      {anexos[tipo] ? (
        <div className="relative group">
          <a href={anexos[tipo]} target="_blank" rel="noopener noreferrer" className="block p-4 border-2 border-green-300 bg-green-50 rounded-xl text-center hover:bg-green-100 transition-colors">
            <Icon className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-700">Anexo Enviado</p>
          </a>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleRemove(tipo)}
            className="absolute top-2 right-2 h-6 w-6 bg-red-500 text-white hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <label className={cn(
          "flex flex-col items-center justify-center gap-2 h-24 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
          uploading[tipo] ? "border-blue-300 bg-blue-50" : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50"
        )}>
          {uploading[tipo] ? (
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          ) : (
            <Icon className="w-6 h-6 text-slate-400" />
          )}
          <span className="text-sm font-medium text-slate-600">
            {uploading[tipo] ? 'Enviando...' : 'Clique para anexar'}
          </span>
          <input type="file" accept={accept} onChange={(e) => handleUpload(tipo, e.target.files[0])} className="hidden" disabled={uploading[tipo]} />
        </label>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SlotAnexo tipo="video" icon={Video} label="Vídeo" accept="video/*" />
      <SlotAnexo tipo="foto" icon={ImageIcon} label="Foto" accept="image/*" />
      <SlotAnexo tipo="comprovante" icon={FileText} label="Comprovante" accept="image/*,.pdf" />
    </div>
  );
}