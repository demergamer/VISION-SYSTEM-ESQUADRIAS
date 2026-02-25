import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ShoppingCart, Users, Package, Briefcase, Truck, FileText, Banknote, ScrollText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/components/workspace/WindowManager';
import { usePreferences } from '@/components/hooks/usePreferences';

const CATEGORIES = [
  {
    key: 'pedidos',
    label: 'Pedidos',
    icon: ShoppingCart,
    color: 'text-blue-600 bg-blue-50',
    entity: 'Pedido',
    page: 'Pedidos',
    getLabel: r => `#${r.numero_pedido} — ${r.cliente_nome}`,
    getSub: r => r.valor_pedido?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + ' · ' + (r.status || ''),
    match: (r, q) => {
      const s = q.toLowerCase();
      return (r.numero_pedido || '').toLowerCase().includes(s) || (r.cliente_nome || '').toLowerCase().includes(s);
    },
  },
  {
    key: 'clientes',
    label: 'Clientes',
    icon: Users,
    color: 'text-violet-600 bg-violet-50',
    entity: 'Cliente',
    page: 'Clientes',
    getLabel: r => r.nome || r.razao_social || r.codigo,
    getSub: r => [r.cidade, r.estado].filter(Boolean).join(', ') || r.cnpj || '',
    match: (r, q) => {
      const s = q.toLowerCase();
      return (r.nome || '').toLowerCase().includes(s) || (r.razao_social || '').toLowerCase().includes(s) || (r.codigo || '').toLowerCase().includes(s);
    },
  },
  {
    key: 'produtos',
    label: 'Produtos',
    icon: Package,
    color: 'text-amber-600 bg-amber-50',
    entity: 'Produto',
    page: 'Produtos',
    getLabel: r => r.nome_base || r.nome,
    getSub: r => r.categoria || '',
    match: (r, q) => {
      const s = q.toLowerCase();
      return (r.nome_base || '').toLowerCase().includes(s) || (r.nome || '').toLowerCase().includes(s) || (r.categoria || '').toLowerCase().includes(s);
    },
  },
  {
    key: 'representantes',
    label: 'Representantes',
    icon: Briefcase,
    color: 'text-emerald-600 bg-emerald-50',
    entity: 'Representante',
    page: 'Representantes',
    getLabel: r => r.nome,
    getSub: r => r.regiao || r.codigo || '',
    match: (r, q) => {
      const s = q.toLowerCase();
      return (r.nome || '').toLowerCase().includes(s) || (r.codigo || '').toLowerCase().includes(s);
    },
  },
  {
    key: 'motoristas',
    label: 'Motoristas',
    icon: Truck,
    color: 'text-orange-600 bg-orange-50',
    entity: 'Motorista',
    page: 'Motoristas',
    getLabel: r => r.nome,
    getSub: r => r.codigo || r.telefone || '',
    match: (r, q) => (r.nome || '').toLowerCase().includes(q.toLowerCase()),
  },
  {
    key: 'orcamentos',
    label: 'Orçamentos',
    icon: FileText,
    color: 'text-pink-600 bg-pink-50',
    entity: 'Orcamento',
    page: 'Orcamentos',
    getLabel: r => `#${r.numero_sequencial || '?'} — ${r.cliente_nome}`,
    getSub: r => r.status || '',
    match: (r, q) => {
      const s = q.toLowerCase();
      return (r.cliente_nome || '').toLowerCase().includes(s) || String(r.numero_sequencial || '').includes(s);
    },
  },
  {
    key: 'cheques',
    label: 'Cheques',
    icon: ScrollText,
    color: 'text-slate-600 bg-slate-100',
    entity: 'Cheque',
    page: 'Cheques',
    getLabel: r => `Cheque ${r.numero_cheque} — ${r.emitente || r.cliente_nome}`,
    getSub: r => r.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || '',
    match: (r, q) => {
      const s = q.toLowerCase();
      return (r.numero_cheque || '').toLowerCase().includes(s) || (r.emitente || '').toLowerCase().includes(s) || (r.cliente_nome || '').toLowerCase().includes(s);
    },
  },
];

// Cache global de dados (não recarregar em cada abertura)
const dataCache = {};
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 1 min

async function loadAllData() {
  const now = Date.now();
  if (now - cacheTimestamp < CACHE_TTL && Object.keys(dataCache).length > 0) return dataCache;

  await Promise.all(
    CATEGORIES.map(async (cat) => {
      try {
        dataCache[cat.key] = await base44.entities[cat.entity].list('-created_date', 300);
      } catch {
        dataCache[cat.key] = [];
      }
    })
  );
  cacheTimestamp = now;
  return dataCache;
}

function highlight(text, query) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function GlobalSearch({ compact = false, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const workspace = useWorkspace();
  const { preferences } = usePreferences();

  const isOS = preferences?.ui_mode === 'os';

  // Flatten results for keyboard nav
  const flatResults = CATEGORIES.flatMap(cat =>
    (results[cat.key] || []).slice(0, 4).map(r => ({ cat, record: r }))
  );

  const handleNavigate = useCallback((page) => {
    if (isOS && workspace?.openWindow) {
      workspace.openWindow(page);
    } else {
      navigate(`/${page}`);
    }
    setOpen(false);
    setQuery('');
    onClose?.();
  }, [isOS, workspace, navigate, onClose]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({});
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);

    const timer = setTimeout(async () => {
      const data = await loadAllData();
      const newResults = {};
      CATEGORIES.forEach(cat => {
        const matches = (data[cat.key] || []).filter(r => cat.match(r, query)).slice(0, 5);
        if (matches.length) newResults[cat.key] = matches;
      });
      setResults(newResults);
      setLoading(false);
      setActiveIdx(-1);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard nav
  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      handleNavigate(flatResults[activeIdx].cat.page);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const totalResults = Object.values(results).reduce((s, arr) => s + arr.length, 0);
  const hasResults = totalResults > 0;

  return (
    <div ref={containerRef} className={cn("relative", compact ? "w-full max-w-xs" : "w-full max-w-lg")}>
      {/* Input */}
      <div className={cn(
        "flex items-center gap-2 rounded-xl border transition-all",
        compact
          ? "bg-slate-800/80 border-slate-700 hover:border-slate-500 focus-within:border-blue-500 px-2.5 py-1"
          : "bg-white border-slate-200 hover:border-slate-300 focus-within:border-blue-400 shadow-sm px-3 py-2"
      )}>
        <Search className={cn("w-4 h-4 shrink-0", compact ? "text-slate-400" : "text-slate-400")} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Buscar pedidos, clientes, produtos..."
          className={cn(
            "flex-1 bg-transparent outline-none text-sm min-w-0",
            compact ? "text-white placeholder:text-slate-500 text-xs" : "text-slate-800 placeholder:text-slate-400"
          )}
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
            className={cn("shrink-0", compact ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {loading && (
          <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          "absolute top-full mt-2 left-0 right-0 z-[600] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden",
          compact ? "min-w-[340px]" : "w-full"
        )}>
          {!hasResults && !loading && (
            <div className="py-8 text-center text-slate-400 text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>Nenhum resultado para <strong className="text-slate-600">"{query}"</strong></p>
            </div>
          )}

          {hasResults && (
            <div className="max-h-[480px] overflow-y-auto">
              {CATEGORIES.map(cat => {
                const items = results[cat.key];
                if (!items?.length) return null;
                const Icon = cat.icon;
                let flatOffset = CATEGORIES.slice(0, CATEGORIES.indexOf(cat))
                  .reduce((s, c) => s + Math.min((results[c.key] || []).length, 4), 0);

                return (
                  <div key={cat.key}>
                    {/* Category header */}
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={cn("p-1 rounded-md", cat.color)}>
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{cat.label}</span>
                      </div>
                      <button
                        onClick={() => handleNavigate(cat.page)}
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                      >
                        Ver todos →
                      </button>
                    </div>

                    {/* Results */}
                    {items.slice(0, 4).map((record, i) => {
                      const globalIdx = flatOffset + i;
                      const isActive = globalIdx === activeIdx;
                      return (
                        <button
                          key={record.id || i}
                          onMouseEnter={() => setActiveIdx(globalIdx)}
                          onClick={() => handleNavigate(cat.page)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                            isActive ? "bg-blue-50" : "hover:bg-slate-50"
                          )}
                        >
                          <span className={cn("p-1.5 rounded-lg shrink-0", cat.color)}>
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {highlight(cat.getLabel(record), query)}
                            </p>
                            {cat.getSub(record) && (
                              <p className="text-xs text-slate-400 truncate">{cat.getSub(record)}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-400">{totalResults} resultado(s) encontrado(s)</span>
                <span className="text-[10px] text-slate-400">↑↓ navegar · Enter abrir</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}