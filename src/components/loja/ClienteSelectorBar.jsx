import React, { useState, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Search, ChevronDown, X, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABELA_LABELS = {
  preco_consumidor: 'Consumidor',
  preco_revenda: 'Revenda',
  preco_construtora: 'Construtora'
};

const TABELA_COLORS = {
  preco_consumidor: 'bg-blue-100 text-blue-700',
  preco_revenda: 'bg-emerald-100 text-emerald-700',
  preco_construtora: 'bg-purple-100 text-purple-700'
};

export default function ClienteSelectorBar({ clientes, clienteSelecionado, onSelect, tabelaPreco, isRepresentanteOuAdmin }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() =>
    clientes.filter(c => {
      const q = search.toLowerCase();
      return c.nome?.toLowerCase().includes(q) || c.codigo?.toLowerCase().includes(q);
    }).slice(0, 20),
    [clientes, search]
  );

  if (!isRepresentanteOuAdmin) {
    return (
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-100">
        <User className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-600 font-medium">{clienteSelecionado?.nome || 'Você'}</span>
        {tabelaPreco && (
          <Badge className={cn("text-xs border-0", TABELA_COLORS[tabelaPreco])}>
            Tabela {TABELA_LABELS[tabelaPreco]}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-slate-100 px-5 py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-slate-500 shrink-0">
          <Building2 className="w-4 h-4" />
          <span className="font-medium">Cliente:</span>
        </div>

        <div className="relative flex-1 min-w-56 max-w-sm">
          <Button
            variant="outline"
            className={cn("w-full justify-between h-9 text-sm font-normal", !clienteSelecionado && "text-slate-400 border-dashed border-orange-300 bg-orange-50")}
            onClick={() => setOpen(!open)}
          >
            <span className="truncate">{clienteSelecionado ? clienteSelecionado.nome : 'Selecione o cliente...'}</span>
            {clienteSelecionado ? <X className="w-4 h-4 shrink-0" onClick={(e) => { e.stopPropagation(); onSelect(null); setSearch(''); }} /> : <ChevronDown className="w-4 h-4 shrink-0" />}
          </Button>

          {open && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-4">Nenhum cliente encontrado</p>
                ) : filtered.map(c => (
                  <button key={c.id} className="w-full text-left px-3 py-2.5 hover:bg-blue-50 text-sm flex items-center justify-between gap-2 border-b border-slate-50 last:border-0"
                    onClick={() => { onSelect(c); setOpen(false); setSearch(''); }}>
                    <div>
                      <p className="font-medium text-slate-700">{c.nome}</p>
                      {c.codigo && <p className="text-xs text-slate-400">#{c.codigo}</p>}
                    </div>
                    {c.tem_st && <Badge variant="outline" className="text-[10px]">ST</Badge>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {clienteSelecionado && tabelaPreco && (
          <Badge className={cn("text-xs border-0 shrink-0", TABELA_COLORS[tabelaPreco])}>
            Tabela {TABELA_LABELS[tabelaPreco]}
          </Badge>
        )}

        {!clienteSelecionado && (
          <span className="text-xs text-orange-500 font-medium">⚠ Selecione o cliente para ver os preços</span>
        )}
      </div>
    </div>
  );
}