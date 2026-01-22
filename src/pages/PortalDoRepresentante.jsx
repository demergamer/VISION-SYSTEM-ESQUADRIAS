import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, ShoppingCart, CreditCard, AlertCircle, 
  Search, Briefcase, LogOut, Loader2, 
  ChevronDown, ChevronRight, MapPin, Truck, Eye, Wallet, CalendarClock, DollarSign,
  Lock, UserPlus, Edit, Send, FileText
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import ModalContainer from "@/components/modals/ModalContainer";
import SolicitarNovoCliente from "@/components/portais/SolicitarNovoCliente";
import LiquidacaoSelfService from "@/components/portais/LiquidacaoSelfService";

// --- UTILITÁRIOS ---
const realizarLogout = () => {
  try { localStorage.clear(); sessionStorage.clear(); window.location.href = '/'; } 
  catch (e) { window.location.reload(); }
};

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

// --- COMPONENTE: WIDGET DE ESTATÍSTICA (iOS Style) ---
const StatWidget = ({ title, value, subtitle, icon: Icon, colorClass }) => (
  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
    <div className="flex justify-between items-start mb-3">
      <div className={`p-3 rounded-2xl ${colorClass}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {subtitle && <Badge variant="secondary" className="font-normal bg-slate-100">{subtitle}</Badge>}
    </div>
    <div>
      <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</h3>
      <p className="text-sm font-medium text-slate-500 mt-1 uppercase tracking-wide">{title}</p>
    </div>
  </div>
);

// --- COMPONENTE: MODAL DE DETALHES ---
const DetailsModal = ({ item, type, open, onOpenChange }) => {
  if (!item) return null;

  const getTitle = () => {
    if (type === 'pedido') return `Pedido #${item.numero_pedido}`;
    if (type === 'cheque') return `Cheque #${item.numero_cheque}`;
    if (type === 'credito') return `Crédito Ref. ${item.referencia || 'N/A'}`;
    return 'Detalhes';
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {type === 'pedido' ? <ShoppingCart className="w-5 h-5" /> : type === 'cheque' ? <CreditCard className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
            Detalhes do Item
          </DialogTitle>
          <DialogDescription>{getTitle()}</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-4 bg-slate-50 rounded-xl border mt-2">
          <div className="space-y-4">
            {Object.entries(item).map(([key, value]) => {
              if (key === 'id' || key === 'representante_codigo' || typeof value === 'object') return null;
              return (
                <div key={key} className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-2 last:border-0">
                  <span className="text-sm font-medium text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="col-span-2 text-sm text-slate-800 font-semibold break-words">
                    {key.includes('valor') || key.includes('saldo') || key.includes('total') 
                      ? formatCurrency(value) 
                      : (key.includes('data') ? (value ? format(new Date(value), 'dd/MM/yyyy') : '-') : String(value))}
                  </span>
                </div>
              )
            })}
            
            {type === 'pedido' && item.itens && (
              <div className="mt-6">
                <h4 className="font-bold text-slate-800 mb-2">Itens do Pedido</h4>
                <div className="bg-white rounded-lg border p-2">
                  <pre className="text-xs text-slate-600 overflow-auto">{JSON.stringify(item.itens, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// --- COMPONENTE: LINHA DO CLIENTE EXPANSÍVEL ---
const ClientRow = ({ cliente, pedidos, cheques, creditos, borderos, autorizacoes, onViewDetails, onSolicitarLiquidacao }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('transito');
  const [liquidacaoView, setLiquidacaoView] = useState('bordero');
  const [expandedBordero, setExpandedBordero] = useState(null);

  // Cálculos do Cliente
  const totalDevendo = pedidos.reduce((acc, p) => acc + (p.saldo_restante || 0), 0);
  
  // Filtro de Atrasados (> 20 dias e aberto/parcial)
  const pedidosAtrasados = pedidos.filter(p => {
    return (p.status === 'aberto' || p.status === 'parcial') && 
           differenceInDays(new Date(), new Date(p.data_entrega)) > 20;
  });
  const temAtraso = pedidosAtrasados.length > 0;

  // Filtros dos Pedidos
  const pedidosEmTransito = pedidos.filter(p => p.status === 'aguardando');
  const pedidosAbertos = pedidos.filter(p => (p.status === 'aberto' || p.status === 'parcial') && !pedidosAtrasados.includes(p));
  const pedidosPagos = pedidos.filter(p => p.status === 'pago');
  const pedidosCancelados = pedidos.filter(p => p.status === 'cancelado');

  // Filtros de Cheques e Créditos
  const chequesAVencer = cheques.filter(c => c.status === 'normal' && new Date(c.data_vencimento) >= new Date());
  const valorChequesAVencer = chequesAVencer.reduce((acc, c) => acc + (c.valor || 0), 0);
  
  const totalCreditos = creditos.reduce((acc, c) => acc + (c.valor || 0), 0);

  return (
    <div className={`mb-4 bg-white rounded-2xl border transition-all duration-300 ${isExpanded ? 'shadow-md border-blue-200 ring-1 ring-blue-100' : 'shadow-sm border-slate-100'}`}>
      
      {/* CABEÇALHO DO CLIENTE (Clicável) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer hover:bg-slate-50/50 rounded-2xl gap-4"
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-colors shrink-0",
            temAtraso ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
          )}>
            {temAtraso ? <AlertCircle className="w-6 h-6" /> : <Users className="w-6 h-6" />}
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-800">{cliente.nome}</h4>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {cliente.regiao || 'Sem região'}</span>
              <span className="font-mono bg-slate-100 px-2 rounded text-xs">{cliente.codigo}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pedidosAbertos.length > 0 && (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); onSolicitarLiquidacao(cliente); }} className="gap-2 bg-emerald-600 hover:bg-emerald-700 h-8">
              <DollarSign className="w-4 h-4" />
              Liquidar
            </Button>
          )}
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-sm font-medium">Detalhes</span>
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* ÁREA EXPANDIDA */}
      {isExpanded && (
        <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="h-px w-full bg-slate-100 mb-4" />
          
          {/* TOTALIZADORES INDIVIDUAIS (DASHBOARD DO CLIENTE) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            
            {/* 1. Saldo Devedor (Descido do Cabeçalho) */}
            <div className={cn(
              "border p-4 rounded-xl flex items-center gap-4",
              totalDevendo > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"
            )}>
              <div className={cn("p-2 rounded-lg", totalDevendo > 0 ? "bg-red-100" : "bg-white")}>
                <DollarSign className={cn("w-5 h-5", totalDevendo > 0 ? "text-red-600" : "text-slate-600")} />
              </div>
              <div>
                <p className={cn("text-xs font-bold uppercase", totalDevendo > 0 ? "text-red-600" : "text-slate-500")}>
                  Saldo Devedor
                </p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(totalDevendo)}</p>
              </div>
            </div>

            {/* 2. Cheques a Vencer */}
            <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex items-center gap-4">
              <div className="bg-purple-100 p-2 rounded-lg"><CalendarClock className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-xs text-purple-600 font-bold uppercase">Cheques a Vencer</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(valorChequesAVencer)}</p>
              </div>
            </div>
            
            {/* 3. Créditos Disponíveis */}
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-4">
              <div className="bg-emerald-100 p-2 rounded-lg"><Wallet className="w-5 h-5 text-emerald-600" /></div>
              <div>
                <p className="text-xs text-emerald-600 font-bold uppercase">Créditos Disponíveis</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(totalCreditos)}</p>
              </div>
            </div>

            {/* 4. Pedidos em Trânsito */}
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-4">
              <div className="bg-amber-100 p-2 rounded-lg"><Truck className="w-5 h-5 text-amber-600" /></div>
              <div>
                <p className="text-xs text-amber-600 font-bold uppercase">Em Trânsito</p>
                <p className="text-lg font-bold text-slate-800">{pedidosEmTransito.length} <span className="text-xs font-normal text-slate-500">pedidos</span></p>
              </div>
            </div>
          </div>

          {/* ABAS DE DADOS */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-slate-100 p-1 rounded-xl h-auto flex-wrap justify-start gap-2 mb-4 w-full sm:w-auto">
              <TabsTrigger value="transito" className="rounded-lg px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm">
                Em Trânsito <Badge className="ml-2 bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">{pedidosEmTransito.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="abertos" className="rounded-lg px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                Abertos <Badge className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">{pedidosAbertos.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="atrasados" className="rounded-lg px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm">
                Em Atraso <Badge className="ml-2 bg-red-100 text-red-700 hover:bg-red-100 border-0">{pedidosAtrasados.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="autorizacoes" className="rounded-lg px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm">
                Autorizações <Badge className="ml-2 bg-orange-100 text-orange-700 hover:bg-orange-100 border-0">{autorizacoes.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="liquidacoes" className="rounded-lg px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">
                Liquidações <Badge className="ml-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">{liquidacaoView === 'bordero' ? borderos.length : pedidosPagos.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="creditos" className="rounded-lg px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">
                Créditos <Badge className="ml-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">{creditos.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="cheques" className="rounded-lg px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm">
                Cheques <Badge className="ml-2 bg-purple-100 text-purple-700 hover:bg-purple-100 border-0">{cheques.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* TABELA DE PEDIDOS (Reutilizável) */}
            {['transito', 'abertos', 'atrasados'].map(statusTab => {
              let currentList = [];
              if(statusTab === 'abertos') currentList = pedidosAbertos;
              if(statusTab === 'transito') currentList = pedidosEmTransito;
              if(statusTab === 'atrasados') currentList = pedidosAtrasados;

              return (
                <TabsContent key={statusTab} value={statusTab} className="mt-0">
                  {currentList.length > 0 ? (
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow>
                            <TableHead className="w-[100px]">Pedido</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Rota / Entrega</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentList.map(p => (
                            <TableRow key={p.id} className="hover:bg-slate-50/50">
                              <TableCell className="font-mono font-medium">#{p.numero_pedido}</TableCell>
                              <TableCell>{p.data_entrega ? format(new Date(p.data_entrega), 'dd/MM/yyyy') : '-'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Truck className="w-4 h-4 text-slate-400" />
                                  <span className="text-sm font-medium text-slate-700">{p.rota_codigo || 'Não definida'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-slate-500">{formatCurrency(p.valor_pedido)}</TableCell>
                              <TableCell className="text-right font-bold text-slate-800">{formatCurrency(p.saldo_restante)}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => onViewDetails(p, 'pedido')}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                      Nenhum pedido nesta situação.
                    </div>
                  )}
                </TabsContent>
              )
            })}

            {/* ABA AUTORIZAÇÕES */}
            <TabsContent value="autorizacoes" className="mt-0">
              {autorizacoes.length > 0 ? (
                <div className="space-y-3">
                  {autorizacoes.map(autorizacao => (
                    <div key={autorizacao.id} className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-xs font-bold text-orange-600 uppercase">Solicitação</span>
                          <h3 className="text-lg font-bold text-slate-800">#{autorizacao.numero_solicitacao}</h3>
                        </div>
                        <Badge className="bg-orange-100 text-orange-700">Em Análise</Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Data:</span>
                          <span className="font-medium">{format(new Date(autorizacao.created_date), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Pedidos:</span>
                          <span className="font-semibold">{autorizacao.pedidos_ids?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Valor Proposto:</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(autorizacao.valor_final_proposto)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                  Nenhuma solicitação em análise no momento.
                </div>
              )}
            </TabsContent>

            {/* ABA LIQUIDAÇÕES */}
            <TabsContent value="liquidacoes" className="mt-0">
              <div className="mb-3 flex items-center gap-2 bg-white border border-slate-100 rounded-xl p-1 inline-flex">
                <Button 
                  variant={liquidacaoView === 'bordero' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setLiquidacaoView('bordero')}
                  className={liquidacaoView === 'bordero' ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
                >
                  <FileText className="w-4 h-4 mr-2" /> Borderôs ({borderos.length})
                </Button>
                <Button 
                  variant={liquidacaoView === 'pedidos' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setLiquidacaoView('pedidos')}
                  className={liquidacaoView === 'pedidos' ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" /> Pedidos ({pedidosPagos.length})
                </Button>
              </div>

              {liquidacaoView === 'bordero' ? (
                borderos.length > 0 ? (
                  <div className="space-y-3">
                    {borderos.map(bordero => (
                      <div key={bordero.id} className="border border-slate-100 rounded-xl bg-white hover:shadow-md transition-all">
                        <button
                          onClick={() => setExpandedBordero(expandedBordero === bordero.id ? null : bordero.id)}
                          className="w-full p-4 text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-slate-800">Borderô #{bordero.numero_bordero}</h3>
                                <p className="text-xs text-slate-500">{format(new Date(bordero.created_date), 'dd/MM/yyyy HH:mm')}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-500">Valor Total</p>
                              <p className="text-xl font-bold text-emerald-600">{formatCurrency(bordero.valor_total)}</p>
                            </div>
                          </div>
                        </button>

                        {expandedBordero === bordero.id && (
                          <div className="px-4 pb-4 pt-0 border-t border-slate-100 space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                              <div>
                                <span className="text-slate-500">Pedidos:</span>
                                <span className="font-medium ml-2">{bordero.pedidos_ids?.length || 0}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Forma Pagamento:</span>
                                <span className="font-medium ml-2 text-xs">{bordero.forma_pagamento || 'N/A'}</span>
                              </div>
                            </div>

                            {bordero.pedidos_ids && bordero.pedidos_ids.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-slate-700 mb-2 text-sm">Pedidos Liquidados:</h4>
                                <div className="space-y-2">
                                  {bordero.pedidos_ids.map(pedidoId => {
                                    const pedido = pedidos.find(p => p.id === pedidoId);
                                    return pedido ? (
                                      <div key={pedidoId} className="flex justify-between items-center p-2 bg-slate-50 border rounded-lg text-sm">
                                        <span className="font-medium">#{pedido.numero_pedido}</span>
                                        <span className="text-slate-600">{formatCurrency(pedido.valor_pedido)}</span>
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            )}

                            {bordero.comprovantes_urls && bordero.comprovantes_urls.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-slate-700 mb-2 text-sm">Comprovantes:</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  {bordero.comprovantes_urls.map((url, idx) => (
                                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" download className="block border rounded-lg overflow-hidden hover:border-emerald-400 transition-colors">
                                      <img src={url} alt={`Comprovante ${idx + 1}`} className="w-full h-24 object-cover" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                    Nenhum borderô encontrado.
                  </div>
                )
              ) : (
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  {pedidosPagos.length > 0 ? (
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow>
                          <TableHead className="w-[100px]">Pedido</TableHead>
                          <TableHead>Borderô</TableHead>
                          <TableHead>Data Pag.</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pedidosPagos.map(p => (
                          <TableRow key={p.id} className="hover:bg-slate-50/50">
                            <TableCell className="font-mono font-medium">#{p.numero_pedido}</TableCell>
                            <TableCell>
                              {p.bordero_numero ? (
                                <Badge className="bg-emerald-100 text-emerald-700">#B{p.bordero_numero}</Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell>{p.data_pagamento ? format(new Date(p.data_pagamento), 'dd/MM/yyyy') : '-'}</TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(p.valor_pedido)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => onViewDetails(p, 'pedido')}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-slate-400 bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                      Nenhum pedido pago encontrado.
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* TABELA DE CHEQUES */}
            <TabsContent value="cheques" className="mt-0">
              {cheques.length > 0 ? (
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead>Nº Cheque</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Banco</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cheques.map(c => (
                        <TableRow key={c.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-mono">{c.numero_cheque}</TableCell>
                          <TableCell>{c.data_vencimento ? format(new Date(c.data_vencimento), 'dd/MM/yyyy') : '-'}</TableCell>
                          <TableCell>{c.banco || '-'}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(c.valor)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn(
                              "font-normal",
                              c.status === 'devolvido' ? "bg-red-50 text-red-600 border-red-200" : "bg-blue-50 text-blue-600 border-blue-200"
                            )}>
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-600 hover:bg-purple-50" onClick={() => onViewDetails(c, 'cheque')}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                  Nenhum cheque encontrado.
                </div>
              )}
            </TabsContent>

            {/* TABELA DE CRÉDITOS */}
            <TabsContent value="creditos" className="mt-0">
              {creditos.length > 0 ? (
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead>Referência</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor Original</TableHead>
                        <TableHead className="text-right">Valor Usado</TableHead>
                        <TableHead className="text-right">Disponível</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditos.map(c => (
                        <TableRow key={c.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-mono">{c.referencia || '-'}</TableCell>
                          <TableCell>{c.data_emissao ? format(new Date(c.data_emissao), 'dd/MM/yyyy') : '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={c.descricao}>{c.descricao || 'Crédito em conta'}</TableCell>
                          <TableCell className="text-right text-slate-500">{formatCurrency(c.valor_original)}</TableCell>
                          <TableCell className="text-right text-red-400">{formatCurrency(c.valor_usado)}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(c.valor)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => onViewDetails(c, 'credito')}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                  Nenhum crédito disponível.
                </div>
              )}
            </TabsContent>

          </Tabs>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function PainelRepresentante() {
  const [user, setUser] = useState(null);
  const [representante, setRepresentante] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [detailsModal, setDetailsModal] = useState({ open: false, item: null, type: null });
  const [showSolicitarClienteModal, setShowSolicitarClienteModal] = useState(false);
  const [showLiquidacaoModal, setShowLiquidacaoModal] = useState(false);
  const [clienteParaLiquidacao, setClienteParaLiquidacao] = useState(null);

  // 1. Busca de Dados
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const u = await base44.auth.me();
        if (mounted && u) {
          setUser(u);
          const reps = await base44.entities.Representante.list();
          const rep = reps.find(r => r.email === u.email);
          setRepresentante(rep);
        }
      } catch (e) { console.error(e); } 
      finally { if (mounted) setLoading(false); }
    }
    loadData();
    return () => { mounted = false };
  }, []);

  const { data: todosClientes = [] } = useQuery({ queryKey: ['clientes', representante?.id], queryFn: () => base44.entities.Cliente.list(), enabled: !!representante });
  const { data: todosPedidos = [] } = useQuery({ queryKey: ['pedidos', representante?.id], queryFn: () => base44.entities.Pedido.list(), enabled: !!representante });
  const { data: todosCheques = [] } = useQuery({ queryKey: ['cheques', representante?.id], queryFn: () => base44.entities.Cheque.list(), enabled: !!representante });
  const { data: todosCreditos = [] } = useQuery({ queryKey: ['creditos', representante?.id], queryFn: () => base44.entities.Credito.list(), enabled: !!representante });
  const { data: todosBorderos = [] } = useQuery({ queryKey: ['borderos', representante?.id], queryFn: () => base44.entities.Bordero.list('-created_date'), enabled: !!representante });
  const { data: todasLiquidacoesPendentes = [] } = useQuery({ queryKey: ['liquidacoesPendentes', representante?.id], queryFn: () => base44.entities.LiquidacaoPendente.list('-created_date'), enabled: !!representante });

  // 2. Filtros e Agrupamento
  const meusClientes = useMemo(() => {
    if (!representante) return [];
    
    let clientes = todosClientes.filter(c => c.representante_codigo === representante.codigo);
    
    if (searchTerm) {
      clientes = clientes.filter(c => 
        c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.regiao?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return clientes.map(c => ({
      ...c,
      pedidos: todosPedidos.filter(p => p.cliente_codigo === c.codigo),
      cheques: todosCheques.filter(ch => ch.cliente_codigo === c.codigo),
      creditos: todosCreditos.filter(cr => cr.cliente_codigo === c.codigo && cr.status === 'disponivel'),
      borderos: todosBorderos.filter(b => b.cliente_codigo === c.codigo),
      autorizacoes: todasLiquidacoesPendentes.filter(lp => lp.cliente_codigo === c.codigo && lp.status === 'pendente')
    }));
  }, [representante, todosClientes, todosPedidos, todosCheques, todosCreditos, searchTerm]);

  // 3. Estatísticas Globais (KPIs)
  const stats = useMemo(() => {
    const meusPedidos = todosPedidos.filter(p => p.representante_codigo === representante?.codigo);
    
    const clientesComVendas30k = meusClientes.filter(c => {
      const totalVendas = c.pedidos
        .filter(p => p.status !== 'cancelado')
        .reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
      return totalVendas > 30000;
    }).length;

    const totalVendasAbertas = meusPedidos
      .filter(p => p.status === 'aberto' || p.status === 'parcial')
      .reduce((sum, p) => sum + (p.saldo_restante || 0), 0);

    const chequesTotal = todosCheques
      .filter(c => meusClientes.some(cli => cli.codigo === c.cliente_codigo))
      .reduce((sum, c) => sum + (c.valor || 0), 0);

    return {
      totalClientes: meusClientes.length,
      clientes30k: clientesComVendas30k,
      vendasAbertas: totalVendasAbertas,
      carteiraCheques: chequesTotal
    };
  }, [meusClientes, todosPedidos, todosCheques, representante]);

  const handleViewDetails = (item, type) => {
    setDetailsModal({ open: true, item, type });
  };

  const handleSolicitarLiquidacao = (cliente) => {
    setClienteParaLiquidacao(cliente);
    setShowLiquidacaoModal(true);
  };

  // --- RENDERIZAÇÃO ---

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Carregando portal...</p>
      </div>
    );
  }

  if (!user || !representante) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center border-amber-200 bg-amber-50">
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
          <p className="text-slate-600 mb-4">Email não vinculado a um representante.</p>
          <div className="flex justify-center gap-3">
             <Button onClick={() => window.location.reload()} variant="outline" className="bg-white">Recarregar</Button>
             <Button onClick={realizarLogout} variant="destructive">Sair</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-20 font-sans text-slate-900">
      
      {/* Sticky Header com Blur */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Olá, <span className="text-blue-600">{representante.nome.split(' ')[0]}</span></h1>
          <p className="text-sm text-slate-500 font-medium">Portal do Representante</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar Cliente..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10 rounded-full bg-slate-100 border-transparent focus:bg-white transition-all" 
            />
          </div>
          <Button onClick={realizarLogout} variant="ghost" size="icon" className="rounded-full hover:bg-red-50 hover:text-red-600">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8">
        
        {/* Botões de Ação Globais */}
        <div className="flex gap-3">
          <Button onClick={() => setShowSolicitarClienteModal(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4" />
            Solicitar Novo Cliente
          </Button>
          <Button variant="outline" className="gap-2" disabled>
            <Lock className="w-4 h-4" />
            Orçamentos (Em Breve)
          </Button>
        </div>
        
        {/* KPI Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatWidget 
            title="Clientes na Carteira" 
            value={stats.totalClientes} 
            icon={Users} 
            colorClass="bg-blue-500 shadow-blue-200" 
          />
          <StatWidget 
            title="Clientes +30k" 
            value={stats.clientes30k} 
            subtitle="VIPs"
            icon={Briefcase} 
            colorClass="bg-purple-500 shadow-purple-200" 
          />
          <StatWidget 
            title="Vendas em Aberto" 
            value={formatCurrency(stats.vendasAbertas)} 
            icon={ShoppingCart} 
            colorClass="bg-amber-500 shadow-amber-200" 
          />
          <StatWidget 
            title="Custódia de Cheques" 
            value={formatCurrency(stats.carteiraCheques)} 
            icon={CreditCard} 
            colorClass="bg-emerald-500 shadow-emerald-200" 
          />
        </div>

        {/* Lista de Clientes (Main Content) */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-700 ml-2">Carteira de Clientes</h2>
          
          {meusClientes.length > 0 ? (
            meusClientes.map(cliente => (
              <ClientRow 
                key={cliente.id} 
                cliente={cliente} 
                pedidos={cliente.pedidos} 
                cheques={cliente.cheques}
                creditos={cliente.creditos}
                borderos={cliente.borderos}
                autorizacoes={cliente.autorizacoes}
                onViewDetails={handleViewDetails}
                onSolicitarLiquidacao={handleSolicitarLiquidacao}
              />
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhum cliente encontrado.</p>
            </div>
          )}
        </div>

      </div>

      {/* Modal Global de Detalhes */}
      <DetailsModal 
        open={detailsModal.open} 
        onOpenChange={(open) => setDetailsModal(prev => ({ ...prev, open }))}
        item={detailsModal.item}
        type={detailsModal.type}
      />

      {/* Modal Solicitar Novo Cliente */}
      <ModalContainer
        open={showSolicitarClienteModal}
        onClose={() => setShowSolicitarClienteModal(false)}
        title="Solicitar Cadastro de Cliente"
        description="Preencha os dados do novo cliente"
        size="lg"
      >
        <SolicitarNovoCliente
          representanteCodigo={representante?.codigo}
          onSuccess={() => {
            setShowSolicitarClienteModal(false);
            toast.success('Solicitação enviada!');
          }}
          onCancel={() => setShowSolicitarClienteModal(false)}
        />
      </ModalContainer>

      {/* Modal Solicitar Liquidação */}
      <ModalContainer
        open={showLiquidacaoModal}
        onClose={() => {
          setShowLiquidacaoModal(false);
          setClienteParaLiquidacao(null);
        }}
        title="Solicitar Liquidação"
        description={clienteParaLiquidacao ? `Cliente: ${clienteParaLiquidacao.nome}` : ''}
        size="xl"
      >
        {clienteParaLiquidacao && (
          <LiquidacaoSelfService
            pedidos={clienteParaLiquidacao.pedidos.filter(p => p.status === 'aberto' || p.status === 'parcial')}
            clienteCodigo={clienteParaLiquidacao.codigo}
            clienteNome={clienteParaLiquidacao.nome}
            onSuccess={() => {
              setShowLiquidacaoModal(false);
              setClienteParaLiquidacao(null);
            }}
            onCancel={() => {
              setShowLiquidacaoModal(false);
              setClienteParaLiquidacao(null);
            }}
          />
        )}
      </ModalContainer>

    </div>
  );
}