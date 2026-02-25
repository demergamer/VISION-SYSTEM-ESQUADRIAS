/**
 * Versão somente leitura do RotasList para o Portal do Motorista.
 * Sem botões de edição (Dividir, Portador) — apenas consulta.
 */
import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, CheckCircle2, Clock, AlertCircle, ChevronRight, User, Calendar, Search, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const safeDate = (d) => { try { return d ? format(new Date(d), 'dd/MM/yyyy') : '-'; } catch { return '-'; } };

const getStatus = (rota) => {
  if (rota.status === 'concluida' || (rota.pedidos_confirmados === rota.total_pedidos && rota.total_pedidos > 0)) return 'concluida';
  if (rota.pedidos_confirmados > 0 && rota.pedidos_confirmados < rota.total_pedidos) return 'parcial';
  return 'pendente';
};

const statusConfig = {
  concluida: { label: 'Concluída', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', border: 'border-l-4 border-l-emerald-500', icon: CheckCircle2, iconColor: 'text-emerald-600' },
  parcial:   { label: 'Parcial',   color: 'bg-amber-100 text-amber-700 border-amber-200',   border: 'border-l-4 border-l-amber-500',   icon: Clock,       iconColor: 'text-amber-600' },
  pendente:  { label: 'Pendente',  color: 'bg-blue-100 text-blue-700 border-blue-200',     border: 'border-l-4 border-l-blue-500',    icon: AlertCircle, iconColor: 'text-blue-600' },
};

export default function RotasListReadOnly({ rotas = [], onSelectRota, isLoading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [subTab, setSubTab] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filtered = useMemo(() => {
    return rotas.filter(r => {
      const match = r.codigo_rota?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.motorista_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeDate(r.data_importacao).includes(searchTerm);
      const status = getStatus(r);
      return match && (subTab === 'todos' || status === subTab);
    }).sort((a, b) => new Date(b.created_date || b.data_importacao || 0) - new Date(a.created_date || a.data_importacao || 0));
  }, [rotas, searchTerm, subTab]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar rota..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="pl-10 bg-white" />
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Tabs value={subTab} onValueChange={v => { setSubTab(v); setCurrentPage(1); }}>
            <TabsList className="bg-slate-200/50">
              <TabsTrigger value="todos">Todas ({rotas.length})</TabsTrigger>
              <TabsTrigger value="pendente">Pendentes</TabsTrigger>
              <TabsTrigger value="parcial">Parciais</TabsTrigger>
              <TabsTrigger value="concluida">Concluídas</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={String(itemsPerPage)} onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
            <SelectTrigger className="h-9 w-24 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="30">30</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {paginated.length > 0 ? paginated.map(rota => {
          const status = getStatus(rota);
          const cfg = statusConfig[status];
          const Icon = cfg.icon;
          return (
            <Card key={rota.id} className={cn("p-4 hover:shadow-md transition-all group cursor-pointer", cfg.border)} onClick={() => onSelectRota(rota)}>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className={cn("p-3 rounded-xl bg-slate-50", cfg.iconColor)}>
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-slate-800">{rota.codigo_rota}</h3>
                      <Badge variant="outline" className={cfg.color}><Icon className="w-3 h-3 mr-1" />{cfg.label}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {safeDate(rota.data_importacao)}</span>
                      {rota.motorista_nome && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {rota.motorista_nome}</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right min-w-[100px]">
                  <p className="text-xs text-slate-400 uppercase font-bold">Progresso</p>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className={cn("text-lg font-bold", cfg.iconColor)}>{rota.pedidos_confirmados}</span>
                    <span className="text-slate-400 text-sm">/ {rota.total_pedidos}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-600">{formatCurrency(rota.valor_total)}</p>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500" />
              </div>
            </Card>
          );
        }) : (
          <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Nenhuma rota encontrada.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length)}–{Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).map((p, idx, arr) => (
              <React.Fragment key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-2 text-slate-400 self-center">…</span>}
                <Button variant={p === currentPage ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(p)} className={p === currentPage ? "bg-blue-600 text-white" : ""}>{p}</Button>
              </React.Fragment>
            ))}
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}