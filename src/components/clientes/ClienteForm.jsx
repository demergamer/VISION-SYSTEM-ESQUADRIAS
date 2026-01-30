import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea"; // Importando Textarea
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, AlertCircle, Upload, Loader2, Search, Factory } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { InputCpfCnpj } from "@/components/ui/input-mask";
import { useQuery } from '@tanstack/react-query';

function FormasPagamentoSelector({ formasSelecionadas, onChange }) {
  const { data: formasCadastradas = [] } = useQuery({
    queryKey: ['formasPagamento'],
    queryFn: () => base44.entities.FormaPagamento.list()
  });

  const formasPadrao = ['Dinheiro', 'PIX', 'Cheque', 'Crédito', 'Boleto', 'Cartão'];
  const formasCustomizadas = formasCadastradas.filter(f => f.ativa).map(f => f.nome);
  const todasFormas = [...formasPadrao, ...formasCustomizadas];

  return (
    <div className="flex flex-wrap gap-2">
      {todasFormas.map(forma => (
        <button
          key={forma}
          type="button"
          onClick={() => {
            onChange(prev =>
              prev.includes(forma) ? prev.filter(f => f !== forma) : [...prev, forma]
            );
          }}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium transition-all",
            formasSelecionadas.includes(forma)
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          {forma}
        </button>
      ))}
    </div>
  );
}

export default function ClienteForm({ cliente, representantes = [], todosClientes = [], onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    codigo: '',
    nome: '', 
    razao_social: '', 
    nome_fantasia: '', 
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
    bloqueado_manual: false,
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: '',
    // Novos campos Fiscais
    cnaes_descricao: '', // Lista de CNAEs para visualização
    tem_st: false // Flag de Substituição Tributária
  });

  const [errors, setErrors] = useState({});
  const [serasaFile, setSerasaFile] = useState(null);
  const [serasaUploading, setSerasaUploading] = useState(false);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);

  useEffect(() => {
    if (cliente) {
      setForm({
        codigo: cliente.codigo || '',
        nome: cliente.nome || '',
        razao_social: cliente.razao_social || '',
        nome_fantasia: cliente.nome_fantasia || '',
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
        bloqueado_manual: cliente.bloqueado_manual || false,
        cep: cliente.cep || '',
        endereco: cliente.endereco || '',
        numero: cliente.numero || '',
        bairro: cliente.bairro || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        complemento: cliente.complemento || '',
        cnaes_descricao: cliente.cnaes_descricao || '',
        tem_st: cliente.tem_st || false
      });
      setFormasPagamento(cliente.formas_pagamento || []);
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

  // --- CONSULTA CNPJ & LÓGICA DE ST ---
  const handleConsultarCNPJ = async () => {
    const cnpjLimpo = form.cnpj?.replace(/\D/g, '');

    if (!cnpjLimpo || cnpjLimpo.length !== 14) {
      toast.error("Digite um CNPJ válido (14 dígitos) para consultar.");
      return;
    }

    setIsConsulting(true);
    const toastId = toast.loading("Consultando Receita Federal e CNAEs...");

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      
      if (!response.ok) {
        throw new Error('CNPJ não encontrado ou erro na API.');
      }

      const data = await response.json();

      // --- LÓGICA DE VERIFICAÇÃO ST ---
      // CNAEs que ativam o ST automaticamente (somente números)
      const cnaesComST = [
        '4744005', // Comércio varejista de materiais de construção não especificados
        '4744099', // Comércio varejista de materiais de construção em geral
        '4672900'  // Comércio atacadista de ferragens e ferramentas
      ];

      // Monta lista com Principal + Secundários
      const todosCnaesDaEmpresa = [
        { codigo: data.cnae_fiscal, descricao: data.cnae_fiscal_descricao },
        ...(data.cnaes_secundarios || [])
      ];

      // Verifica se ALGUM CNAE da empresa está na lista de ST
      const possuiST = todosCnaesDaEmpresa.some(cnae => {
        // Remove pontuação do código vindo da API para comparar
        const codigoLimpo = String(cnae.codigo).replace(/\D/g, '');
        return cnaesComST.includes(codigoLimpo);
      });

      // Cria um texto legível com todos os CNAEs para salvar no cadastro
      const textoCnaes = todosCnaesDaEmpresa
        .map(c => `${c.codigo} - ${c.descricao}`)
        .join('\n');

      setForm(prev => ({
        ...prev,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia || data.razao_social,
        nome: prev.nome || (data.nome_fantasia || data.razao_social),
        email: data.email || prev.email,
        telefone: data.ddd_telefone_1 || prev.telefone,
        cep: data.cep ? data.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : prev.cep,
        endereco: data.logradouro,
        numero: data.numero,
        bairro: data.bairro,
        cidade: data.municipio,
        estado: data.uf,
        complemento: data.complemento,
        data_consulta: new Date().toISOString().split('T')[0],
        // Novos Campos Preenchidos Automaticamente
        cnaes_descricao: textoCnaes,
        tem_st: possuiST
      }));

      toast.success(possuiST ? "Dados carregados. ATENÇÃO: Cliente tem ST!" : "Dados carregados com sucesso!", { id: toastId });

    } catch (error) {
      console.error(error);
      toast.error("Erro ao consultar CNPJ.", { id: toastId });
    } finally {
      setIsConsulting(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    const isEdit = !!cliente?.id;

    if (form.codigo) {
      const exists = todosClientes.some(c => 
        c.codigo?.toLowerCase() === form.codigo.toLowerCase() && 
        (!isEdit || c.id !== cliente.id)
      );
      if (exists) newErrors.codigo = "Código já cadastrado.";
    } else {
      newErrors.codigo = "Código é obrigatório.";
    }

    if (!form.nome) newErrors.nome = "Apelido é obrigatório.";

    if (form.cnpj) {
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

  const handleSerasaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSerasaUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setSerasaFile(file_url);
      toast.success('Arquivo Serasa enviado!');
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setSerasaUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (validate()) {
      setIsSaving(true);
      try {
        const dataToSave = {
          ...form,
          formas_pagamento: formasPagamento,
          serasa_file_url: serasaFile
        };
        await onSave(dataToSave);
      } finally {
        setIsSaving(false);
      }
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
            <Label htmlFor="cnpj" className={labelClass}>CPF/CNPJ</Label>
            <div className="flex gap-2">
              <InputCpfCnpj
                id="cnpj"
                value={form.cnpj}
                onChange={(e) => {
                  setForm({ ...form, cnpj: e.target.value });
                  if (errors.cnpj) setErrors({...errors, cnpj: null});
                }}
                className={cn(inputClass, errors.cnpj && "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100")}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleConsultarCNPJ}
                disabled={isConsulting}
                title="Consultar na Receita"
                className="shrink-0 h-11 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-700"
              >
                {isConsulting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                {isConsulting ? "..." : "Consultar"}
              </Button>
            </div>
            {errors.cnpj && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.cnpj}</p>}
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="nome" className={labelClass}>Apelido (Nome no Sistema) *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => {
                setForm({ ...form, nome: e.target.value });
                if (errors.nome) setErrors({...errors, nome: null});
              }}
              placeholder="Como este cliente é conhecido no sistema"
              className={cn(inputClass, "font-bold text-slate-700", errors.nome && "border-red-300 bg-red-50")}
            />
            <p className="text-[10px] text-slate-400 ml-1">Usado nas listagens rápidas.</p>
            {errors.nome && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.nome}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="razao_social" className={labelClass}>Razão Social</Label>
            <Input
              id="razao_social"
              value={form.razao_social}
              onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="nome_fantasia" className={labelClass}>Nome Fantasia</Label>
            <Input
              id="nome_fantasia"
              value={form.nome_fantasia}
              onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
              className={inputClass}
            />
          </div>

          {/* Endereço */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div className="space-y-1 md:col-span-1">
                <Label htmlFor="cep" className={labelClass}>CEP</Label>
                <Input id="cep" value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} className={cn(inputClass, "bg-white")} />
             </div>
             <div className="space-y-1 md:col-span-2">
                <Label htmlFor="endereco" className={labelClass}>Endereço</Label>
                <Input id="endereco" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className={cn(inputClass, "bg-white")} />
             </div>
             <div className="space-y-1">
                <Label htmlFor="numero" className={labelClass}>Número</Label>
                <Input id="numero" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} className={cn(inputClass, "bg-white")} />
             </div>
             <div className="space-y-1">
                <Label htmlFor="bairro" className={labelClass}>Bairro</Label>
                <Input id="bairro" value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} className={cn(inputClass, "bg-white")} />
             </div>
             <div className="space-y-1">
                <Label htmlFor="cidade" className={labelClass}>Cidade</Label>
                <Input id="cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className={cn(inputClass, "bg-white")} />
             </div>
             <div className="space-y-1">
                <Label htmlFor="regiao" className={labelClass}>Região</Label>
                <Input
                  id="regiao"
                  value={form.regiao}
                  onChange={(e) => setForm({ ...form, regiao: e.target.value })}
                  placeholder="Ex: Sul, Sudeste"
                  className={cn(inputClass, "bg-white")}
                />
             </div>
          </div>
        </div>
      </div>

      {/* CLASSIFICAÇÃO FISCAL (ST) */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium text-slate-900 border-b pb-2 mb-4 flex items-center gap-2">
          <Factory className="w-4 h-4 text-slate-500" /> Classificação Fiscal
        </h3>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="p-4 rounded-xl border-2 transition-all duration-300 bg-slate-50 border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-bold text-slate-700">Substituição Tributária (ST)</Label>
              {/* Botões Visuais tipo "Pílula" */}
              <div className="flex bg-slate-200 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, tem_st: false })}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-sm font-semibold transition-all",
                    !form.tem_st ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Sem ST
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, tem_st: true })}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-2",
                    form.tem_st ? "bg-red-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <AlertCircle className="w-4 h-4" />
                  Com ST
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Define se os pedidos deste cliente terão cálculo de ST. Preenchido automaticamente via CNAE.
            </p>
          </div>

          <div className="space-y-1">
            <Label className={labelClass}>CNAEs da Empresa</Label>
            <Textarea
              value={form.cnaes_descricao}
              readOnly
              className="bg-slate-100 text-xs font-mono border-slate-200 h-24 resize-none"
              placeholder="Os códigos de atividade econômica aparecerão aqui após a consulta..."
            />
          </div>
        </div>
      </div>

      {/* Seção Comercial */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium text-slate-900 border-b pb-2 mb-4">Dados Comerciais</h3>
        {/* ... (Resto do código comercial mantido igual) ... */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <Label htmlFor="representante" className={labelClass}>Representante *</Label>
            <Select value={form.representante_codigo} onValueChange={handleRepresentanteChange}>
              <SelectTrigger className={cn(inputClass, "w-full")}><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {representantes.map((rep) => (<SelectItem key={rep.codigo} value={rep.codigo}>{rep.codigo} - {rep.nome}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="porcentagem" className={labelClass}>Comissão (%)</Label>
            <div className="relative"><Input type="number" value={form.porcentagem_comissao} onChange={(e) => setForm({ ...form, porcentagem_comissao: parseFloat(e.target.value) || 0 })} className={cn(inputClass, "pr-8")} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">%</span></div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="limite" className={labelClass}>Limite de Crédito</Label>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span><Input type="number" step="100" value={form.limite_credito} onChange={(e) => setForm({ ...form, limite_credito: parseFloat(e.target.value) || 0 })} className={cn(inputClass, "pl-9 font-medium text-slate-700")} /></div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="score" className={labelClass}>Score de Crédito</Label>
            <Input value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} className={inputClass} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="data_consulta" className={labelClass}>Data da Consulta</Label>
            <Input type="date" value={form.data_consulta} onChange={(e) => setForm({ ...form, data_consulta: e.target.value })} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Upload Serasa & Pagamentos */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium text-slate-900 border-b pb-2 mb-4">Análise de Crédito</h3>
        <div className="space-y-2">
          <Label className={labelClass}>Arquivo Serasa (PDF)</Label>
          <div className="flex items-center gap-3">
            <label className={cn("flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all", serasaFile ? "border-green-300 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50 text-slate-600")}>
              {serasaUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="text-sm font-medium">{serasaUploading ? 'Enviando...' : serasaFile ? 'Arquivo enviado' : 'Selecionar PDF'}</span>
              <input type="file" accept=".pdf" onChange={handleSerasaUpload} className="hidden" disabled={serasaUploading} />
            </label>
          </div>
        </div>
        <div className="space-y-2">
          <Label className={labelClass}>Formas de Pagamento Autorizadas</Label>
          <FormasPagamentoSelector formasSelecionadas={formasPagamento} onChange={setFormasPagamento} />
        </div>
      </div>

      {/* Contato & Bloqueio */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium text-slate-900 border-b pb-2 mb-4">Contato</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1"><Label className={labelClass}>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className={inputClass} /></div>
          <div className="space-y-1"><Label className={labelClass}>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} /></div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-center justify-between">
        <div><Label htmlFor="bloqueado" className="text-base font-semibold text-slate-800 cursor-pointer">Bloquear Cliente</Label><p className="text-sm text-slate-500 mt-0.5">Impede a criação de novos pedidos</p></div>
        <Switch id="bloqueado" checked={form.bloqueado_manual} onCheckedChange={(checked) => setForm({ ...form, bloqueado_manual: checked })} />
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || isSaving} className="h-11 px-6 rounded-xl border-slate-200">Cancelar</Button>
        <Button type="button" onClick={handleSubmit} disabled={isLoading || isSaving} className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg">{isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4 mr-2" /> {cliente ? 'Salvar Alterações' : 'Cadastrar Cliente'}</>}</Button>
      </div>

      {isSaving && (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"><div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4"><Loader2 className="w-12 h-12 text-blue-600 animate-spin" /><div className="text-center"><h3 className="text-lg font-bold text-slate-800">Salvando Cliente</h3><p className="text-sm text-slate-500">Aguarde um momento...</p></div></div></div>)}
    </div>
  );
}