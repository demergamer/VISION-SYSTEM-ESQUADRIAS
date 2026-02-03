import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Edit, X, CheckCircle, Clock, XCircle, AlertTriangle, 
  ArrowRightLeft, FileText, Image as ImageIcon, Video, 
  Building2, Landmark // Novos ícones para depósito
} from "lucide-react";
import { format } from "date-fns";

export default function ChequeDetails({ cheque, onEdit, onClose }) {
  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  const formatDate = (dateStr) => dateStr ? format(new Date(dateStr), 'dd/MM/yyyy') : '-';

  const getStatusConfig = (status) => {
    const config = {
      normal: { label: 'Em Carteira', class: 'bg-blue-100 text-blue-700', icon: Clock },
      compensado: { label: 'Compensado', class: 'bg-green-100 text-green-700', icon: CheckCircle },
      devolvido: { label: 'Devolvido', class: 'bg-red-100 text-red-700', icon: XCircle },
      pago: { label: 'Pago (Resgatado)', class: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
      repassado: { label: 'Repassado', class: 'bg-purple-100 text-purple-700', icon: ArrowRightLeft },
      cancelado: { label: 'Cancelado', class: 'bg-slate-100 text-slate-700', icon: AlertTriangle }
    };
    return config[status] || { label: status, class: 'bg-slate-100', icon: Clock };
  };

  const statusConfig = getStatusConfig(cheque.status);
  const StatusIcon = statusConfig.icon;
  const isVencido = cheque.status === 'normal' && new Date(cheque.data_vencimento) < new Date();

  return (
    <div className="space-y-6">
      
      {/* 1. VISUAL DO CHEQUE (REPRESENTAÇÃO GRÁFICA) */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 shadow-sm relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] opacity-5 pointer-events-none">
            <FileText className="w-64 h-64 text-blue-900" />
        </div>

        <div className="space-y-4 relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Banco</p>
              <p className="font-bold text-xl text-slate-800">{cheque.banco || 'Não Informado'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Nº Cheque</p>
              <p className="font-mono font-bold text-xl text-slate-900 tracking-wider">{cheque.numero_cheque}</p>
            </div>
          </div>
          
          <div className="border-t border-blue-200 pt-4 mt-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Valor</p>
            <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-blue-100 inline-block">
                <p className="font-bold text-4xl text-slate-800">{formatCurrency(cheque.valor)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-blue-200 pt-4 mt-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Emitente</p>
              <p className="font-medium text-lg text-slate-800 leading-tight">{cheque.emitente || 'Não Informado'}</p>
              {cheque.emitente_cpf_cnpj && (
                <p className="text-xs font-mono text-slate-600 mt-1">{cheque.emitente_cpf_cnpj}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Bom Para</p>
              <p className={`font-bold text-lg ${isVencido ? 'text-red-600' : 'text-slate-800'}`}>
                {formatDate(cheque.data_vencimento)}
              </p>
              {isVencido && <span className="text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded-full">VENCIDO</span>}
            </div>
          </div>

          <div className="flex justify-between items-end text-sm border-t border-blue-200 pt-3 mt-2">
            <div className="text-slate-600 font-mono">
              <span className="font-bold">AG:</span> {cheque.agencia || '---'} &nbsp;|&nbsp; 
              <span className="font-bold">CC:</span> {cheque.conta || '---'}
            </div>
            <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Emissão</p>
                <p className="font-medium text-slate-700">{formatDate(cheque.data_emissao)}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. STATUS E DESTINO (ATUALIZADO) */}
      <div className="space-y-4">
        
        {/* Card de Status Básico */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 flex flex-col justify-center">
            <p className="text-xs text-slate-500 mb-2 uppercase font-bold">Situação Atual</p>
            <div className="flex items-center gap-2">
                <Badge className={`${statusConfig.class} text-sm px-3 py-1`}>
                    <StatusIcon className="w-4 h-4 mr-2" />
                    {statusConfig.label}
                </Badge>
            </div>
            </Card>

            <Card className="p-4 bg-slate-50 border-slate-200">
            <p className="text-xs text-slate-500 mb-1 uppercase font-bold">Cliente Vinculado</p>
            <p className="font-bold text-slate-800 truncate" title={cheque.cliente_nome}>{cheque.cliente_nome}</p>
            {cheque.cliente_codigo && (
                <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="bg-white text-xs font-mono">{cheque.cliente_codigo}</Badge>
                </div>
            )}
            </Card>
        </div>

        {/* 4. DESTINO (REPASSE OU DEPÓSITO) - NOVO BLOCO */}
        {(cheque.status === 'repassado' || cheque.status === 'compensado') && (
            <Card className={`p-4 border ${cheque.status === 'repassado' ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200'}`}>
                <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${cheque.status === 'repassado' ? 'text-purple-800' : 'text-green-800'}`}>
                    {cheque.status === 'repassado' ? <ArrowRightLeft className="w-5 h-5" /> : <Landmark className="w-5 h-5" />} 
                    {cheque.status === 'repassado' ? 'Informações de Repasse' : 'Informações de Depósito'}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cheque.status === 'repassado' ? (
                        <>
                            <div>
                                <p className="text-xs font-bold uppercase opacity-70 text-purple-700">Destino (Fornecedor)</p>
                                <p className="font-medium text-purple-900 text-lg">{cheque.fornecedor_repassado_nome || 'N/A'}</p>
                                {cheque.fornecedor_repassado_codigo && <span className="text-xs font-mono bg-white/50 px-1 rounded text-purple-800">Cód: {cheque.fornecedor_repassado_codigo}</span>}
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase opacity-70 text-purple-700">Data do Repasse</p>
                                <p className="font-medium text-purple-900">{formatDate(cheque.data_repasse)}</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <p className="text-xs font-bold uppercase opacity-70 text-green-700">Destino</p>
                                <p className="font-medium text-green-900 text-lg flex items-center gap-2">
                                    <Building2 className="w-4 h-4" /> Conta Própria
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase opacity-70 text-green-700">Data da Compensação</p>
                                <p className="font-medium text-green-900">{formatDate(cheque.data_compensacao)}</p>
                            </div>
                        </>
                    )}
                </div>
            </Card>
        )}
      </div>

      {/* 3. HISTÓRICO DE PROBLEMAS (DEVOLUÇÃO / PAGAMENTO) */}
      {(cheque.status === 'devolvido' || cheque.status === 'pago') && (
          <Card className="p-4 bg-red-50 border-red-200">
            <h4 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Histórico de Devolução
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cheque.motivo_devolucao && (
                    <div>
                        <p className="text-xs text-red-600 font-bold uppercase">Motivo</p>
                        <p className="text-red-900">{cheque.motivo_devolucao}</p>
                    </div>
                )}
                {cheque.data_pagamento && (
                    <div>
                        <p className="text-xs text-red-600 font-bold uppercase">Data Regularização</p>
                        <p className="text-red-900">{formatDate(cheque.data_pagamento)}</p>
                    </div>
                )}
                {cheque.valor_pago > 0 && (
                    <div>
                        <p className="text-xs text-red-600 font-bold uppercase">Valor Pago</p>
                        <p className="text-red-900 font-bold">{formatCurrency(cheque.valor_pago)}</p>
                    </div>
                )}
                {cheque.forma_pagamento && (
                    <div>
                        <p className="text-xs text-red-600 font-bold uppercase">Forma Pagto</p>
                        <p className="text-red-900">{cheque.forma_pagamento}</p>
                    </div>
                )}
            </div>

            {/* Substituição */}
            {(cheque.cheque_substituto_numero || cheque.cheque_substituido_numero) && (
                <div className="mt-3 pt-3 border-t border-red-200">
                    {cheque.cheque_substituto_numero && (
                        <p className="text-xs text-red-700">Substituído pelo cheque: <strong>#{cheque.cheque_substituto_numero}</strong></p>
                    )}
                    {cheque.cheque_substituido_numero && (
                        <p className="text-xs text-red-700">Substitui o cheque: <strong>#{cheque.cheque_substituido_numero}</strong></p>
                    )}
                </div>
            )}
          </Card>
      )}

      {/* 5. ANEXOS E OBSERVAÇÕES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-xs text-slate-500 mb-2 uppercase font-bold">Observações</p>
            <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg min-h-[60px]">
                {cheque.observacao || 'Nenhuma observação registrada.'}
                {cheque.pedido_id && (
                    <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-blue-600 font-mono">
                        Ref. Pedido: #{cheque.pedido_id}
                    </div>
                )}
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-xs text-slate-500 mb-2 uppercase font-bold">Anexos</p>
            <div className="flex flex-col gap-2">
                {cheque.anexo_foto_url ? (
                    <a href={cheque.anexo_foto_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-blue-50 rounded-lg transition-colors border border-slate-100">
                        <ImageIcon className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-blue-600 underline">Ver Foto do Cheque</span>
                    </a>
                ) : <span className="text-xs text-slate-400 italic pl-2">Sem foto</span>}

                {cheque.anexo_video_url && (
                    <a href={cheque.anexo_video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-purple-50 rounded-lg transition-colors border border-slate-100">
                        <Video className="w-4 h-4 text-purple-500" />
                        <span className="text-sm text-purple-600 underline">Ver Vídeo</span>
                    </a>
                )}

                {cheque.anexo_comprovante_url && (
                    <a href={cheque.anexo_comprovante_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-green-50 rounded-lg transition-colors border border-slate-100">
                        <FileText className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600 underline">Ver Comprovante Pgto</span>
                    </a>
                )}
            </div>
          </Card>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="outline" onClick={onClose}>
          <X className="w-4 h-4 mr-2" />
          Fechar
        </Button>
        <Button onClick={onEdit} className="bg-blue-600 hover:bg-blue-700">
          <Edit className="w-4 h-4 mr-2" />
          Editar Dados
        </Button>
      </div>
    </div>
  );
}