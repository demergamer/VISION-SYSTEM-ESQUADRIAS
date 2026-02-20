import React, { useState, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Building2, User, ChevronDown, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import UserMenu from "@/components/loja/UserMenu";

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
        <User className="w-4 h-4 text-blue-200" />
        <span className="text-sm text-white font-medium hidden sm:inline">{clienteSelecionado?.nome || 'Você'}</span>
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
      <Building2 className="w-4 h-4 text-blue-200 shrink-0 hidden md:block" />
      <div className="relative">
        <Button
          size="sm"
          className={cn(
            "h-9 text-sm font-normal min-w-44 justify-between gap-2 border",
            !clienteSelecionado
              ? "bg-yellow-400 hover:bg-yellow-300 text-yellow-900 border-yellow-500 font-semibold"
              : "bg-white hover:bg-slate-100 text-slate-800 border-slate-200"
          )}
          onClick={() => setOpen(v => !v)}
        >
          <span className="truncate max-w-40">
            {clienteSelecionado ? clienteSelecionado.nome : '⚠ Selecione o cliente'}
          </span>
          {clienteSelecionado
            ? <X className="w-3.5 h-3.5 shrink-0" onClick={e => { e.stopPropagation(); onSelectCliente(null); setSearch(''); }} />
            : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
        </Button>

        {open && (
          <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-[60] overflow-hidden">
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar cliente..." className="h-8 pl-8 text-sm" />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-5">Nenhum cliente encontrado</p>
              ) : filtered.map(c => (
                <button key={c.id}
                  className="w-full text-left px-3 py-2.5 hover:bg-blue-50 text-sm flex items-center justify-between gap-2 border-b border-slate-50 last:border-0"
                  onClick={() => { onSelectCliente(c); setOpen(false); setSearch(''); }}>
                  <div>
                    <p className="font-semibold text-slate-700">{c.nome}</p>
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
        <Badge className={cn("text-xs border-0 shrink-0 hidden md:flex", TABELA_COLORS[tabelaPreco])}>
          {TABELA_LABELS[tabelaPreco]}
        </Badge>
      )}
    </div>
  );
}

export default function LojaHeader({
  searchTerm, onSearch,
  clientes, clienteSelecionado, onSelectCliente, tabelaPreco, isRepresentanteOuAdmin,
  totalItens, onOpenCarrinho, onToggleSidebar,
  user, corPrimaria
}) {
  return (
    <header className="bg-blue-700 sticky top-0 z-50 shadow-lg">
      {/* FAIXA SUPERIOR */}
      <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center gap-4">

        {/* Logo J&C */}
        <div className="flex items-center shrink-0">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/936ba5dbe_logo_JCEsquadrias.png"
            alt="J&C Esquadrias"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Busca gigante */}
        <div className="flex-1 relative mx-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Buscar produtos, linhas e medidas..."
            value={searchTerm}
            onChange={e => onSearch(e.target.value)}
            className="pl-12 h-11 rounded-xl border-0 bg-white text-slate-800 shadow-md text-sm focus-visible:ring-yellow-400 focus-visible:ring-2"
          />
          {searchTerm && (
            <button onClick={() => onSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Direita */}
        <div className="flex items-center gap-2 shrink-0">
          <ClienteSelector
            clientes={clientes}
            clienteSelecionado={clienteSelecionado}
            onSelectCliente={onSelectCliente}
            tabelaPreco={tabelaPreco}
            isRepresentanteOuAdmin={isRepresentanteOuAdmin}
          />

          {/* Filtros mobile */}
          <Button variant="ghost" size="icon" className="lg:hidden h-10 w-10 text-white hover:bg-blue-600" onClick={onToggleSidebar}>
            <SlidersHorizontal className="w-5 h-5" />
          </Button>

          {/* Carrinho */}
          <button
            onClick={onOpenCarrinho}
            className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl hover:bg-blue-600 transition-colors group"
          >
            <div className="relative">
              <ShoppingCart className="w-6 h-6 text-white" />
              {totalItens > 0 && (
                <span className="absolute -top-2 -right-2.5 h-5 min-w-5 px-1 bg-yellow-400 text-yellow-900 text-[10px] font-extrabold rounded-full flex items-center justify-center shadow">
                  {totalItens}
                </span>
              )}
            </div>
            <span className="text-[10px] text-blue-200 font-medium hidden sm:block">Orçamento</span>
          </button>
        </div>
      </div>
    </header>
  );
}