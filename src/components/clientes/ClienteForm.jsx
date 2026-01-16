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
import { Save, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ClienteForm({ cliente, representantes = [], todosClientes = [], onSave, onCancel, isLoading }) {
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

  const [errors, setErrors] = useState({});

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

  const validate = () => {
    const newErrors = {};
    const isEdit = !!cliente?.id;

    // Verificar Código Duplicado
    if (form.codigo) {
      const exists = todosClientes.some(c => 
        c.codigo?.toLowerCase() === form.codigo.toLowerCase() && 
        (!isEdit || c.id !== cliente.id)
      );
      if (exists) newErrors.codigo = "Código já cadastrado.";
    } else {
      newErrors.codigo = "Código é obrigatório.";
    }

    // Verificar Nome Duplicado
    if (form.nome) {
      const exists = todosClientes.some(c => 
        c.nome?.toLowerCase() === form.nome.toLowerCase() && 
        (!isEdit || c.id !== cliente.id)
      );
      if (exists) newErrors.nome = "Nome/Razão Social já cadastrado.";
    } else {
      newErrors.nome = "Nome é obrigatório.";
    }

    // Verificar CNPJ Duplicado
    if (form.cnpj) {
        // Remover caracteres não numéricos para comparação
        const cleanCNPJ = form.cnpj.replace(/\D/g, '');
        const exists = todosClientes.some(c => {
            const existingClean = c.cnpj?.replace(/\D/g, '') || '';
            return existingClean === cleanCNPJ && (!isEdit || c.id !== cliente.id);
        });
        if (exists) newErrors.cnpj = "CNPJ já cadastrado.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSave(form);
    } else {
      toast.error("Verifique os erros no formulário.");
    }
  };

  const inputClass = "h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1 mb-1.5 block";

  return (
    <div className="space-y-8 py-2">
      {/* Seção Principal */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium text-slate-900 border-b pb-2 mb-4">Informações Básicas</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <Label htmlFor="codigo" className={labelClass}>Código *</Label>
            <Input
              id="codigo"
              value={form.codigo}
              onChange={(e) => {
                setForm({ ...form, codigo: e.target.value });
                if (errors.codigo) setErrors({...errors, codigo: null});
              }}
              placeholder="Ex: CLI001"
              disabled={!!cliente?.id}
              className={cn(inputClass, errors.codigo && "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100")}
            />
            {errors.codigo && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.codigo}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="nome" className={labelClass}>Nome / Razão Social *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => {
                setForm({ ...form, nome: e.target.value });
                if (errors.nome) setErrors({...errors, nome: null});
              }}
              placeholder="Nome completo ou razão social"
              className={cn(inputClass, errors.nome && "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100")}
            />
            {errors.nome && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.nome}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cnpj" className={labelClass}>CNPJ</Label>
            <Input
              id="cnpj"
              value={form.cnpj}
              onChange={(e) => {
                setForm({ ...form, cnpj: e.target.value });
                if (errors.cnpj) setErrors({...errors, cnpj: null});
              }}
              placeholder="00.000.000/0000-00"
              className={cn(inputClass, errors.cnpj && "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100")}
            />
            {errors.cnpj && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.cnpj}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="regiao" className={labelClass}>Região</Label>
            <Input
              id="regiao"
              value={form.regiao}
              onChange={(e) => setForm({ ...form, regiao: e.target.value })}
              placeholder="Ex: Sul, Sudeste, Norte"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Seção Comercial */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium text-slate-900 border-b pb-2 mb-4">Dados Comerciais</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <Label htmlFor="representante" className={labelClass}>Representante *</Label>
            <Select
              value={form.representante_codigo}
              onValueChange={handleRepresentanteChange}
            >
              <SelectTrigger className={cn(inputClass, "w-full")}>
                <SelectValue placeholder="Selecione o representante" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {representantes.map((rep) => (
                  <SelectItem key={rep.codigo} value={rep.codigo}>
                    {rep.codigo} - {rep.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="porcentagem" className={labelClass}>Comissão (%)</Label>
            <div className="relative">
                <Input
                id="porcentagem"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.porcentagem_comissao}
                onChange={(e) => setForm({ ...form, porcentagem_comissao: parseFloat(e.target.value) || 0 })}
                className={cn(inputClass, "pr-8")}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">%</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="limite" className={labelClass}>Limite de Crédito</Label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                <Input
                id="limite"
                type="number"
                min="0"
                step="100"
                value={form.limite_credito}
                onChange={(e) => setForm({ ...form, limite_credito: parseFloat(e.target.value) || 0 })}
                className={cn(inputClass, "pl-9 font-medium text-slate-700")}
                />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="score" className={labelClass}>Score de Crédito</Label>
            <Input
              id="score"
              value={form.score}
              onChange={(e) => setForm({ ...form, score: e.target.value })}
              placeholder="Ex: A, B, C ou pontuação"
              className={inputClass}
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="data_consulta" className={labelClass}>Data da Consulta</Label>
            <Input
              id="data_consulta"
              type="date"
              value={form.data_consulta}
              onChange={(e) => setForm({ ...form, data_consulta: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Seção Contato */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium text-slate-900 border-b pb-2 mb-4">Contato</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <Label htmlFor="telefone" className={labelClass}>Telefone</Label>
            <Input
              id="telefone"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="(00) 00000-0000"
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="email" className={labelClass}>Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@exemplo.com"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Bloqueio */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <Label htmlFor="bloqueado" className="text-base font-semibold text-slate-800 cursor-pointer">Bloquear Cliente</Label>
          <p className="text-sm text-slate-500 mt-0.5">Impede a criação de novos pedidos para este cliente</p>
        </div>
        <Switch
          id="bloqueado"
          checked={form.bloqueado_manual}
          onCheckedChange={(checked) => setForm({ ...form, bloqueado_manual: checked })}
        />
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="h-11 px-6 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900">
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isLoading} className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200">
          <Save className="w-4 h-4 mr-2" />
          {cliente ? 'Salvar Alterações' : 'Cadastrar Cliente'}
        </Button>
      </div>
    </div>
  );
}