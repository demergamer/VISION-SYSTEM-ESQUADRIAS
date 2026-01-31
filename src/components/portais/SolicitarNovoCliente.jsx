import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Send, X, Search, CheckCircle, AlertCircle, MapPin, Building, FileText, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { InputCpfCnpj } from "@/components/ui/input-mask";
import { cn } from "@/lib/utils";

export default function SolicitarNovoCliente({ representante, onSuccess, onCancel }) {
  const [isSaving, setIsSaving] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);
  const [serasaFile, setSerasaFile] = useState(null);
  const [uploadingSerasa, setUploadingSerasa] = useState(false);
  
  const [form, setForm] = useState({
    nome: '', nome_fantasia: '', email: '', telefone: '', cnpj: '',
    cep: '', endereco: '', numero: '', bairro: '', cidade: '', estado: '', complemento: '', regiao: '',
    tem_st: false, cnaes_descricao: '', limite_credito_sugerido: '', observacao: ''
  });

  // CONSULTA CNPJ (BRASIL API)
  const handleConsultarCNPJ = async (cnpjValue) => {
    const cnpjLimpo = cnpjValue.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) return;

    setIsConsulting(true);
    const toastId = toast.loading("Consultando Receita Federal...");

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (!response.ok) throw new Error('CNPJ não encontrado');
      
      const data = await response.json();
      
      // Regra de ST (Exemplo)
      const cnaesComST = ['4744005', '4744099', '4672900'];
      const todosCnaes = [{ codigo: data.cnae_fiscal, descricao: data.cnae_fiscal_descricao }, ...(data.cnaes_secundarios || [])];
      const possuiST = todosCnaes.some(c => cnaesComST.includes(String(c.codigo).replace(/\D/g, '')));
      const resumoCnaes = todosCnaes.map(c => `${c.codigo} - ${c.descricao}`).join('\n');

      setForm(prev => ({
        ...prev,
        nome: data.razao_social,
        nome_fantasia: data.nome_fantasia || data.razao_social,
        email: data.email || prev.email,
        telefone: data.ddd_telefone_1 || prev.telefone,
        cep: data.cep ? data.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : prev.cep,
        endereco: data.logradouro,
        numero: data.numero,
        bairro: data.bairro,
        cidade: data.municipio,
        estado: data.uf,
        complemento: data.complemento,
        tem_st: possuiST,
        cnaes_descricao: resumoCnaes
      }));

      toast.success(possuiST ? "Dados carregados (Com ST)" : "Dados carregados!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Erro na consulta CNPJ.", { id: toastId });
    } finally {
      setIsConsulting(false);
    }
  };

  const handleCnpjChange = (e) => {
    const val = e.target.value;
    setForm({...form, cnpj: val});
    if(val.replace(/\D/g, '').length === 14) handleConsultarCNPJ(val);
  };

  const handleUploadSerasa = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingSerasa(true);
    try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setSerasaFile(file_url);
        toast.success("Arquivo anexado!");
    } catch (e) { toast.error("Erro no upload"); } 
    finally { setUploadingSerasa(false); }
  };

  const handleSubmit = async () => {
    if (!form.nome || !form.telefone) { toast.error('Nome e Telefone são obrigatórios'); return; }

    setIsSaving(true);
    try {
      await base44.entities.SolicitacaoCadastroCliente.create({
        ...form,
        representante_solicitante_codigo: representante?.codigo,
        representante_solicitante_nome: representante?.nome,
        solicitante_tipo: 'representante',
        status: 'pendente',
        serasa_file_url: serasaFile,
        limite_credito_sugerido: parseFloat(form.limite_credito_sugerido) || 0
      });
      toast.success('Solicitação enviada com sucesso!');
      onSuccess();
    } catch (error) {
      toast.error('Erro ao enviar solicitação');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "h-10 bg-slate-50 border-slate-200 focus:bg-white transition-all";

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 text-blue-800 px-4 py-3 rounded-lg text-sm border border-blue-200 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <div>
          <p className="font-bold">Solicitação de Cadastro</p>
          <p>O cliente será vinculado automaticamente à sua carteira (<strong>{representante?.nome}</strong>) após aprovação.</p>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[60vh] pr-2">
        <Accordion type="multiple" defaultValue={['dados', 'endereco']} className="space-y-4">
          
          {/* 1. DADOS CADASTRAIS */}
          <AccordionItem value="dados" className="border rounded-xl px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline"><div className="flex gap-2 items-center"><Building className="w-5 h-5 text-blue-600"/> Dados Cadastrais</div></AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                        <Label>CNPJ (Busca Automática)</Label>
                        <div className="relative">
                            <InputCpfCnpj value={form.cnpj} onChange={handleCnpjChange} className={cn(inputClass, "pr-10")} placeholder="Digite para buscar..." />
                            {isConsulting && <Loader2 className="absolute right-3 top-2.5 w-5 h-5 animate-spin text-blue-600" />}
                        </div>
                        {form.tem_st && <p className="text-xs text-orange-600 font-bold">⚠️ Cliente possui ST (Substituição Tributária)</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>Razão Social *</Label>
                        <Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className={inputClass} readOnly={isConsulting} />
                    </div>
                    <div className="space-y-2">
                        <Label>Nome Fantasia</Label>
                        <Input value={form.nome_fantasia} onChange={e => setForm({...form, nome_fantasia: e.target.value})} className={inputClass} />
                    </div>
                    <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inputClass} />
                    </div>
                    <div className="space-y-2">
                        <Label>Telefone *</Label>
                        <Input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className={inputClass} />
                    </div>
                </div>
            </AccordionContent>
          </AccordionItem>

          {/* 2. ENDEREÇO */}
          <AccordionItem value="endereco" className="border rounded-xl px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline"><div className="flex gap-2 items-center"><MapPin className="w-5 h-5 text-red-500"/> Endereço</div></AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>CEP</Label><Input value={form.cep} onChange={e => setForm({...form, cep: e.target.value})} className={inputClass} /></div>
                    <div className="space-y-2 md:col-span-2"><Label>Endereço</Label><Input value={form.endereco} onChange={e => setForm({...form, endereco: e.target.value})} className={inputClass} /></div>
                    <div className="space-y-2"><Label>Número</Label><Input value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} className={inputClass} /></div>
                    <div className="space-y-2"><Label>Bairro</Label><Input value={form.bairro} onChange={e => setForm({...form, bairro: e.target.value})} className={inputClass} /></div>
                    <div className="space-y-2"><Label>Cidade/UF</Label><Input value={`${form.cidade}-${form.estado}`} readOnly className={cn(inputClass, "bg-slate-100")} /></div>
                    <div className="space-y-2 md:col-span-3"><Label>Região de Entrega (Sugestão)</Label><Input value={form.regiao} onChange={e => setForm({...form, regiao: e.target.value})} className={inputClass} placeholder="Ex: ZONA LESTE" /></div>
                </div>
            </AccordionContent>
          </AccordionItem>

          {/* 3. FINANCEIRO E ANEXOS */}
          <AccordionItem value="financeiro" className="border rounded-xl px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline"><div className="flex gap-2 items-center"><FileText className="w-5 h-5 text-emerald-600"/> Financeiro & Anexos</div></AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Limite de Crédito Sugerido (R$)</Label>
                        <Input type="number" value={form.limite_credito_sugerido} onChange={e => setForm({...form, limite_credito_sugerido: e.target.value})} className={inputClass} placeholder="0.00" />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Anexar Serasa/Ficha Cadastral</Label>
                        <div className="flex items-center gap-3">
                            <label className="cursor-pointer">
                                <input type="file" accept=".pdf" className="hidden" onChange={handleUploadSerasa} disabled={uploadingSerasa} />
                                <div className={cn("flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed transition-all", serasaFile ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-300 hover:bg-slate-100")}>
                                    {uploadingSerasa ? <Loader2 className="w-4 h-4 animate-spin"/> : serasaFile ? <CheckCircle className="w-4 h-4"/> : <Upload className="w-4 h-4"/>}
                                    <span className="text-sm font-medium">{serasaFile ? "Arquivo Anexado" : "Clique para selecionar PDF"}</span>
                                </div>
                            </label>
                            {serasaFile && <Button size="icon" variant="ghost" className="text-red-500" onClick={() => setSerasaFile(null)}><Trash2 className="w-4 h-4"/></Button>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Observações Gerais</Label>
                        <Textarea value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})} className="bg-slate-50 min-h-[80px]" placeholder="Informações relevantes para análise..." />
                    </div>
                </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>} Enviar Solicitação
        </Button>
      </div>
    </div>
  );
}