import React, { useState, useMemo } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Users, Eye, Calendar, TrendingUp, DollarSign, FileText } from "lucide-react";
import PermissionGuard from "@/components/PermissionGuard";
import ModalContainer from "@/components/modais/ModalContainer";
import ComissaoDetalhes from "@/components/comissoes/ComissaoDetalhes";
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Comissoes() {
  const hoje = new Date();
  const [mesAnoSelecionado, setMesAnoSelecionado] = useState(format(hoje, 'yyyy-MM'));
  const [representanteSelecionado, setRepresentanteSelecionado] = useState(null);
  const [showDetalhes, setShowDetalhes] = useState(false);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  // FETCH: Pedidos pagos
  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list(),
  });

  // FETCH: Representantes
  const { data: representantes = [] } = useQuery({
    queryKey: ['representantes'],
    queryFn: () => base44.entities.Representante.list(),
  });

  // LÓGICA: Calcular comissões por representante no mês selecionado
  const comissoesPorRepresentante = useMemo(() => {
    const [ano, mes] = mesAnoSelecionado.split('-').map(Number);
    const inicioMes = startOfMonth(new Date(ano, mes - 1));
    const fimMes = endOfMonth(new Date(ano, mes - 1));

    // FILTRAR: Pedidos 100% quitados no período
    const pedidosElegiveis = pedidos.filter(p => {
      // REGRA: Só pedidos pagos (status === 'pago' E saldo_restante === 0)
      if (p.status !== 'pago' || (p.saldo_restante && p.saldo_restante > 0)) {
        return false;
      }

      // REGRA: Data de liquidação deve estar no mês selecionado
      if (!p.data_pagamento) return false;

      const dataPagamento = new Date(p.data_pagamento);
      return dataPagamento >= inicioMes && dataPagamento <= fimMes;
    });

    // AGRUPAR por representante
    const agrupado = {};
    
    pedidosElegiveis.forEach(pedido => {
      const repCodigo = pedido.representante_codigo;
      const repNome = pedido.representante_nome || 'Sem Representante';
      
      if (!repCodigo) return;

      if (!agrupado[repCodigo]) {
        agrupado[repCodigo] = {
          codigo: repCodigo,
          nome: repNome,
          pedidos: [],
          totalVendas: 0,
          totalComissoes: 0,
          vales: 0, // TODO: Implementar vales/adiantamentos
          saldoAPagar: 0,
          status: 'aberto'
        };
      }

      const valorPedido = pedido.valor_pedido || 0;
      const percentualComissao = pedido.porcentagem_comissao || 5;
      const valorComissao = (valorPedido * percentualComissao) / 100;

      agrupado[repCodigo].pedidos.push({
        ...pedido,
        valorComissao
      });
      agrupado[repCodigo].totalVendas += valorPedido;
      agrupado[repCodigo].totalComissoes += valorComissao;
      agrupado[repCodigo].saldoAPagar = agrupado[repCodigo].totalComissoes - agrupado[repCodigo].vales;
    });

    return Object.values(agrupado);
  }, [pedidos, mesAnoSelecionado]);

  // Gerar lista de meses (últimos 12 meses)
  const mesesDisponiveis = useMemo(() => {
    const meses = [];
    for (let i = 0; i < 12; i++) {
      const data = new Date();
      data.setMonth(data.getMonth() - i);
      meses.push({
        value: format(data, 'yyyy-MM'),
        label: format(data, 'MMMM yyyy', { locale: ptBR })
      });
    }
    return meses;
  }, []);

  const totalGeralComissoes = comissoesPorRepresentante.reduce((sum, rep) => sum + rep.totalComissoes, 0);
  const totalGeralVendas = comissoesPorRepresentante.reduce((sum, rep) => sum + rep.totalVendas, 0);

  return (
    <PermissionGuard setor="Comissoes">
      <div className="space-y-6">
        {/* CABEÇALHO */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Comissões</h1>
            <p className="text-slate-500 mt-1">Fechamento mensal de comissões por representante</p>
          </div>
        </div>

        {/* FILTRO DE PERÍODO */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-slate-700">Período:</span>
            </div>
            <select 
              value={mesAnoSelecionado}
              onChange={(e) => setMesAnoSelecionado(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium shadow-sm hover:border-blue-400 transition-colors capitalize"
            >
              {mesesDisponiveis.map(mes => (
                <option key={mes.value} value={mes.value} className="capitalize">
                  {mes.label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* RESUMO GERAL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Vendas</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalGeralVendas)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-blue-100 rounded-xl">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Comissões</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalGeralComissoes)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Representantes Ativos</p>
                <p className="text-2xl font-bold text-purple-700">{comissoesPorRepresentante.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* LISTA DE REPRESENTANTES */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-600" />
            Comissões por Representante
          </h2>

          {comissoesPorRepresentante.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Nenhuma comissão no período selecionado</p>
              <p className="text-sm text-slate-400 mt-1">Pedidos devem estar 100% quitados para gerar comissão</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comissoesPorRepresentante.map((rep) => (
                <div 
                  key={rep.codigo}
                  className="p-5 bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{rep.nome}</h3>
                      <p className="text-xs text-slate-500">Código: {rep.codigo}</p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                      {rep.status === 'fechado' ? 'Fechado' : 'Aberto'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Vendas</p>
                      <p className="font-bold text-emerald-600">{formatCurrency(rep.totalVendas)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Pedidos</p>
                      <p className="font-bold text-blue-600">{rep.pedidos.length}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Comissão</p>
                      <p className="font-bold text-purple-600">{formatCurrency(rep.totalComissoes)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">(-) Vales</p>
                      <p className="font-bold text-red-600">{formatCurrency(rep.vales)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border-2 border-emerald-300">
                      <p className="text-xs text-slate-500 mb-1">A Pagar</p>
                      <p className="font-bold text-emerald-700 text-lg">{formatCurrency(rep.saldoAPagar)}</p>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => {
                      setRepresentanteSelecionado(rep);
                      setShowDetalhes(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    Ver Detalhes e Fechar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* MODAL DE DETALHES */}
        <ModalContainer
          open={showDetalhes}
          onClose={() => {
            setShowDetalhes(false);
            setRepresentanteSelecionado(null);
          }}
          title={`Detalhes - ${representanteSelecionado?.nome || ''}`}
          description={`Fechamento de ${mesesDisponiveis.find(m => m.value === mesAnoSelecionado)?.label}`}
          size="xl"
        >
          {representanteSelecionado && (
            <ComissaoDetalhes 
              representante={representanteSelecionado}
              mesAno={mesAnoSelecionado}
              onClose={() => {
                setShowDetalhes(false);
                setRepresentanteSelecionado(null);
              }}
            />
          )}
        </ModalContainer>
      </div>
    </PermissionGuard>
  );
}