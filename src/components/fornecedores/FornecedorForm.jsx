import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, X, Search } from "lucide-react";
import { toast } from "sonner";

function formatCnpj(v) {
  const d = v.replace(/\D/g, '');
  if (d.length <= 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

async function gerarCodigoFornecedor(razaoSocial) {
  const todos = await base44.entities.Fornecedor.list('-created_date', 1);
  const ultimoNum = todos.length > 0
    ? Math.max(...todos.map(f => {
        const n = parseInt((f.codigo || '').split(' - ')[0]);
        return isNaN(n) ? 0 : n;
      })) + 1
    : 1;
  const stopwords = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'com', 'para', 'por', 'ltda', 'me', 'sa', 'eireli'];
  const abrev = (razaoSocial || '')
    .toUpperCase()
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopwords.includes(w.toLowerCase()))
    .slice(0, 3)
    .map(w => w[0])
    .join('');
  return `${ultimoNum} - ${abrev || 'FOR'}`;
}

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
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const cnpjTimeout = useRef(null);

  const buscarCnpj = async (cnpjRaw) => {
    const digits = cnpjRaw.replace(/\D/g, '');
    if (digits.length !== 14) return;
    setBuscandoCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) { toast.error('CNPJ não encontrado'); return; }
      const data = await res.json();
      const razao = data.razao_social || '';
      const codigo = !fornecedor ? await gerarCodigoFornecedor(razao) : form.codigo;
      setForm(f => ({
        ...f,
        codigo,
        nome: data.nome_fantasia || razao,
        observacao: [
          razao && `Razão Social: ${razao}`,
          data.cnae_fiscal_descricao && `CNAE: ${data.cnae_fiscal_descricao}`,
          data.logradouro && `End: ${data.logradouro}, ${data.numero || 's/n'} - ${data.municipio}/${data.uf}`
        ].filter(Boolean).join('\n')
      }));
      toast.success('CNPJ encontrado! Dados preenchidos.');
    } catch { toast.error('Erro ao buscar CNPJ'); }
    finally { setBuscandoCnpj(false); }
  };

  const handleCnpjChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 14);
    const formatted = formatCnpj(raw);
    setForm(f => ({ ...f, cnpj: formatted }));
    clearTimeout(cnpjTimeout.current);
    if (raw.length === 14) {
      cnpjTimeout.current = setTimeout(() => buscarCnpj(raw), 600);
    }
  };

  const handleNomeChange = async (e) => {
    const nome = e.target.value;
    setForm(f => ({ ...f, nome }));
    if (!fornecedor && !form.codigo && nome.length >= 3) {
      const codigo = await gerarCodigoFornecedor(nome);
      setForm(f => ({ ...f, nome, codigo }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nome) { toast.error('Informe o nome do fornecedor'); return; }
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Código (readonly, gerado automaticamente) */}
        <div className="space-y-2">
          <Label htmlFor="codigo">
            Código
            <span className="ml-2 text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Gerado automaticamente</span>
          </Label>
          <Input
            id="codigo"
            value={form.codigo}
            readOnly
            disabled
            placeholder="Calculado ao preencher o nome"
            className="bg-slate-50 text-slate-500 font-mono"
          />
        </div>

        {/* Nome */}
        <div className="space-y-2">
          <Label htmlFor="nome">Nome/Razão Social *</Label>
          <Input
            id="nome"
            value={form.nome}
            onChange={handleNomeChange}
            placeholder="Nome do fornecedor"
            required
          />
        </div>

        {/* CNPJ com busca automática */}
        <div className="space-y-2">
          <Label htmlFor="cnpj">
            CPF/CNPJ
            {buscandoCnpj && <Loader2 className="w-3 h-3 inline ml-2 animate-spin text-blue-500" />}
            {!buscandoCnpj && <span className="ml-2 text-[10px] text-slate-400">Preencha o CNPJ para auto-completar</span>}
          </Label>
          <div className="relative">
            <Input
              id="cnpj"
              value={form.cnpj}
              onChange={handleCnpjChange}
              placeholder="00.000.000/0000-00"
              maxLength={18}
            />
            {buscandoCnpj && <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-pulse" />}
          </div>
        </div>

        {/* Tipo */}
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

        {/* Telefone */}
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            placeholder="(00) 00000-0000"
          />
        </div>

        {/* Email */}
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

        {/* Observações */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="obs">Observações / Dados CNPJ</Label>
          <Textarea
            id="obs"
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            rows={3}
            className="text-xs"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4 mr-2" />Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || buscandoCnpj}>
          {isLoading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />Salvar</>
          )}
        </Button>
      </div>
    </form>
  );
}