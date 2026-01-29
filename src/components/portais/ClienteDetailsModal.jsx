import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, MapPin, Phone, Mail, Percent, Users, CreditCard, ShoppingCart, Wallet, CalendarClock, Download, AlertCircle, CheckCircle2 } from "lucide-react";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function ClienteDetailsModal({ cliente, pedidos = [], cheques = [], creditos = [], open, onClose }) {
  if (!cliente) return null;

  // Cálculos
  const pedidosAbertos = pedidos.filter(p => p.status === 'aberto' || p.status === 'parcial');
  const totalAberto = pedidosAbertos.reduce((sum, p) => sum + (p.saldo_restante || 0), 0);
  
  const chequesAVencer = cheques.filter(c => c.status === 'normal' && new Date(c.data_vencimento) >= new Date());
  const valorChequesAVencer = chequesAVencer.reduce((sum, c) => sum + (c.valor || 0), 0);
  
  const creditosDisponiveis = creditos.filter(c => c.status === 'disponivel');
  const totalCreditos = creditosDisponiveis.reduce((sum, c) => sum + (c.valor || 0), 0);

  const handleDownloadSerasa = () => {
    if (cliente.serasa_file_url) {
      window.open(cliente.serasa_file_url, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="w-5 h-5 text-blue-600" />
            Dados do Cliente
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 p-4">
            {/* Info Principal */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-bold text-lg text-slate-800 mb-1">{cliente.nome}</h3>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span className="font-mono bg-white px-2 py-1 rounded border">{cliente.codigo}</span>
                {cliente.cnpj && <span className="font-mono">{cliente.cnpj}</span>}
              </div>
              {cliente.bloqueado_manual && (
                <Badge variant="destructive" className="mt-2">🚫 CLIENTE BLOQUEADO</Badge>
              )}
            </div>

            {/* Cards de Resumo Financeiro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Limite de Crédito */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-emerald-700 mb-2">
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase">Limite</span>
                </div>
                <p className="text-2xl font-bold text-emerald-800">{formatCurrency(cliente.limite_credito || 0)}</p>
              </div>

              {/* Pedidos em Aberto */}
              <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase">Em Aberto</span>
                </div>
                <p className="text-2xl font-bold text-red-800">{formatCurrency(totalAberto)}</p>
                <p className="text-xs text-red-600 mt-1">{pedidosAbertos.length} pedidos</p>
              </div>

              {/* Cheques a Vencer */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-purple-700 mb-2">
                  <CalendarClock className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase">Cheques</span>
                </div>
                <p className="text-2xl font-bold text-purple-800">{formatCurrency(valorChequesAVencer)}</p>
                <p className="text-xs text-purple-600 mt-1">{chequesAVencer.length} a vencer</p>
              </div>

              {/* Créditos Disponíveis */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <Wallet className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase">Créditos</span>
                </div>
                <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalCreditos)}</p>
                <p className="text-xs text-blue-600 mt-1">{creditosDisponiveis.length} disponíveis</p>
              </div>
            </div>

            {/* Dados de Contato */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase">Região</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{cliente.regiao || 'Não definida'}</p>
              </div>

              <div className="border rounded-lg p-4 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Percent className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase">Comissão</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{cliente.porcentagem_comissao || 5}%</p>
              </div>

              <div className="border rounded-lg p-4 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Phone className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase">Telefone</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{cliente.telefone || 'Não cadastrado'}</p>
              </div>

              <div className="border rounded-lg p-4 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Mail className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase">Email</span>
                </div>
                <p className="text-sm font-medium text-slate-800 break-all">{cliente.email || 'Não cadastrado'}</p>
              </div>
            </div>

            {/* Representante */}
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-600 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Representante</span>
              </div>
              <p className="text-sm font-medium text-slate-800">{cliente.representante_nome || 'Não atribuído'}</p>
              <p className="text-xs text-slate-500 font-mono mt-1">Código: {cliente.representante_codigo}</p>
            </div>

            {/* Análise de Crédito */}
            <div className="border border-slate-200 rounded-xl p-4 bg-gradient-to-r from-slate-50 to-slate-100">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Análise de Crédito
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Score */}
                <div>
                  <p className="text-xs text-slate-600 font-bold uppercase mb-1">Score</p>
                  {cliente.score ? (
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-slate-800">{cliente.score}</p>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Não consultado</p>
                  )}
                  {cliente.data_consulta && (
                    <p className="text-xs text-slate-500 mt-1">
                      Consultado em {new Date(cliente.data_consulta).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>

                {/* Download Serasa */}
                <div>
                  <p className="text-xs text-slate-600 font-bold uppercase mb-1">Relatório Serasa</p>
                  {cliente.serasa_file_url ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadSerasa}
                      className="gap-2 w-full"
                    >
                      <Download className="w-4 h-4" />
                      Baixar PDF
                    </Button>
                  ) : (
                    <p className="text-sm text-slate-500">Sem arquivo</p>
                  )}
                </div>
              </div>
            </div>

            {/* Formas de Pagamento */}
            <div className="border border-slate-200 rounded-xl p-4">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Formas de Pagamento Autorizadas
              </h3>
              {cliente.formas_pagamento && cliente.formas_pagamento.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {cliente.formas_pagamento.map((forma, idx) => (
                    <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {forma}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Nenhuma forma de pagamento configurada</p>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}