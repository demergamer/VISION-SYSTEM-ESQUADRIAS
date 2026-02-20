import React from 'react';
import { cn } from "@/lib/utils";

const CAT_LABELS = {
  Porta: 'Portas', Janela: 'Janelas', Servico: 'Serviços',
  Reembalar: 'Reembalar', Acessorio: 'Acessórios'
};

const CAT_ICONS = {
  Porta: '🚪', Janela: '🪟', Servico: '🔧', Reembalar: '📦', Acessorio: '⚙️'
};

function FilterGroup({ title, items, selected, onSelect, labelFn, iconFn }) {
  return (
    <div>
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">{title}</h3>
      <ul className="space-y-0.5">
        <li>
          <button
            onClick={() => onSelect('')}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all",
              !selected
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
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
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2",
                item === selected
                  ? "bg-blue-50 text-blue-700 font-semibold border border-blue-100"
                  : "text-slate-600 hover:bg-slate-100 font-medium"
              )}
            >
              {iconFn && <span className="text-base leading-none">{iconFn(item)}</span>}
              <span>{labelFn ? labelFn(item) : item}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LojaSidebar({ categorias, linhas, categoriaFiltro, linhaFiltro, onCategoria, onLinha }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-6 sticky top-24">
      {categorias.length > 0 && (
        <FilterGroup
          title="Categorias"
          items={categorias}
          selected={categoriaFiltro}
          onSelect={onCategoria}
          labelFn={c => CAT_LABELS[c] || c}
          iconFn={c => CAT_ICONS[c] || '📁'}
        />
      )}

      {linhas.length > 0 && (
        <>
          <div className="h-px bg-slate-100" />
          <FilterGroup
            title="Linhas"
            items={linhas}
            selected={linhaFiltro}
            onSelect={onLinha}
          />
        </>
      )}
    </div>
  );
}