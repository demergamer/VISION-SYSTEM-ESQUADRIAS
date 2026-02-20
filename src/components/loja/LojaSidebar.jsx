import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";

const CAT_LABELS = {
  Porta: 'Portas', Janela: 'Janelas', Servico: 'Serviços',
  Reembalar: 'Reembalar', Acessorio: 'Acessórios'
};
const CAT_ICONS = {
  Porta: '🚪', Janela: '🪟', Servico: '🔧', Reembalar: '📦', Acessorio: '⚙️'
};

function AccordionBlock({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-3 px-1 text-sm font-bold text-slate-700 hover:text-blue-700 transition-colors"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="pb-3 px-1">{children}</div>}
    </div>
  );
}

function FilterList({ items, selected, onSelect, labelFn, iconFn }) {
  return (
    <ul className="space-y-0.5">
      <li>
        <button
          onClick={() => onSelect('')}
          className={cn(
            "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-all",
            !selected ? "bg-blue-600 text-white font-semibold" : "text-slate-600 hover:bg-slate-100"
          )}
        >
          Todos
        </button>
      </li>
      {items.map(item => (
        <li key={item}>
          <button
            onClick={() => onSelect(item === selected ? '' : item)}
            className={cn(
              "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-all flex items-center gap-2",
              item === selected
                ? "bg-blue-50 text-blue-700 font-semibold"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {iconFn && <span>{iconFn(item)}</span>}
            {labelFn ? labelFn(item) : item}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function LojaSidebar({
  categorias, linhas,
  categoriaFiltro, linhaFiltro,
  precoMin, precoMax,
  onCategoria, onLinha,
  onPrecoMin, onPrecoMax
}) {
  const hasFilters = categoriaFiltro || linhaFiltro || precoMin || precoMax;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-24">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
          <span className="font-bold text-slate-700 text-sm">Filtros</span>
        </div>
        {hasFilters && (
          <button
            onClick={() => { onCategoria(''); onLinha(''); onPrecoMin(''); onPrecoMax(''); }}
            className="text-xs text-red-500 hover:text-red-700 font-semibold"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="px-3 py-1">
        {/* Categorias */}
        {categorias.length > 0 && (
          <AccordionBlock title="Categorias">
            <FilterList
              items={categorias}
              selected={categoriaFiltro}
              onSelect={onCategoria}
              labelFn={c => CAT_LABELS[c] || c}
              iconFn={c => CAT_ICONS[c] || '📁'}
            />
          </AccordionBlock>
        )}

        {/* Linhas */}
        {linhas.length > 0 && (
          <AccordionBlock title="Linhas">
            <FilterList
              items={linhas}
              selected={linhaFiltro}
              onSelect={onLinha}
            />
          </AccordionBlock>
        )}

        {/* Faixa de Preço */}
        <AccordionBlock title="Faixa de Preço" defaultOpen={false}>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Preço mínimo (R$)</label>
              <Input
                type="number"
                placeholder="0,00"
                value={precoMin}
                onChange={e => onPrecoMin(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Preço máximo (R$)</label>
              <Input
                type="number"
                placeholder="Sem limite"
                value={precoMax}
                onChange={e => onPrecoMax(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </AccordionBlock>
      </div>
    </div>
  );
}