import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, ShoppingCart, CreditCard, AlertCircle, CalendarDays, User as UserIcon } from "lucide-react";
import { format } from "date-fns";

export default function BorderoDetails({ bordero, pedidos, onClose }) {
  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  // DEFENSIVE CODING: Renderização segura de anexos
  const renderAnexos = () => {
    if (!bordero.comprovantes_urls) {
      return (
        <div className="text-center p-6 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">Nenhum comprovante anexado</p>
        </div>
      );
    }

    let arquivos = [];
    try {
      if (Array.isArray(bordero.comprovantes_urls)) {
        arquivos = bordero.comprovantes_urls;
      } else if (typeof bordero.comprovantes_urls === 'string') {
        arquivos = JSON.parse(bordero.comprovantes_urls);
      }
    } catch (error) {
      console.error('Erro ao processar anexos:', error);
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Erro ao carregar anexos</p>
            <p className="text-sm text-red-600">Os dados estão preservados no banco, mas não podem ser exibidos no momento.</p>
          </div>
        </div>
      );
    }

    if (!arquivos || arquivos.length === 0) {
      return (
        <div className="text-center p-6 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">Nenhum comprovante anexado</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {arquivos.map((url, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-400 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">Comprovante {idx + 1}</p>
                <p className="text-[11px] text-slate-400">Documento anexado</p>
              </div>
            </div>
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              download
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-medium text-xs rounded-lg hover:bg-emerald-600 hover:text-white transition-colors flex items-center gap-1.5 border border-emerald-200 hover:border-emerald-600"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar
            </a>
          </div>
        ))}
      </div>
    );
  };

  // DEFENSIVE CODING: Renderização segura de cheques
  const renderCheques = () => {
    if (!bordero.cheques_anexos || !Array.isArray(bordero.cheques_anexos) || bordero.cheques_anexos.length === 0) {
      return null;
    }

    return (
      <div>
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-purple-600" /> Cheques Vinculados ({bordero.cheques_anexos.length})
        </h3>
        <div className="space-y-3">
          {bordero.cheques_anexos.map((cheque, idx) => (
            <div key={idx} className="p-4 bg-white border border-purple-200 shadow-sm rounded-xl hover:shadow-md transition-shadow">
              {/* CORREÇÃO DO GRID AQUI: 6 Colunas para mostrar tudo! */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Nº Cheque</p>
                  {/* Busca 'numero' (novo) ou 'numero_cheque' (legado) */}
                  <p className="font-bold text-slate-800">{cheque.numero || cheque.numero_cheque || '-'}</p>
                </div>
                
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Banco</p>
                  <p className="font-semibold text-slate-700 truncate" title={cheque.banco}>{cheque.banco || '-'}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Agência / Conta</p>
                  <p className="font-semibold text-slate-700">
                    {cheque.agencia ? `${cheque.agencia} / ${cheque.conta || '-'}` : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <UserIcon className="w-3 h-3" /> Emitente
                  </p>
                  <p className="font-semibold text-slate-700 truncate" title={cheque.emitente}>{cheque.emitente || '-'}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Bom Para
                  </p>
                  <p className="font-semibold text-amber-700">
                    {cheque.data_vencimento ? format(new Date(cheque.data_vencimento + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
                  </p>
                </div>

                <div className="text-right md:text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Valor</p>
                  <p className="font-extrabold text-purple-700 text-lg leading-none">{formatCurrency(cheque.valor || 0)}</p>
                </div>

              </div>

              {/* Botões de anexo (Fotos do Cheque) */}
              {(cheque.anexo_foto_url || cheque.anexo_video_url) && (
                <div className="mt-4 pt-3 border-t border-purple-100 flex gap-2">
                  {cheque.anexo_foto_url && (
                    <a 
                      href={cheque.anexo_foto_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 font-medium text-xs rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Ver Foto Frente
                    </a>
                  )}
                  {cheque.anexo_video_url && (
                    <a 
                      href={cheque.anexo_video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 font-medium text-xs rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Ver Foto Verso
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // DEFENSIVE CODING: Renderização segura de pedidos
  const renderPedidos = () => {
    const pedidosIds = bordero.pedidos_ids && Array.isArray(bordero.pedidos_ids) ? bordero.pedidos_ids : [];
    
    if (pedidosIds.length === 0) {
      return (
        <div className="text-center p-6 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
          <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">Nenhum pedido vinculado</p>
        </div>
      );
    }

    return (
      <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
        {pedidosIds.map((pedidoId) => {
          const pedido = pedidos.find(p => p.id === pedidoId);
          
          if (!pedido) {
            return (
              <div key={pedidoId} className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 mr-2" />
                <p className="text-sm text-amber-700 font-medium">Pedido {pedidoId.substring(0, 8)}... (não encontrado no cache)</p>
              </div>
            );
          }

          return (
            <div key={pedidoId} className="flex justify-between items-center p-3.5 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Pedido #{pedido.numero_pedido || '-'}</p>
                  <p className="text-xs text-slate-500 font-medium">{pedido.cliente_nome || '-'}</p>
                </div>
              </div>
              <p className="font-black text-blue-700 text-base">{formatCurrency(pedido.valor_pedido || 0)}</p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO - Informações Principais */}
      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-200 shadow-sm relative overflow-hidden">
        {/* Efeito visual de fundo */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-200 rounded-full blur-3xl opacity-40 pointer-events-none"></div>
        
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100 px-2 py-1 rounded-md mb-2 inline-block">Bordero de Liquidação</span>
            <h2 className="text-4xl font-black text-slate-800 drop-shadow-sm">#{bordero.numero_bordero || '-'}</h2>
          </div>
          <Badge className="bg-white text-emerald-700 border-emerald-300 text-sm px-4 py-1.5 shadow-sm font-bold">
            {bordero.tipo_liquidacao === 'massa' ? 'Liquidação em Massa' : bordero.tipo_liquidacao === 'individual' ? 'Liquidação Individual' : 'Pendente Aprovada'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Valor Total</p>
            <p className="font-black text-emerald-700 text-2xl">{formatCurrency(bordero.valor_total || 0)}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Data</p>
            <p className="font-bold text-slate-700">
              {bordero.created_date ? format(new Date(bordero.created_date), 'dd/MM/yyyy HH:mm') : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Operador</p>
            <p className="font-bold text-slate-700 truncate" title={bordero.liquidado_por}>
              {bordero.liquidado_por ? bordero.liquidado_por.split('@')[0] : 'Sistema'}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Forma(s)</p>
            <p className="font-bold text-slate-700 text-xs leading-tight line-clamp-2" title={bordero.forma_pagamento}>
              {bordero.forma_pagamento || 'Não especificada'}
            </p>
          </div>
          
          {bordero.cliente_nome && (
            <div className="col-span-2 md:col-span-4 pt-3 border-t border-emerald-200/50 mt-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cliente Vinculado</p>
              <p className="font-bold text-slate-800 text-lg">
                {bordero.cliente_nome} {bordero.cliente_codigo ? <span className="text-slate-500 font-medium text-sm">({bordero.cliente_codigo})</span> : ''}
              </p>
            </div>
          )}
          
          {bordero.observacao && (
            <div className="col-span-2 md:col-span-4 bg-white/60 p-3 rounded-lg border border-emerald-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Observações de Liquidação</p>
              <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{bordero.observacao}</p>
            </div>
          )}
        </div>
      </Card>

      {/* COMPROVANTES DE PAGAMENTO */}
      <div>
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" /> Comprovantes de Pagamento
        </h3>
        {renderAnexos()}
      </div>

      {/* CHEQUES (se houver) */}
      {renderCheques()}

      {/* PEDIDOS LIQUIDADOS */}
      <div>
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600" /> 
          Pedidos Liquidados ({bordero.pedidos_ids && Array.isArray(bordero.pedidos_ids) ? bordero.pedidos_ids.length : 0})
        </h3>
        {renderPedidos()}
      </div>

      {/* BOTÃO FECHAR */}
      <div className="pt-4 border-t border-slate-200">
        <Button variant="outline" className="w-full h-12 text-base font-bold text-slate-600 hover:bg-slate-100" onClick={onClose}>
          Fechar Detalhes
        </Button>
      </div>
    </div>
  );
}