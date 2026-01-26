import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink } from "lucide-react";

const statusConfig = {
  aguardando_separacao: { label: 'Aguardando Separação', color: 'bg-yellow-100 text-yellow-700' },
  em_separacao: { label: 'Em Separação', color: 'bg-blue-100 text-blue-700' },
  aguardando_liquidacao: { label: 'Aguardando Liquidação', color: 'bg-purple-100 text-purple-700' },
  parcialmente_usado: { label: 'Parcialmente Usado', color: 'bg-orange-100 text-orange-700' },
  finalizado: { label: 'Finalizado', color: 'bg-green-100 text-green-700' },
  devolvido: { label: 'Devolvido', color: 'bg-red-100 text-red-700' }
};

export default function PortDetalhes({ port }) {
  const config = statusConfig[port.status];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">PORT #{port.numero_port}</h2>
        <Badge className={config.color}>{config.label}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-slate-700 mb-3">Informações do Cliente</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-500">Código:</span>
              <span className="ml-2 font-medium">{port.cliente_codigo}</span>
            </div>
            <div>
              <span className="text-slate-500">Nome:</span>
              <span className="ml-2 font-medium">{port.cliente_nome}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-slate-700 mb-3">Dados Financeiros</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-500">Valor do Sinal:</span>
              <span className="ml-2 font-bold text-emerald-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(port.valor_total_sinal)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Saldo Disponível:</span>
              <span className="ml-2 font-bold text-blue-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(port.saldo_disponivel)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Forma de Pagamento:</span>
              <span className="ml-2 font-medium">{port.forma_pagamento}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold text-slate-700 mb-3">Pedidos Vinculados</h3>
        <div className="flex flex-wrap gap-2">
          {port.pedidos_numeros?.map((num, idx) => (
            <Badge key={idx} variant="outline" className="text-sm">#{num}</Badge>
          ))}
        </div>
      </Card>

      {port.comprovantes_urls && port.comprovantes_urls.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-slate-700 mb-3">Comprovantes Anexados</h3>
          <div className="space-y-2">
            {port.comprovantes_urls.map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-slate-700 flex-1">Comprovante {idx + 1}</span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>
            ))}
          </div>
        </Card>
      )}

      {port.observacao && (
        <Card className="p-4">
          <h3 className="font-semibold text-slate-700 mb-2">Observações</h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{port.observacao}</p>
        </Card>
      )}

      {port.motivo_devolucao && (
        <Card className="p-4 bg-red-50 border-red-200">
          <h3 className="font-semibold text-red-700 mb-2">Motivo da Devolução</h3>
          <p className="text-sm text-slate-700">{port.motivo_devolucao}</p>
        </Card>
      )}

      <div className="text-xs text-slate-500 pt-4 border-t">
        Criado por {port.created_by} em {new Date(port.created_date).toLocaleString('pt-BR')}
      </div>
    </div>
  );
}