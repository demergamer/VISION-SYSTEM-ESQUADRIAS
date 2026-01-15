import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X } from "lucide-react";

export default function ClienteForm({ cliente, representantes = [], onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    cnpj: '',
    regiao: '',
    representante_codigo: '',
    representante_nome: '',
    porcentagem_comissao: 5,
    telefone: '',
    email: '',
    score: '',
    data_consulta: '',
    limite_credito: 0,
    bloqueado_manual: false
  });

  useEffect(() => {
    if (cliente) {
      setForm({
        codigo: cliente.codigo || '',
        nome: cliente.nome || '',
        cnpj: cliente.cnpj || '',
        regiao: cliente.regiao || '',
        representante_codigo: cliente.representante_codigo || '',
        representante_nome: cliente.representante_nome || '',
        porcentagem_comissao: cliente.porcentagem_comissao || 5,
        telefone: cliente.telefone || '',
        email: cliente.email || '',
        score: cliente.score || '',
        data_consulta: cliente.data_consulta || '',
        limite_credito: cliente.limite_credito || 0,
        bloqueado_manual: cliente.bloqueado_manual || false
      });
    }
  }, [cliente]);

  const handleRepresentanteChange = (codigo) => {
    const rep = representantes.find(r => r.codigo === codigo);
    setForm({
      ...form,
      representante_codigo: codigo,
      representante_nome: rep?.nome || ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="codigo">Código *</Label>
          <Input
            id="codigo"
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            placeholder="Ex: CLI001"
            required
            disabled={cliente && cliente.id}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome">Nome / Razão Social *</Label>
          <Input
            id="nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome completo ou razão social"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input
            id="cnpj"
            value={form.cnpj}
            onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
            placeholder="00.000.000/0000-00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="regiao">Região</Label>
          <Input
            id="regiao"
            value={form.regiao}
            onChange={(e) => setForm({ ...form, regiao: e.target.value })}
            placeholder="Ex: Sul, Sudeste, Norte"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="representante">Representante *</Label>
          <Select
            value={form.representante_codigo}
            onValueChange={handleRepresentanteChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o representante" />
            </SelectTrigger>
            <SelectContent>
              {representantes.map((rep) => (
                <SelectItem key={rep.codigo} value={rep.codigo}>
                  {rep.codigo} - {rep.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="porcentagem">Comissão (%)</Label>
          <Input
            id="porcentagem"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={form.porcentagem_comissao}
            onChange={(e) => setForm({ ...form, porcentagem_comissao: parseFloat(e.target.value) || 0 })}
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

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="email@exemplo.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="score">Score de Crédito</Label>
          <Input
            id="score"
            value={form.score}
            onChange={(e) => setForm({ ...form, score: e.target.value })}
            placeholder="Ex: A, B, C ou pontuação"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="data_consulta">Data da Consulta</Label>
          <Input
            id="data_consulta"
            type="date"
            value={form.data_consulta}
            onChange={(e) => setForm({ ...form, data_consulta: e.target.value })}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="limite">Limite de Crédito (R$)</Label>
          <Input
            id="limite"
            type="number"
            min="0"
            step="100"
            value={form.limite_credito}
            onChange={(e) => setForm({ ...form, limite_credito: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
        <div>
          <Label htmlFor="bloqueado" className="font-medium">Bloquear Cliente</Label>
          <p className="text-sm text-slate-500">Impede novos pedidos</p>
        </div>
        <Switch
          id="bloqueado"
          checked={form.bloqueado_manual}
          onCheckedChange={(checked) => setForm({ ...form, bloqueado_manual: checked })}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {cliente ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );
}