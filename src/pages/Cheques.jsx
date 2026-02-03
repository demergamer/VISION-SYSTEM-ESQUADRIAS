import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutGrid, List, Filter, Plus, Search, 
  ArrowUpRight, AlertCircle, CheckCircle2, Clock,
  MoreHorizontal, Wallet, User, ArrowRightLeft, MapPin, Building2
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

import ModalContainer from "@/components/modals/ModalContainer";
import ChequeForm from "@/components/cheques/ChequeForm";
import ChequeDetails from "@/components/cheques/ChequeDetails";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function Cheques() {
  const [viewMode, setViewMode] = useState('table');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // NAVEGAÇÃO
  const [mainTab, setMainTab] = useState('a_compensar');
  const [subTab, setSubTab] = useState('em_maos'); // Default sub-tab

  const [filters, setFilters] = useState({ dataInicio: '', dataFim: '', banco: 'todos', valorMin: '', valorMax: '' });
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCheque, setSelectedCheque] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const { data: cheques = [], refetch } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });

  // MAPA DE CLIENTES
  const mapClientes = useMemo(() => {
      const map = {};
      clientes.forEach(c => map[c.codigo] = c);
      return map;
  }, [clientes]);

  const dadosProcessados = useMemo(() => {
    let lista = cheques;

    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      lista = lista.filter(c => 
        c.numero_cheque?.toLowerCase().includes(termo) ||
        c.emitente?.toLowerCase().includes(termo) ||
        c.cliente_nome?.toLowerCase().includes(termo) ||
        c.valor?.toString().includes(termo)
      );
    }

    if (filters.banco !== 'todos') lista = lista.filter(c => c.banco === filters.banco);
    if (filters.valorMin) lista = lista.filter(c => c.valor >= parseFloat(filters.valorMin));
    if (filters.valorMax) lista = lista.filter(c => c.valor <= parseFloat(filters.valorMax));
    if (filters.dataInicio) lista = lista.filter(c => new Date(c.data_vencimento) >= new Date(filters.dataInicio));
    if (filters.dataFim) lista = lista.filter(c => new Date(c.data_vencimento) <= new Date(filters.dataFim));

    // --- LÓGICA DE SEPARAÇÃO ---
    
    // 1. A COMPENSAR
    const emMaos = lista.filter(c => c.status === 'normal');
    const repassadosACompensar = lista.filter(c => c.status === 'repassado' && isFuture(parseISO(c.data_vencimento)));

    // 2. DEVOLVIDOS
    const devolvidosGeral = lista.filter(c => c.status === 'devolvido');
    const devolvidosAqui = devolvidosGeral.filter(c => !c.fornecedor_repassado_nome); 
    const devolvidosNaoAqui = devolvidosGeral.filter(c => !!c.fornecedor_repassado_nome); 

    // 3. COMPENSADOS (BAIXADOS)
    const depositados = lista.filter(c => c.status === 'compensado' || c.status === 'pago');
    const repassadosBaixados = lista.filter(c => c.status === 'repassado' && isPast(parseISO(c.data_vencimento)));

    // SELEÇÃO DA LISTA FINAL (BASEADA NAS ABAS E SUB-ABAS)
    let listaFinal = [];
    
    if (mainTab === 'a_compensar') {
        if (subTab === 'em_maos') listaFinal = emMaos;
        else if (subTab === 'repassados') listaFinal = repassadosACompensar;
        else listaFinal = [...emMaos, ...repassadosACompensar]; // Fallback
    } 
    else if (mainTab === 'devolvidos') {
        if (subTab === 'aqui') listaFinal = devolvidosAqui;
        else if (subTab === 'nao_aqui') listaFinal = devolvidosNaoAqui;
        else listaFinal = devolvidosGeral;
    } 
    else if (mainTab === 'compensados') {
        if (subTab === 'depositados') listaFinal = depositados;
        else if (subTab === 'repassados') listaFinal = repassadosBaixados;
        else listaFinal = [...depositados, ...repassadosBaixados];
    }

    return {
      listaFinal,
      totais: {
        emMaos: emMaos.reduce((acc, c) => acc + c.valor, 0),
        repassadosFuturo: repassadosACompensar.reduce((acc, c) => acc + c.valor, 0),
        devolvidosGeral: devolvidosGeral.reduce((acc, c) => acc + c.valor, 0),
        devolvidosAqui: devolvidosAqui.reduce((acc, c) => acc + c.valor, 0),
        devolvidosNaoAqui: devolvidosNaoAqui.reduce((acc, c) => acc + c.valor, 0),
        depositados: depositados.reduce((acc, c) => acc + c.valor, 0),
        repassadosBaixados: repassadosBaixados.reduce((acc, c) => acc + c.valor, 0)
      },
      contagem: {
        emMaos: emMaos.length,
        repassadosFuturo: repassadosACompensar.length,
        devolvidosGeral: devolvidosGeral.length,
        devolvidosAqui: devolvidosAqui.length,
        devolvidosNaoAqui: devolvidosNaoAqui.length,
        depositados: depositados.length,
        repassadosBaixados: repassadosBaixados.length
      }
    };
  }, [cheques, searchTerm, filters, mainTab, subTab]);

  // Função para resetar sub-aba ao trocar a aba principal
  const handleMainTabChange = (val) => {
      setMainTab(val);
      if (val === 'a_compensar') setSubTab('em_maos');
      else if (val === 'devolvidos') setSubTab('todos');
      else if (val === 'compensados') setSubTab('depositados');
  };

  const handleEdit = (cheque) => { setSelectedCheque(cheque); setShowFormModal(true); };
  const handleView = (cheque) => { setSelectedCheque(cheque); setShowDetailsModal(true); };
  const handleNew = () => { setSelectedCheque(null); setShowFormModal(true); };
  const handleSelectAll = (checked) => { if (checked) setSelectedIds(dadosProcessados.listaFinal.map(c => c.id)); else setSelectedIds([]); };
  const handleSelectOne = (id) => { setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10 w-full">
      {/* 1. HEADER FULL WIDTH */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 w-full">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Wallet className="w-6 h-6 text-indigo-600" /> Gestão de Cheques
            </h1>
            <p className="text-slate-500 text-sm">Controle de custódia, repasses e devoluções</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* KPI Cards Rápidos */}
            <div className="flex gap-3 overflow-x-auto pb-1 sm:pb-0">
                <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg min-w-[150px]">
                    <p className="text-[10px] uppercase font-bold text-blue-600 flex items-center gap-1">
                        <Clock className="w-3 h-3"/> Em Mãos (A Compensar)
                    </p>
                    <p className="text-lg font-bold text-blue-900">{formatCurrency(dadosProcessados.totais.emMaos)}</p>
                </div>
                
                <div className="bg-purple-50 border border-purple-100 px-4 py-2 rounded-lg min-w-[150px]">
                    <p className="text-[10px] uppercase font-bold text-purple-600 flex items-center gap-1">
                        <ArrowRightLeft className="w-3 h-3"/> Repassados (Passivo)
                    </p>
                    <p className="text-lg font-bold text-purple-900">{formatCurrency(dadosProcessados.totais.repassadosFuturo)}</p>
                </div>

                <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-lg min-w-[150px]">
                    <p className="text-[10px] uppercase font-bold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3"/> Total Devolvido
                    </p>
                    <p className="text-lg font-bold text-red-900">{formatCurrency(dadosProcessados.totais.devolvidosGeral)}</p>
                </div>
            </div>

            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block" />

            <div className="flex gap-2">
                <Button variant="outline" className="gap-2" onClick={() => {}} disabled={selectedIds.length === 0}>
                    <MoreHorizontal className="w-4 h-4" /> Ações
                </Button>
                <Button onClick={handleNew} className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200">
                    <Plus className="w-4 h-4" /> Novo
                </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 w-full">
        
        {/* 2. BARRA DE CONTROLE PRINCIPAL */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            
            <Tabs value={mainTab} onValueChange={handleMainTabChange} className="w-full lg:w-auto">
                <TabsList className="bg-slate-100 p-1 h-auto flex-wrap">
                    <TabsTrigger value="a_compensar" className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                        <Clock className="w-4 h-4" /> A Compensar <Badge className="ml-2 bg-blue-200 text-blue-800 hover:bg-blue-200">{dadosProcessados.contagem.emMaos + dadosProcessados.contagem.repassadosFuturo}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="devolvidos" className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-sm">
                        <AlertCircle className="w-4 h-4" /> Devolvidos <Badge className="ml-2 bg-red-200 text-red-800 hover:bg-red-200">{dadosProcessados.contagem.devolvidosGeral}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="compensados" className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                        <CheckCircle2 className="w-4 h-4" /> Baixados <Badge className="ml-2 bg-emerald-200 text-emerald-800 hover:bg-emerald-200">{dadosProcessados.contagem.depositados + dadosProcessados.contagem.repassadosBaixados}</Badge>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"/>
                </div>
                <Button variant={showFilters ? "secondary" : "outline"} size="icon" onClick={() => setShowFilters(!showFilters)} className={cn("shrink-0", showFilters && "bg-slate-200")}><Filter className="w-4 h-4" /></Button>
                <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setViewMode('table')} className={cn("h-8 w-8 rounded-md", viewMode === 'table' ? "bg-white shadow-sm" : "text-slate-500")}><List className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setViewMode('grid')} className={cn("h-8 w-8 rounded-md", viewMode === 'grid' ? "bg-white shadow-sm" : "text-slate-500")}><LayoutGrid className="w-4 h-4" /></Button>
                </div>
            </div>
        </div>

        {/* 3. PAINEL DE FILTROS */}
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
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <Button variant="ghost" onClick={() => setFilters({ dataInicio: '', dataFim: '', banco: 'todos', valorMin: '', valorMax: '' })} className="w-full text-red-500 hover:text-red-700 hover:bg-red-50">Limpar</Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>

        {/* 4. SUB-ABAS (DINÂMICAS POR MAIN TAB) */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 animate-in fade-in slide-in-from-left-2">
            
            {/* SUB-ABAS: A COMPENSAR */}
            {mainTab === 'a_compensar' && (
                <>
                    <Button variant={subTab === 'em_maos' ? 'default' : 'outline'} onClick={() => setSubTab('em_maos')} className={cn("rounded-full h-8 text-xs", subTab === 'em_maos' && "bg-blue-600 hover:bg-blue-700")}>
                        🏢 Em Carteira (Mãos) ({formatCurrency(dadosProcessados.totais.emMaos)})
                    </Button>
                    <Button variant={subTab === 'repassados' ? 'default' : 'outline'} onClick={() => setSubTab('repassados')} className={cn("rounded-full h-8 text-xs", subTab === 'repassados' && "bg-purple-600 hover:bg-purple-700")}>
                        🤝 Repassados (Passivo Futuro) ({formatCurrency(dadosProcessados.totais.repassadosFuturo)})
                    </Button>
                </>
            )}

            {/* SUB-ABAS: DEVOLVIDOS */}
            {mainTab === 'devolvidos' && (
                <>
                    <Button variant={subTab === 'todos' ? 'default' : 'outline'} onClick={() => setSubTab('todos')} className={cn("rounded-full h-8 text-xs", subTab === 'todos' && "bg-slate-800")}>
                        Todos ({formatCurrency(dadosProcessados.totais.devolvidosGeral)})
                    </Button>
                    <Button variant={subTab === 'aqui' ? 'default' : 'outline'} onClick={() => setSubTab('aqui')} className={cn("rounded-full h-8 text-xs", subTab === 'aqui' && "bg-red-600 hover:bg-red-700")}>
                        🏦 Na Empresa (Está Aqui) ({formatCurrency(dadosProcessados.totais.devolvidosAqui)})
                    </Button>
                    <Button variant={subTab === 'nao_aqui' ? 'default' : 'outline'} onClick={() => setSubTab('nao_aqui')} className={cn("rounded-full h-8 text-xs", subTab === 'nao_aqui' && "bg-orange-500 hover:bg-orange-600 text-white")}>
                        🤝 Com Terceiros (Não está Aqui) ({formatCurrency(dadosProcessados.totais.devolvidosNaoAqui)})
                    </Button>
                </>
            )}

            {/* SUB-ABAS: BAIXADOS */}
            {mainTab === 'compensados' && (
                <>
                    <Button variant={subTab === 'depositados' ? 'default' : 'outline'} onClick={() => setSubTab('depositados')} className={cn("rounded-full h-8 text-xs", subTab === 'depositados' && "bg-emerald-600 hover:bg-emerald-700")}>
                        ✅ Depositados em Conta ({formatCurrency(dadosProcessados.totais.depositados)})
                    </Button>
                    <Button variant={subTab === 'repassados' ? 'default' : 'outline'} onClick={() => setSubTab('repassados')} className={cn("rounded-full h-8 text-xs", subTab === 'repassados' && "bg-indigo-600 hover:bg-indigo-700")}>
                        ✅ Baixados por Repasse ({formatCurrency(dadosProcessados.totais.repassadosBaixados)})
                    </Button>
                </>
            )}
        </div>

        {/* 5. TABELA PRINCIPAL */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="w-[50px]"><Checkbox checked={selectedIds.length > 0} onCheckedChange={handleSelectAll} /></TableHead>
                        <TableHead>Cheque</TableHead>
                        <TableHead>Cliente / Representante</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center">Localização / Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {dadosProcessados.listaFinal.map(cheque => {
                        const cliente = mapClientes[cheque.cliente_codigo];
                        const isVencido = cheque.status === 'normal' && isPast(parseISO(cheque.data_vencimento));
                        
                        return (
                            <TableRow key={cheque.id} className="group hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => handleView(cheque)}>
                                <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedIds.includes(cheque.id)} onCheckedChange={() => handleSelectOne(cheque.id)} /></TableCell>
                                <TableCell>
                                    <div className="font-mono font-bold text-slate-700">#{cheque.numero_cheque}</div>
                                    <div className="text-xs text-slate-500 uppercase">{cheque.banco}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium text-slate-800">{cheque.cliente_nome}</div>
                                    {cliente?.representante_nome && (
                                        <div className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mt-0.5">
                                            <User className="w-3 h-3" /> {cliente.representante_nome.split(' ')[0]}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className={cn("text-sm", isVencido ? "text-red-600 font-bold" : "text-slate-600")}>
                                        {format(new Date(cheque.data_vencimento), 'dd/MM/yyyy')}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-700">{formatCurrency(cheque.valor)}</TableCell>
                                <TableCell className="text-center">
                                    {cheque.status === 'repassado' ? (
                                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">Repassado</Badge>
                                    ) : cheque.status === 'devolvido' ? (
                                        cheque.fornecedor_repassado_nome ? (
                                            <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100 flex w-fit mx-auto gap-1">
                                                <MapPin className="w-3 h-3"/> Com {cheque.fornecedor_repassado_nome.split(' ')[0]}
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 flex w-fit mx-auto gap-1">
                                                <Building2 className="w-3 h-3"/> Na Empresa/Banco
                                            </Badge>
                                        )
                                    ) : cheque.status === 'compensado' ? (
                                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Compensado</Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Em Carteira</Badge>
                                    )}
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
      </div>

      {/* MODAIS */}
      <ModalContainer open={showFormModal} onClose={() => setShowFormModal(false)} title={selectedCheque ? "Editar Cheque" : "Novo Cheque"}>
        <ChequeForm cheque={selectedCheque} clientes={clientes} onSave={() => { setShowFormModal(false); refetch(); }} onCancel={() => setShowFormModal(false)} />
      </ModalContainer>

      <ModalContainer open={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Detalhes do Cheque">
        {selectedCheque && <ChequeDetails cheque={selectedCheque} clientes={clientes} onEdit={() => { setShowDetailsModal(false); handleEdit(selectedCheque); }} onClose={() => setShowDetailsModal(false)} />}
      </ModalContainer>

    </div>
  );
}