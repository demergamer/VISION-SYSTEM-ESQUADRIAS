import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileText, CreditCard, TrendingDown } from "lucide-react";
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
    if (!clienteData) return [];
    return pedidos.filter(p => 
      p.cliente_codigo === clienteData.codigo && 
      (p.status === 'aberto' || p.status === 'parcial')
    );
  }, [pedidos, clienteData]);

  // Filtrar cheques do cliente
  const meusCheques = useMemo(() => {
    if (!clienteData) return [];
    return cheques.filter(c => 
      c.cliente_codigo === clienteData.codigo && 
      c.status === 'devolvido'
    );
  }, [cheques, clienteData]);

  // Calcular totais
  const totais = useMemo(() => {
    const totalPedidos = meusPedidos.reduce((sum, p) => 
      sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0
    );
    const totalCheques = meusCheques.reduce((sum, c) => sum + c.valor, 0);
    
    return {
      pedidos: totalPedidos,
      cheques: totalCheques,
      total: totalPedidos + totalCheques
    };
  }, [meusPedidos, meusCheques]);

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

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total a Pagar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">
                    {formatCurrency(totais.total)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Pedidos Abertos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">
                    {formatCurrency(totais.pedidos)}
                  </p>
                  <p className="text-xs text-slate-500">{meusPedidos.length} pedidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Cheques Devolvidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">
                    {formatCurrency(totais.cheques)}
                  </p>
                  <p className="text-xs text-slate-500">{meusCheques.length} cheques</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pedidos */}
        {meusPedidos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {meusPedidos.map(pedido => {
                  const saldo = pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0));
                  const diasAtraso = calcularDiasAtraso(pedido.data_entrega);
                  
                  return (
                    <div key={pedido.id} className="p-4 border rounded-lg hover:bg-slate-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-800">
                              Pedido #{pedido.numero_pedido}
                            </p>
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
                          <p className="text-lg font-bold text-red-600">
                            {formatCurrency(saldo)}
                          </p>
                          <p className="text-xs text-slate-500">
                            Total: {formatCurrency(pedido.valor_pedido)}
                          </p>
                        </div>
                      </div>
                      {pedido.observacao && (
                        <p className="text-sm text-slate-600 mt-2">
                          Obs: {pedido.observacao}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cheques */}
        {meusCheques.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cheques Devolvidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {meusCheques.map(cheque => {
                  const diasAtraso = calcularDiasAtraso(cheque.data_vencimento);
                  
                  return (
                    <div key={cheque.id} className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-800">
                            Cheque #{cheque.numero_cheque}
                          </p>
                          <p className="text-sm text-slate-600">
                            Banco: {cheque.banco} | Venc: {format(new Date(cheque.data_vencimento), 'dd/MM/yyyy')}
                          </p>
                          {diasAtraso > 0 && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              {diasAtraso} dias vencido
                            </Badge>
                          )}
                        </div>
                        <p className="text-lg font-bold text-orange-600">
                          {formatCurrency(cheque.valor)}
                        </p>
                      </div>
                      {cheque.motivo_devolucao && (
                        <p className="text-sm text-slate-600 mt-2">
                          Motivo: {cheque.motivo_devolucao}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mensagem se não houver débitos */}
        {meusPedidos.length === 0 && meusCheques.length === 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <p className="text-green-800 font-medium">
                ✓ Parabéns! Você não possui débitos pendentes.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}