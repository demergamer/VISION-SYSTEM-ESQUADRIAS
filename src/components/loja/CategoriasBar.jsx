import React from 'react';
import { cn } from "@/lib/utils";
import { LayoutGrid } from "lucide-react";

const CAT_LABELS = {
  Porta: 'Portas', Janela: 'Janelas', Servico: 'Serviços',
  Reembalar: 'Reembalar', Acessorio: 'Acessórios'
};

const CAT_ICONS = {
  Porta: '🚪', Janela: '🪟', Servico: '🔧', Reembalar: '📦', Acessorio: '⚙️'
};

export default function CategoriasBar({ categorias, linhas, categoriaFiltro, onCategoria }) {
  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto py-0 scrollbar-hide">
          <button
            onClick={() => onCategoria('')}
            className={cn(
              "flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all",
              !categoriaFiltro
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            Todas as Categorias
          </button>

          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => onCategoria(cat === categoriaFiltro ? '' : cat)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all",
                cat === categoriaFiltro
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              )}
            >
              <span>{CAT_ICONS[cat] || '📁'}</span>
              {CAT_LABELS[cat] || cat}
            </button>
          ))}

          {linhas.map(linha => (
            <button
              key={`linha-${linha}`}
              className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all"
            >
              Linha {linha}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}