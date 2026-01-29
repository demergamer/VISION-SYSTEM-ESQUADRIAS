import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, TrendingUp, DollarSign, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function ComissaoModal({ open, onClose, pedidos, representante }) {
  const mesAtual = format(new Date(), 'yyyy-MM');

  const comissaoMesAtual = useMemo(() => {
    const pedidosPagos = pedidos.filter(p => 
      p.status === 'pago' && 
      p.mes_pagamento === mesAtual &&
      !p.comissao_paga
    );

    const totalVendas = pedidosPagos.reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
    const totalComissao = pedidosPagos.reduce((sum, p) => {
      const percentual = p.porcentagem_comissao || 5;
      return sum + (p.valor_pedido * percentual / 100);
    }, 0);

    return {
      pedidos: pedidosPagos,
      totalVendas,
      totalComissao,
      qtdPedidos: pedidosPagos.length
    };
  }, [pedidos, mesAtual]);

  const comissoesPendentes = useMemo(() => {
    return pedidos.filter(p => 
      p.status === 'pago' && 
      !p.comissao_paga &&
      p.mes_pagamento !== mesAtual
    );
  }, [pedidos, mesAtual]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wallet className="w-5 h-5 text-emerald-600" />
            Resumo de Comissões
          </DialogTitle>
          <DialogDescription>
            {representante?.nome} - {format(new Date(), 'MMMM/yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border-b">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-xs font-bold uppercase">Total Vendas</span>
              </div>
              <p className="text-2xl font-bold text-blue-800">{formatCurrency(comissaoMesAtual.totalVendas)}</p>
              <p className="text-xs text-blue-600 mt-1">{comissaoMesAtual.qtdPedidos} pedidos</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-700 mb-2">
                <DollarSign className="w-5 h-5" />
                <span className="text-xs font-bold uppercase">Comissão</span>
              </div>
              <p className="text-2xl font-bold text-emerald-800">{formatCurrency(comissaoMesAtual.totalComissao)}</p>
              <p className="text-xs text-emerald-600 mt-1">Mês atual</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-700 mb-2">
                <Clock className="w-5 h-5" />
                <span className="text-xs font-bold uppercase">Pendentes</span>
              </div>
              <p className="text-2xl font-bold text-amber-800">{comissoesPendentes.length}</p>
              <p className="text-xs text-amber-600 mt-1">Pedidos anteriores</p>
            </div>
          </div>

          {/* Tabela de Pedidos */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {/* Pedidos do Mês Atual */}
              <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Pedidos do Mês Atual ({comissaoMesAtual.pedidos.length})
                </h3>
                {comissaoMesAtual.pedidos.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Data Pag.</TableHead>
                          <TableHead className="text-right">Valor Pedido</TableHead>
                          <TableHead className="text-center">%</TableHead>
                          <TableHead className="text-right">Comissão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comissaoMesAtual.pedidos.map(p => {
                          const percentual = p.porcentagem_comissao || 5;
                          const comissao = p.valor_pedido * percentual / 100;
                          return (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono font-medium">#{p.numero_pedido}</TableCell>
                              <TableCell>{p.cliente_nome}</TableCell>
                              <TableCell className="text-sm">
                                {p.data_pagamento ? format(new Date(p.data_pagamento), 'dd/MM/yyyy') : '-'}
                              </TableCell>
                              <TableCell className="text-right text-slate-600">{formatCurrency(p.valor_pedido)}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{percentual}%</Badge>
                              </TableCell>
                              <TableCell className="text-right font-bold text-emerald-600">
                                {formatCurrency(comissao)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <p className="text-slate-500">Nenhum pedido pago este mês.</p>
                  </div>
                )}
              </div>

              {/* Pedidos Pendentes de Meses Anteriores */}
              {comissoesPendentes.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                    Comissões Pendentes ({comissoesPendentes.length})
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-amber-50">
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Mês Pag.</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">Comissão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comissoesPendentes.map(p => {
                          const percentual = p.porcentagem_comissao || 5;
                          const comissao = p.valor_pedido * percentual / 100;
                          return (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono font-medium">#{p.numero_pedido}</TableCell>
                              <TableCell>{p.cliente_nome}</TableCell>
                              <TableCell>{p.mes_pagamento || '-'}</TableCell>
                              <TableCell className="text-right text-slate-600">{formatCurrency(p.valor_pedido)}</TableCell>
                              <TableCell className="text-right font-bold text-amber-600">
                                {formatCurrency(comissao)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="border-t p-4 text-xs text-slate-500 text-center">
          ℹ️ As comissões são calculadas sobre os pedidos pagos. O fechamento oficial é feito pela administração.
        </div>
      </DialogContent>
    </Dialog>
  );
}