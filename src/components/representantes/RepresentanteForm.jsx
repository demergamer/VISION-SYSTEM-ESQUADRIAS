import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, X, Loader2 } from "lucide-react";

export default function RepresentanteForm({ representante, onSave, onCancel, isLoading }) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    email: '', // Novo campo adicionado
    regiao: '',
    telefone: '',
    bloqueado: false
  });

  useEffect(() => {
    if (representante) {
      setForm({
        codigo: representante.codigo || '',
        nome: representante.nome || '',
        email: representante.email || '', // Carrega o email existente
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

        {/* --- NOVO CAMPO EMAIL --- */}
        <div className="space-y-2">
          <Label htmlFor="email">Email de Acesso *</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="email@exemplo.com"
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
          <p className="text-sm text-slate-500">Impede o acesso ao portal</p>
        </div>
        <Switch
          id="bloqueado"
          checked={form.bloqueado}
          onCheckedChange={(checked) => setForm({ ...form, bloqueado: checked })}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || isSaving}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="button" onClick={async () => {
          setIsSaving(true);
          try {
            await onSave(form);
          } finally {
            setIsSaving(false);
          }
        }} disabled={isLoading || isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {representante ? 'Atualizar' : 'Cadastrar'}
            </>
          )}
        </Button>
      </div>

      {/* Overlay de Loading */}
      {isSaving && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800">Salvando Representante</h3>
              <p className="text-sm text-slate-500">Aguarde um momento...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}