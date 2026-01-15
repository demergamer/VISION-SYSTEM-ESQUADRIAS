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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-800">
            Bem-vindo, {clienteData.nome}
          </h1>
          <p className="text-slate-500">
            Visualize seus débitos e pendências
          </p>
        </div>

        {/* Resumo Geral */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-700">
                Total a Pagar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-200 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-700" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-800">
                    {formatCurrency(totais.totalAPagar)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-700">
                Créditos Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-200 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-700" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-800">
                    {formatCurrency(totais.creditos)}
                  </p>
                  <p className="text-xs text-green-600">{meusCreditos.length} créditos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção Pedidos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-red-600" />
                  <p className="text-sm font-medium text-red-700">A Pagar</p>
                </div>
                <p className="text-2xl font-bold text-red-800">{formatCurrency(totais.pedidosAPagar)}</p>
                <p className="text-xs text-red-600 mt-1">{meusPedidos.aPagar.length} pedidos</p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-700">Pagos</p>
                </div>
                <p className="text-2xl font-bold text-green-800">{formatCurrency(totais.pedidosPagos)}</p>
                <p className="text-xs text-green-600 mt-1">{meusPedidos.pagos.length} pedidos</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-slate-600" />
                  <p className="text-sm font-medium text-slate-700">Cancelados</p>
                </div>
                <p className="text-2xl font-bold text-slate-800">{meusPedidos.cancelados.length}</p>
                <p className="text-xs text-slate-600 mt-1">pedidos</p>
              </div>
            </div>

            {meusPedidos.aPagar.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-700 text-sm">Pedidos Pendentes</h3>
                {meusPedidos.aPagar.map(pedido => {
                  const saldo = pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0));
                  const diasAtraso = calcularDiasAtraso(pedido.data_entrega);
                  
                  return (
                    <div key={pedido.id} className="p-4 border rounded-lg hover:bg-slate-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-800">Pedido #{pedido.numero_pedido}</p>
                            {diasAtraso > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {diasAtraso} dias de atraso
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">
                            Entrega: {format(new Date(pedido.data_entrega), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">{formatCurrency(saldo)}</p>
                          <p className="text-xs text-slate-500">Total: {formatCurrency(pedido.valor_pedido)}</p>
                        </div>
                      </div>
                      {pedido.observacao && (
                        <p className="text-sm text-slate-600 mt-2">Obs: {pedido.observacao}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção Cheques */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Cheques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-700">A Vencer</p>
                </div>
                <p className="text-2xl font-bold text-yellow-800">{formatCurrency(totais.chequesAVencer)}</p>
                <p className="text-xs text-yellow-600 mt-1">{meusCheques.aVencer.length} cheques</p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-700">Compensados</p>
                </div>
                <p className="text-2xl font-bold text-green-800">{meusCheques.compensados.length}</p>
                <p className="text-xs text-green-600 mt-1">cheques</p>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <p className="text-sm font-medium text-red-700">Devolvidos</p>
                </div>
                <p className="text-2xl font-bold text-red-800">{formatCurrency(totais.chequesDevolvidos)}</p>
                <p className="text-xs text-red-600 mt-1">{meusCheques.devolvidos.length} cheques</p>
              </div>
            </div>

            {meusCheques.devolvidos.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-700 text-sm">Cheques Devolvidos</h3>
                {meusCheques.devolvidos.map(cheque => {
                  const diasAtraso = calcularDiasAtraso(cheque.data_vencimento);
                  
                  return (
                    <div key={cheque.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-800">Cheque #{cheque.numero_cheque}</p>
                          <p className="text-sm text-slate-600">
                            Banco: {cheque.banco} | Venc: {format(new Date(cheque.data_vencimento), 'dd/MM/yyyy')}
                          </p>
                          {diasAtraso > 0 && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              {diasAtraso} dias vencido
                            </Badge>
                          )}
                        </div>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(cheque.valor)}</p>
                      </div>
                      {cheque.motivo_devolucao && (
                        <p className="text-sm text-slate-600 mt-2">Motivo: {cheque.motivo_devolucao}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção Créditos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Créditos Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {meusCreditos.length > 0 ? (
              <div className="space-y-3">
                {meusCreditos.map(credito => (
                  <div key={credito.id} className="p-4 border border-green-200 rounded-lg bg-green-50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-slate-800">Crédito #{credito.numero_credito}</p>
                        <p className="text-sm text-slate-600">{credito.origem}</p>
                      </div>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(credito.valor)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-4">Nenhum crédito disponível</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}