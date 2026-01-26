import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";

const statusConfig = {
  aguardando_vinculo: { label: 'Aguardando Vínculo', color: 'bg-slate-100 text-slate-700' },
  em_separacao: { label: 'Em Separação', color: 'bg-blue-100 text-blue-700' },
  aguardando_liquidacao: { label: 'Aguardando Liquidação', color: 'bg-purple-100 text-purple-700' },
  parcialmente_usado: { label: 'Parcialmente Usado', color: 'bg-orange-100 text-orange-700' },
  finalizado: { label: 'Finalizado', color: 'bg-green-100 text-green-700' },
  devolvido: { label: 'Devolvido', color: 'bg-red-100 text-red-700' }
};

export default function PortDetalhes({ port }) {
  const config = statusConfig[port.status];
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

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
            <div>
              <span className="text-slate-500">Data Entrada:</span>
              <span className="ml-2 font-medium">
                {new Date(port.data_entrada || port.created_date).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-slate-700 mb-3">Dados Financeiros</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-500">Valor do Sinal:</span>
              <span className="ml-2 font-bold text-emerald-600">{formatCurrency(port.valor_total_sinal)}</span>
            </div>
            <div>
              <span className="text-slate-500">Saldo Disponível:</span>
              <span className="ml-2 font-bold text-blue-600">{formatCurrency(port.saldo_disponivel)}</span>
            </div>
            <div>
              <span className="text-slate-500">Forma:</span>
              <span className="ml-2 font-medium">{port.forma_pagamento?.tipo || '-'}</span>
            </div>
          </div>
        </Card>
      </div>

      {port.forma_pagamento && (
        <Card className="p-4">
          <h3 className="font-semibold text-slate-700 mb-3">Detalhes da Forma de Pagamento</h3>
          
          {port.forma_pagamento.tipo === 'Cheque' && port.forma_pagamento.detalhes_cheque && (
            <div className="space-y-1 text-sm">
              <div><span className="text-slate-500">Banco:</span> <span className="font-medium">{port.forma_pagamento.detalhes_cheque.banco}</span></div>
              <div><span className="text-slate-500">Nº Cheque:</span> <span className="font-medium">{port.forma_pagamento.detalhes_cheque.numero_cheque}</span></div>
              <div><span className="text-slate-500">Bom Para:</span> <span className="font-medium">{port.forma_pagamento.detalhes_cheque.data_bom_para ? new Date(port.forma_pagamento.detalhes_cheque.data_bom_para).toLocaleDateString('pt-BR') : '-'}</span></div>
            </div>
          )}

          {port.forma_pagamento.tipo === 'Cartão' && port.forma_pagamento.detalhes_cartao && (
            <div className="space-y-1 text-sm">
              <div><span className="text-slate-500">Bandeira:</span> <span className="font-medium">{port.forma_pagamento.detalhes_cartao.bandeira}</span></div>
              <div><span className="text-slate-500">Parcelas:</span> <span className="font-medium">{port.forma_pagamento.detalhes_cartao.parcelas}x</span></div>
            </div>
          )}

          {port.forma_pagamento.tipo === 'PIX' && port.forma_pagamento.detalhes_pix?.id_transacao && (
            <div className="text-sm">
              <span className="text-slate-500">ID Transação:</span> 
              <span className="font-mono ml-2 text-xs">{port.forma_pagamento.detalhes_pix.id_transacao}</span>
            </div>
          )}
        </Card>
      )}

      <Card className="p-4">
        <h3 className="font-semibold text-slate-700 mb-3">Pedidos Vinculados</h3>
        <div className="space-y-2">
          {port.itens_port?.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-2">
                {item.vinculado ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-slate-400" />
                )}
                <span className="font-mono font-medium">#{item.numero_pedido_manual}</span>
                {item.vinculado && (
                  <Badge className="bg-green-50 text-green-700 text-xs">Vinculado</Badge>
                )}
              </div>
              <span className="font-bold text-emerald-600">{formatCurrency(item.valor_alocado)}</span>
            </div>
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