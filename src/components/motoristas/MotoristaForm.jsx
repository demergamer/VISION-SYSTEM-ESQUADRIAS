import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, X } from "lucide-react";

export default function MotoristaForm({ motorista, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    nome_social: '',
    foto_url: '',
    telefone: '',
    chave_pix: '',
    ativo: true
  });

  useEffect(() => {
    if (motorista) setForm({ ...form, ...motorista });
  }, [motorista]);

  const inputClass = "h-10 rounded-lg border-slate-200 bg-slate-50 focus:bg-white";

  return (
    <div className="space-y-4 py-2">
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
          <Label>URL da Foto</Label>
          <Input value={form.foto_url} onChange={e => setForm({ ...form, foto_url: e.target.value })} placeholder="https://..." className={inputClass} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}><X className="w-4 h-4 mr-2" />Cancelar</Button>
        <Button onClick={() => onSave(form)} disabled={isLoading || !form.nome} className="bg-blue-600 hover:bg-blue-700 text-white">
          {isLoading ? <span className="animate-spin mr-2">⏳</span> : <Save className="w-4 h-4 mr-2" />}
          {motorista ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </div>
  );
}