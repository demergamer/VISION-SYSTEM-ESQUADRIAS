import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, X } from "lucide-react";
import { InputCpfCnpj } from "@/components/ui/input-mask";

export default function FornecedorForm({ fornecedor, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    codigo: fornecedor?.codigo || '',
    nome: fornecedor?.nome || '',
    cnpj: fornecedor?.cnpj || '',
    telefone: fornecedor?.telefone || '',
    email: fornecedor?.email || '',
    tipo: fornecedor?.tipo || 'material',
    observacao: fornecedor?.observacao || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="codigo">Código *</Label>
          <Input
            id="codigo"
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            placeholder="Ex: FOR001"
            required
            disabled={!!fornecedor}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nome">Nome/Razão Social *</Label>
          <Input
            id="nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome do fornecedor"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cnpj">CPF/CNPJ</Label>
          <InputCpfCnpj
            id="cnpj"
            value={form.cnpj}
            onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo</Label>
          <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="material">Material</SelectItem>
              <SelectItem value="servico">Serviço</SelectItem>
              <SelectItem value="equipamento">Equipamento</SelectItem>
              <SelectItem value="diversos">Diversos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            placeholder="(00) 00000-0000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="email@fornecedor.com"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="obs">Observações</Label>
          <Textarea
            id="obs"
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading} className={isLoading ? 'cursor-not-allowed opacity-70' : ''}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </>
          )}
        </Button>
      </div>
    </form>
  );
}