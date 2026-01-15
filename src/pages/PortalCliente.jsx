import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileText, CreditCard, TrendingDown, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { format } from "date-fns";

export default function PortalCliente() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list()
  });

  const { data: cheques = [] } = useQuery({
    queryKey: ['cheques'],
    queryFn: () => base44.entities.Cheque.list()
  });

  // Encontrar cliente pelo email do usuário
  const clienteData = useMemo(() => {
    // Assumindo que o email do usuário corresponde a algum campo do cliente
    // Ou você pode adicionar um campo "email_usuario" na entidade Cliente
    return clientes.find(c => c.email === user?.email);
  }, [clientes, user]);

  // Filtrar pedidos do cliente
  const meusPedidos = useMemo(() => {
    if (!clienteData) return { aPagar: [], pagos: [], cancelados: [] };
    const clientePedidos = pedidos.filter(p => p.cliente_codigo === clienteData.codigo);
    return {
      aPagar: clientePedidos.filter(p => p.status === 'aberto' || p.status === 'parcial'),
      pagos: clientePedidos.filter(p => p.status === 'pago'),
      cancelados: clientePedidos.filter(p => p.status === 'cancelado')
    };
  }, [pedidos, clienteData]);

  // Filtrar cheques do cliente
  const meusCheques = useMemo(() => {
    if (!clienteData) return { aVencer: [], compensados: [], devolvidos: [] };
    const clienteCheques = cheques.filter(c => c.cliente_codigo === clienteData.codigo);
    const hoje = new Date();
    return {
      aVencer: clienteCheques.filter(c => c.status === 'normal' && new Date(c.data_vencimento) >= hoje),
      compensados: clienteCheques.filter(c => c.status === 'pago'),
      devolvidos: clienteCheques.filter(c => c.status === 'devolvido')
    };
  }, [cheques, clienteData]);

  // Buscar créditos do cliente
  const { data: creditos = [] } = useQuery({
    queryKey: ['creditos'],
    queryFn: () => base44.entities.Credito.list()
  });

  const meusCreditos = useMemo(() => {
    if (!clienteData) return [];
    return creditos.filter(c => c.cliente_codigo === clienteData.codigo && c.status === 'disponivel');
  }, [creditos, clienteData]);

  // Calcular totais
  const totais = useMemo(() => {
    const totalPedidosAPagar = meusPedidos.aPagar.reduce((sum, p) => 
      sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0
    );
    const totalChequesDevolvidos = meusCheques.devolvidos.reduce((sum, c) => sum + c.valor, 0);
    const totalCreditos = meusCreditos.reduce((sum, c) => sum + c.valor, 0);
    
    return {
      pedidosAPagar: totalPedidosAPagar,
      pedidosPagos: meusPedidos.pagos.reduce((sum, p) => sum + p.valor_pedido, 0),
      chequesAVencer: meusCheques.aVencer.reduce((sum, c) => sum + c.valor, 0),
      chequesDevolvidos: totalChequesDevolvidos,
      creditos: totalCreditos,
      totalAPagar: totalPedidosAPagar + totalChequesDevolvidos
    };
  }, [meusPedidos, meusCheques, meusCreditos]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const calcularDiasAtraso = (dataEntrega) => {
    const hoje = new Date();
    const entrega = new Date(dataEntrega);
    const diff = Math.floor((hoje - entrega) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  if (!clienteData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <p className="text-yellow-800">
                  Nenhum cadastro encontrado para o email: {user?.email}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            {clienteData.nome}
          </h1>
          <p className="text-slate-500">Acompanhe suas movimentações financeiras</p>
        </div>

        {/* Resumo Geral */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-50 to-transparent rounded-full -mr-16 -mt-16 opacity-50" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-50 rounded-xl">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-sm font-medium text-slate-600">Total a Pagar</p>
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-1">
                {formatCurrency(totais.totalAPagar)}
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-50 to-transparent rounded-full -mr-16 -mt-16 opacity-50" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-50 rounded-xl">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-slate-600">Créditos Disponíveis</p>
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-1">
                {formatCurrency(totais.creditos)}
              </p>
              <p className="text-xs text-slate-500">{meusCreditos.length} créditos ativos</p>
            </div>
          </div>
        </div>

        {/* Seção Pedidos */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-800">Pedidos</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="group p-5 bg-gradient-to-br from-red-50 to-white border border-red-100 rounded-xl hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Clock className="w-4 h-4 text-red-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">A Pagar</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totais.pedidosAPagar)}</p>
                <p className="text-xs text-slate-500 mt-1">{meusPedidos.aPagar.length} pedidos</p>
              </div>
              <div className="group p-5 bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-xl hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Pagos</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totais.pedidosPagos)}</p>
                <p className="text-xs text-slate-500 mt-1">{meusPedidos.pagos.length} pedidos</p>
              </div>
              <div className="group p-5 bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-xl hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <XCircle className="w-4 h-4 text-slate-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Cancelados</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{meusPedidos.cancelados.length}</p>
                <p className="text-xs text-slate-500 mt-1">pedidos</p>
              </div>
            </div>

            {meusPedidos.aPagar.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="font-medium text-slate-700 text-sm mb-3">Pendentes</h3>
                {meusPedidos.aPagar.map(pedido => {
                  const saldo = pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0));
                  const diasAtraso = calcularDiasAtraso(pedido.data_entrega);
                  
                  return (
                    <div key={pedido.id} className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-800">#{pedido.numero_pedido}</p>
                            {diasAtraso > 0 && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                {diasAtraso}d atraso
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {format(new Date(pedido.data_entrega), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">{formatCurrency(saldo)}</p>
                          <p className="text-xs text-slate-500">de {formatCurrency(pedido.valor_pedido)}</p>
                        </div>
                      </div>
                      {pedido.observacao && (
                        <p className="text-xs text-slate-600 mt-2 bg-white p-2 rounded-lg">{pedido.observacao}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Seção Cheques */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-800">Cheques</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="group p-5 bg-gradient-to-br from-yellow-50 to-white border border-yellow-100 rounded-xl hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Clock className="w-4 h-4 text-yellow-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">A Vencer</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totais.chequesAVencer)}</p>
                <p className="text-xs text-slate-500 mt-1">{meusCheques.aVencer.length} cheques</p>
              </div>
              <div className="group p-5 bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-xl hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Compensados</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{meusCheques.compensados.length}</p>
                <p className="text-xs text-slate-500 mt-1">cheques</p>
              </div>
              <div className="group p-5 bg-gradient-to-br from-red-50 to-white border border-red-100 rounded-xl hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Devolvidos</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totais.chequesDevolvidos)}</p>
                <p className="text-xs text-slate-500 mt-1">{meusCheques.devolvidos.length} cheques</p>
              </div>
            </div>

            {meusCheques.devolvidos.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="font-medium text-slate-700 text-sm mb-3">Devolvidos</h3>
                {meusCheques.devolvidos.map(cheque => {
                  const diasAtraso = calcularDiasAtraso(cheque.data_vencimento);
                  
                  return (
                    <div key={cheque.id} className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-800">#{cheque.numero_cheque}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {cheque.banco} • {format(new Date(cheque.data_vencimento), 'dd/MM/yyyy')}
                          </p>
                          {diasAtraso > 0 && (
                            <span className="inline-block mt-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              {diasAtraso}d vencido
                            </span>
                          )}
                        </div>
                        <p className="text-lg font-bold text-slate-900">{formatCurrency(cheque.valor)}</p>
                      </div>
                      {cheque.motivo_devolucao && (
                        <p className="text-xs text-slate-600 mt-2 bg-white p-2 rounded-lg">{cheque.motivo_devolucao}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Seção Créditos */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-800">Créditos Disponíveis</h2>
            </div>
          </div>
          <div className="p-6">
            {meusCreditos.length > 0 ? (
              <div className="space-y-3">
                {meusCreditos.map(credito => (
                  <div key={credito.id} className="p-4 bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">Crédito #{credito.numero_credito}</p>
                        <p className="text-xs text-slate-500 mt-1">{credito.origem}</p>
                      </div>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(credito.valor)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-8 text-sm">Nenhum crédito disponível</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}