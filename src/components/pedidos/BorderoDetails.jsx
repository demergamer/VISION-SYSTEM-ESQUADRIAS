import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, ShoppingCart, CreditCard, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function BorderoDetails({ bordero, pedidos, onClose }) {
  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  // DEFENSIVE CODING: Renderização segura de anexos
  const renderAnexos = () => {
    // Verificar se existe comprovantes_urls
    if (!bordero.comprovantes_urls) {
      return (
        <div className="text-center p-6 bg-slate-50 rounded-lg">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhum comprovante anexado</p>
        </div>
      );
    }

    // Tentar processar os anexos de forma segura
    let arquivos = [];
    try {
      // Se já for array, usar direto
      if (Array.isArray(bordero.comprovantes_urls)) {
        arquivos = bordero.comprovantes_urls;
      } 
      // Se for string, tentar fazer parse
      else if (typeof bordero.comprovantes_urls === 'string') {
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

    // Se não houver arquivos válidos
    if (!arquivos || arquivos.length === 0) {
      return (
        <div className="text-center p-6 bg-slate-50 rounded-lg">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhum comprovante anexado</p>
        </div>
      );
    }

    // Renderizar lista de arquivos
    return (
      <div className="space-y-2">
        {arquivos.map((url, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Comprovante {idx + 1}</p>
                <p className="text-xs text-slate-400">Clique para baixar</p>
              </div>
            </div>
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              download
              className="px-4 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
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
          <CreditCard className="w-5 h-5 text-purple-500" /> Cheques Vinculados ({bordero.cheques_anexos.length})
        </h3>
        <div className="space-y-3">
          {bordero.cheques_anexos.map((cheque, idx) => (
            <div key={idx} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Nº Cheque</p>
                  <p className="font-bold text-slate-800">{cheque.numero_cheque || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Banco</p>
                  <p className="font-medium text-slate-700">{cheque.banco || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Valor</p>
                  <p className="font-bold text-purple-600">{formatCurrency(cheque.valor || 0)}</p>
                </div>
              </div>
              {cheque.anexo_foto_url && (
                <div className="mt-3">
                  <a 
                    href={cheque.anexo_foto_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Foto do Cheque
                  </a>
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
        <div className="text-center p-6 bg-slate-50 rounded-lg">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhum pedido vinculado</p>
        </div>
      );
    }

    return (
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {pedidosIds.map((pedidoId) => {
          const pedido = pedidos.find(p => p.id === pedidoId);
          
          if (!pedido) {
            return (
              <div key={pedidoId} className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 mr-2" />
                <p className="text-sm text-amber-700">Pedido {pedidoId.substring(0, 8)}... (não encontrado)</p>
              </div>
            );
          }

          return (
            <div key={pedidoId} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
              <div>
                <p className="font-medium text-slate-800">#{pedido.numero_pedido || '-'}</p>
                <p className="text-xs text-slate-500">{pedido.cliente_nome || '-'}</p>
              </div>
              <p className="font-semibold text-blue-600">{formatCurrency(pedido.valor_pedido || 0)}</p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO - Informações Principais */}
      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Borderô</span>
            <h2 className="text-3xl font-bold text-slate-800">#{bordero.numero_bordero || '-'}</h2>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-sm px-3 py-1">
            {bordero.tipo_liquidacao === 'massa' ? 'Em Massa' : bordero.tipo_liquidacao === 'individual' ? 'Individual' : 'Pendente Aprovada'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Valor Total</p>
            <p className="font-bold text-emerald-600 text-2xl">{formatCurrency(bordero.valor_total || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Data de Liquidação</p>
            <p className="font-medium text-slate-700">
              {bordero.created_date ? format(new Date(bordero.created_date), 'dd/MM/yyyy HH:mm') : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Forma de Pagamento</p>
            <p className="font-medium text-slate-700">{bordero.forma_pagamento || 'Não especificada'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Liquidado por</p>
            <p className="font-medium text-slate-700 text-sm">
              {bordero.liquidado_por ? bordero.liquidado_por.split('@')[0] : 'Sistema'}
            </p>
          </div>
          {bordero.cliente_nome && (
            <div className="col-span-2">
              <p className="text-xs text-slate-500 mb-1">Cliente</p>
              <p className="font-medium text-slate-800">
                {bordero.cliente_nome} {bordero.cliente_codigo ? `(${bordero.cliente_codigo})` : ''}
              </p>
            </div>
          )}
          {bordero.observacao && (
            <div className="col-span-2">
              <p className="text-xs text-slate-500 mb-1">Observações</p>
              <p className="text-sm text-slate-700">{bordero.observacao}</p>
            </div>
          )}
        </div>
      </Card>

      {/* PEDIDOS LIQUIDADOS */}
      <div>
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-500" /> 
          Pedidos Liquidados ({bordero.pedidos_ids && Array.isArray(bordero.pedidos_ids) ? bordero.pedidos_ids.length : 0})
        </h3>
        {renderPedidos()}
      </div>

      {/* COMPROVANTES DE PAGAMENTO */}
      <div>
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-500" /> Comprovantes de Pagamento
        </h3>
        {renderAnexos()}
      </div>

      {/* CHEQUES (se houver) */}
      {renderCheques()}

      {/* BOTÃO FECHAR */}
      <Button variant="outline" className="w-full h-12 text-base" onClick={onClose}>
        Fechar
      </Button>
    </div>
  );
}