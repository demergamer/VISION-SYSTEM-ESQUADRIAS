import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Calendar, TrendingUp, AlertTriangle, DollarSign, Users, Package, CreditCard, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PermissionGuard from "@/components/PermissionGuard";
import { differenceInDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState('diario');

  const { data: pedidos = [] } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });
  const { data: cheques = [] } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
  const { data: representantes = [] } = useQuery({ queryKey: ['representantes'], queryFn: () => base44.entities.Representante.list() });
  const { data: borderos = [] } = useQuery({ queryKey: ['borderos'], queryFn: () => base44.entities.Bordero.list() });

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // **ABA 1: DIÁRIO**
  const dadosDiario = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    const borderosHoje = borderos.filter(b => {
      const data = new Date(b.created_date);
      data.setHours(0, 0, 0, 0);
      return data.getTime() === hoje.getTime();
    });

    const recebimentosHoje = {
      dinheiro: 0, cheque: 0, pix: 0, credito: 0, outros: 0
    };

    borderosHoje.forEach(b => {
      const forma = b.forma_pagamento?.toLowerCase() || '';
      if (forma.includes('dinheiro')) recebimentosHoje.dinheiro += b.valor_total || 0;
      else if (forma.includes('cheque')) recebimentosHoje.cheque += b.valor_total || 0;
      else if (forma.includes('pix')) recebimentosHoje.pix += b.valor_total || 0;
      else if (forma.includes('credito') || forma.includes('crédito')) recebimentosHoje.credito += b.valor_total || 0;
      else recebimentosHoje.outros += b.valor_total || 0;
    });

    const pedidosVencendoHoje = pedidos.filter(p => {
      if (p.status !== 'aberto' && p.status !== 'parcial') return false;
      const dataEntrega = new Date(p.data_entrega);
      dataEntrega.setHours(0, 0, 0, 0);
      return dataEntrega.getTime() === hoje.getTime() || dataEntrega.getTime() === ontem.getTime();
    });

    const totalCarregado = pedidos.filter(p => p.confirmado_entrega === false && p.status !== 'cancelado').reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
    const totalEntregue = pedidos.filter(p => p.confirmado_entrega === true).reduce((sum, p) => sum + (p.valor_pedido || 0), 0);

    return { recebimentosHoje, pedidosVencendoHoje, totalCarregado, totalEntregue };
  }, [borderos, pedidos]);

  // **ABA 2: SEMANAL**
  const dadosSemanais = useMemo(() => {
    const inicioSemana = startOfWeek(new Date(), { weekStartsOn: 0 });
    const fimSemana = endOfWeek(new Date(), { weekStartsOn: 0 });

    const pedidosVencendoSemana = pedidos.filter(p => {
      if (p.status !== 'aberto' && p.status !== 'parcial') return false;
      const dataEntrega = new Date(p.data_entrega);
      return dataEntrega >= inicioSemana && dataEntrega <= fimSemana;
    });

    const chequesVencendoSemana = cheques.filter(c => {
      if (c.status !== 'normal') return false;
      const dataVenc = new Date(c.data_vencimento);
      return dataVenc >= inicioSemana && dataVenc <= fimSemana;
    });

    const vendasPorRep = representantes.map(rep => {
      const vendasRep = pedidos.filter(p => {
        if (!p.data_pagamento) return false;
        const dataPag = new Date(p.data_pagamento);
        return p.representante_codigo === rep.codigo && dataPag >= inicioSemana && dataPag <= fimSemana;
      });
      const totalVendas = vendasRep.reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
      return { nome: rep.nome, total: totalVendas };
    }).sort((a, b) => b.total - a.total).slice(0, 5);

    return { pedidosVencendoSemana, chequesVencendoSemana, vendasPorRep };
  }, [pedidos, cheques, representantes]);

  // **ABA 3: MENSAL**
  const dadosMensais = useMemo(() => {
    const inicioMes = startOfMonth(new Date());
    const fimMes = endOfMonth(new Date());

    const faturamentoNota = pedidos.filter(p => {
      if (!p.data_entrega) return false;
      const dataEnt = new Date(p.data_entrega);
      return dataEnt >= inicioMes && dataEnt <= fimMes;
    }).reduce((sum, p) => sum + (p.valor_pedido || 0), 0);

    const caixaReal = borderos.filter(b => {
      const data = new Date(b.created_date);
      return data >= inicioMes && data <= fimMes;
    }).reduce((sum, b) => sum + (b.valor_total || 0), 0);

    const totalPedidos = pedidos.length;
    const pedidosInadimplentes = pedidos.filter(p => {
      if (p.status !== 'aberto' && p.status !== 'parcial') return false;
      return differenceInDays(new Date(), new Date(p.data_entrega)) > 30;
    }).length;
    const taxaInadimplencia = totalPedidos > 0 ? ((pedidosInadimplentes / totalPedidos) * 100).toFixed(1) : 0;

    const vendasPorRegiao = clientes.reduce((acc, cli) => {
      const vendasCli = pedidos.filter(p => p.cliente_codigo === cli.codigo && p.status === 'pago').reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
      const regiao = cli.regiao || 'Sem Região';
      if (!acc[regiao]) acc[regiao] = 0;
      acc[regiao] += vendasCli;
      return acc;
    }, {});
    const mapaCalor = Object.entries(vendasPorRegiao).map(([regiao, valor]) => ({ regiao, valor })).sort((a, b) => b.valor - a.valor);

    const clientesComVendas = clientes.map(cli => {
      const totalVendas = pedidos.filter(p => p.cliente_codigo === cli.codigo && p.status === 'pago').reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
      return { nome: cli.nome, total: totalVendas };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

    const totalVendas = clientesComVendas.reduce((sum, c) => sum + c.total, 0);
    let acumulado = 0;
    const curvaABC = clientesComVendas.map(c => {
      acumulado += c.total;
      const percentualAcumulado = (acumulado / totalVendas) * 100;
      return { ...c, percentualAcumulado };
    }).filter(c => c.percentualAcumulado <= 80);

    const evolucaoMensal = Array.from({ length: 6 }, (_, i) => {
      const mes = subMonths(new Date(), 5 - i);
      const mesAno = format(mes, 'yyyy-MM');
      const vendasMes = pedidos.filter(p => p.mes_pagamento === mesAno);
      const totalMes = vendasMes.reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
      const ticketMedio = vendasMes.length > 0 ? totalMes / vendasMes.length : 0;
      return { mes: format(mes, 'MMM/yy'), ticketMedio };
    });

    return { faturamentoNota, caixaReal, taxaInadimplencia, mapaCalor, curvaABC, evolucaoMensal };
  }, [pedidos, borderos, clientes]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <PermissionGuard setor="Relatorios">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Relatórios Inteligentes</h1>
              <p className="text-slate-500 mt-1">Análise estratégica e indicadores-chave</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="diario" className="gap-2"><Calendar className="w-4 h-4" />Diário (O Pulso)</TabsTrigger>
              <TabsTrigger value="semanal" className="gap-2"><TrendingUp className="w-4 h-4" />Semanal (Previsibilidade)</TabsTrigger>
              <TabsTrigger value="mensal" className="gap-2"><BarChart className="w-4 h-4" />Mensal (Estratégico)</TabsTrigger>
            </TabsList>

            {/* **DIÁRIO** */}
            <TabsContent value="diario" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-blue-600" />Recebimentos do Dia</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={[
                        { name: 'Dinheiro', value: dadosDiario.recebimentosHoje.dinheiro },
                        { name: 'Cheque', value: dadosDiario.recebimentosHoje.cheque },
                        { name: 'PIX', value: dadosDiario.recebimentosHoje.pix },
                        { name: 'Crédito', value: dadosDiario.recebimentosHoje.credito },
                        { name: 'Outros', value: dadosDiario.recebimentosHoje.outros }
                      ].filter(d => d.value > 0)} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${formatCurrency(value)}`} outerRadius={80} fill="#8884d8" dataKey="value">
                        {COLORS.map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-600" />Alerta Inadimplência</h3>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {dadosDiario.pedidosVencendoHoje.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-8">Nenhum pedido vencendo hoje</p>
                    ) : (
                      dadosDiario.pedidosVencendoHoje.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                          <div>
                            <p className="font-semibold text-sm">Pedido #{p.numero_pedido}</p>
                            <p className="text-xs text-slate-600">{p.cliente_nome}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-700">{formatCurrency(p.saldo_restante || (p.valor_pedido - (p.total_pago || 0)))}</p>
                            <Button size="sm" className="mt-1 h-6 text-xs bg-green-600 hover:bg-green-700" onClick={() => window.open(`https://wa.me/5511994931958?text=Olá ${p.cliente_nome}, pedido ${p.numero_pedido} venceu.`, '_blank')}>
                              Cobrar via Zap
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                <Card className="p-6 md:col-span-2">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-purple-600" />Expedição</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-xl"><p className="text-sm text-blue-600 mb-1">Valor Carregado</p><p className="text-2xl font-bold text-blue-700">{formatCurrency(dadosDiario.totalCarregado)}</p></div>
                    <div className="p-4 bg-green-50 rounded-xl"><p className="text-sm text-green-600 mb-1">Valor Entregue (Ticado)</p><p className="text-2xl font-bold text-green-700">{formatCurrency(dadosDiario.totalEntregue)}</p></div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* **SEMANAL** */}
            <TabsContent value="semanal" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" />Fluxo de Caixa Semanal</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm text-amber-700 mb-1">Pedidos Vencendo</p>
                      <p className="text-xl font-bold text-amber-800">{formatCurrency(dadosSemanais.pedidosVencendoSemana.reduce((sum, p) => sum + (p.saldo_restante || 0), 0))}</p>
                      <p className="text-xs text-slate-500">{dadosSemanais.pedidosVencendoSemana.length} pedidos</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm text-purple-700 mb-1">Cheques a Depositar</p>
                      <p className="text-xl font-bold text-purple-800">{formatCurrency(dadosSemanais.chequesVencendoSemana.reduce((sum, c) => sum + (c.valor || 0), 0))}</p>
                      <p className="text-xs text-slate-500">{dadosSemanais.chequesVencendoSemana.length} cheques</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-green-600" />Ranking Representantes (7 dias)</h3>
                  <div className="space-y-2">
                    {dadosSemanais.vendasPorRep.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">Sem vendas na semana</p>
                    ) : (
                      dadosSemanais.vendasPorRep.map((rep, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : 'bg-amber-700'}`}>
                              {idx + 1}
                            </div>
                            <span className="font-semibold text-sm">{rep.nome}</span>
                          </div>
                          <span className="font-bold text-green-700">{formatCurrency(rep.total)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* **MENSAL** */}
            <TabsContent value="mensal" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6">
                  <p className="text-sm text-blue-600 mb-1">Faturamento (Nota)</p>
                  <p className="text-3xl font-bold text-blue-700">{formatCurrency(dadosMensais.faturamentoNota)}</p>
                </Card>
                <Card className="p-6">
                  <p className="text-sm text-green-600 mb-1">Caixa (Real)</p>
                  <p className="text-3xl font-bold text-green-700">{formatCurrency(dadosMensais.caixaReal)}</p>
                </Card>
                <Card className="p-6">
                  <p className="text-sm text-red-600 mb-1">Taxa Inadimplência</p>
                  <p className="text-3xl font-bold text-red-700">{dadosMensais.taxaInadimplencia}%</p>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-purple-600" />Mapa de Calor - Vendas por Região</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dadosMensais.mapaCalor}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="regiao" />
                    <YAxis tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="valor" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-amber-600" />Curva ABC - Clientes (Top 20% = 80% Receita)</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {dadosMensais.curvaABC.map((cli, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="font-semibold text-sm">{cli.nome}</span>
                      <div className="text-right">
                        <p className="font-bold text-slate-800">{formatCurrency(cli.total)}</p>
                        <p className="text-xs text-slate-500">{cli.percentualAcumulado.toFixed(1)}% acumulado</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-600" />Evolução Ticket Médio (6 meses)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dadosMensais.evolucaoMensal}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="ticketMedio" stroke="#3b82f6" strokeWidth={3} name="Ticket Médio" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PermissionGuard>
  );
}