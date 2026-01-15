import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertCircle, FileText, CreditCard, TrendingDown, CheckCircle, XCircle, Clock, DollarSign, Search } from "lucide-react";
import { format } from "date-fns";

export default function PortalCliente() {
  const [filtros, setFiltros] = useState({
    numeroPedido: '',
    rota: '',
    dataEntregaInicio: '',
    dataEntregaFim: '',
    dataPagamentoInicio: '',
    dataPagamentoFim: '',
    valorMin: '',
    valorMax: ''
  });

  const [filtrosCheques, setFiltrosCheques] = useState({
    numeroCheque: '',
    banco: '',
    dataVencimentoInicio: '',
    dataVencimentoFim: '',
    valorMin: '',
    valorMax: ''
  });

  const [abaPedidos, setAbaPedidos] = useState('aPagar');
  const [abaCheques, setAbaCheques] = useState('devolvidos');

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
    let clientePedidos = pedidos.filter(p => p.cliente_codigo === clienteData.codigo);
    
    // Aplicar filtros
    if (filtros.numeroPedido) {
      clientePedidos = clientePedidos.filter(p => 
        p.numero_pedido?.toLowerCase().includes(filtros.numeroPedido.toLowerCase())
      );
    }
    if (filtros.rota) {
      clientePedidos = clientePedidos.filter(p => 
        p.rota_codigo?.toLowerCase().includes(filtros.rota.toLowerCase())
      );
    }
    if (filtros.dataEntregaInicio) {
      clientePedidos = clientePedidos.filter(p => 
        new Date(p.data_entrega) >= new Date(filtros.dataEntregaInicio)
      );
    }
    if (filtros.dataEntregaFim) {
      clientePedidos = clientePedidos.filter(p => 
        new Date(p.data_entrega) <= new Date(filtros.dataEntregaFim)
      );
    }
    if (filtros.dataPagamentoInicio) {
      clientePedidos = clientePedidos.filter(p => 
        p.data_pagamento && new Date(p.data_pagamento) >= new Date(filtros.dataPagamentoInicio)
      );
    }
    if (filtros.dataPagamentoFim) {
      clientePedidos = clientePedidos.filter(p => 
        p.data_pagamento && new Date(p.data_pagamento) <= new Date(filtros.dataPagamentoFim)
      );
    }
    if (filtros.valorMin) {
      clientePedidos = clientePedidos.filter(p => 
        p.valor_pedido >= parseFloat(filtros.valorMin)
      );
    }
    if (filtros.valorMax) {
      clientePedidos = clientePedidos.filter(p => 
        p.valor_pedido <= parseFloat(filtros.valorMax)
      );
    }
    
    return {
      aPagar: clientePedidos.filter(p => p.status === 'aberto' || p.status === 'parcial'),
      pagos: clientePedidos.filter(p => p.status === 'pago'),
      cancelados: clientePedidos.filter(p => p.status === 'cancelado')
    };
  }, [pedidos, clienteData, filtros]);

  // Filtrar cheques do cliente
  const meusCheques = useMemo(() => {
    if (!clienteData) return { aVencer: [], compensados: [], devolvidos: [] };
    let clienteCheques = cheques.filter(c => c.cliente_codigo === clienteData.codigo);
    
    // Aplicar filtros
    if (filtrosCheques.numeroCheque) {
      clienteCheques = clienteCheques.filter(c => 
        c.numero_cheque?.toLowerCase().includes(filtrosCheques.numeroCheque.toLowerCase())
      );
    }
    if (filtrosCheques.banco) {
      clienteCheques = clienteCheques.filter(c => 
        c.banco?.toLowerCase().includes(filtrosCheques.banco.toLowerCase())
      );
    }
    if (filtrosCheques.dataVencimentoInicio) {
      clienteCheques = clienteCheques.filter(c => 
        new Date(c.data_vencimento) >= new Date(filtrosCheques.dataVencimentoInicio)
      );
    }
    if (filtrosCheques.dataVencimentoFim) {
      clienteCheques = clienteCheques.filter(c => 
        new Date(c.data_vencimento) <= new Date(filtrosCheques.dataVencimentoFim)
      );
    }
    if (filtrosCheques.valorMin) {
      clienteCheques = clienteCheques.filter(c => 
        c.valor >= parseFloat(filtrosCheques.valorMin)
      );
    }
    if (filtrosCheques.valorMax) {
      clienteCheques = clienteCheques.filter(c => 
        c.valor <= parseFloat(filtrosCheques.valorMax)
      );
    }
    
    const hoje = new Date();
    return {
      aVencer: clienteCheques.filter(c => c.status === 'normal' && new Date(c.data_vencimento) >= hoje),
      compensados: clienteCheques.filter(c => c.status === 'pago'),
      devolvidos: clienteCheques.filter(c => c.status === 'devolvido')
    };
  }, [cheques, clienteData, filtrosCheques]);

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

  const formatNumero = (numero) => {
    if (!numero) return '';
    return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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
              <button 
                onClick={() => setAbaPedidos('aPagar')}
                className={`group p-5 rounded-xl transition-all text-left ${
                  abaPedidos === 'aPagar' 
                    ? 'bg-gradient-to-br from-red-50 to-white border-2 border-red-200 shadow-md' 
                    : 'bg-white border border-slate-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Clock className="w-4 h-4 text-red-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">A Pagar</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totais.pedidosAPagar)}</p>
                <p className="text-xs text-slate-500 mt-1">{meusPedidos.aPagar.length} pedidos</p>
              </button>
              <button 
                onClick={() => setAbaPedidos('pagos')}
                className={`group p-5 rounded-xl transition-all text-left ${
                  abaPedidos === 'pagos' 
                    ? 'bg-gradient-to-br from-green-50 to-white border-2 border-green-200 shadow-md' 
                    : 'bg-white border border-slate-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Pagos</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totais.pedidosPagos)}</p>
                <p className="text-xs text-slate-500 mt-1">{meusPedidos.pagos.length} pedidos</p>
              </button>
              <button 
                onClick={() => setAbaPedidos('cancelados')}
                className={`group p-5 rounded-xl transition-all text-left ${
                  abaPedidos === 'cancelados' 
                    ? 'bg-gradient-to-br from-slate-50 to-white border-2 border-slate-300 shadow-md' 
                    : 'bg-white border border-slate-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <XCircle className="w-4 h-4 text-slate-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Cancelados</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{meusPedidos.cancelados.length}</p>
                <p className="text-xs text-slate-500 mt-1">pedidos</p>
              </button>
            </div>

            {/* Filtros de Pesquisa */}
            <div className="pt-4 border-t border-slate-100 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-4 h-4 text-slate-500" />
                <h3 className="font-medium text-slate-700 text-sm">Pesquisar Pedidos</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Input
                  placeholder="Nº Pedido"
                  value={filtros.numeroPedido}
                  onChange={(e) => setFiltros({...filtros, numeroPedido: e.target.value})}
                  className="text-sm"
                />
                <Input
                  placeholder="Rota"
                  value={filtros.rota}
                  onChange={(e) => setFiltros({...filtros, rota: e.target.value})}
                  className="text-sm"
                />
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Data Entrega (De)</label>
                  <Input
                    type="date"
                    value={filtros.dataEntregaInicio}
                    onChange={(e) => setFiltros({...filtros, dataEntregaInicio: e.target.value})}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Data Entrega (Até)</label>
                  <Input
                    type="date"
                    value={filtros.dataEntregaFim}
                    onChange={(e) => setFiltros({...filtros, dataEntregaFim: e.target.value})}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Data Pagamento (De)</label>
                  <Input
                    type="date"
                    value={filtros.dataPagamentoInicio}
                    onChange={(e) => setFiltros({...filtros, dataPagamentoInicio: e.target.value})}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Data Pagamento (Até)</label>
                  <Input
                    type="date"
                    value={filtros.dataPagamentoFim}
                    onChange={(e) => setFiltros({...filtros, dataPagamentoFim: e.target.value})}
                    className="text-sm"
                  />
                </div>
                <Input
                  type="number"
                  placeholder="Valor Mínimo"
                  value={filtros.valorMin}
                  onChange={(e) => setFiltros({...filtros, valorMin: e.target.value})}
                  className="text-sm"
                />
                <Input
                  type="number"
                  placeholder="Valor Máximo"
                  value={filtros.valorMax}
                  onChange={(e) => setFiltros({...filtros, valorMax: e.target.value})}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Lista de Pedidos Baseada na Aba Selecionada */}
            {meusPedidos[abaPedidos].length > 0 ? (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="font-medium text-slate-700 text-sm mb-3">
                  {abaPedidos === 'aPagar' ? 'Pendentes' : abaPedidos === 'pagos' ? 'Pagos' : 'Cancelados'}
                </h3>
                {meusPedidos[abaPedidos].map(pedido => {
                  const saldo = pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0));
                  const diasAtraso = calcularDiasAtraso(pedido.data_entrega);
                  
                  return (
                    <div key={pedido.id} className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-800">#{formatNumero(pedido.numero_pedido)}</p>
                            {diasAtraso > 0 && abaPedidos === 'aPagar' && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                {diasAtraso}d atraso
                              </span>
                            )}
                            {abaPedidos === 'pagos' && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                Pago
                              </span>
                            )}
                            {abaPedidos === 'cancelados' && (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-xs font-medium rounded-full">
                                Cancelado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Entrega: {format(new Date(pedido.data_entrega), 'dd/MM/yyyy')}
                            {pedido.rota_codigo && ` • Rota: ${pedido.rota_codigo}`}
                          </p>
                          {pedido.data_pagamento && (
                            <p className="text-xs text-green-600 mt-0.5">
                              Pago em: {format(new Date(pedido.data_pagamento), 'dd/MM/yyyy')}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          {abaPedidos === 'aPagar' ? (
                            <>
                              <p className="text-lg font-bold text-slate-900">{formatCurrency(saldo)}</p>
                              <p className="text-xs text-slate-500">de {formatCurrency(pedido.valor_pedido)}</p>
                            </>
                          ) : (
                            <p className="text-lg font-bold text-slate-900">{formatCurrency(pedido.valor_pedido)}</p>
                          )}
                        </div>
                      </div>
                      {pedido.observacao && (
                        <div className="mt-2 bg-white p-2 rounded-lg">
                          <p className="text-xs text-slate-500 font-medium mb-1">Observação:</p>
                          <p className="text-xs text-slate-700">{pedido.observacao}</p>
                        </div>
                      )}
                      {pedido.outras_informacoes && (
                        <div className="mt-2 bg-white p-2 rounded-lg">
                          <p className="text-xs text-slate-500 font-medium mb-1">Outras Informações:</p>
                          <p className="text-xs text-slate-700">{pedido.outras_informacoes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-center text-slate-400 py-8 text-sm">
                  Nenhum pedido {abaPedidos === 'aPagar' ? 'pendente' : abaPedidos === 'pagos' ? 'pago' : 'cancelado'}
                </p>
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
              <button 
                onClick={() => setAbaCheques('aVencer')}
                className={`group p-5 rounded-xl transition-all text-left ${
                  abaCheques === 'aVencer' 
                    ? 'bg-gradient-to-br from-yellow-50 to-white border-2 border-yellow-200 shadow-md' 
                    : 'bg-white border border-slate-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Clock className="w-4 h-4 text-yellow-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">A Vencer</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totais.chequesAVencer)}</p>
                <p className="text-xs text-slate-500 mt-1">{meusCheques.aVencer.length} cheques</p>
              </button>
              <button 
                onClick={() => setAbaCheques('compensados')}
                className={`group p-5 rounded-xl transition-all text-left ${
                  abaCheques === 'compensados' 
                    ? 'bg-gradient-to-br from-green-50 to-white border-2 border-green-200 shadow-md' 
                    : 'bg-white border border-slate-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Compensados</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{meusCheques.compensados.length}</p>
                <p className="text-xs text-slate-500 mt-1">cheques</p>
              </button>
              <button 
                onClick={() => setAbaCheques('devolvidos')}
                className={`group p-5 rounded-xl transition-all text-left ${
                  abaCheques === 'devolvidos' 
                    ? 'bg-gradient-to-br from-red-50 to-white border-2 border-red-200 shadow-md' 
                    : 'bg-white border border-slate-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Devolvidos</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totais.chequesDevolvidos)}</p>
                <p className="text-xs text-slate-500 mt-1">{meusCheques.devolvidos.length} cheques</p>
              </button>
            </div>

            {/* Filtros de Pesquisa */}
            <div className="pt-4 border-t border-slate-100 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-4 h-4 text-slate-500" />
                <h3 className="font-medium text-slate-700 text-sm">Pesquisar Cheques</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Input
                  placeholder="Nº Cheque"
                  value={filtrosCheques.numeroCheque}
                  onChange={(e) => setFiltrosCheques({...filtrosCheques, numeroCheque: e.target.value})}
                  className="text-sm"
                />
                <Input
                  placeholder="Banco"
                  value={filtrosCheques.banco}
                  onChange={(e) => setFiltrosCheques({...filtrosCheques, banco: e.target.value})}
                  className="text-sm"
                />
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Vencimento (De)</label>
                  <Input
                    type="date"
                    value={filtrosCheques.dataVencimentoInicio}
                    onChange={(e) => setFiltrosCheques({...filtrosCheques, dataVencimentoInicio: e.target.value})}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Vencimento (Até)</label>
                  <Input
                    type="date"
                    value={filtrosCheques.dataVencimentoFim}
                    onChange={(e) => setFiltrosCheques({...filtrosCheques, dataVencimentoFim: e.target.value})}
                    className="text-sm"
                  />
                </div>
                <Input
                  type="number"
                  placeholder="Valor Mínimo"
                  value={filtrosCheques.valorMin}
                  onChange={(e) => setFiltrosCheques({...filtrosCheques, valorMin: e.target.value})}
                  className="text-sm"
                />
                <Input
                  type="number"
                  placeholder="Valor Máximo"
                  value={filtrosCheques.valorMax}
                  onChange={(e) => setFiltrosCheques({...filtrosCheques, valorMax: e.target.value})}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Lista de Cheques Baseada na Aba Selecionada */}
            {meusCheques[abaCheques].length > 0 ? (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="font-medium text-slate-700 text-sm mb-3">
                  {abaCheques === 'aVencer' ? 'A Vencer' : abaCheques === 'compensados' ? 'Compensados' : 'Devolvidos'}
                </h3>
                {meusCheques[abaCheques].map(cheque => {
                  const diasAtraso = calcularDiasAtraso(cheque.data_vencimento);
                  
                  return (
                    <div key={cheque.id} className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-800">#{formatNumero(cheque.numero_cheque)}</p>
                            {abaCheques === 'aVencer' && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                                A Vencer
                              </span>
                            )}
                            {abaCheques === 'compensados' && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                Compensado
                              </span>
                            )}
                            {abaCheques === 'devolvidos' && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                Devolvido
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {cheque.banco} • Venc: {format(new Date(cheque.data_vencimento), 'dd/MM/yyyy')}
                          </p>
                          {cheque.data_compensacao && abaCheques === 'compensados' && (
                            <p className="text-xs text-green-600 mt-0.5">
                              Compensado em: {format(new Date(cheque.data_compensacao), 'dd/MM/yyyy')}
                            </p>
                          )}
                          {diasAtraso > 0 && abaCheques === 'devolvidos' && (
                            <span className="inline-block mt-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              {diasAtraso}d vencido
                            </span>
                          )}
                        </div>
                        <p className="text-lg font-bold text-slate-900 ml-4">{formatCurrency(cheque.valor)}</p>
                      </div>
                      {cheque.emitente && (
                        <div className="mt-2 bg-white p-2 rounded-lg">
                          <p className="text-xs text-slate-500 font-medium mb-1">Emitente:</p>
                          <p className="text-xs text-slate-700">{cheque.emitente}</p>
                        </div>
                      )}
                      {cheque.motivo_devolucao && abaCheques === 'devolvidos' && (
                        <div className="mt-2 bg-white p-2 rounded-lg">
                          <p className="text-xs text-slate-500 font-medium mb-1">Motivo da Devolução:</p>
                          <p className="text-xs text-slate-700">{cheque.motivo_devolucao}</p>
                        </div>
                      )}
                      {cheque.observacao && (
                        <div className="mt-2 bg-white p-2 rounded-lg">
                          <p className="text-xs text-slate-500 font-medium mb-1">Observação:</p>
                          <p className="text-xs text-slate-700">{cheque.observacao}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-center text-slate-400 py-8 text-sm">
                  Nenhum cheque {abaCheques === 'aVencer' ? 'a vencer' : abaCheques === 'compensados' ? 'compensado' : 'devolvido'}
                </p>
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