import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, X } from "lucide-react";

export default function ConvidarUsuarioForm({ onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    email: '',
    role: 'user'
  });

  const handleSave = () => {
    if (!form.email) {
      alert('Por favor, informe o email do usuário');
      return;
    }
    onSave(form);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          Um email de convite será enviado para o usuário. Ele receberá instruções para criar sua senha e acessar o sistema.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email do Usuário *</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="usuario@empresa.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Perfil de Acesso *</Label>
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Usuário - Acesso ao Portal do Cliente</SelectItem>
              <SelectItem value="admin">Administrador - Acesso Total</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            {form.role === 'admin' 
              ? 'Administradores têm acesso a todas as funcionalidades do sistema'
              : 'Usuários têm acesso apenas ao Portal do Cliente com seus pedidos e cheques'
            }
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="button" onClick={handleSave} disabled={isLoading}>
          <UserPlus className="w-4 h-4 mr-2" />
          Enviar Convite
        </Button>
      </div>
    </div>
  );
}