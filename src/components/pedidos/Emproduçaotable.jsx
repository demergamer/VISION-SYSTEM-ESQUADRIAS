import React, { useState, useMemo, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Factory, FileText, UserCheck, Clock, ChevronLeft, ChevronRight } from "lucide-react";

export default function Emproduçaotable({ data = [], isLoading, isPreview, lastSync }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    useEffect(() => { setCurrentPage(1); }, [searchTerm]);

    const pedidosFiltrados = useMemo(() => {
        if (!searchTerm) return data;
        const termo = searchTerm.toLowerCase();
        return data.filter(p =>
            String(p.numero_pedido).toLowerCase().includes(termo) ||
            String(p.cliente_nome).toLowerCase().includes(termo) ||
            String(p.cliente_codigo).toLowerCase().includes(termo)
        );
    }, [data, searchTerm]);

    const totalPages = Math.ceil(pedidosFiltrados.length / itemsPerPage);
    const paginatedPedidos = pedidosFiltrados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const stats = useMemo(() => {
        const totalPecas = data.reduce((sum, p) => {
            const itens = p.itens_pedido || [];
            return sum + itens.reduce((acc, item) => acc + (item.quantidade || 0), 0);
        }, 0);
        const clientesUnicos = new Set(data.map(p => p.cliente_codigo).filter(Boolean)).size;
        return { totalPecas, pedidosCount: data.length, clientesUnicos };
    }, [data]);

    if (isLoading) {
        return (
            <div className="p-10 flex flex-col items-center justify-center text-slate-500 bg-white rounded-xl border border-slate-200">
                <Loader2 className="w-10 h-10 animate-spin mb-3 text-blue-500" />
                <p className="font-medium">Carregando base...</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="p-16 text-center border border-slate-200 rounded-xl bg-white shadow-sm">
                <Factory className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-600 mb-1">A Fábrica está Vazia</h3>
                <p className="text-slate-500">Faça o upload do relatório do Neo para alimentar o sistema.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><FileText className="w-6 h-6" /></div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{stats.pedidosCount}</p>
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
                            placeholder="Buscar por pedido ou cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-9 bg-white"
                        />
                    </div>
                </div>

                <div className="p-4 bg-slate-50/50 space-y-4">
                    {paginatedPedidos.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">Nenhum resultado para "{searchTerm}".</div>
                    ) : (
                        paginatedPedidos.map((pedido) => {
                            const itens = pedido.itens_pedido || [];
                            const totalPecas = itens.reduce((acc, item) => acc + (item.quantidade || 0), 0);
                            return (
                                <div key={pedido.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="bg-slate-100/50 p-3 px-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg font-mono text-sm shadow-sm">
                                                #{pedido.numero_pedido}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm md:text-base line-clamp-1">{pedido.cliente_nome}</h4>
                                                <p className="text-xs text-slate-500 font-mono">Cód: {pedido.cliente_codigo}</p>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-2">
                                            {itens.length === 0 ? (
                                                <Badge className="bg-slate-100 text-slate-500 border-slate-200 px-3 py-1 text-sm">
                                                    Sem itens
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 text-sm font-bold">
                                                    {totalPecas} {totalPecas === 1 ? 'Peça' : 'Peças'}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {itens.length > 0 && (
                                        <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {itens.map((item, idx) => (
                                                <div key={idx} className="p-3 px-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        {item.codigo_peca && (
                                                            <div className="bg-slate-100 text-slate-500 text-[10px] font-mono font-bold px-2 py-1 rounded shrink-0 mt-0.5">
                                                                {item.codigo_peca}
                                                            </div>
                                                        )}
                                                        <p className="text-sm text-slate-700 font-medium line-clamp-2">
                                                            {item.descricao_peca || item.descricao || '-'}
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider mb-0.5">Qtde</span>
                                                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{item.quantidade}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="p-4 border-t bg-white flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                            Mostrando {(currentPage - 1) * itemsPerPage + 1} até {Math.min(currentPage * itemsPerPage, pedidosFiltrados.length)} de {pedidosFiltrados.length} pedidos
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                Próxima <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}