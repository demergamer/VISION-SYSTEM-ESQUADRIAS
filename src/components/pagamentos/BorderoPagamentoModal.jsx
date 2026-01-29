import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  X, FileText, Download, DollarSign, Calendar, User, CreditCard,
  CheckCircle, Eye
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function BorderoPagamentoModal({ borderoId, onClose }) {
  const [bordero, setBordero] = useState(null);
  const [contas, setContas] = useState([]);
  const [cheques, setCheques] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Buscar borderô
        const borderosList = await base44.entities.BorderoPagamento.list();
        const borderoData = borderosList.find(b => b.id === borderoId);
        
        if (!borderoData) {
          toast.error('Borderô não encontrado');
          onClose();
          return;
        }
        
        setBordero(borderoData);

        // Buscar contas relacionadas
        if (borderoData.contas_ids && borderoData.contas_ids.length > 0) {
          const contasList = await base44.entities.ContaPagar.list();
          const contasRelacionadas = contasList.filter(c => 
            borderoData.contas_ids.includes(c.id)
          );
          setContas(contasRelacionadas);
        }

        // Buscar cheques repassados
        if (borderoData.cheques_repassados && borderoData.cheques_repassados.length > 0) {
          const chequesList = await base44.entities.Cheque.list();
          const chequesIds = borderoData.cheques_repassados.map(cr => cr.cheque_id);
          const chequesRelacionados = chequesList.filter(ch => 
            chequesIds.includes(ch.id)
          );
          setCheques(chequesRelacionados);
        }
      } catch (error) {
        console.error('Erro ao carregar borderô:', error);
        toast.error('Erro ao carregar detalhes do borderô');
      } finally {
        setLoading(false);
      }
    };

    if (borderoId) {
      fetchData();
    }
  }, [borderoId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl p-8 text-center">
          <p className="text-slate-600">Carregando detalhes...</p>
        </Card>
      </div>
    );
  }

  if (!bordero) {
    return null;
  }

  const getTipoIcon = (tipo) => {
    const icons = {
      'dinheiro': '💵',
      'cheque_terceiro': '🎫',
      'pecas': '⚙️',
      'pix': '🏦',
      'transferencia': '🏦',
      'credito': '💳'
    };
    return icons[tipo] || '💰';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-5xl my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 z-10 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-blue-600 text-white text-base px-3 py-1">
                  Borderô #{bordero.numero_bordero}
                </Badge>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Pago
                </Badge>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">
                {bordero.fornecedor_nome}
              </h2>
              <p className="text-sm text-slate-600">
                Código: {bordero.fornecedor_codigo}
              </p>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-xs text-slate-600">Data Pagamento</p>
                <p className="font-semibold">
                  {bordero.data_pagamento ? format(parseISO(bordero.data_pagamento), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-xs text-slate-600">Valor Total</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(bordero.valor_total)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-xs text-slate-600">Liquidado por</p>
                <p className="font-semibold text-sm truncate">
                  {bordero.liquidado_por?.split('@')[0] || 'Sistema'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* A. Itens Baixados (Contas) */}
          <Card className="p-4">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Contas Liquidadas ({contas.length})
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs text-slate-600 font-semibold pb-2 px-2">Vencimento</th>
                    <th className="text-left text-xs text-slate-600 font-semibold pb-2 px-2">Descrição</th>
                    <th className="text-right text-xs text-slate-600 font-semibold pb-2 px-2">Valor Original</th>
                    <th className="text-right text-xs text-slate-600 font-semibold pb-2 px-2">Juros/Desconto</th>
                    <th className="text-right text-xs text-slate-600 font-semibold pb-2 px-2">Valor Pago</th>
                    <th className="text-center text-xs text-slate-600 font-semibold pb-2 px-2">Anexo</th>
                  </tr>
                </thead>
                <tbody>
                  {contas.map((conta) => {
                    const jurosMulta = conta.juros_multa || 0;
                    const desconto = conta.desconto || 0;
                    const ajuste = jurosMulta - desconto;
                    
                    return (
                      <tr key={conta.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-2 text-sm">
                          {conta.data_vencimento ? format(parseISO(conta.data_vencimento), "dd/MM/yy") : '-'}
                        </td>
                        <td className="py-3 px-2 text-sm">{conta.descricao}</td>
                        <td className="py-3 px-2 text-sm text-right font-medium">
                          {formatCurrency(conta.valor_original || conta.valor)}
                        </td>
                        <td className={`py-3 px-2 text-sm text-right font-medium ${ajuste > 0 ? 'text-red-600' : ajuste < 0 ? 'text-green-600' : ''}`}>
                          {ajuste > 0 ? '+' : ''}{formatCurrency(ajuste)}
                        </td>
                        <td className="py-3 px-2 text-sm text-right font-bold text-blue-700">
                          {formatCurrency(conta.valor_pago)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {conta.comprovante_url ? (
                            <a 
                              href={conta.comprovante_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* B. Como Foi Pago (Origem) */}
          <Card className="p-4">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              Formas de Pagamento
            </h3>
            
            <div className="space-y-3">
              {bordero.formas_pagamento?.map((fp, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTipoIcon(fp.tipo)}</span>
                    <div>
                      <p className="font-semibold text-slate-800 capitalize">
                        {fp.tipo.replace('_', ' ')}
                      </p>
                      {fp.detalhes && (
                        <p className="text-xs text-slate-600 mt-1">{fp.detalhes}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(fp.valor)}
                  </p>
                </div>
              ))}
            </div>

            {/* Cheques Repassados */}
            {cheques.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold text-sm text-slate-700 mb-3">
                  🎫 Cheques Repassados ({cheques.length})
                </h4>
                <div className="space-y-2">
                  {cheques.map((cheque) => (
                    <div key={cheque.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-mono text-sm font-bold text-blue-900">
                            {cheque.banco} Nº {cheque.numero_cheque}
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            Emitente: {cheque.emitente}
                          </p>
                          {cheque.cliente_nome && (
                            <p className="text-xs text-blue-600">
                              Cliente: {cheque.cliente_nome}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-700">
                            {formatCurrency(cheque.valor)}
                          </p>
                          {cheque.anexo_foto_url && (
                            <a 
                              href={cheque.anexo_foto_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1 justify-end mt-1"
                            >
                              <Eye className="w-3 h-3" />
                              Ver Cheque
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* C. Comprovante de Pagamento */}
          {bordero.recibo_url && (
            <Card className="p-4">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-purple-600" />
                Comprovante de Pagamento
              </h3>
              
              <a 
                href={bordero.recibo_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-200 rounded-lg">
                    <FileText className="w-6 h-6 text-purple-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Recibo de Pagamento</p>
                    <p className="text-xs text-slate-600">Clique para visualizar/baixar</p>
                  </div>
                </div>
                <Download className="w-5 h-5 text-purple-600" />
              </a>
            </Card>
          )}

          {/* Observações */}
          {bordero.observacao && (
            <Card className="p-4">
              <h3 className="font-bold text-sm text-slate-700 mb-2">Observações</h3>
              <p className="text-sm text-slate-600">{bordero.observacao}</p>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 sticky bottom-0 rounded-b-xl">
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Fechar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}