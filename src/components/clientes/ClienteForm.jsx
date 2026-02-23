import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Save, X, AlertCircle, Upload, Loader2, Factory, 
  CheckCircle, Lock, MapPin, Briefcase, Phone, FileText, Building,
  Eye, Trash2, Calendar, Wallet, CheckSquare, Plus, Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { InputCpfCnpj } from "@/components/ui/input-mask";

function FormasPagamentoSelector({ formasSelecionadas, onChange }) {
  const formasFixas = ['PIX', 'Dinheiro', 'Cartão'];
  const formasOpcionais = ['Boleto', 'Cheque', 'Serviços'];

  const togglePagamento = (forma) => {
    if (formasFixas.includes(forma)) return;
    if (formasSelecionadas.includes(forma)) onChange(formasSelecionadas.filter(f => f !== forma));
    else onChange([...formasSelecionadas, forma]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {formasFixas.map(forma => (
        <div key={forma} className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm flex items-center gap-2 cursor-not-allowed opacity-80" title="Obrigatório">
            <CheckSquare className="w-4 h-4 fill-current" /> {forma}
        </div>
      ))}
      {formasOpcionais.map(forma => {
        const isSelected = formasSelecionadas.includes(forma);
        return (
            <button key={forma} type="button" onClick={() => togglePagamento(forma)} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all border flex items-center gap-2", isSelected ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}>
                <div className={cn("w-4 h-4 rounded border flex items-center justify-center", isSelected ? "bg-white border-white" : "bg-white border-slate-300")}>{isSelected && <CheckSquare className="w-3 h-3 text-blue-600" />}</div>
                {forma}
            </button>
        );
      })}
    </div>
  );
}

export default function ClienteForm({ cliente, representantes = [], todosClientes = [], onSave, onCancel, isLoading, onSuccess, isClientMode = false }) {
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
    telefone_1: '', responsavel_1: '',
    telefone_2: '', responsavel_2: '',
    telefone_3: '', responsavel_3: '',
    contatos_lista: [],
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
    cnaes_descricao: '', 
    tem_st: false,
    formas_pagamento: ['PIX', 'Dinheiro', 'Cartão'], 
    permite_cobranca_posterior: 'nao', 
    dia_cobranca: '',
    serasa_file_url: null,
    logo_url: null
  });

  const [errors, setErrors] = useState({});
  const [serasaUploading, setSerasaUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);

  useEffect(() => {
    if (cliente) {
      // Garante que representante_codigo seja sempre uma string simples (pega apenas o primeiro
      // se vier como array ou string concatenada por alguma corrupção de dados)
      let repCodigo = cliente.representante_codigo || '';
      if (Array.isArray(repCodigo)) repCodigo = repCodigo[0] || '';
      repCodigo = String(repCodigo).trim();

      // Tenta encontrar o representante pelo código limpo para obter o nome correto da lista
      const repDaLista = representantes.find(r => String(r.codigo).trim() === repCodigo);
      const repNome = repDaLista?.nome || (typeof cliente.representante_nome === 'string' ? cliente.representante_nome.trim() : '');

      setForm(prev => ({
        ...prev,
        ...cliente,
        representante_codigo: repCodigo,
        representante_nome: repNome,
        porcentagem_comissao: cliente.porcentagem_comissao ?? 5,
        limite_credito: cliente.limite_credito ?? 0,
        bloqueado_manual: cliente.bloqueado_manual ?? false,
        tem_st: cliente.tem_st ?? false,
        formas_pagamento: Array.from(new Set([...(cliente.formas_pagamento || []), 'PIX', 'Dinheiro', 'Cartão'])),
        permite_cobranca_posterior: cliente.permite_cobranca_posterior || 'nao',
        dia_cobranca: cliente.dia_cobranca || '',
        contatos_lista: cliente.contatos_lista || [],
        logo_url: cliente.logo_url || null
      }));
    }
  }, [cliente, representantes]);

  const formatTelefoneDinamico = (val) => {
    if (!val) return '';
    let v = val.replace(/\D/g, '').substring(0, 11);
    if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (v.length > 5) return v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    return v;
  };

  const handleInputChange = (e) => {
      const { name, value } = e.target;
      let finalVal = value;
      if (['telefone_1', 'telefone_2', 'telefone_3'].includes(name)) finalVal = formatTelefoneDinamico(value);
      setForm(prev => ({ ...prev, [name]: finalVal }));
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleRepresentanteChange = (codigo) => {
    const rep = representantes.find(r => r.codigo === codigo);
    setForm(prev => ({ ...prev, representante_codigo: codigo, representante_nome: rep?.nome || '' }));
  };

  const handleBlurCEP = async () => {
    const cepLimpo = form.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setForm(prev => ({ ...prev, endereco: data.logradouro, bairro: data.bairro, cidade: data.localidade, estado: data.uf }));
        toast.success("Endereço preenchido!");
      }
    } catch (e) { console.error(e); }
  };

  const handleConsultarCNPJ = async (cnpjValue) => {
    const cnpjLimpo = cnpjValue?.replace(/\D/g, '');
    if (!cnpjLimpo || cnpjLimpo.length !== 14) return;
    setIsConsulting(true);
    const toastId = toast.loading("Buscando dados do CNPJ...");
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (!response.ok) throw new Error('Erro na API');
      const data = await response.json();
      const cnaesComST = ['4744005', '4744099']; 
      const todosCnaes = [{ codigo: data.cnae_fiscal, descricao: data.cnae_fiscal_descricao }, ...(data.cnaes_secundarios || [])];
      const possuiST = todosCnaes.some(c => cnaesComST.includes(String(c.codigo).replace(/\D/g, '')));
      const textoCnaes = todosCnaes.map(c => `${c.codigo} - ${c.descricao}`).join('\n');

      setForm(prev => ({
        ...prev,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia || data.razao_social,
        nome: prev.nome || (data.nome_fantasia || data.razao_social), 
        email: data.email || prev.email,
        telefone_1: formatTelefoneDinamico(data.ddd_telefone_1 || prev.telefone_1),
        cep: data.cep ? data.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : prev.cep,
        endereco: data.logradouro, numero: data.numero, bairro: data.bairro, cidade: data.municipio, estado: data.uf, complemento: data.complemento,
        data_consulta: new Date().toISOString().split('T')[0],
        cnaes_descricao: textoCnaes,
        tem_st: possuiST 
      }));
      toast.success(possuiST ? "Dados carregados. COM ST!" : "Dados carregados!", { id: toastId });
    } catch (error) { toast.error("Erro ao consultar CNPJ.", { id: toastId }); } finally { setIsConsulting(false); }
  };

  const handleCnpjChange = (e) => {
    const val = e.target.value;
    setForm({ ...form, cnpj: val });
    if (val.replace(/\D/g, '').length === 14) handleConsultarCNPJ(val);
  };

  const handleSerasaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSerasaUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, serasa_file_url: file_url }));
      toast.success('Arquivo Serasa enviado!');
    } catch (error) { toast.error('Erro no upload'); } finally { setSerasaUploading(false); }
  };

  const [logoUploading, setLogoUploading] = useState(false);
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, logo_url: file_url }));
      toast.success('Logo enviada!');
    } catch (error) { toast.error('Erro no upload da logo'); } finally { setLogoUploading(false); }
  };

  const adicionarContato = () => setForm(prev => ({ ...prev, contatos_lista: [...(prev.contatos_lista || []), { telefone: '', nome_responsavel: '', setor: '' }] }));
  const removerContato = (i) => setForm(prev => ({ ...prev, contatos_lista: prev.contatos_lista.filter((_, idx) => idx !== i) }));
  const atualizarContato = (i, field, value) => setForm(prev => {
    const lista = [...(prev.contatos_lista || [])];
    lista[i] = { ...lista[i], [field]: value };
    return { ...prev, contatos_lista: lista };
  });

  const validate = () => {
    const newErrors = {};
    if (!isClientMode && !form.codigo) newErrors.codigo = "Código obrigatório.";
    if (!form.nome) newErrors.nome = "Apelido obrigatório.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validate()) {
      setIsSaving(true);
      try {
        // Em modo cliente, só salva campos permitidos
        let dataToSave;
        if (isClientMode) {
          dataToSave = {
            nome: form.nome,
            nome_fantasia: form.nome_fantasia,
            email: form.email,
            telefone_1: form.telefone_1, responsavel_1: form.responsavel_1,
            telefone_2: form.telefone_2, responsavel_2: form.responsavel_2,
            telefone_3: form.telefone_3, responsavel_3: form.responsavel_3,
            contatos_lista: form.contatos_lista || [],
            logo_url: form.logo_url,
            cep: form.cep, endereco: form.endereco, numero: form.numero,
            bairro: form.bairro, cidade: form.cidade, estado: form.estado, complemento: form.complemento,
          };
        } else {
          dataToSave = { ...form, porcentagem_comissao: parseFloat(form.porcentagem_comissao) || 0, limite_credito: parseFloat(form.limite_credito) || 0 };
        }
        if (onSave) await onSave(dataToSave);
        else if (onSuccess) onSuccess(dataToSave); 
      } catch (error) { toast.error("Erro ao salvar."); } finally { setIsSaving(false); }
    } else { toast.error("Verifique os erros."); }
  };

  const inputClass = "h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1 mb-1.5 block";

  return (
    <div className="py-2 h-full flex flex-col">
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <Accordion type="multiple" defaultValue={['dados_cadastrais', 'endereco', 'contato', 'analise_financeira']} className="space-y-4">
          
          <AccordionItem value="dados_cadastrais" className="border rounded-xl bg-white px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4"><div className="flex items-center gap-2 text-slate-800"><Building className="w-5 h-5 text-blue-600" /><span className="font-semibold text-base">Dados Cadastrais</span></div></AccordionTrigger>
            <AccordionContent className="pb-4 pt-2">
              {/* Logo Upload */}
              <div className="mb-6 flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  {form.logo_url ? <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-slate-300" />}
                </div>
                <div>
                  <Label className={labelClass}>Logo / Foto da Empresa</Label>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-all">
                    {logoUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><Upload className="w-4 h-4" /> Enviar imagem</>}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={logoUploading} />
                  </label>
                  {form.logo_url && <button type="button" onClick={() => setForm(p => ({...p, logo_url: null}))} className="ml-2 text-xs text-red-500 hover:underline">Remover</button>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {!isClientMode && (
                  <div className="space-y-1">
                    <Label htmlFor="codigo" className={labelClass}>Código *</Label>
                    <Input id="codigo" value={form.codigo} onChange={handleInputChange} name="codigo" disabled={!!cliente?.id} className={cn(inputClass, errors.codigo && "border-red-300")} placeholder="Ex: CLI001" />
                    {errors.codigo && <p className="text-xs text-red-500">{errors.codigo}</p>}
                  </div>
                )}
                {!isClientMode && (
                  <div className="space-y-1 lg:col-span-2">
                    <Label htmlFor="cnpj" className={labelClass}>CPF/CNPJ (Busca Auto)</Label>
                    <div className="relative">
                      <InputCpfCnpj id="cnpj" value={form.cnpj} onChange={handleCnpjChange} className={inputClass} placeholder="Digite para buscar..." />
                      {isConsulting && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600 animate-spin" />}
                    </div>
                  </div>
                )}
                
                {/* 3 CAMPOS DE NOME SEPARADOS */}
                <div className="space-y-1 lg:col-span-3">
                  <Label htmlFor="nome" className={labelClass}>Nome (Apelido / Identificação) *</Label>
                  <Input id="nome" name="nome" value={form.nome} onChange={handleInputChange} disabled={isClientMode} className={cn(inputClass, "font-bold text-slate-700", isClientMode && "bg-slate-100 cursor-not-allowed opacity-70")} placeholder="Como o cliente é conhecido" />
                  {errors.nome && <p className="text-xs text-red-500">{errors.nome}</p>}
                </div>
                <div className="space-y-1 lg:col-span-3">
                  <Label htmlFor="nome_fantasia" className={labelClass}>Nome Fantasia {isClientMode && <span className="text-blue-500 normal-case font-normal">(editável)</span>}</Label>
                  <Input id="nome_fantasia" name="nome_fantasia" value={form.nome_fantasia} onChange={handleInputChange} className={inputClass} placeholder="Nome na fachada/marca" />
                </div>
                <div className="space-y-1 lg:col-span-3">
                  <Label htmlFor="razao_social" className={labelClass}>Razão Social</Label>
                  <Input id="razao_social" name="razao_social" value={form.razao_social} onChange={handleInputChange} disabled={isClientMode} className={cn(inputClass, isClientMode && "bg-slate-100 cursor-not-allowed opacity-70")} placeholder="Nome jurídico" />
                </div>
                
                {!isClientMode && (
                  <div className="md:col-span-3 mt-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2"><Factory className="w-5 h-5 text-slate-500" /><span className="font-semibold text-slate-700">Classificação Fiscal (ST)</span></div>
                      <div className={cn("px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border shadow-sm cursor-pointer select-none", form.tem_st ? "bg-red-100 text-red-700 border-red-200" : "bg-green-100 text-green-700 border-green-200")} onClick={() => setForm(prev => ({...prev, tem_st: !prev.tem_st}))}>
                        {form.tem_st ? <><AlertCircle className="w-4 h-4" /> COM ST</> : <><CheckCircle className="w-4 h-4" /> SEM ST</>}
                      </div>
                    </div>
                    <Textarea value={form.cnaes_descricao} readOnly className="bg-white text-xs font-mono border-slate-200 h-20 resize-none" placeholder="CNAEs..." />
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="endereco" className="border rounded-xl bg-white px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4"><div className="flex items-center gap-2 text-slate-800"><MapPin className="w-5 h-5 text-red-500" /><span className="font-semibold text-base">Endereço</span></div></AccordionTrigger>
            <AccordionContent className="pb-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1 md:col-span-1"><Label className={labelClass}>CEP</Label><Input name="cep" value={form.cep} onChange={handleInputChange} onBlur={handleBlurCEP} className={inputClass} /></div>
                <div className="space-y-1 md:col-span-2"><Label className={labelClass}>Endereço</Label><Input name="endereco" value={form.endereco} onChange={handleInputChange} className={inputClass} /></div>
                <div className="space-y-1 md:col-span-1"><Label className={labelClass}>Número</Label><Input name="numero" value={form.numero} onChange={handleInputChange} className={inputClass} /></div>
                <div className="space-y-1 md:col-span-1"><Label className={labelClass}>Bairro</Label><Input name="bairro" value={form.bairro} onChange={handleInputChange} className={inputClass} /></div>
                <div className="space-y-1 md:col-span-1"><Label className={labelClass}>Cidade</Label><Input name="cidade" value={form.cidade} onChange={handleInputChange} className={inputClass} /></div>
                <div className="space-y-1 md:col-span-1"><Label className={labelClass}>UF</Label><Input name="estado" value={form.estado} onChange={handleInputChange} className={inputClass} maxLength={2} /></div>
                <div className="space-y-1 md:col-span-1"><Label className={labelClass}>Região</Label><Input name="regiao" value={form.regiao} onChange={handleInputChange} className={inputClass} /></div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="contato" className="border rounded-xl bg-white px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4"><div className="flex items-center gap-2 text-slate-800"><Phone className="w-5 h-5 text-amber-500" /><span className="font-semibold text-base">Contatos</span></div></AccordionTrigger>
            <AccordionContent className="pb-4 pt-2 space-y-4">
               <div className="space-y-1"><Label className={labelClass}>Email Geral</Label><Input name="email" value={form.email} onChange={handleInputChange} className={inputClass} /></div>
               
               {/* Contatos dinâmicos */}
               <div className="space-y-3">
                 <div className="flex items-center justify-between">
                   <Label className={labelClass}>Lista de Contatos</Label>
                   <Button type="button" size="sm" variant="outline" onClick={adicionarContato} className="h-8 text-xs gap-1">
                     <Plus className="w-3.5 h-3.5" /> Adicionar Contato
                   </Button>
                 </div>
                 {(form.contatos_lista || []).length === 0 && (
                   <p className="text-xs text-slate-400 italic">Nenhum contato adicionado. Clique em "+ Adicionar Contato".</p>
                 )}
                 {(form.contatos_lista || []).map((contato, i) => (
                   <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100 relative">
                     <div className="space-y-1"><Label className={labelClass}>Telefone</Label><Input value={contato.telefone} onChange={(e) => atualizarContato(i, 'telefone', formatTelefoneDinamico(e.target.value))} className={inputClass} placeholder="(00) 00000-0000" /></div>
                     <div className="space-y-1"><Label className={labelClass}>Nome Responsável</Label><Input value={contato.nome_responsavel} onChange={(e) => atualizarContato(i, 'nome_responsavel', e.target.value)} className={inputClass} placeholder="Ex: João Silva" /></div>
                     <div className="space-y-1 relative">
                       <Label className={labelClass}>Setor</Label>
                       <div className="flex gap-2">
                         <Input value={contato.setor} onChange={(e) => atualizarContato(i, 'setor', e.target.value)} className={inputClass} placeholder="Ex: Financeiro" />
                         <Button type="button" size="icon" variant="ghost" onClick={() => removerContato(i)} className="h-11 w-10 text-red-500 hover:bg-red-50 shrink-0">
                           <Trash2 className="w-4 h-4" />
                         </Button>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            </AccordionContent>
          </AccordionItem>

          {!isClientMode && (
            <AccordionItem value="analise_financeira" className="border rounded-xl bg-white px-4 shadow-sm">
              <AccordionTrigger className="hover:no-underline py-4"><div className="flex items-center gap-2 text-slate-800"><Wallet className="w-5 h-5 text-green-600" /><span className="font-semibold text-base">Financeiro & Cobrança</span></div></AccordionTrigger>
              <AccordionContent className="pb-4 pt-2 space-y-6">
                <div className="space-y-2">
                   <Label className={labelClass}>Formas de Pagamento Autorizadas</Label>
                   <FormasPagamentoSelector formasSelecionadas={form.formas_pagamento} onChange={(newVal) => setForm(prev => ({...prev, formas_pagamento: newVal}))} />
                </div>
                <div className="h-px bg-slate-100 my-2"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <div className="space-y-1">
                       <Label className={labelClass}>Aceita Cobrança Posterior?</Label>
                       <Select value={form.permite_cobranca_posterior} onValueChange={(val) => setForm(prev => ({...prev, permite_cobranca_posterior: val}))}>
                          <SelectTrigger className={cn(inputClass, "bg-white")}><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="nao">Não (Pagamento na Entrega/Antecipado)</SelectItem><SelectItem value="sim">Sim (Cobrador passa depois)</SelectItem></SelectContent>
                       </Select>
                    </div>
                    {form.permite_cobranca_posterior === 'sim' && (
                        <div className="space-y-1 animate-in fade-in slide-in-from-left-2">
                           <Label className={labelClass}>Dia da Cobrança</Label>
                           <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-600" />
                              <Select value={form.dia_cobranca} onValueChange={(val) => setForm(prev => ({...prev, dia_cobranca: val}))}>
                                  <SelectTrigger className={cn(inputClass, "pl-9 bg-white border-amber-300")}><SelectValue placeholder="Selecione o dia..." /></SelectTrigger>
                                  <SelectContent>{['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'].map(dia => (<SelectItem key={dia} value={dia}>{dia}</SelectItem>))}</SelectContent>
                              </Select>
                           </div>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1"><Label className={labelClass}>Limite de Crédito (R$)</Label><Input type="number" value={form.limite_credito} onChange={handleInputChange} name="limite_credito" className={inputClass} /></div>
                   <div className="space-y-1"><Label className={labelClass}>Score Serasa</Label><Input value={form.score} onChange={handleInputChange} name="score" className={inputClass} /></div>
                </div>
                <div className="space-y-1">
                   <Label className={labelClass}>Arquivo Serasa (PDF)</Label>
                   <div className="flex items-center gap-3">
                      <label className={cn("flex-1 flex items-center justify-between gap-3 h-12 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all", form.serasa_file_url ? "border-green-300 bg-green-50" : "border-slate-200 bg-slate-50")}>
                          {serasaUploading ? <span className="text-sm text-blue-600 flex gap-2"><Loader2 className="animate-spin w-4 h-4"/> Enviando...</span> : form.serasa_file_url ? <span className="text-sm font-bold text-green-700 flex gap-2"><CheckCircle className="w-4 h-4"/> Arquivo Salvo</span> : <span className="text-sm text-slate-500 flex gap-2"><Upload className="w-4 h-4"/> Clique para enviar PDF</span>}
                          <input type="file" accept=".pdf" onChange={handleSerasaUpload} className="hidden" disabled={serasaUploading} />
                      </label>
                      {form.serasa_file_url && <Button type="button" variant="ghost" size="icon" onClick={() => window.open(form.serasa_file_url, '_blank')}><Eye className="w-4 h-4 text-blue-600"/></Button>}
                      {form.serasa_file_url && <Button type="button" variant="ghost" size="icon" onClick={() => setForm(p => ({...p, serasa_file_url: null}))}><Trash2 className="w-4 h-4 text-red-600"/></Button>}
                   </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {!isClientMode && (
            <AccordionItem value="vendas" className="border rounded-xl bg-white px-4 shadow-sm">
               <AccordionTrigger className="hover:no-underline py-4"><div className="flex items-center gap-2 text-slate-800"><Briefcase className="w-5 h-5 text-purple-600"/><span className="font-semibold text-base">Vendas</span></div></AccordionTrigger>
               <AccordionContent className="pb-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                          <Label className={labelClass}>Representante</Label>
                          <Select value={form.representante_codigo} onValueChange={handleRepresentanteChange}>
                              <SelectTrigger className={inputClass}><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>{representantes.map(r => <SelectItem key={r.codigo} value={r.codigo}>{r.nome}</SelectItem>)}</SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-1"><Label className={labelClass}>Comissão Padrão (%)</Label><Input type="number" name="porcentagem_comissao" value={form.porcentagem_comissao} onChange={handleInputChange} className={inputClass} /></div>
                  </div>
               </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {!isClientMode && (
          <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-center justify-between">
            <div><Label htmlFor="bloqueado" className="text-base font-semibold text-slate-800 cursor-pointer">Bloquear Cliente</Label><p className="text-sm text-slate-500 mt-0.5">Impede a criação de novos pedidos</p></div>
            <Switch id="bloqueado" checked={form.bloqueado_manual} onCheckedChange={(checked) => setForm({ ...form, bloqueado_manual: checked })} />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t mt-4 bg-white sticky bottom-0 z-10">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || isSaving} className="h-11 px-6 rounded-xl border-slate-200">Cancelar</Button>
        <Button type="button" onClick={handleSubmit} disabled={isLoading || isSaving} className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg">{isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4 mr-2" /> {cliente ? 'Salvar' : 'Cadastrar'}</>}</Button>
      </div>
    </div>
  );
}