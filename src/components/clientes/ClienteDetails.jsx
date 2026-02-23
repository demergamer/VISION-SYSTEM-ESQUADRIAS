import React, { useRef, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { 
  Building2, 
  Phone, 
  MapPin, 
  User,
  Percent,
  Calendar,
  CreditCard,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Edit,
  X,
  FileText,
  Download,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Factory,
  Briefcase,
  Mail,
  Camera,
  Loader2
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function ClienteDetails({ cliente, stats, creditos, onEdit, onClose, onViewPedidos, onLogoUpdate }) {
  const [logoUrl, setLogoUrl] = useState(cliente.logo_url || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Cliente.update(cliente.id, { logo_url: file_url });
    setLogoUrl(file_url);
    if (onLogoUpdate) onLogoUpdate(file_url);
    toast.success('Logo atualizada com sucesso!');
    setUploadingLogo(false);
  };

  const getInitials = (name) => {
    if (!name) return 'CL';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const cliStats = stats || {
    totalPedidosAbertos: 0,
    totalChequesVencer: 0,
    bloqueadoAuto: false,
    compras30k: false,
    ativo: false
  };

  const isBloqueado = cliente.bloqueado_manual || cliStats.bloqueadoAuto;

  return (
    <div className="space-y-6">
      {/* Header Fixo */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar Interativo com Upload */}
          <div
            className="relative group cursor-pointer w-20 h-20 rounded-2xl shadow-md overflow-hidden shrink-0"
            onClick={() => logoInputRef.current?.click()}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={cliente.nome} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <span className="text-white font-extrabold text-2xl tracking-tight">
                  {getInitials(cliente.nome_fantasia || cliente.razao_social || cliente.nome)}
                </span>
              </div>
            )}
            {/* Overlay de hover */}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingLogo
                ? <Loader2 className="w-7 h-7 text-white animate-spin" />
                : <Camera className="w-7 h-7 text-white" />
              }
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
              disabled={uploadingLogo}
            />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-800">{cliente.nome}</h2>
            <p className="text-slate-500 font-mono text-sm">Cód: {cliente.codigo}</p>
            {cliente.nome_fantasia && (
              <p className="text-xs text-slate-400 mt-0.5">{cliente.nome_fantasia}</p>
            )}
          </div>
        </div>
        
        {/* Lado Direito: Botão Editar + Status */}
        <div className="flex flex-col items-end gap-2">
          <Button 
            onClick={onEdit} 
            variant="outline" 
            size="sm" 
            className="h-8 gap-2 text-xs border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200"
          >
            <Edit className="w-3.5 h-3.5" /> Editar
          </Button>

          <div className="flex gap-2">
            <Badge variant="outline" className={cn(
              "text-xs px-2 py-0.5 shadow-sm",
              isBloqueado 
                ? "bg-red-50 text-red-600 border-red-200" 
                : "bg-emerald-50 text-emerald-600 border-emerald-200"
            )}>
              {isBloqueado ? 'Bloqueado' : 'Liberado'}
            </Badge>
            {cliStats.ativo && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 border-blue-200">
                Ativo
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Resumo Financeiro Rápido (Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 border-blue-100 bg-blue-50/50">
          <p className="text-xs text-blue-600 font-semibold mb-1">Limite de Crédito</p>
          <p className="text-lg font-bold text-blue-700">{formatCurrency(cliente.limite_credito)}</p>
        </Card>
        <Card className="p-4 border-amber-100 bg-amber-50/50">
          <p className="text-xs text-amber-600 font-semibold mb-1">Pedidos Abertos</p>
          <p className="text-lg font-bold text-amber-700">{formatCurrency(cliStats.totalPedidosAbertos)}</p>
        </Card>
        <Card className="p-4 border-purple-100 bg-purple-50/50">
          <p className="text-xs text-purple-600 font-semibold mb-1">Cheques a Vencer</p>
          <p className="text-lg font-bold text-purple-700">{formatCurrency(cliStats.totalChequesVencer)}</p>
        </Card>
        <Card className="p-4 border-green-100 bg-green-50/50">
          <p className="text-xs text-green-600 font-semibold mb-1">Créditos Disp.</p>
          <p className="text-lg font-bold text-green-700">
            {formatCurrency((creditos || []).reduce((sum, c) => c.status === 'disponivel' ? sum + c.valor : sum, 0))}
          </p>
        </Card>
      </div>

      {/* Accordions com Detalhes Completos */}
      <div className="pr-1">
        <Accordion type="multiple" defaultValue={['dados_gerais', 'financeiro']} className="space-y-4">
          
          {/* 1. DADOS GERAIS & ENDEREÇO */}
          <AccordionItem value="dados_gerais" className="border rounded-xl bg-white px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2 text-slate-800">
                <Building2 className="w-5 h-5 text-slate-500" />
                <span className="font-semibold text-base">Dados Cadastrais & Endereço</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Razão Social</p>
                  <p className="font-medium text-slate-800">{cliente.razao_social || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">CNPJ / CPF</p>
                  <p className="font-medium text-slate-800">{cliente.cnpj || '-'}</p>
                </div>
              </div>

              {/* Bloco de Endereço */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-slate-800">
                      {cliente.endereco}, {cliente.numero} {cliente.complemento && `(${cliente.complemento})`}
                    </p>
                    <p className="text-slate-600">
                      {cliente.bairro} - {cliente.cidade} / {cliente.estado}
                    </p>
                    <p className="text-slate-500 text-xs">
                      CEP: {cliente.cep} • Região: {cliente.regiao || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Classificação Fiscal (ST) */}
              <div className="flex items-center gap-3 pt-2 border-t">
                <Factory className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">Substituição Tributária (ST):</span>
                <Badge variant={cliente.tem_st ? "destructive" : "secondary"} className="gap-1">
                  {cliente.tem_st ? <><AlertCircle className="w-3 h-3" /> SIM (Com ST)</> : <><CheckCircle className="w-3 h-3" /> NÃO (Sem ST)</>}
                </Badge>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 2. COMERCIAL & CONTATO */}
          <AccordionItem value="comercial" className="border rounded-xl bg-white px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2 text-slate-800">
                <Briefcase className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-base">Comercial & Contato</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Representante</p>
                      <p className="font-medium text-slate-800">{cliente.representante_nome || cliente.representante_codigo || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Percent className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Comissão</p>
                      <p className="font-medium text-slate-800">{cliente.porcentagem_comissao}%</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-l pl-4 md:pl-6 border-slate-100">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Telefone</p>
                      <p className="font-medium text-slate-800">{cliente.telefone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Email</p>
                      <p className="font-medium text-slate-800">{cliente.email || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 3. FINANCEIRO & ANÁLISE */}
          <AccordionItem value="financeiro" className="border rounded-xl bg-white px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2 text-slate-800">
                <FileText className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-base">Análise Financeira</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2">
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Score e Consulta */}
                <div className="space-y-3 bg-slate-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Score de Crédito:</span>
                    <span className="text-sm font-bold text-blue-700">{cliente.score || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                    <span className="text-xs text-slate-500">Última Consulta:</span>
                    <span className="text-xs font-medium text-slate-800">
                      {cliente.data_consulta ? format(new Date(cliente.data_consulta), 'dd/MM/yyyy') : 'Nunca'}
                    </span>
                  </div>
                  
                  {cliente.serasa_file_url ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full gap-2 mt-2 bg-white text-blue-700 border-blue-200 hover:bg-blue-50 h-8 text-xs"
                      onClick={() => window.open(cliente.serasa_file_url, '_blank')}
                    >
                      <Download className="w-3 h-3" />
                      Ver Relatório PDF
                    </Button>
                  ) : (
                    <p className="text-[10px] text-slate-400 text-center italic mt-2">Sem PDF anexado</p>
                  )}
                </div>

                {/* Formas de Pagamento */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Formas de Pagamento Autorizadas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cliente.formas_pagamento && cliente.formas_pagamento.length > 0 ? (
                      cliente.formas_pagamento.map((forma, idx) => (
                        <Badge 
                          key={idx} 
                          className="bg-white text-slate-700 border-slate-200 hover:bg-slate-50 px-2 py-0.5 text-xs font-normal"
                        >
                          {forma}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">Nenhuma definida</p>
                    )}
                  </div>
                </div>

              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>

      {/* Footer Actions - SEM BOTÃO EDITAR */}
      <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white z-10">
        <Button variant="outline" onClick={onClose} className="h-10">
          <X className="w-4 h-4 mr-2" />
          Fechar
        </Button>
        <Button variant="default" onClick={onViewPedidos} className="h-10 bg-slate-800 hover:bg-slate-900 text-white">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Histórico de Pedidos
        </Button>
      </div>

    </div>
  );
}