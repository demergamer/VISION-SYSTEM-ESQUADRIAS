import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";

export default function SolicitarNovoCliente({ representanteCodigo, onSuccess, onCancel }) {
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    cnpj: '',
    regiao: '',
    observacao: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nome || !form.email || !form.telefone) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      await base44.entities.SolicitacaoCadastroCliente.create({
        ...form,
        solicitante_tipo: 'representante',
        representante_solicitante_codigo: representanteCodigo,
        status: 'pendente'
      });

      toast.success('Solicitação enviada para análise!');
      onSuccess();
    } catch (error) {
      toast.error('Erro ao enviar solicitação');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome/Razão Social *</Label>
          <Input id="nome" value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input id="cnpj" value={form.cnpj} onChange={(e) => setForm({...form, cnpj: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone *</Label>
          <Input id="telefone" value={form.telefone} onChange={(e) => setForm({...form, telefone: e.target.value})} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="regiao">Região</Label>
          <Input id="regiao" value={form.regiao} onChange={(e) => setForm({...form, regiao: e.target.value})} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="obs">Observações</Label>
          <Textarea id="obs" value={form.observacao} onChange={(e) => setForm({...form, observacao: e.target.value})} rows={3} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
          {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4 mr-2" /> Enviar Solicitação</>}
        </Button>
      </div>
    </form>
  );
}