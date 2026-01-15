import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, X, CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";

export default function ChequeDetails({ cheque, onEdit, onClose }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getStatusConfig = (status) => {
    const config = {
      pendente: { label: 'Pendente', class: 'bg-yellow-100 text-yellow-700', icon: Clock },
      compensado: { label: 'Compensado', class: 'bg-green-100 text-green-700', icon: CheckCircle },
      devolvido: { label: 'Devolvido', class: 'bg-red-100 text-red-700', icon: XCircle },
      cancelado: { label: 'Cancelado', class: 'bg-slate-100 text-slate-700', icon: AlertTriangle }
    };
    return config[status] || config.pendente;
  };

  const statusConfig = getStatusConfig(cheque.status);
  const StatusIcon = statusConfig.icon;
  const vencido = cheque.status === 'pendente' && new Date(cheque.data_vencimento) < new Date();

  return (
    <div className="space-y-6">
      {/* Visual do Cheque */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500">BANCO</p>
              <p className="font-bold text-lg">{cheque.banco}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Nº DO CHEQUE</p>
              <p className="font-mono font-bold text-lg">{cheque.numero_cheque}</p>
            </div>
          </div>
          
          <div className="border-t border-blue-300 pt-3">
            <p className="text-xs text-slate-500">PAGUE POR ESTE CHEQUE A QUANTIA DE</p>
            <p className="font-bold text-3xl text-green-700">{formatCurrency(cheque.valor)}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-blue-300 pt-3">
            <div>
              <p className="text-xs text-slate-500">A</p>
              <p className="font-medium text-lg">{cheque.emitente}</p>
              {cheque.emitente_cpf_cnpj && (
                <p className="text-sm font-mono text-slate-600 mt-1">{cheque.emitente_cpf_cnpj}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500">DATA DE EMISSÃO</p>
              <p className="font-medium">
                {cheque.data_emissao ? new Date(cheque.data_emissao).toLocaleDateString('pt-BR') : '-'}
              </p>
            </div>
          </div>

          <div className="text-sm border-t border-blue-300 pt-2">
            <p className="text-slate-600">
              <span className="font-medium">AG:</span> {cheque.agencia || '-'} / 
              <span className="font-medium ml-2">CONTA:</span> {cheque.conta || '-'}
            </p>
          </div>
        </div>
      </Card>

      {/* Status e Informações */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-sm text-slate-500 mb-2">Status</p>
          <Badge className={`${statusConfig.class} text-base px-3 py-1`}>
            <StatusIcon className="w-4 h-4 mr-2" />
            {statusConfig.label}
          </Badge>
          {vencido && (
            <p className="text-red-600 text-sm mt-2 font-medium">⚠️ Cheque vencido</p>
          )}
        </Card>

        <Card className="p-4">
          <p className="text-sm text-slate-500 mb-2">Vencimento</p>
          <p className={`text-lg font-bold ${vencido ? 'text-red-600' : 'text-slate-800'}`}>
            {new Date(cheque.data_vencimento).toLocaleDateString('pt-BR')}
          </p>
        </Card>
      </div>

      {/* Cliente */}
      {cheque.cliente_nome && (
        <Card className="p-4 bg-slate-50">
          <p className="text-sm text-slate-500 mb-1">Cliente Vinculado</p>
          <p className="font-bold text-lg">{cheque.cliente_nome}</p>
          {cheque.cliente_codigo && (
            <p className="text-sm font-mono text-slate-600">{cheque.cliente_codigo}</p>
          )}
        </Card>
      )}

      {/* Data de Compensação */}
      {cheque.data_compensacao && (
        <Card className="p-4 bg-green-50 border-green-200">
          <p className="text-sm text-green-700 mb-1">Data de Compensação</p>
          <p className="font-bold text-lg text-green-800">
            {new Date(cheque.data_compensacao).toLocaleDateString('pt-BR')}
          </p>
        </Card>
      )}

      {/* Motivo de Devolução */}
      {cheque.motivo_devolucao && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-red-700 mb-1">Motivo da Devolução</p>
          <p className="text-red-800">{cheque.motivo_devolucao}</p>
        </Card>
      )}

      {/* Observações */}
      {cheque.observacao && (
        <Card className="p-4">
          <p className="text-sm text-slate-500 mb-2">Observações</p>
          <p className="text-slate-700 whitespace-pre-wrap">{cheque.observacao}</p>
        </Card>
      )}

      {/* Pedido Vinculado */}
      {cheque.pedido_id && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-700 mb-1">Pedido Vinculado</p>
          <p className="font-mono font-bold text-blue-800">{cheque.pedido_id}</p>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          <X className="w-4 h-4 mr-2" />
          Fechar
        </Button>
        <Button onClick={onEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Editar
        </Button>
      </div>
    </div>
  );
}