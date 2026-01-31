import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, TrendingUp, DollarSign, Clock, CheckCircle2, Search, CalendarDays, ArrowUpRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function ComissaoModal({ open, onClose, pedidos, representante }) {
  const [activeTab, setActiveTab] = useState('a_receber');
  const [busca, setBusca] = useState('');

  // --- 1. SEGMENTAÇÃO DOS DADOS ---
  const dados = useMemo(() => {
    // A. COMISSÕES LIBERADAS (A RECEBER)
    // Regra: Pedido está PAGO, mas a comissão ainda NÃO foi paga.
    // Inclui o mês atual e resíduos de meses anteriores.
    const liberadas = pedidos.filter(p => 
      p.status === 'pago' && 
      !p.comissao_paga
    );

    // B. PROJEÇÃO (FUTURO)
    // Regra: Pedidos em aberto, trânsito ou parciais.
    // O cliente ainda não pagou, logo a comissão é apenas uma previsão.
    const futuras = pedidos.filter(p => 
      ['aberto', 'parcial', 'aguardando', 'em_transito'].includes(p.status)
    );

    // C. HISTÓRICO (JÁ RECEBIDAS)
    // Regra: Comissão já foi marcada como paga.
    const recebidas = pedidos.filter(p => p.comissao_paga === true);

    // Função auxiliar de totais
    const calcTotal = (lista) => lista.reduce((acc, p) => acc + (p.valor_pedido * (p.porcentagem_comissao || 5) / 100), 0);
    const calcVendas = (lista) => lista.reduce((acc, p) => acc + (p.valor_pedido || 0), 0);

    return {
      liberadas,
      totalLiberado: calcTotal(liberadas),
      vendasLiberadas: calcVendas(liberadas),
      
      futuras,
      totalFuturo: calcTotal(futuras),
      vendasFuturas: calcVendas(futuras),
      
      recebidas,
      totalRecebido: calcTotal(recebidas),
    };
  }, [pedidos]);

  // --- 2. FILTRAGEM DA TABELA (BUSCA) ---
  const listaExibida = useMemo(() => {
    let listaAlvo = [];
    switch (activeTab) {
      case 'a_receber': listaAlvo = dados.liberadas; break;
      case 'futuras': listaAlvo = dados.futuras; break;
      case 'historico': listaAlvo = dados.recebidas; break;
      default: listaAlvo = [];
    }

    if (!busca) return listaAlvo;

    const termo = busca.toLowerCase();
    return listaAlvo.filter(p => 
      p.numero_pedido?.toLowerCase().includes(termo) ||
      p.cliente_nome?.toLowerCase().includes(termo)
    );
  }, [dados, activeTab, busca]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] h-[90vh] flex flex-col p-0 overflow-hidden">
        
        {/* CABEÇALHO */}
        <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                <Wallet className="w-6 h-6 text-purple-600" />
                Painel de Comissões
              </DialogTitle>
              <DialogDescription>
                Resumo financeiro de {representante?.nome}
              </DialogDescription>
            </div>
            
            {/* CARDS DE RESUMO (Topo) */}
            <div className="flex gap-4">
              <div className={cn(
                "px-4 py-2 rounded-xl border transition-all",
                activeTab === 'a_receber' ? "bg-emerald-50 border-emerald-200 ring-1 ring-emerald-100" : "bg-slate-50 border-slate-100 opacity-60"
              )}>
                <p className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Disponível
                </p>
                <p className="text-xl font-bold text-emerald-700">{formatCurrency(dados.totalLiberado)}</p>
              </div>

              <div className={cn(
                "px-4 py-2 rounded-xl border transition-all",
                activeTab === 'futuras' ? "bg-amber-50 border-amber-200 ring-1 ring-amber-100" : "bg-slate-50 border-slate-100 opacity-60"
              )}>
                <p className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Projeção
                </p>
                <p className="text-xl font-bold text-amber-700">{formatCurrency(dados.totalFuturo)}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* CONTROLES E ABAS */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                    <TabsList className="bg-white border border-slate-200 p-1 rounded-lg h-auto">
                        <TabsTrigger value="a_receber" className="gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                            <DollarSign className="w-4 h-4" /> A Receber <Badge className="ml-1 bg-emerald-200 text-emerald-800 hover:bg-emerald-200">{dados.liberadas.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="futuras" className="gap-2 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
                            <Clock className="w-4 h-4" /> Futuras (Em Aberto) <Badge className="ml-1 bg-amber-200 text-amber-800 hover:bg-amber-200">{dados.futuras.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="historico" className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                            <CalendarDays className="w-4 h-4" /> Histórico Pago
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                        placeholder="Filtrar pedidos..." 
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="pl-9 bg-white border-slate-200 focus:bg-white"
                    />
                </div>
            </div>
            
            {/* Aviso de Contexto */}
            <div className="text-xs text-slate-500 flex items-center gap-2">
                {activeTab === 'a_receber' && (
                    <>ℹ️ Exibindo pedidos <b>PAGOS</b> pelo cliente (Mês atual + Atrasados) com comissão pendente.</>
                )}
                {activeTab === 'futuras' && (
                    <>ℹ️ Exibindo pedidos <b>EM ABERTO</b>. Valores sujeitos a alteração até o pagamento.</>
                )}
                {activeTab === 'historico' && (
                    <>ℹ️ Exibindo comissões que <b>JÁ FORAM PAGAS</b> a você.</>
                )}
            </div>
        </div>

        {/* TABELA COM SCROLL */}
        <div className="flex-1 bg-white overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
                <div className="min-w-[800px]"> {/* Garante largura mínima para não quebrar colunas */}
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <TableRow>
                                <TableHead className="w-[100px]">Pedido</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>
                                    {activeTab === 'futuras' ? 'Previsão Entrega' : 'Data Pagamento'}
                                </TableHead>
                                <TableHead className="text-right">Valor Venda</TableHead>
                                <TableHead className="text-center">%</TableHead>
                                <TableHead className="text-right">
                                    {activeTab === 'historico' ? 'Comissão Paga' : 'Comissão Prevista'}
                                </TableHead>
                                <TableHead className="text-center w-[120px]">Status Pedido</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {listaExibida.length > 0 ? listaExibida.map(p => {
                                const percentual = p.porcentagem_comissao || 5;
                                const valorComissao = (p.valor_pedido || 0) * percentual / 100;
                                const dataRef = activeTab === 'futuras' ? p.data_entrega : p.data_pagamento;
                                
                                return (
                                    <TableRow key={p.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                                        <TableCell className="font-mono font-medium text-slate-700">
                                            #{p.numero_pedido}
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-800">
                                            {p.cliente_nome}
                                        </TableCell>
                                        <TableCell className="text-slate-500 text-sm">
                                            {dataRef ? format(new Date(dataRef), 'dd/MM/yyyy') : '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-slate-600">
                                            {formatCurrency(p.valor_pedido)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="font-normal bg-slate-100 text-slate-600">
                                                {percentual}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={cn("text-right font-bold", 
                                            activeTab === 'a_receber' ? "text-emerald-600" : 
                                            activeTab === 'futuras' ? "text-amber-600" : "text-blue-600"
                                        )}>
                                            {formatCurrency(valorComissao)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={cn(
                                                "text-[10px] font-normal border",
                                                p.status === 'pago' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                p.status === 'cancelado' ? "bg-slate-50 text-slate-500 border-slate-200" :
                                                "bg-blue-50 text-blue-700 border-blue-200"
                                            )}>
                                                {p.status === 'pago' ? 'Pago' : 
                                                 p.status === 'cancelado' ? 'Cancelado' : 'Aberto'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                                        Nenhum registro encontrado nesta categoria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </ScrollArea>
        </div>

        {/* RODAPÉ */}
        <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}