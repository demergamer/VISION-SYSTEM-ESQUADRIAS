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
  Eye, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { InputCpfCnpj } from "@/components/ui/input-mask";
import { useQuery } from '@tanstack/react-query';

// Componente para Seleção de Formas de Pagamento
function FormasPagamentoSelector({ formasSelecionadas, onChange }) {
  const { data: formasCadastradas = [] } = useQuery({
    queryKey: ['formasPagamento'],
    queryFn: () => base44.entities.FormaPagamento.list()
  });

  const formasPadrao = ['Dinheiro', 'PIX', 'Cheque', 'Crédito', 'Boleto', 'Cartão'];
  // Combina formas padrão com as cadastradas (evitando duplicatas se necessário)
  const formasCustomizadas = formasCadastradas.filter(f => f.ativa).map(f => f.nome);
  const todasFormas = Array.from(new Set([...formasPadrao, ...formasCustomizadas]));

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
            "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
            formasSelecionadas.includes(forma)
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
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
    cnaes_descricao: '', 
    tem_st: false 
  });

  const [errors, setErrors] = useState({});
  const [serasaFile, setSerasaFile] = useState(null);
  const [serasaUploading, setSerasaUploading] = useState(false);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);

  // Inicializa o formulário com dados existentes (edição)
  useEffect(() => {
    if (cliente) {
      setForm(prev => ({
        ...prev,
        ...cliente,
        // Garante valores padrão para evitar undefined
        porcentagem_comissao: cliente.porcentagem_comissao ?? 5,
        limite_credito: cliente.limite_credito ?? 0,
        bloqueado_manual: cliente.bloqueado_manual ?? false,
        tem_st: cliente.tem_st ?? false
      }));
      setFormasPagamento(cliente.formas_pagamento || []);
      if (cliente.serasa_file_url) {
        setSerasaFile(cliente.serasa_file_url);
      }
    }
  }, [cliente]);

  const handleRepresentanteChange = (codigo) => {
    const rep = representantes.find(r => r.codigo === codigo);
    setForm(prev => ({
      ...prev,
      representante_codigo: codigo,
      representante_nome: rep?.nome || ''
    }));
  };

  // --- CONSULTA CNPJ AUTOMÁTICA ---
  const handleConsultarCNPJ = async (cnpjValue) => {
    const cnpjLimpo = cnpjValue?.replace(/\D/g, '');

    if (!cnpjLimpo || cnpjLimpo.length !== 14) return;

    setIsConsulting(true);
    const toastId = toast.loading("Buscando dados do CNPJ...");

    try {
      // Usando BrasilAPI (gratuita e estável)
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      
      if (!response.ok) {
        throw new Error('CNPJ não encontrado ou erro na API.');
      }

      const data = await response.json();

      // Lógica de ST (Substituição Tributária) baseada em CNAEs específicos
      // Adicione mais CNAEs conforme a regra de negócio da sua empresa
      const cnaesComST = ['4744005', '4744099', '4672900']; 

      const todosCnaesDaEmpresa = [
        { codigo: data.cnae_fiscal, descricao: data.cnae_fiscal_descricao },
        ...(data.cnaes_secundarios || [])
      ];

      const possuiST = todosCnaesDaEmpresa.some(cnae => {
        const codigoLimpo = String(cnae.codigo).replace(/\D/g, '');
        return cnaesComST.includes(codigoLimpo);
      });

      const textoCnaes = todosCnaesDaEmpresa
        .map(c => `${c.codigo} - ${c.descricao}`)
        .join('\n');

      setForm(prev => ({
        ...prev,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia || data.razao_social,
        // Se já tiver nome (apelido), mantém. Senão usa Fantasia ou Razão.
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

  const handleCnpjChange = (e) => {
    const newValue = e.target.value;
    setForm({ ...form, cnpj: newValue });
    if (errors.cnpj) setErrors({...errors, cnpj: null});

    // Gatilho automático ao completar 14 dígitos
    const digits = newValue.replace(/\D/g, '');
    if (digits.length === 14) {
      handleConsultarCNPJ(digits);
    }
  };

  const validate = () => {
    const newErrors = {};
    const isEdit = !!cliente?.id;

    if (!form.codigo) newErrors.codigo = "Código é obrigatório.";
    else {
      const exists = todosClientes.some(c => 
        c.codigo?.toLowerCase() === form.codigo.toLowerCase() && 
        (!isEdit || c.id !== cliente.id)
      );
      if (exists) newErrors.codigo = "Código já cadastrado.";
    }

    if (!form.nome) newErrors.nome = "Apelido é obrigatório.";

    if (form.cnpj) {
        const cleanCNPJ = form.cnpj.replace(/\D/g, '');
        // Validação simples de tamanho (pode adicionar validação de dígito verificador se quiser)
        if (cleanCNPJ.length !== 14 && cleanCNPJ.length !== 11) {
             // Aceita CPF ou CNPJ, mas alerta se tamanho estiver errado
             // newErrors.cnpj = "CPF/CNPJ inválido."; 
        }

        const exists = todosClientes.some(c => {
            const existingClean = c.cnpj?.replace(/\D/g, '') || '';
            return existingClean === cleanCNPJ && (!isEdit || c.id !== cliente.id);
        });
        if (exists) newErrors.cnpj = "Documento já cadastrado.";
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

  const handleRemoveSerasa = (e) => {
    e.stopPropagation();
    setSerasaFile(null);
  };

  const handleSubmit = async () => {
    if (validate()) {
      setIsSaving(true);
      try {
        const dataToSave = { 
          ...form, 
          formas_pagamento: formasPagamento, 
          serasa_file_url: serasaFile,
          // Garante numéricos
          porcentagem_comissao: parseFloat(form.porcentagem_comissao) || 0,
          limite_credito: parseFloat(form.limite_credito) || 0
        };
        await onSave(dataToSave);
      } catch (error) {
          toast.error("Erro ao salvar cliente.");
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
    <div className="py-2 h-full flex flex-col">
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <Accordion type="multiple" defaultValue={['dados_cadastrais', 'endereco', 'dados_comerciais']} className="space-y-4">
          
          {/* 1. DADOS CADASTRAIS */}
          <AccordionItem value="dados_cadastrais" className="border rounded-xl bg-white px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2 text-slate-800">
                <Building className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-base">Dados Cadastrais & Fiscal</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Código */}
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
                    disabled={!!cliente?.id} // Código não editável na edição para integridade
                    className={cn(inputClass, errors.codigo && "border-red-300 bg-red-50 focus:border-red-400")}
                  />
                  {errors.codigo && <p className="text-xs text-red-500 mt-1">{errors.codigo}</p>}
                </div>

                {/* CNPJ */}
                <div className="space-y-1 lg:col-span-2">
                  <Label htmlFor="cnpj" className={labelClass}>CPF/CNPJ (Automático)</Label>
                  <div className="relative">
                    <InputCpfCnpj
                      id="cnpj"
                      value={form.cnpj}
                      onChange={handleCnpjChange}
                      className={cn(inputClass, "pr-10", errors.cnpj && "border-red-300 bg-red-50 focus:border-red-400")}
                      placeholder="Digite o CNPJ para busca automática..."
                    />
                    {isConsulting && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      </div>
                    )}
                  </div>
                  {errors.cnpj && <p className="text-xs text-red-500 mt-1">{errors.cnpj}</p>}
                </div>

                {/* Nome/Apelido */}
                <div className="space-y-1 lg:col-span-3">
                  <Label htmlFor="nome" className={labelClass}>Apelido (Nome no Sistema) *</Label>
                  <Input
                    id="nome"
                    value={form.nome}
                    onChange={(e) => {
                      setForm({ ...form, nome: e.target.value });
                      if (errors.nome) setErrors({...errors, nome: null});
                    }}
                    className={cn(inputClass, "font-bold text-slate-700", errors.nome && "border-red-300 bg-red-50")}
                  />
                  {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome}</p>}
                </div>

                {/* Razão Social */}
                <div className="space-y-1 lg:col-span-1">
                  <Label htmlFor="razao_social" className={labelClass}>Razão Social</Label>
                  <Input id="razao_social" value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} className={inputClass} />
                </div>

                {/* Nome Fantasia */}
                <div className="space-y-1 lg:col-span-2">
                  <Label htmlFor="nome_fantasia" className={labelClass}>Nome Fantasia</Label>
                  <Input id="nome_fantasia" value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} className={inputClass} />
                </div>

                {/* Classificação Fiscal / ST */}
                <div className="md:col-span-2 lg:col-span-3 mt-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Factory className="w-5 h-5 text-slate-500" />
                      <span className="font-semibold text-slate-700">Classificação Fiscal (ST)</span>
                    </div>
                    
                    <div className={cn(
                      "px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border shadow-sm select-none w-fit cursor-pointer transition-all",
                      form.tem_st ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200" : "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                    )} onClick={() => setForm(prev => ({...prev, tem_st: !prev.tem_st}))}>
                      {form.tem_st ? <><AlertCircle className="w-4 h-4" /> COM ST</> : <><CheckCircle className="w-4 h-4" /> SEM ST</>}
                      <Lock className="w-3 h-3 ml-2 opacity-50" />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className={labelClass}>CNAEs da Empresa</Label>
                    <Textarea
                      value={form.cnaes_descricao}
                      readOnly
                      className="bg-white text-xs font-mono border-slate-200 h-20 resize-none focus-visible:ring-0"
                      placeholder="Os códigos de atividade econômica aparecerão aqui após a consulta..."
                    />
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 2. ENDEREÇO & LOCALIZAÇÃO */}
          <AccordionItem value="endereco" className="border rounded-xl bg-white px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2 text-slate-800">
                <MapPin className="w-5 h-5 text-red-500" />
                <span className="font-semibold text-base">Endereço & Localização</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1 md:col-span-1">
                  <Label htmlFor="cep" className={labelClass}>CEP</Label>
                  <Input id="cep" value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} className={inputClass} placeholder="00000-000" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="endereco" className={labelClass}>Endereço (Rua, Av...)</Label>
                  <Input id="endereco" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className={inputClass} />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <Label htmlFor="numero" className={labelClass}>Número</Label>
                  <Input id="numero" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} className={inputClass} />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <Label htmlFor="complemento" className={labelClass}>Complemento</Label>
                  <Input id="complemento" value={form.complemento} onChange={(e) => setForm({ ...form, complemento: e.target.value })} className={inputClass} placeholder="Apto, Sala" />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <Label htmlFor="bairro" className={labelClass}>Bairro</Label>
                  <Input id="bairro" value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} className={inputClass} />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <Label htmlFor="cidade" className={labelClass}>Cidade</Label>
                  <Input id="cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className={inputClass} />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <Label htmlFor="estado" className={labelClass}>Estado</Label>
                  <Input id="estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className={inputClass} maxLength={2} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="regiao" className={labelClass}>Região Comercial</Label>
                  <Input id="regiao" value={form.regiao} onChange={(e) => setForm({ ...form, regiao: e.target.value })} placeholder="Ex: Zona Leste" className={inputClass} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 3. DADOS COMERCIAIS */}
          <AccordionItem value="dados_comerciais" className="border rounded-xl bg-white px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2 text-slate-800">
                <Briefcase className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-base">Dados Comerciais</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1 lg:col-span-1">
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
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 4. ANÁLISE FINANCEIRA */}
          <AccordionItem value="analise_financeira" className="border rounded-xl bg-white px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2 text-slate-800">
                <FileText className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-base">Análise Financeira</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <Label htmlFor="score" className={labelClass}>Score de Crédito</Label>
                    <Input value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="data_consulta" className={labelClass}>Data da Consulta</Label>
                    <Input type="date" value={form.data_consulta} onChange={(e) => setForm({ ...form, data_consulta: e.target.value })} className={inputClass} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className={labelClass}>Arquivo Serasa (PDF)</Label>
                  <div className="flex items-center gap-3">
                    <label className={cn(
                      "flex-1 flex items-center justify-between gap-3 h-12 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all group",
                      serasaFile 
                        ? "border-green-300 bg-green-50 hover:bg-green-100" 
                        : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50"
                    )}>
                      {serasaUploading ? (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm font-medium">Enviando...</span>
                        </div>
                      ) : serasaFile ? (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white rounded-lg shadow-sm">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="text-left">
                              <span className="text-sm font-bold text-green-800 block">Arquivo Salvo</span>
                              <span className="text-[10px] text-green-600">Clique para substituir</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100" onClick={(e) => { e.stopPropagation(); window.open(serasaFile, '_blank'); }} title="Visualizar PDF">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-100" onClick={handleRemoveSerasa} title="Remover Arquivo">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center w-full gap-2 text-slate-500 group-hover:text-blue-600">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm font-medium">Clique para selecionar PDF do Serasa</span>
                        </div>
                      )}
                      
                      <input type="file" accept=".pdf" onChange={handleSerasaUpload} className="hidden" disabled={serasaUploading} />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className={labelClass}>Formas de Pagamento Autorizadas</Label>
                  <FormasPagamentoSelector formasSelecionadas={formasPagamento} onChange={setFormasPagamento} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 5. CONTATO */}
          <AccordionItem value="contato" className="border rounded-xl bg-white px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2 text-slate-800">
                <Phone className="w-5 h-5 text-amber-500" />
                <span className="font-semibold text-base">Contato</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1"><Label className={labelClass}>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className={inputClass} /></div>
                <div className="space-y-1"><Label className={labelClass}>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} /></div>
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>

        <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-center justify-between">
          <div><Label htmlFor="bloqueado" className="text-base font-semibold text-slate-800 cursor-pointer">Bloquear Cliente</Label><p className="text-sm text-slate-500 mt-0.5">Impede a criação de novos pedidos</p></div>
          <Switch id="bloqueado" checked={form.bloqueado_manual} onCheckedChange={(checked) => setForm({ ...form, bloqueado_manual: checked })} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t mt-4 bg-white sticky bottom-0 z-10">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || isSaving} className="h-11 px-6 rounded-xl border-slate-200">Cancelar</Button>
        <Button type="button" onClick={handleSubmit} disabled={isLoading || isSaving} className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg">{isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4 mr-2" /> {cliente ? 'Salvar Alterações' : 'Cadastrar Cliente'}</>}</Button>
      </div>

      {isSaving && (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"><div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4"><Loader2 className="w-12 h-12 text-blue-600 animate-spin" /><div className="text-center"><h3 className="text-lg font-bold text-slate-800">Salvando Cliente</h3><p className="text-sm text-slate-500">Aguarde um momento...</p></div></div></div>)}
    </div>
  );
}