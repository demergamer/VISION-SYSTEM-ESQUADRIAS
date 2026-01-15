import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, X } from "lucide-react";

export default function UsuarioForm({ user, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    full_name: '',
    setor: ''
  });

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        setor: user.setor || ''
      });
    }
  }, [user]);

  const handleSave = () => {
    onSave(form);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Nome Completo *</Label>
          <Input
            id="full_name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Nome completo do usuário"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={user?.email || ''}
            disabled
            className="bg-slate-100"
          />
          <p className="text-xs text-slate-500">O email não pode ser alterado</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="setor">Setor</Label>
          <Input
            id="setor"
            value={form.setor}
            onChange={(e) => setForm({ ...form, setor: e.target.value })}
            placeholder="Ex: Financeiro, Vendas, TI..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Perfil</Label>
          <Input
            id="role"
            value={user?.role === 'admin' ? 'Administrador' : 'Usuário'}
            disabled
            className="bg-slate-100"
          />
          <p className="text-xs text-slate-500">O perfil não pode ser alterado aqui</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="button" onClick={handleSave} disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          Salvar
        </Button>
      </div>
    </div>
  );
}