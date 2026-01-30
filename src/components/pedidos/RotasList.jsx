import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Truck, CheckCircle2, Clock, AlertCircle, ChevronRight, User, Calendar, RefreshCw, Search, Split
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function RotasList({ rotas, onSelectRota, onAlterarPortador, onDividirRota, isLoading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [subTab, setSubTab] = useState('todos'); // todos, pendente, parcial, concluida

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  const safeFormatDate = (date) => { try { return date ? format(new Date(date), 'dd/MM/yyyy') : '-'; } catch { return '-'; } };

  // Lógica de Status (Recalculada no front para garantir)
  const getStatus = (rota) => {
    if (rota.status === 'concluida' || (rota.pedidos_confirmados === rota.total_pedidos && rota.total_pedidos > 0)) return 'concluida';
    if (rota.pedidos_confirmados > 0 && rota.pedidos_confirmados < rota.total_pedidos) return 'parcial';
    return 'pendente';
  };

  const filteredRotas = useMemo(() => {
    return rotas.filter(rota => {
      const matchesSearch = 
        rota.codigo_rota?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rota.motorista_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeFormatDate(rota.data_importacao).includes(searchTerm);
      
      const status = getStatus(rota);
      const matchesTab = subTab === 'todos' || status === subTab;

      return matchesSearch && matchesTab;
    }).sort((a, b) => new Date(b.created_date || b.data_importacao) - new Date(a.created_date || a.data_importacao));
  }, [rotas, searchTerm, subTab]);

  const getStatusConfig = (status) => {
    switch(status) {
        case 'concluida': return { label: 'Concluída', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', bgCard: 'border-l-4 border-l-emerald-500', icon: CheckCircle2, iconColor: 'text-emerald-600' };
        case 'parcial': return { label: 'Parcial', color: 'bg-amber-100 text-amber-700 border-amber-200', bgCard: 'border-l-4 border-l-amber-500', icon: Clock, iconColor: 'text-amber-600' };
        default: return { label: 'Pendente', color: 'bg-blue-100 text-blue-700 border-blue-200', bgCard: 'border-l-4 border-l-blue-500', icon: AlertCircle, iconColor: 'text-blue-600' };
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar rota..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white" />
          </div>
          
          <Tabs value={subTab} onValueChange={setSubTab} className="w-full md:w-auto">
            <TabsList className="bg-slate-200/50">
                <TabsTrigger value="todos">Todas</TabsTrigger>
                <TabsTrigger value="pendente">Pendentes</TabsTrigger>
                <TabsTrigger value="parcial">Parciais</TabsTrigger>
                <TabsTrigger value="concluida">Concluídas</TabsTrigger>
            </TabsList>
          </Tabs>
      </div>

      <div className="space-y-3">
        {filteredRotas.length > 0 ? filteredRotas.map((rota) => {
          const status = getStatus(rota);
          const config = getStatusConfig(status);
          const StatusIcon = config.icon;

          return (
            <Card key={rota.id} className={cn("p-4 hover:shadow-md transition-all group", config.bgCard)}>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Ícone e Nome */}
                <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => onSelectRota(rota)}>
                  <div className={cn("p-3 rounded-xl bg-slate-50", config.iconColor)}>
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-slate-800">{rota.codigo_rota}</h3>
                      <Badge variant="outline" className={config.color}><StatusIcon className="w-3 h-3 mr-1" />{config.label}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {safeFormatDate(rota.data_importacao)}</span>
                      {rota.motorista_nome && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {rota.motorista_nome}</span>}
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 justify-end">
                    {onDividirRota && status !== 'concluida' && (
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onDividirRota(rota); }} className="h-9 gap-2 text-slate-600" title="Dividir esta rota em duas">
                            <Split className="w-4 h-4" /> <span className="hidden xl:inline">Dividir</span>
                        </Button>
                    )}
                    {onAlterarPortador && (
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onAlterarPortador(rota); }} className="h-9 gap-2 text-slate-600" title="Trocar Motorista">
                            <RefreshCw className="w-4 h-4" /> <span className="hidden xl:inline">Portador</span>
                        </Button>
                    )}
                </div>

                {/* Totais */}
                <div className="text-right cursor-pointer min-w-[100px]" onClick={() => onSelectRota(rota)}>
                  <p className="text-xs text-slate-400 uppercase font-bold">Progresso</p>
                  <div className="flex items-baseline justify-end gap-1">
                      <span className={cn("text-lg font-bold", config.iconColor)}>{rota.pedidos_confirmados}</span>
                      <span className="text-slate-400 text-sm">/ {rota.total_pedidos}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-600">{formatCurrency(rota.valor_total)}</p>
                </div>
                
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 cursor-pointer" onClick={() => onSelectRota(rota)} />
              </div>
            </Card>
          );
        }) : (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p>Nenhuma rota encontrada neste filtro.</p>
            </div>
        )}
      </div>
    </div>
  );
}