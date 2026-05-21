import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, X, Search, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatCnpj(v) {
  const d = v.replace(/\D/g, '');
  if (d.length <= 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

async function gerarCodigoFornecedor(razaoSocial) {
  const todos = await base44.entities.Fornecedor.list('-created_date', 200);
  const ultimoNum = todos.length > 0
    ? Math.max(...todos.map(f => {
        const n = parseInt((f.codigo || '').split(' - ')[0]);
        return isNaN(n) ? 0 : n;
      })) + 1
    : 1;
  const stopwords = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'com', 'para', 'por', 'ltda', 'me', 'sa', 'eireli', 'epp', 'ss'];
  const abrev = (razaoSocial || '')
    .toUpperCase()
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopwords.includes(w.toLowerCase()))
    .slice(0, 3)
    .map(w => w[0])
    .join('');
  return `${ultimoNum} - ${abrev || 'FOR'}`;
}

// Busca com retry automático até MAX_RETRIES tentativas
async function buscarCnpjComRetry(digits, maxRetries = 5, delay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (res.status === 429 || res.status >= 500) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, delay * attempt));
          continue;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      if (res.status === 404) throw new Error('CNPJ não encontrado na Receita Federal');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, delay * attempt));
    }
  }
}

export default function FornecedorForm({ fornecedor, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    codigo:               fornecedor?.codigo || '',
    nome:                 fornecedor?.nome || '',
    razao_social:         fornecedor?.razao_social || '',
    cnpj:                 fornecedor?.cnpj || '',
    telefone:             fornecedor?.telefone || '',
    email:                fornecedor?.email || '',
    tipo:                 fornecedor?.tipo || 'material',
    logradouro:           fornecedor?.logradouro || '',
    numero:               fornecedor?.numero || '',
    complemento:          fornecedor?.complemento || '',
    bairro:               fornecedor?.bairro || '',
    municipio:            fornecedor?.municipio || '',
    uf:                   fornecedor?.uf || '',
    cep:                  fornecedor?.cep || '',
    cnae_principal:       fornecedor?.cnae_principal || '',
    cnaes_secundarios:    fornecedor?.cnaes_secundarios || [],
    porte:                fornecedor?.porte || '',
    natureza_juridica:    fornecedor?.natureza_juridica || '',
    situacao_cadastral:   fornecedor?.situacao_cadastral || '',
    data_inicio_atividade: fornecedor?.data_inicio_atividade || '',
    observacao:           fornecedor?.observacao || '',
  });

  const [cnpjStatus, setCnpjStatus] = useState(null); // null | 'loading' | 'ok' | 'error'
  const [cnpjMensagem, setCnpjMensagem] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const cnpjTimeout = useRef(null);
  const cnpjDigitsRef = useRef('');

  const aplicarDadosCnpj = async (data) => {
    const razao = data.razao_social || '';
    const codigo = !fornecedor ? await gerarCodigoFornecedor(razao) : form.codigo;

    // CNAEs secundários: pega todos os disponíveis
    const cnaesSecundarios = (data.cnaes_secundarios || []).map(c =>
      `${c.codigo} - ${c.descricao}`
    );

    setForm(f => ({
      ...f,
      codigo,
      razao_social: razao,
      nome: data.nome_fantasia || razao,
      logradouro: data.logradouro || '',
      numero: data.numero || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      municipio: data.municipio || '',
      uf: data.uf || '',
      cep: (data.cep || '').replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2'),
      cnae_principal: data.cnae_fiscal
        ? `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao || ''}`
        : '',
      cnaes_secundarios: cnaesSecundarios,
      porte: data.porte || '',
      natureza_juridica: data.natureza_juridica || '',
      situacao_cadastral: data.descricao_situacao_cadastral || '',
      data_inicio_atividade: data.data_inicio_atividade || '',
    }));
  };

  const buscarCnpj = async (digits) => {
    if (digits.length !== 14) return;
    cnpjDigitsRef.current = digits;
    setCnpjStatus('loading');
    setCnpjMensagem('Consultando Receita Federal...');
    setTentativa(1);

    try {
      // Inicia com feedback de tentativas visível
      let attempt = 0;
      const maxRetries = 5;
      const baseDelay = 2000;
      let data = null;

      while (attempt < maxRetries) {
        attempt++;
        setTentativa(attempt);
        setCnpjMensagem(attempt > 1 ? `Tentativa ${attempt}/${maxRetries}...` : 'Consultando Receita Federal...');

        try {
          const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
          if (res.status === 404) {
            setCnpjStatus('error');
            setCnpjMensagem('CNPJ não encontrado na Receita Federal');
            toast.error('CNPJ não encontrado');
            return;
          }
          if (res.status === 429 || res.status >= 500) {
            if (attempt < maxRetries) {
              setCnpjMensagem(`Servidor ocupado. Aguardando e retentando (${attempt}/${maxRetries})...`);
              await new Promise(r => setTimeout(r, baseDelay * attempt));
              continue;
            }
            throw new Error(`Servidor indisponível após ${maxRetries} tentativas`);
          }
          if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
          data = await res.json();
          break;
        } catch (err) {
          if (attempt >= maxRetries) throw err;
          setCnpjMensagem(`Falha na tentativa ${attempt}. Retentando em ${attempt * 2}s...`);
          await new Promise(r => setTimeout(r, baseDelay * attempt));
        }
      }

      if (data) {
        await aplicarDadosCnpj(data);
        setCnpjStatus('ok');
        setCnpjMensagem('Dados preenchidos com sucesso!');
        toast.success('CNPJ encontrado! Dados preenchidos.');
      }
    } catch (err) {
      setCnpjStatus('error');
      setCnpjMensagem(err.message || 'Erro ao buscar CNPJ');
      toast.error('Não foi possível consultar o CNPJ. Preencha manualmente.');
    }
  };

  const handleCnpjChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 14);
    const formatted = formatCnpj(raw);
    setForm(f => ({ ...f, cnpj: formatted }));
    setCnpjStatus(null);
    setCnpjMensagem('');
    clearTimeout(cnpjTimeout.current);
    if (raw.length === 14) {
      cnpjTimeout.current = setTimeout(() => buscarCnpj(raw), 700);
    }
  };

  const handleNomeChange = async (e) => {
    const nome = e.target.value;
    setForm(f => ({ ...f, nome }));
    if (!fornecedor && nome.length >= 3) {
      const codigo = await gerarCodigoFornecedor(nome);
      setForm(f => ({ ...f, codigo }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nome) { toast.error('Informe o nome do fornecedor'); return; }
    onSave(form);
  };

  const isLoading_ = isLoading || cnpjStatus === 'loading';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Identificação ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">
            Código
            <span className="ml-2 text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Automático</span>
          </Label>
          <Input value={form.codigo} readOnly disabled placeholder="Gerado ao preencher nome/CNPJ" className="bg-slate-50 text-slate-500 font-mono text-xs" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="material">Material</SelectItem>
              <SelectItem value="servico">Serviço</SelectItem>
              <SelectItem value="equipamento">Equipamento</SelectItem>
              <SelectItem value="diversos">Diversos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* CNPJ com retry */}
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs flex items-center gap-2">
            CPF/CNPJ
            {cnpjStatus === 'loading' && <span className="flex items-center gap-1 text-blue-500 font-normal text-[10px]"><Loader2 className="w-3 h-3 animate-spin" />{cnpjMensagem}</span>}
            {cnpjStatus === 'ok' && <span className="flex items-center gap-1 text-green-600 font-normal text-[10px]"><CheckCircle className="w-3 h-3" />{cnpjMensagem}</span>}
            {cnpjStatus === 'error' && <span className="flex items-center gap-1 text-red-500 font-normal text-[10px]"><AlertCircle className="w-3 h-3" />{cnpjMensagem}</span>}
            {cnpjStatus === null && <span className="font-normal text-[10px] text-slate-400">Preencha para buscar automaticamente</span>}
          </Label>
          <div className="relative">
            <Input
              value={form.cnpj}
              onChange={handleCnpjChange}
              placeholder="00.000.000/0000-00"
              maxLength={18}
              className={cn(
                cnpjStatus === 'ok' && 'border-green-400 focus-visible:ring-green-400',
                cnpjStatus === 'error' && 'border-red-400 focus-visible:ring-red-400'
              )}
            />
            {cnpjStatus === 'loading' && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />}
            {cnpjStatus === 'ok' && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
            {cnpjStatus === 'error' && (
              <button type="button" title="Tentar novamente" onClick={() => buscarCnpj(form.cnpj.replace(/\D/g, ''))} className="absolute right-3 top-1/2 -translate-y-1/2">
                <RefreshCw className="w-4 h-4 text-red-400 hover:text-red-600" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Razão Social</Label>
          <Input value={form.razao_social} onChange={e => setForm(f => ({ ...f, razao_social: e.target.value }))} placeholder="Razão Social oficial" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Nome Fantasia / Apelido *</Label>
          <Input value={form.nome} onChange={handleNomeChange} placeholder="Nome usado no sistema" required />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Telefone</Label>
          <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Email</Label>
          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@fornecedor.com" />
        </div>
      </div>

      {/* ── Endereço ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">📍 Endereço</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Logradouro</Label>
            <Input value={form.logradouro} onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))} placeholder="Rua, Av..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Número</Label>
            <Input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="Nº" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Complemento</Label>
            <Input value={form.complemento} onChange={e => setForm(f => ({ ...f, complemento: e.target.value }))} placeholder="Sala, Bloco..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bairro</Label>
            <Input value={form.bairro} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} placeholder="Bairro" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">CEP</Label>
            <Input value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} placeholder="00000-000" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Município</Label>
            <Input value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} placeholder="Cidade" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">UF</Label>
            <Input value={form.uf} onChange={e => setForm(f => ({ ...f, uf: e.target.value }))} placeholder="SP" maxLength={2} className="uppercase" />
          </div>
        </div>
      </div>

      {/* ── CNAEs ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">🏭 CNAEs & Dados Fiscais</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">CNAE Principal</Label>
            <Input value={form.cnae_principal} onChange={e => setForm(f => ({ ...f, cnae_principal: e.target.value }))} placeholder="Ex: 4120-4/00 - Construção de edifícios" />
          </div>

          {form.cnaes_secundarios.length > 0 && (
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">CNAEs Secundários ({form.cnaes_secundarios.length})</Label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-lg border max-h-32 overflow-y-auto">
                {form.cnaes_secundarios.map((cnae, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] font-mono bg-white">{cnae}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Porte</Label>
            <Input value={form.porte} onChange={e => setForm(f => ({ ...f, porte: e.target.value }))} placeholder="ME, EPP, Grande..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Natureza Jurídica</Label>
            <Input value={form.natureza_juridica} onChange={e => setForm(f => ({ ...f, natureza_juridica: e.target.value }))} placeholder="Ex: Sociedade Empresária Limitada" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Situação Cadastral</Label>
            <Input value={form.situacao_cadastral} onChange={e => setForm(f => ({ ...f, situacao_cadastral: e.target.value }))} placeholder="ATIVA / INAPTA..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data de Início de Atividade</Label>
            <Input value={form.data_inicio_atividade} onChange={e => setForm(f => ({ ...f, data_inicio_atividade: e.target.value }))} placeholder="AAAA-MM-DD" />
          </div>
        </div>
      </div>

      {/* ── Observações ── */}
      <div className="space-y-1">
        <Label className="text-xs">Observações</Label>
        <Textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} rows={2} className="text-xs" />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading_}><X className="w-4 h-4 mr-2" />Cancelar</Button>
        <Button type="submit" disabled={isLoading_}>
          {isLoading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
            : cnpjStatus === 'loading'
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Buscando CNPJ...</>
            : <><Save className="w-4 h-4 mr-2" />Salvar</>
          }
        </Button>
      </div>
    </form>
  );
}