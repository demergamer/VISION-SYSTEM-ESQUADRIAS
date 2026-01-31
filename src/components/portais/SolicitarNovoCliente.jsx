import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, X, Search, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { InputCpfCnpj } from "@/components/ui/input-mask"; // Certifique-se de ter este componente ou use Input normal

export default function SolicitarNovoCliente({ representanteCodigo, onSuccess, onCancel }) {
  const [isSaving, setIsSaving] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);
  
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    cnpj: '',
    regiao: '',
    observacao: '',
    tem_st: false, // Novo campo
    cnaes_descricao: '' // Novo campo para info do adm
  });

  // Consulta CNPJ Automática (Mesma lógica do Admin)
  const handleConsultarCNPJ = async (cnpjValue) => {
    const cnpjLimpo = cnpjValue.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) return;

    setIsConsulting(true);
    const toastId = toast.loading("Consultando Receita Federal...");

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (!response.ok) throw new Error('CNPJ não encontrado');
      
      const data = await response.json();
      
      // Lógica de ST (Exemplo: Vidros/Esquadrias)
      const cnaesComST = ['4744005', '4744099', '4672900'];
      const todosCnaes = [
        { codigo: data.cnae_fiscal, descricao: data.cnae_fiscal_descricao },
        ...(data.cnaes_secundarios || [])
      ];
      
      const possuiST = todosCnaes.some(c => cnaesComST.includes(String(c.codigo).replace(/\D/g, '')));
      const resumoCnaes = todosCnaes.map(c => `${c.codigo} - ${c.descricao}`).join('\n');

      setForm(prev => ({
        ...prev,
        nome: data.nome_fantasia || data.razao_social, // Preenche automático
        email: data.email || prev.email,
        telefone: data.ddd_telefone_1 || prev.telefone,
        regiao: data.municipio ? `${data.municipio}/${data.uf}` : prev.regiao, // Sugere região
        tem_st: possuiST,
        cnaes_descricao: resumoCnaes
      }));

      toast.success(possuiST ? "Dados carregados (Cliente COM ST)" : "Dados carregados com sucesso!", { id: toastId });

    } catch (error) {
      console.error(error);
      toast.error("Erro ao consultar CNPJ.", { id: toastId });
    } finally {
      setIsConsulting(false);
    }
  };

  const handleCnpjChange = (e) => {
    const val = e.target.value;
    setForm({...form, cnpj: val});
    if(val.replace(/\D/g, '').length === 14) {
      handleConsultarCNPJ(val);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nome || !form.email || !form.telefone) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      // Cria a solicitação
      await base44.entities.SolicitacaoCadastroCliente.create({
        ...form,
        solicitante_tipo: 'representante',
        representante_solicitante_codigo: representanteCodigo,
        status: 'pendente',
        // Adicionamos infos extras na observação para o admin ver
        observacao: `${form.observacao}\n\n[SISTEMA] ST: ${form.tem_st ? 'SIM' : 'NÃO'}\nCNAEs: ${form.cnaes_descricao || 'N/A'}`
      });

      // Notifica admin (opcional, se tiver função backend)
      // await base44.functions.invoke('notificarAdminNovoCliente', { ... });

      toast.success('Solicitação enviada para análise!');
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar solicitação');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Alerta Informativo */}
      <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm border border-blue-200 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Cadastro Sujeito a Aprovação</p>
          <p>O cliente será analisado pelo setor financeiro. O código será gerado automaticamente após a aprovação.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* CNPJ com Consulta */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cnpj">CNPJ (Automático)</Label>
          <div className="relative">
            <InputCpfCnpj 
              id="cnpj" 
              value={form.cnpj} 
              onChange={handleCnpjChange} 
              placeholder="Digite para buscar..."
              className="pr-10"
            />
            {isConsulting && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              </div>
            )}
          </div>
          {form.tem_st && <p className="text-xs text-orange-600 font-bold mt-1">⚠️ Este CNPJ possui Substituição Tributária (ST)</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome">Nome/Razão Social *</Label>
          <Input 
            id="nome" 
            value={form.nome} 
            onChange={(e) => setForm({...form, nome: e.target.value})} 
            required 
            readOnly={isConsulting} // Bloqueia enquanto consulta
            className={isConsulting ? 'bg-slate-50' : ''}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone *</Label>
          <Input id="telefone" value={form.telefone} onChange={(e) => setForm({...form, telefone: e.target.value})} required />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="regiao">Região Sugerida</Label>
          <Input id="regiao" value={form.regiao} onChange={(e) => setForm({...form, regiao: e.target.value})} placeholder="Ex: ZONA LESTE" />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="obs">Observações</Label>
          <Textarea 
            id="obs" 
            value={form.observacao} 
            onChange={(e) => setForm({...form, observacao: e.target.value})} 
            rows={3} 
            placeholder="Informações adicionais para o financeiro..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving || isConsulting} className="bg-blue-600 hover:bg-blue-700">
          {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4 mr-2" /> Enviar Solicitação</>}
        </Button>
      </div>
    </form>
  );
}