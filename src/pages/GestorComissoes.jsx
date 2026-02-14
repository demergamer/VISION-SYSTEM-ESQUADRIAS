import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, ArrowRight, Plus, DollarSign, Loader2, Clock, CheckCircle2, X } from "lucide-react";
import ModalContainer from "@/components/modals/ModalContainer";
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export default function GestorComissoes() {
  const queryClient = useQueryClient();
  
  // Mês de Referência (Competência)
  const [mesCompetencia, setMesCompetencia] = useState(() => format(new Date(), 'yyyy-MM'));
  
  // Modal de Antecipação
  const [showModalAntecipar, setShowModalAntecipar] = useState(false);
  const [comissoesSelecionadas, setComissoesSelecionadas] = useState([]);

  // Busca comissões do mês atual
  const { data: comissoesDoMes = [], isLoading } = useQuery({
    queryKey: ['commissionEntries', mesCompetencia],
    queryFn: async () => {
      const todas = await base44.entities.CommissionEntry.list();
      return todas.filter(c => c.mes_competencia === mesCompetencia && c.status === 'aberto');
    }
  });

  // Busca comissões de outros meses (para antecipação)
  const { data: comissoesOutrosMeses = [] } = useQuery({
    queryKey: ['commissionEntries', 'outros'],
    queryFn: async () => {
      const todas = await base44.entities.CommissionEntry.list();
      return todas.filter(c => c.mes_competencia !== mesCompetencia && c.status === 'aberto');
    },
    enabled: showModalAntecipar
  });

  // Postergar para o próximo mês
  const postergarMutation = useMutation({
    mutationFn: async (comissaoId) => {
      const comissao = await base44.entities.CommissionEntry.get(comissaoId);
      const proximoMes = format(addMonths(new Date(mesCompetencia + '-01'), 1), 'yyyy-MM');
      const novaDataCompetencia = format(new Date(proximoMes + '-01'), 'yyyy-MM-dd');
      
      const movimentacao = {
        data: new Date().toISOString(),
        mes_origem: mesCompetencia,
        mes_destino: proximoMes,
        usuario: 'admin',
        motivo: 'Postergado manualmente'
      };

      await base44.entities.CommissionEntry.update(comissaoId, {
        data_competencia: novaDataCompetencia,
        mes_competencia: proximoMes,
        movimentacoes: [...(comissao.movimentacoes || []), movimentacao]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['commissionEntries']);
      toast.success('Comissão postergada para o próximo mês!');
    }
  });

  // Antecipar comissões selecionadas
  const anteciparMutation = useMutation({
    mutationFn: async (idsComissoes) => {
      const ultimoDiaDoMes = format(new Date(mesCompetencia + '-01'), 'yyyy-MM') + '-' + 
                             new Date(new Date(mesCompetencia + '-01').getFullYear(), 
                                     new Date(mesCompetencia + '-01').getMonth() + 1, 0).getDate();
      
      const promises = idsComissoes.map(async id => {
        const comissao = await base44.entities.CommissionEntry.get(id);
        const movimentacao = {
          data: new Date().toISOString(),
          mes_origem: comissao.mes_competencia,
          mes_destino: mesCompetencia,
          usuario: 'admin',
          motivo: 'Antecipado manualmente'
        };

        return base44.entities.CommissionEntry.update(id, {
          data_competencia: ultimoDiaDoMes,
          mes_competencia: mesCompetencia,
          movimentacoes: [...(comissao.movimentacoes || []), movimentacao]
        });
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['commissionEntries']);
      setShowModalAntecipar(false);
      setComissoesSelecionadas([]);
      toast.success('Comissões antecipadas com sucesso!');
    }
  });

  // Fechar comissão do mês
  const fecharMutation = useMutation({
    mutationFn: async () => {
      const ids = comissoesDoMes.map(c => c.id);
      const promises = ids.map(id => 
        base44.entities.CommissionEntry.update(id, {
          status: 'fechado',
          data_fechamento: new Date().toISOString()
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['commissionEntries']);
      toast.success('Comissões do mês fechadas!');
    }
  });

  // Totais
  const totais = useMemo(() => {
    const vendas = comissoesDoMes.reduce((acc, c) => acc + (c.valor_base || 0), 0);
    const comissoes = comissoesDoMes.reduce((acc, c) => acc + (c.valor_comissao || 0), 0);
    return { vendas, comissoes };
  }, [comissoesDoMes]);

  // Meses disponíveis
  const mesesDisponiveis = useMemo(() => {
    const meses = [];
    for (let i = -3; i < 6; i++) {
      const data = addMonths(new Date(), i);
      meses.push({
        value: format(data, 'yyyy-MM'),
        label: format(data, 'MMMM yyyy', { locale: ptBR }).toUpperCase()
      });
    }
    return meses;
  }, []);

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gestor de Comissões</h1>
          <p className="text-slate-500">Controle de competência e movimentação entre meses</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border shadow-sm">
          <Calendar className="w-5 h-5 text-blue-600 ml-2" />
          <select 
            value={mesCompetencia} 
            onChange={(e) => setMesCompetencia(e.target.value)}
            className="bg-transparent border-none font-bold text-slate-700 outline-none uppercase cursor-pointer"
          >
            {mesesDisponiveis.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-blue-50 border-blue-100">
          <p className="text-blue-600 font-bold text-xs uppercase flex items-center gap-2">
            <DollarSign className="w-4 h-4"/> Total Vendas Base
          </p>
          <p className="text-3xl font-bold text-blue-900 mt-1">{formatCurrency(totais.vendas)}</p>
        </Card>
        
        <Card className="p-6 bg-emerald-50 border-emerald-100">
          <p className="text-emerald-600 font-bold text-xs uppercase flex items-center gap-2">
            <DollarSign className="w-4 h-4"/> Total Comissões
          </p>
          <p className="text-3xl font-bold text-emerald-900 mt-1">{formatCurrency(totais.comissoes)}</p>
        </Card>

        <Card className="p-6 bg-purple-50 border-purple-100">
          <p className="text-purple-600 font-bold text-xs uppercase flex items-center gap-2">
            <Clock className="w-4 h-4"/> Lançamentos
          </p>
          <p className="text-3xl font-bold text-purple-900 mt-1">{comissoesDoMes.length}</p>
        </Card>
      </div>

      {/* Tabela Principal */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-700">Comissões a Pagar em {format(new Date(mesCompetencia + '-01'), 'MMMM', { locale: ptBR }).toUpperCase()}</h2>
          <Button onClick={() => setShowModalAntecipar(true)} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4"/> Adicionar/Antecipar
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-10">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500"/>
          </div>
        ) : comissoesDoMes.length === 0 ? (
          <div className="text-center py-16 text-slate-400 border border-dashed rounded-lg">
            Nenhuma comissão neste período.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Venda Real</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Representante</TableHead>
                  <TableHead className="text-right">Valor Base</TableHead>
                  <TableHead className="text-center">%</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comissoesDoMes.map(comissao => (
                  <TableRow key={comissao.id}>
                    <TableCell className="text-sm text-slate-500">
                      {comissao.data_pagamento_real ? 
                        new Date(comissao.data_pagamento_real).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-sm">
                      #{comissao.pedido_numero}
                    </TableCell>
                    <TableCell className="text-sm">{comissao.cliente_nome}</TableCell>
                    <TableCell className="text-sm text-slate-600">{comissao.representante_nome}</TableCell>
                    <TableCell className="text-right font-medium text-blue-700">
                      {formatCurrency(comissao.valor_base)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{comissao.percentual}%</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {formatCurrency(comissao.valor_comissao)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => postergarMutation.mutate(comissao.id)}
                        disabled={postergarMutation.isPending}
                        className="gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      >
                        <ArrowRight className="w-4 h-4"/> Próximo Mês
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Rodapé com Ações */}
        {comissoesDoMes.length > 0 && (
          <div className="mt-6 pt-6 border-t flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-sm text-slate-500">Total a pagar neste mês:</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totais.comissoes)}</p>
            </div>
            <Button 
              onClick={() => {
                if (confirm(`Confirma o fechamento de ${comissoesDoMes.length} comissões?`)) {
                  fecharMutation.mutate();
                }
              }}
              disabled={fecharMutation.isPending}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {fecharMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
              Fechar Comissão de {format(new Date(mesCompetencia + '-01'), 'MMMM', { locale: ptBR })}
            </Button>
          </div>
        )}
      </Card>

      {/* Modal de Antecipação */}
      <ModalContainer 
        open={showModalAntecipar} 
        onClose={() => {
          setShowModalAntecipar(false);
          setComissoesSelecionadas([]);
        }}
        title="Comissões de Outros Períodos"
        description="Selecione as comissões que deseja trazer para o mês atual"
        size="xl"
      >
        <div className="space-y-4">
          {comissoesOutrosMeses.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              Nenhuma comissão disponível em outros períodos.
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0">
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Competência</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Representante</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comissoesOutrosMeses.map(comissao => (
                      <TableRow key={comissao.id} className="cursor-pointer hover:bg-slate-50"
                        onClick={() => {
                          setComissoesSelecionadas(prev => 
                            prev.includes(comissao.id) 
                              ? prev.filter(id => id !== comissao.id)
                              : [...prev, comissao.id]
                          );
                        }}
                      >
                        <TableCell>
                          <Checkbox 
                            checked={comissoesSelecionadas.includes(comissao.id)}
                            onCheckedChange={() => {}}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-700">
                            {format(new Date(comissao.mes_competencia + '-01'), 'MMM/yyyy', { locale: ptBR }).toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">#{comissao.pedido_numero}</TableCell>
                        <TableCell className="text-sm">{comissao.representante_nome}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">
                          {formatCurrency(comissao.valor_comissao)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <p className="text-sm text-slate-600">
                  {comissoesSelecionadas.length} comissão(ões) selecionada(s)
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    setShowModalAntecipar(false);
                    setComissoesSelecionadas([]);
                  }}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => anteciparMutation.mutate(comissoesSelecionadas)}
                    disabled={comissoesSelecionadas.length === 0 || anteciparMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {anteciparMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                    Trazer para {format(new Date(mesCompetencia + '-01'), 'MMMM', { locale: ptBR })}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </ModalContainer>
    </div>
  );
}