import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Users, Eye, Calendar, TrendingUp, DollarSign, FileText, Download, Search } from "lucide-react";
import PermissionGuard from "@/components/PermissionGuard";
import ModalContainer from "@/components/modals/ModalContainer";
import ComissaoDetalhes from "@/components/comissoes/ComissaoDetalhes";
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Comissoes() {
  const queryClient = useQueryClient();
  const hoje = new Date();
  const [mesAnoSelecionado, setMesAnoSelecionado] = useState(format(hoje, 'yyyy-MM'));
  const [representanteSelecionado, setRepresentanteSelecionado] = useState(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [buscaRepresentante, setBuscaRepresentante] = useState('');

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

  // FETCH: Fechamentos salvos
  const { data: fechamentos = [] } = useQuery({
    queryKey: ['fechamentos-comissao'],
    queryFn: () => base44.entities.FechamentoComissao.list(),
  });

  // LÓGICA: Calcular comissões por representante no mês selecionado
  const comissoesPorRepresentante = useMemo(() => {
    const [ano, mes] = mesAnoSelecionado.split('-').map(Number);
    const inicioMes = startOfMonth(new Date(ano, mes - 1));
    const fimMes = endOfMonth(new Date(ano, mes - 1));
    const mesAtual = format(hoje, 'yyyy-MM');
    const ehMesFuturo = mesAnoSelecionado > mesAtual;

    // Verificar se existe fechamento salvo para este mês
    const fechamentosSalvos = fechamentos.filter(f => f.mes_ano === mesAnoSelecionado);

    let pedidosElegiveis;

    if (ehMesFuturo) {
      // MODO PREVISÃO: Pedidos que podem gerar comissão neste mês futuro
      pedidosElegiveis = pedidos.filter(p => {
        // Pedidos postergados para este mês
        if (p.data_referencia_comissao) {
          const dataRef = new Date(p.data_referencia_comissao);
          if (dataRef >= inicioMes && dataRef <= fimMes) {
            return true;
          }
        }
        
        // Pedidos em aberto com previsão de entrega neste mês
        if ((p.status === 'aberto' || p.status === 'parcial') && p.data_entrega) {
          const dataEntrega = new Date(p.data_entrega);
          if (dataEntrega >= inicioMes && dataEntrega <= fimMes) {
            return true;
          }
        }

        return false;
      });
    } else {
      // MODO REAL: Pedidos 100% quitados no período
      pedidosElegiveis = pedidos.filter(p => {
        // TRAVA DE SEGURANÇA: Não incluir pedidos com comissão já paga
        if (p.comissao_paga === true) {
          return false;
        }

        // REGRA: Só pedidos pagos (status === 'pago' E saldo_restante === 0)
        if (p.status !== 'pago' || (p.saldo_restante && p.saldo_restante > 0)) {
          return false;
        }

        // REGRA: Usar data_referencia_comissao se existir, senão data_pagamento
        const dataReferencia = p.data_referencia_comissao || p.data_pagamento;
        if (!dataReferencia) return false;

        const dataRef = new Date(dataReferencia);
        return dataRef >= inicioMes && dataRef <= fimMes;
      });
    }

    // AGRUPAR por representante
    const agrupado = {};
    
    pedidosElegiveis.forEach(pedido => {
      const repCodigo = pedido.representante_codigo;
      const repNome = pedido.representante_nome || 'Sem Representante';
      
      if (!repCodigo) return;

      if (!agrupado[repCodigo]) {
        const rep = representantes.find(r => r.codigo === repCodigo);
        const fechamentoSalvo = fechamentosSalvos.find(f => f.representante_codigo === repCodigo);

        agrupado[repCodigo] = {
          codigo: repCodigo,
          nome: repNome,
          chave_pix: rep?.chave_pix || '',
          pedidos: [],
          totalVendas: 0,
          totalComissoes: 0,
          vales: fechamentoSalvo?.vales_adiantamentos || 0,
          outrosDescontos: fechamentoSalvo?.outros_descontos || 0,
          descricaoOutrosDescontos: fechamentoSalvo?.descricao_outros_descontos || '',
          observacoes: fechamentoSalvo?.observacoes || '',
          saldoAPagar: 0,
          status: fechamentoSalvo?.status || 'aberto',
          fechamentoId: fechamentoSalvo?.id,
          pdf_url: fechamentoSalvo?.pdf_analitico_url
        };
      }

      const valorPedido = pedido.valor_pedido || 0;
      const percentualComissao = pedido.porcentagem_comissao || 5;
      const valorComissao = (valorPedido * percentualComissao) / 100;

      agrupado[repCodigo].pedidos.push({
        ...pedido,
        percentualComissao,
        valorComissao
      });
      agrupado[repCodigo].totalVendas += valorPedido;
      agrupado[repCodigo].totalComissoes += valorComissao;
    });

    // Calcular saldo a pagar
    Object.values(agrupado).forEach(rep => {
      rep.saldoAPagar = rep.totalComissoes - rep.vales - rep.outrosDescontos;
      rep.ehPrevisao = ehMesFuturo;
    });

    return Object.values(agrupado);
  }, [pedidos, mesAnoSelecionado, representantes, fechamentos, hoje]);

  // Gerar lista de meses (últimos 12 meses + próximos 3 meses para previsão)
  const mesesDisponiveis = useMemo(() => {
    const meses = [];
    // Próximos 3 meses (previsão)
    for (let i = 3; i > 0; i--) {
      const data = new Date();
      data.setMonth(data.getMonth() + i);
      meses.push({
        value: format(data, 'yyyy-MM'),
        label: '📊 ' + format(data, 'MMMM yyyy', { locale: ptBR }) + ' (Previsão)',
        ehPrevisao: true
      });
    }
    // Mês atual e passados
    for (let i = 0; i < 12; i++) {
      const data = new Date();
      data.setMonth(data.getMonth() - i);
      meses.push({
        value: format(data, 'yyyy-MM'),
        label: format(data, 'MMMM yyyy', { locale: ptBR }),
        ehPrevisao: false
      });
    }
    return meses;
  }, []);

  const totalGeralComissoes = comissoesPorRepresentante.reduce((sum, rep) => sum + rep.totalComissoes, 0);
  const totalGeralVendas = comissoesPorRepresentante.reduce((sum, rep) => sum + rep.totalVendas, 0);
  const totalGeralAPagar = comissoesPorRepresentante.reduce((sum, rep) => sum + rep.saldoAPagar, 0);
  
  const mesAtual = format(hoje, 'yyyy-MM');
  const ehMesFuturo = mesAnoSelecionado > mesAtual;

  // Filtrar por busca
  const representantesFiltrados = useMemo(() => {
    if (!buscaRepresentante.trim()) return comissoesPorRepresentante;
    
    const busca = buscaRepresentante.toLowerCase();
    return comissoesPorRepresentante.filter(rep => 
      rep.nome.toLowerCase().includes(busca) || 
      rep.codigo.toLowerCase().includes(busca)
    );
  }, [comissoesPorRepresentante, buscaRepresentante]);

  const handleGerarRelatorioGeral = async () => {
    try {
      toast.loading('Gerando relatório geral...');
      const response = await base44.functions.invoke('gerarRelatorioComissoes', {
        tipo: 'geral',
        mes_ano: mesAnoSelecionado,
        representantes: comissoesPorRepresentante
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Comissoes-Geral-${mesAnoSelecionado}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.dismiss();
      toast.success('Relatório geral gerado!');
    } catch (error) {
      toast.dismiss();
      toast.error('Erro ao gerar relatório');
    }
  };

  return (
    <PermissionGuard setor="Comissoes">
      <div className="space-y-6">
        {/* CABEÇALHO */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Comissões</h1>
            <p className="text-slate-500 mt-1">Fechamento mensal de comissões por representante</p>
          </div>
          <Button 
            onClick={handleGerarRelatorioGeral}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
            disabled={comissoesPorRepresentante.length === 0}
          >
            <Download className="w-4 h-4" />
            Relatório Geral (PIX)
          </Button>
        </div>

        {/* FILTRO DE PERÍODO E BUSCA */}
        <Card className={`p-6 ${ehMesFuturo ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'}`}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className={`w-5 h-5 ${ehMesFuturo ? 'text-amber-600' : 'text-blue-600'}`} />
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

            {ehMesFuturo && (
              <Badge className="bg-amber-500 text-white border-amber-600">
                Modo Previsão
              </Badge>
            )}

            <div className="ml-auto flex items-center gap-2">
              <Input 
                placeholder="Buscar representante..."
                value={buscaRepresentante}
                onChange={(e) => setBuscaRepresentante(e.target.value)}
                className="w-64"
              />
            </div>
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
                <Wallet className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total a Pagar</p>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(totalGeralAPagar)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* LISTA DE REPRESENTANTES */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Comissões por Representante
          </h2>

          {representantesFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">
                {buscaRepresentante ? 'Nenhum representante encontrado' : ehMesFuturo ? 'Nenhuma previsão no período' : 'Nenhuma comissão no período selecionado'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {ehMesFuturo ? 'Previsão baseada em pedidos em aberto e postergados' : 'Pedidos devem estar 100% quitados para gerar comissão'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {representantesFiltrados.map((rep) => (
                <div 
                  key={rep.codigo}
                  className={`p-5 border rounded-xl hover:shadow-md transition-all ${
                    ehMesFuturo 
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300' 
                      : 'bg-gradient-to-r from-slate-50 to-blue-50 border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{rep.nome}</h3>
                      <p className="text-xs text-slate-500">Código: {rep.codigo} {rep.chave_pix && `• PIX: ${rep.chave_pix}`}</p>
                    </div>
                    {ehMesFuturo ? (
                      <Badge className="bg-amber-500 text-white border-amber-600">
                        Previsão
                      </Badge>
                    ) : (
                      <Badge className={rep.status === 'fechado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}>
                        {rep.status === 'fechado' ? 'Fechado' : 'Aberto'}
                      </Badge>
                    )}
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
                      <p className="text-xs text-slate-500 mb-1">(-) Descontos</p>
                      <p className="font-bold text-red-600">{formatCurrency(rep.vales + rep.outrosDescontos)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border-2 border-emerald-400">
                      <p className="text-xs text-slate-500 mb-1">A Pagar</p>
                      <p className="font-bold text-emerald-700 text-lg">{formatCurrency(rep.saldoAPagar)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      className="gap-2"
                      onClick={() => {
                        setRepresentanteSelecionado(rep);
                        setShowDetalhes(true);
                      }}
                      disabled={ehMesFuturo}
                    >
                      <Eye className="w-4 h-4" />
                      {ehMesFuturo ? 'Visualizar' : rep.status === 'fechado' ? 'Ver Detalhes' : 'Detalhes'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="gap-2 bg-blue-50 hover:bg-blue-100"
                      onClick={async () => {
                        try {
                          toast.loading('Gerando PDF individual...');
                          const response = await base44.functions.invoke('gerarRelatorioComissoes', {
                            tipo: 'analitico',
                            mes_ano: mesAnoSelecionado,
                            representante: {
                              ...rep,
                              totalVendas: rep.totalVendas,
                              totalComissoes: rep.totalComissoes,
                              vales: rep.vales,
                              outrosDescontos: rep.outrosDescontos,
                              descricaoDescontos: rep.descricaoOutrosDescontos,
                              observacoes: rep.observacoes,
                              saldoAPagar: rep.saldoAPagar
                            }
                          });

                          const blob = new Blob([response.data], { type: 'application/pdf' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `Comissao-${rep.codigo}-${mesAnoSelecionado}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          a.remove();
                          
                          toast.dismiss();
                          toast.success('PDF individual gerado!');
                        } catch (error) {
                          toast.dismiss();
                          toast.error('Erro ao gerar PDF');
                        }
                      }}
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </Button>
                  </div>
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
              pedidosTodos={pedidos}
              onClose={() => {
                setShowDetalhes(false);
                setRepresentanteSelecionado(null);
                queryClient.invalidateQueries(['fechamentos-comissao']);
                queryClient.invalidateQueries(['pedidos']);
              }}
            />
          )}
        </ModalContainer>
      </div>
    </PermissionGuard>
  );
}