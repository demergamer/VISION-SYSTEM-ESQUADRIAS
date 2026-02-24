import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Save, X, Camera, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function MotoristaForm({ motorista, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    nome_social: '',
    foto_url: '',
    telefone: '',
    chave_pix: '',
    email: '',
    ativo: true
  });
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (motorista) setForm({ ...form, ...motorista });
  }, [motorista]);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(p => ({ ...p, foto_url: file_url }));
      toast.success('Foto carregada!');
    } catch {
      toast.error('Erro ao fazer upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  };

  const inputClass = "h-10 rounded-lg border-slate-200 bg-slate-50 focus:bg-white";

  return (
    <div className="space-y-4 py-2">
      {/* Upload de Foto */}
      <div className="space-y-2">
        <Label>Foto de Perfil</Label>
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 border-2 border-slate-200 shrink-0">
            {form.foto_url && <AvatarImage src={form.foto_url} className="object-cover" />}
            <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-lg">
              {(form.nome_social || form.nome || 'M').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex-1 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all",
              dragging ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
            )}
          >
            {uploading
              ? <div className="flex items-center justify-center gap-2 text-blue-600"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Enviando...</span></div>
              : <>
                  <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">Arraste ou <span className="text-blue-600 font-semibold">clique</span> para selecionar</p>
                </>
            }
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Código</Label>
          <Input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="Ex: 045" className={inputClass} />
        </div>
        <div className="space-y-1">
          <Label>Nome Completo *</Label>
          <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome do motorista" className={inputClass} />
        </div>
        <div className="space-y-1">
          <Label>Nome Social</Label>
          <Input value={form.nome_social} onChange={e => setForm({ ...form, nome_social: e.target.value })} placeholder="Como prefere ser chamado" className={inputClass} />
        </div>
        <div className="space-y-1">
          <Label>Telefone</Label>
          <Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-9999" className={inputClass} />
        </div>
        <div className="space-y-1">
          <Label>Chave PIX</Label>
          <Input value={form.chave_pix} onChange={e => setForm({ ...form, chave_pix: e.target.value })} placeholder="CPF, email, celular..." className={inputClass} />
        </div>
        <div className="space-y-1">
          <Label>E-mail de Acesso</Label>
          <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="motorista@email.com" className={inputClass} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}><X className="w-4 h-4 mr-2" />Cancelar</Button>
        <Button onClick={() => onSave(form)} disabled={isLoading || !form.nome || uploading} className="bg-blue-600 hover:bg-blue-700 text-white">
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {motorista ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </div>
  );
}