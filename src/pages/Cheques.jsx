import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutGrid, List, Filter, Plus, Search, 
  ArrowUpRight, ArrowDownLeft, AlertCircle, CheckCircle2, Clock,
  Calendar, DollarSign, Building2, MoreHorizontal, Download, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { format, isPast, isFuture, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Modais
import ModalContainer from "@/components/modals/ModalContainer";
import ChequeForm from "@/components/cheques/ChequeForm";
import ChequeDetails from "@/components/cheques/ChequeDetails";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function Cheques() {
  // --- ESTADOS ---
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Navegação
  const [mainTab, setMainTab] = useState('a_compensar');
  const [subTab, setSubTab] = useState('em_maos');

  // Filtros Avançados
  const [filters, setFilters] = useState({
    dataInicio: '', dataFim: '',
    banco: 'todos',
    valorMin: '', valorMax: ''
  });

  // Modais
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCheque, setSelectedCheque] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // --- QUERIES ---
  const { data: cheques = [], refetch } = useQuery({ 
    queryKey: ['cheques'], 
    queryFn: () => base44.entities.Cheque.list() 
  });
  
  const { data: clientes = [] } = useQuery({ 
    queryKey: ['clientes'], 
    queryFn: () => base44.entities.Cliente.list() 
  });

  // --- PROCESSAMENTO DE DADOS (CÉREBRO) ---
  const dadosProcessados = useMemo(() => {
    let lista = cheques;

    // 1. Busca Textual Global
    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      lista = lista.filter(c => 
        c.numero_cheque?.toLowerCase().includes(termo) ||
        c.emitente?.toLowerCase().includes(termo) ||
        c.cliente_nome?.toLowerCase().includes(termo) ||
        c.valor?.toString().includes(termo)
      );
    }

    // 2. Filtros Avançados
    if (filters.banco !== 'todos') lista = lista.filter(c => c.banco === filters.banco);
    if (filters.valorMin) lista = lista.filter(c => c.valor >= parseFloat(filters.valorMin));
    if (filters.valorMax) lista = lista.filter(c => c.valor <= parseFloat(filters.valorMax));
    if (filters.dataInicio) lista = lista.filter(c => new Date(c.data_vencimento) >= new Date(filters.dataInicio));
    if (filters.dataFim) lista = lista.filter(c => new Date(c.data_vencimento) <= new Date(filters.dataFim));

    // 3. Lógica de Abas e Sub-níveis
    // DEVOLVIDOS
    const devolvidosAReceber = lista.filter(c => c.status === 'devolvido' && !c.data_pagamento);
    const devolvidosPagos = lista.filter(c => c.status === 'pago' || (c.status === 'devolvido' && c.data_pagamento));
    
    // A COMPENSAR (Carteira)
    const emMaos = lista.filter(c => c.status === 'normal');
    // Repassados que ainda não venceram (teoricamente responsabilidade nossa ainda)
    const repassadosAtivos = lista.filter(c => c.status === 'repassado' && isFuture(parseISO(c.data_vencimento)));

    // COMPENSADOS (Baixados)
    const depositados = lista.filter(c => c.status === 'compensado');
    // Repassados que já venceram (assumimos compensados no terceiro)
    const repassadosBaixados = lista.filter(c => c.status === 'repassado' && isPast(parseISO(c.data_vencimento)));

    // Seleção da Lista Final baseada na Navegação
    let listaFinal = [];
    if (mainTab === 'devolvidos') {
       listaFinal = subTab === 'a_receber' ? devolvidosAReceber : devolvidosPagos;
    } else if (mainTab === 'a_compensar') {
       listaFinal = subTab === 'em_maos' ? emMaos : repassadosAtivos;
    } else if (mainTab === 'compensados') {
       listaFinal = subTab === 'depositados' ? depositados : repassadosBaixados;
    }

    return {
      listaFinal,
      totais: {
        devolvidosAReceber: devolvidosAReceber.reduce((acc, c) => acc + c.valor, 0),
        emMaos: emMaos.reduce((acc, c) => acc + c.valor, 0),
        depositados: depositados.reduce((acc, c) => acc + c.valor, 0)
      },
      contagem: {
        devolvidos: devolvidosAReceber.length + devolvidosPagos.length,
        aCompensar: emMaos.length + repassadosAtivos.length,
        compensados: depositados.length + repassadosBaixados.length
      }
    };
  }, [cheques, searchTerm, filters, mainTab, subTab]);

  // --- HANDLERS ---
  const handleEdit = (cheque) => {
    setSelectedCheque(cheque);
    setShowFormModal(true);
  };

  const handleView = (cheque) => {
    setSelectedCheque(cheque);
    setShowDetailsModal(true);
  };

  const handleNew = () => {
    setSelectedCheque(null);
    setShowFormModal(true);
  };

  const handleSelectAll = (checked) => {
    if (checked) setSelectedIds(dadosProcessados.listaFinal.map(c => c.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10 w-full">
      {/* 1. HEADER FULL WIDTH */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 w-full">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-indigo-600" /> Gestão de Cheques
            </h1>
            <p className="text-slate-500 text-sm">Controle de custódia, repasses e devoluções</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* KPI Cards Rápidos no Header */}
            <div className="flex gap-3 overflow-x-auto pb-1 sm:pb-0">
                <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg min-w-[140px]">
                    <p className="text-[10px] uppercase font-bold text-blue-600 flex items-center gap-1"><Clock className="w-3 h-3"/> Em Mãos</p>
                    <p className="text-lg font-bold text-blue-900">{formatCurrency(dadosProcessados.totais.emMaos)}</p>
                </div>
                <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-lg min-w-[140px]">
                    <p className="text-[10px] uppercase font-bold text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Devolvidos</p>
                    <p className="text-lg font-bold text-red-900">{formatCurrency(dadosProcessados.totais.devolvidosAReceber)}</p>
                </div>
            </div>

            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block" />

            <div className="flex gap-2">
                <Button variant="outline" className="gap-2" onClick={() => {}} disabled={selectedIds.length === 0}>
                    <MoreHorizontal className="w-4 h-4" /> Ações em Massa
                </Button>
                <Button onClick={handleNew} className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200">
                    <Plus className="w-4 h-4" /> Novo Cheque
                </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 w-full">
        
        {/* 2. BARRA DE CONTROLE (Tabs + Filtros + ViewMode) */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            
            {/* Tabs Nível 1 */}
            <Tabs value={mainTab} onValueChange={(v) => { setMainTab(v); setSubTab(v === 'devolvidos' ? 'a_receber' : v === 'a_compensar' ? 'em_maos' : 'depositados'); }} className="w-full lg:w-auto">
                <TabsList className="bg-slate-100 p-1 h-auto flex-wrap">
                    <TabsTrigger value="a_compensar" className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                        <Clock className="w-4 h-4" /> A Compensar <Badge className="ml-2 bg-blue-200 text-blue-800 hover:bg-blue-200">{dadosProcessados.contagem.aCompensar}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="devolvidos" className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-sm">
                        <AlertCircle className="w-4 h-4" /> Devolvidos <Badge className="ml-2 bg-red-200 text-red-800 hover:bg-red-200">{dadosProcessados.contagem.devolvidos}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="compensados" className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                        <CheckCircle2 className="w-4 h-4" /> Compensados <Badge className="ml-2 bg-emerald-200 text-emerald-800 hover:bg-emerald-200">{dadosProcessados.contagem.compensados}</Badge>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Controles Direita */}
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                        placeholder="Buscar cheque, cliente, banco..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    />
                </div>
                
                <Button 
                    variant={showFilters ? "secondary" : "outline"} 
                    size="icon" 
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn("shrink-0", showFilters && "bg-slate-200")}
                    title="Filtros Avançados"
                >
                    <Filter className="w-4 h-4" />
                </Button>

                <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200 shrink-0">
                    <Button 
                        variant="ghost" size="icon" 
                        onClick={() => setViewMode('table')}
                        className={cn("h-8 w-8 rounded-md", viewMode === 'table' ? "bg-white shadow-sm" : "text-slate-500")}
                    >
                        <List className="w-4 h-4" />
                    </Button>
                    <Button 
                        variant="ghost" size="icon" 
                        onClick={() => setViewMode('grid')}
                        className={cn("h-8 w-8 rounded-md", viewMode === 'grid' ? "bg-white shadow-sm" : "text-slate-500")}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>

        {/* 3. PAINEL DE FILTROS (REBATÍVEL) */}
        <AnimatePresence>
            {showFilters && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: "auto", opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                >
                    <Card className="bg-slate-50 border-slate-200 mb-6">
                        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Banco</label>
                                <Select value={filters.banco} onValueChange={v => setFilters({...filters, banco: v})}>
                                    <SelectTrigger className="bg-white"><SelectValue placeholder="Todos" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos</SelectItem>
                                        <SelectItem value="BRADESCO">Bradesco</SelectItem>
                                        <SelectItem value="ITAÚ">Itaú</SelectItem>
                                        <SelectItem value="SANTANDER">Santander</SelectItem>
                                        {/* Adicionar mais bancos dinamicamente se quiser */}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Valor (R$)</label>
                                <div className="flex gap-2">
                                    <Input placeholder="Min" type="number" className="bg-white" value={filters.valorMin} onChange={e => setFilters({...filters, valorMin: e.target.value})} />
                                    <Input placeholder="Max" type="number" className="bg-white" value={filters.valorMax} onChange={e => setFilters({...filters, valorMax: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Vencimento</label>
                                <div className="flex gap-2">
                                    <Input type="date" className="bg-white" value={filters.dataInicio} onChange={e => setFilters({...filters, dataInicio: e.target.value})} />
                                    <Input type="date" className="bg-white" value={filters.dataFim} onChange={e => setFilters({...filters, dataFim: e.target.value})} />
                                </div>
                            </div>
                            <div className="flex items-end">
                                <Button variant="ghost" onClick={() => setFilters({ dataInicio: '', dataFim: '', banco: 'todos', valorMin: '', valorMax: '' })} className="w-full text-red-500 hover:text-red-700 hover:bg-red-50">
                                    Limpar Filtros
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>

        {/* 4. SUB-ABAS (NÍVEL 2) */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {mainTab === 'devolvidos' && (
                <>
                    <Button variant={subTab === 'a_receber' ? 'default' : 'outline'} onClick={() => setSubTab('a_receber')} className={cn("rounded-full", subTab === 'a_receber' && "bg-red-600 hover:bg-red-700")}>
                        A Receber
                    </Button>
                    <Button variant={subTab === 'pagos' ? 'default' : 'outline'} onClick={() => setSubTab('pagos')} className={cn("rounded-full", subTab === 'pagos' && "bg-emerald-600 hover:bg-emerald-700")}>
                        Resolvidos / Pagos
                    </Button>
                </>
            )}
            {mainTab === 'a_compensar' && (
                <>
                    <Button variant={subTab === 'em_maos' ? 'default' : 'outline'} onClick={() => setSubTab('em_maos')} className={cn("rounded-full", subTab === 'em_maos' && "bg-blue-600")}>
                        Em Mãos (Carteira)
                    </Button>
                    <Button variant={subTab === 'repassados' ? 'default' : 'outline'} onClick={() => setSubTab('repassados')} className="rounded-full">
                        Repassados (Ainda não compensou)
                    </Button>
                </>
            )}
            {mainTab === 'compensados' && (
                <>
                    <Button variant={subTab === 'depositados' ? 'default' : 'outline'} onClick={() => setSubTab('depositados')} className={cn("rounded-full", subTab === 'depositados' && "bg-emerald-600")}>
                        Depositados em Conta
                    </Button>
                    <Button variant={subTab === 'repassados' ? 'default' : 'outline'} onClick={() => setSubTab('repassados')} className="rounded-full">
                        Repassados (Baixados)
                    </Button>
                </>
            )}
        </div>

        {/* 5. CONTEÚDO (TABLE OU GRID) */}
        {dadosProcessados.listaFinal.length > 0 ? (
            viewMode === 'table' ? (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[50px]"><Checkbox checked={selectedIds.length === dadosProcessados.listaFinal.length && dadosProcessados.listaFinal.length > 0} onCheckedChange={handleSelectAll} /></TableHead>
                                <TableHead>Cheque</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Banco</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dadosProcessados.listaFinal.map(cheque => {
                                const isVencido = cheque.status === 'normal' && isPast(parseISO(cheque.data_vencimento));
                                return (
                                    <TableRow key={cheque.id} className="group hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => handleView(cheque)}>
                                        <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedIds.includes(cheque.id)} onCheckedChange={() => handleSelectOne(cheque.id)} /></TableCell>
                                        <TableCell>
                                            <div className="font-mono font-bold text-slate-700">#{cheque.numero_cheque}</div>
                                            <div className="text-xs text-slate-500">{cheque.emitente || '---'}</div>
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-800">{cheque.cliente_nome}</TableCell>
                                        <TableCell>{cheque.banco}</TableCell>
                                        <TableCell className="text-right font-bold text-slate-700">{formatCurrency(cheque.valor)}</TableCell>
                                        <TableCell>
                                            <div className={cn("text-sm", isVencido ? "text-red-600 font-bold" : "text-slate-600")}>
                                                {format(new Date(cheque.data_vencimento), 'dd/MM/yyyy')}
                                            </div>
                                            {isVencido && <span className="text-[10px] text-red-500 uppercase font-bold">Vencido</span>}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={cn(
                                                "capitalize", 
                                                cheque.status === 'devolvido' ? "bg-red-50 text-red-700 border-red-200" :
                                                cheque.status === 'compensado' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                "bg-blue-50 text-blue-700 border-blue-200"
                                            )}>
                                                {cheque.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(cheque)}>
                                                <MoreHorizontal className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                // VIEW MODE: GRID (EXPLORER)
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {dadosProcessados.listaFinal.map(cheque => (
                        <Card 
                            key={cheque.id} 
                            className="p-4 hover:shadow-md transition-all cursor-pointer border-slate-200 group relative overflow-hidden"
                            onClick={() => handleView(cheque)}
                        >
                            {/* Faixa lateral colorida por status */}
                            <div className={cn("absolute left-0 top-0 bottom-0 w-1", 
                                cheque.status === 'devolvido' ? "bg-red-500" :
                                cheque.status === 'compensado' ? "bg-emerald-500" :
                                "bg-blue-500"
                            )} />

                            <div className="pl-3">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{cheque.banco}</span>
                                    <Badge variant="secondary" className="text-[10px] h-5">{cheque.status}</Badge>
                                </div>
                                <div className="mb-3">
                                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(cheque.valor)}</p>
                                    <p className="text-xs text-slate-500 font-mono">#{cheque.numero_cheque}</p>
                                </div>
                                <div className="border-t border-slate-100 pt-2 mt-2">
                                    <p className="text-sm font-medium text-slate-700 truncate" title={cheque.cliente_nome}>{cheque.cliente_nome}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3"/> {format(new Date(cheque.data_vencimento), 'dd/MM/yy')}</span>
                                        <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )
        ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                <Search className="w-12 h-12 mb-4 text-slate-200" />
                <p className="text-lg font-medium text-slate-600">Nenhum cheque encontrado</p>
                <p className="text-sm">Tente ajustar os filtros ou abas.</p>
            </div>
        )}

      </div>

      {/* MODAIS */}
      <ModalContainer open={showFormModal} onClose={() => setShowFormModal(false)} title={selectedCheque ? "Editar Cheque" : "Novo Cheque"}>
        <ChequeForm 
            cheque={selectedCheque} 
            clientes={clientes} 
            onSave={(data) => {
                if (selectedCheque) {
                    // Update Logic
                    toast.success("Cheque atualizado!");
                } else {
                    // Create Logic
                    toast.success("Cheque cadastrado!");
                }
                setShowFormModal(false);
                refetch();
            }} 
            onCancel={() => setShowFormModal(false)} 
        />
      </ModalContainer>

      <ModalContainer open={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Detalhes do Cheque">
        {selectedCheque && <ChequeDetails cheque={selectedCheque} onEdit={() => { setShowDetailsModal(false); handleEdit(selectedCheque); }} onClose={() => setShowDetailsModal(false)} />}
      </ModalContainer>

    </div>
  );
}