import React, { useState, useMemo, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Search, Loader2, Factory, FileText, 
    UserCheck, Clock, ChevronLeft, ChevronRight
} from "lucide-react";

export default function Emproduçaotable({ data = [], isLoading, isPreview, lastSync }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20; // Mostra 20 pedidos por página para não travar

    // Reseta a página sempre que buscar algo novo
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // --- LÓGICA DE VISUALIZAÇÃO: AGRUPAMENTO E FILTROS ---
    const dadosAgrupados = useMemo(() => {
        let dadosFiltrados = data;
        
        // 1. Aplica o filtro de busca local
        if (searchTerm) {
            const termo = searchTerm.toLowerCase();
            dadosFiltrados = data.filter(item => 
                String(item.numero_pedido).toLowerCase().includes(termo) ||
                String(item.cliente_nome).toLowerCase().includes(termo) ||
                String(item.cliente_codigo).toLowerCase().includes(termo) ||
                String(item.produto_codigo).toLowerCase().includes(termo) ||
                String(item.descricao).toLowerCase().includes(termo)
            );
        }

        // 2. Agrupa por Pedido
        const grupos = {};
        dadosFiltrados.forEach(item => {
            if (!grupos[item.numero_pedido]) {
                grupos[item.numero_pedido] = {
                    numero_pedido: item.numero_pedido,
                    cliente_nome: item.cliente_nome,
                    cliente_codigo: item.cliente_codigo,
                    total_pecas: 0,
                    itens: []
                };
            }
            grupos[item.numero_pedido].itens.push(item);
            grupos[item.numero_pedido].total_pecas += (item.quantidade || 0);
        });

        // 3. Converte para array
        return Object.values(grupos);
    }, [data, searchTerm]);

    // LÓGICA DE PAGINAÇÃO
    const totalPages = Math.ceil(dadosAgrupados.length / itemsPerPage);
    const paginatedGrupos = dadosAgrupados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Resumo para os widgets do topo
    const stats = useMemo(() => {
        const totalPecas = data.reduce((sum, item) => sum + (item.quantidade || 0), 0);
        const pedidosUnicos = new Set(data.map(item => item.numero_pedido)).size;
        const clientesUnicos = new Set(data.map(item => item.cliente_codigo)).size;
        return { totalPecas, pedidosUnicos, clientesUnicos };
    }, [data]);

    if (isLoading) {
        return <div className="p-10 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" /> Carregando base...</div>;
    }

    if (data.length === 0) {
        return (
            <div className="p-16 text-center border border-slate-200 rounded-xl bg-white">
                <Factory className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-400">Fábrica Vazia</h3>
                <p className="text-slate-500">Faça o upload do relatório do Neo para alimentar o sistema.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* DASHBOARD RESUMO DA PRODUÇÃO */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><FileText className="w-6 h-6" /></div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{stats.pedidosUnicos}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pedidos</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><Factory className="w-6 h-6" /></div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{stats.totalPecas}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Peças na Fábrica</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><UserCheck className="w-6 h-6" /></div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{stats.clientesUnicos}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes Atendidos</p>
                    </div>
                </div>
            </div>

            <Card className="border-slate-200 overflow-hidden bg-white shadow-sm">
                <div className="p-4 bg-slate-50 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            Lista de Fabricação
                            {isPreview && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Prévia</Badge>}
                        </h3>
                        {!isPreview && lastSync && (
                            <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" /> Última Sincronização: {new Date(lastSync).toLocaleString('pt-BR')}
                            </span>
                        )}
                    </div>
                    
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder="Buscar por pedido, cliente ou peça..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="pl-9 h-9 bg-white" 
                        />
                    </div>
                </div>
                
                <div className="p-4 bg-slate-50/50 space-y-4">
                    {paginatedGrupos.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">Nenhum resultado encontrado para "{searchTerm}".</div>
                    ) : (
                        paginatedGrupos.map((grupo) => (
                            <div key={grupo.numero_pedido} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                {/* CABEÇALHO DO PEDIDO */}
                                <div className="bg-slate-100/50 p-3 px-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg font-mono text-sm shadow-sm">
                                            #{grupo.numero_pedido}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm md:text-base line-clamp-1">{grupo.cliente_nome}</h4>
                                            <p className="text-xs text-slate-500 font-mono">Cód: {grupo.cliente_codigo}</p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2">
                                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 text-sm font-bold">
                                            {grupo.total_pecas} {grupo.total_pecas === 1 ? 'Peça' : 'Peças'}
                                        </Badge>
                                    </div>
                                </div>
                                
                                {/* LISTA DE PEÇAS DESTE PEDIDO */}
                                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {grupo.itens.map((item, idx) => (
                                        <div key={idx} className="p-3 px-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="bg-slate-100 text-slate-500 text-[10px] font-mono font-bold px-2 py-1 rounded shrink-0 mt-0.5">
                                                    {item.produto_codigo}
                                                </div>
                                                <p className="text-sm text-slate-700 font-medium line-clamp-2">
                                                    {item.descricao}
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider mb-0.5">Qtde</span>
                                                <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{item.quantidade}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* CONTROLES DE PAGINAÇÃO */}
                {totalPages > 1 && (
                    <div className="p-4 border-t bg-white flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                            Mostrando {(currentPage - 1) * itemsPerPage + 1} até {Math.min(currentPage * itemsPerPage, dadosAgrupados.length)} de {dadosAgrupados.length} pedidos
                        </span>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                disabled={currentPage === totalPages}
                            >
                                Próxima <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}