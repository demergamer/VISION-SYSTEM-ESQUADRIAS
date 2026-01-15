import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, X } from "lucide-react";

export default function RepresentanteForm({ representante, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    regiao: '',
    telefone: '',
    bloqueado: false
  });

  useEffect(() => {
    if (representante) {
      setForm({
        codigo: representante.codigo || '',
        nome: representante.nome || '',
        regiao: representante.regiao || '',
        telefone: representante.telefone || '',
        bloqueado: representante.bloqueado || false
      });
    }
  }, [representante]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="codigo">Código *</Label>
          <Input
            id="codigo"
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            placeholder="Ex: REP001"
            disabled={!!representante}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome">Nome Completo *</Label>
          <Input
            id="nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome do representante"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="regiao">Região de Serviço</Label>
          <Input
            id="regiao"
            value={form.regiao}
            onChange={(e) => setForm({ ...form, regiao: e.target.value })}
            placeholder="Ex: Sul, Sudeste, Norte"
          />
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
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
        <div>
          <Label htmlFor="bloqueado" className="font-medium">Bloquear Representante</Label>
          <p className="text-sm text-slate-500">Impede novas operações</p>
        </div>
        <Switch
          id="bloqueado"
          checked={form.bloqueado}
          onCheckedChange={(checked) => setForm({ ...form, bloqueado: checked })}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="button" onClick={() => onSave(form)} disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {representante ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </div>
  );
}