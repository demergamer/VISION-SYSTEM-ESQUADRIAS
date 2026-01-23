import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Eye,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function ClienteDetails({ cliente, stats, creditos, onEdit, onClose, onViewPedidos }) {
  const [showPdfViewer, setShowPdfViewer] = React.useState(false);

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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{cliente.nome}</h2>
            <p className="text-slate-500 font-mono">{cliente.codigo}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className={cn(
            "text-sm px-3 py-1",
            isBloqueado 
              ? "bg-red-50 text-red-600 border-red-200" 
              : "bg-emerald-50 text-emerald-600 border-emerald-200"
          )}>
            {isBloqueado ? 'Bloqueado' : 'Liberado'}
          </Badge>
          {cliStats.ativo && (
            <Badge variant="outline" className="text-sm px-3 py-1 bg-blue-50 text-blue-600 border-blue-200">
              Ativo
            </Badge>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 uppercase">Região</p>
              <p className="font-medium text-slate-800">{cliente.regiao || 'Não informada'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 uppercase">Telefone</p>
              <p className="font-medium text-slate-800">{cliente.telefone || 'Não informado'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 uppercase">Representante</p>
              <p className="font-medium text-slate-800">{cliente.representante_nome || cliente.representante_codigo}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <Percent className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 uppercase">Comissão</p>
              <p className="font-medium text-slate-800">{cliente.porcentagem_comissao || 5}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 uppercase">Score</p>
              <p className="font-medium text-slate-800">{cliente.score || 'Não consultado'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 uppercase">Última Consulta</p>
              <p className="font-medium text-slate-800">
                {cliente.data_consulta ? format(new Date(cliente.data_consulta), 'dd/MM/yyyy') : 'Nunca'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-blue-100 bg-blue-50/30">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-700 font-medium">Limite de Crédito</p>
          </div>
          <p className="text-3xl font-bold text-blue-700">{formatCurrency(cliente.limite_credito)}</p>
        </Card>
        <Card className="p-5 border-amber-100 bg-amber-50/30">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingCart className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-700 font-medium">Pedidos em Aberto</p>
          </div>
          <p className="text-3xl font-bold text-amber-700">{formatCurrency(cliStats.totalPedidosAbertos)}</p>
        </Card>
        <Card className="p-5 border-purple-100 bg-purple-50/30">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-purple-700 font-medium">Cheques a Vencer</p>
          </div>
          <p className="text-3xl font-bold text-purple-700">{formatCurrency(cliStats.totalChequesVencer)}</p>
        </Card>
        <Card className="p-5 border-green-100 bg-green-50/30">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-700 font-medium">Créditos Disponíveis</p>
          </div>
          <p className="text-3xl font-bold text-green-700">
            {formatCurrency((creditos || []).reduce((sum, c) => c.status === 'disponivel' ? sum + c.valor : sum, 0))}
          </p>
        </Card>
      </div>

      {/* ANÁLISE DE CRÉDITO E PAGAMENTO */}
      <Card className="p-6 bg-gradient-to-br from-slate-50 to-white border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Análise de Crédito e Pagamento
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          {/* COLUNA A: FORMAS DE PAGAMENTO */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-semibold text-slate-700">Formas de Pagamento Autorizadas</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {cliente.formas_pagamento && cliente.formas_pagamento.length > 0 ? (
                cliente.formas_pagamento.map((forma, idx) => (
                  <Badge 
                    key={idx} 
                    className="bg-emerald-100 text-emerald-700 border-emerald-200 px-3 py-1 text-xs"
                  >
                    {forma}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-slate-400 italic">Nenhuma forma de pagamento definida</p>
              )}
            </div>
          </div>

          {/* COLUNA B: INTEGRAÇÃO SERASA */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-semibold text-slate-700">Análise Serasa / Score</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Data da Consulta:</span>
                <span className="text-sm font-medium text-slate-800">
                  {cliente.data_consulta ? format(new Date(cliente.data_consulta), 'dd/MM/yyyy') : 'Nunca consultado'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Score / Pontuação:</span>
                <span className="text-sm font-bold text-blue-700">
                  {cliente.score || 'Não disponível'}
                </span>
              </div>
              {cliente.serasa_file_url && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full gap-2 mt-3 border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => setShowPdfViewer(true)}
                >
                  <Eye className="w-4 h-4" />
                  Visualizar Relatório PDF
                </Button>
              )}
              {!cliente.serasa_file_url && (
                <p className="text-xs text-slate-400 italic mt-2">Nenhum relatório Serasa anexado</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {cliStats.compras30k && (
          <Badge className="bg-purple-100 text-purple-700 border-purple-200">
            Mais de R$ 30.000 em compras
          </Badge>
        )}
        {cliStats.bloqueadoAuto && (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            Bloqueado automaticamente
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          <X className="w-4 h-4 mr-2" />
          Fechar
        </Button>
        <Button variant="outline" onClick={onViewPedidos}>
          <ShoppingCart className="w-4 h-4 mr-2" />
          Ver Pedidos
        </Button>
        <Button onClick={onEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Editar Cliente
        </Button>
      </div>

      {/* PDF VIEWER MODAL */}
      {showPdfViewer && cliente.serasa_file_url && (
        <div 
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPdfViewer(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b bg-slate-50">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-800">Relatório Serasa</h3>
                  <p className="text-xs text-slate-500">{cliente.nome}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowPdfViewer(false)}
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 p-2">
              <embed 
                src={cliente.serasa_file_url} 
                type="application/pdf" 
                width="100%" 
                height="600px"
                className="rounded-lg shadow-md"
              />
            </div>
            <div className="p-3 bg-slate-50 border-t flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(cliente.serasa_file_url, '_blank')}
              >
                Abrir em Nova Aba
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPdfViewer(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}