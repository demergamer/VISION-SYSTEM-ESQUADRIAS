import React, { useState, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Store, SlidersHorizontal, Building2, User, ChevronDown, X } from "lucide-react";
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

function ClienteSelector({ clientes, clienteSelecionado, onSelectCliente, tabelaPreco, isRepresentanteOuAdmin }) {
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
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-600 font-medium hidden sm:inline">{clienteSelecionado?.nome || 'Você'}</span>
        {tabelaPreco && (
          <Badge className={cn("text-xs border-0", TABELA_COLORS[tabelaPreco])}>
            {TABELA_LABELS[tabelaPreco]}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2">
      <Building2 className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 text-sm font-normal min-w-40 justify-between gap-2",
            !clienteSelecionado && "border-dashed border-orange-300 bg-orange-50 text-orange-600"
          )}
          onClick={() => setOpen(v => !v)}
        >
          <span className="truncate max-w-36">
            {clienteSelecionado ? clienteSelecionado.nome : '⚠ Selecione o cliente'}
          </span>
          {clienteSelecionado
            ? <X className="w-3.5 h-3.5 shrink-0" onClick={e => { e.stopPropagation(); onSelectCliente(null); setSearch(''); }} />
            : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
        </Button>

        {open && (
          <div className="absolute top-full right-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar cliente..." className="h-8 pl-8 text-sm" />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-5">Nenhum cliente encontrado</p>
              ) : filtered.map(c => (
                <button key={c.id}
                  className="w-full text-left px-3 py-2.5 hover:bg-blue-50 text-sm flex items-center justify-between gap-2 border-b border-slate-50 last:border-0"
                  onClick={() => { onSelectCliente(c); setOpen(false); setSearch(''); }}>
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
        <Badge className={cn("text-xs border-0 shrink-0 hidden sm:flex", TABELA_COLORS[tabelaPreco])}>
          {TABELA_LABELS[tabelaPreco]}
        </Badge>
      )}
    </div>
  );
}

export default function LojaHeader({
  searchTerm, onSearch,
  clientes, clienteSelecionado, onSelectCliente, tabelaPreco, isRepresentanteOuAdmin,
  totalItens, onOpenCarrinho, onToggleSidebar
}) {
  return (
    <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">

        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-extrabold text-slate-800 leading-tight text-base">Loja</h1>
            <p className="text-[10px] text-slate-400 leading-none">Catálogo B2B/B2C</p>
          </div>
        </div>

        {/* Busca central */}
        <div className="relative flex-1 max-w-xl mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome ou SKU..."
            value={searchTerm}
            onChange={e => onSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-sm"
          />
          {searchTerm && (
            <button onClick={() => onSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Direita: cliente + carrinho + filtros mobile */}
        <div className="flex items-center gap-2 shrink-0">
          <ClienteSelector
            clientes={clientes}
            clienteSelecionado={clienteSelecionado}
            onSelectCliente={onSelectCliente}
            tabelaPreco={tabelaPreco}
            isRepresentanteOuAdmin={isRepresentanteOuAdmin}
          />

          {/* Filtros mobile */}
          <Button variant="outline" size="icon" className="lg:hidden h-9 w-9 shrink-0" onClick={onToggleSidebar}>
            <SlidersHorizontal className="w-4 h-4" />
          </Button>

          {/* Carrinho */}
          <Button
            variant="outline"
            size="sm"
            className="relative h-9 gap-1.5 shrink-0"
            onClick={onOpenCarrinho}
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Orçamento</span>
            {totalItens > 0 && (
              <span className="absolute -top-2 -right-2 h-5 min-w-5 px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalItens}
              </span>
            )}
          </Button>
        </div>

      </div>
    </header>
  );
}