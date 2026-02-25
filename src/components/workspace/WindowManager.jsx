import React, { useState, useRef, useCallback, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { X, Minus, Maximize2, Minimize2, GripHorizontal } from 'lucide-react';

// ─── Context ────────────────────────────────────────────────────────────────
const WorkspaceCtx = createContext(null);
export const useWorkspace = () => useContext(WorkspaceCtx);

// ─── Provider ────────────────────────────────────────────────────────────────
export function WorkspaceProvider({ children }) {
  const [windows, setWindows] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const zTop = useRef(100);

  const openWindow = useCallback((page) => {
    setWindows(prev => {
      const exists = prev.find(w => w.page === page);
      if (exists) {
        setActiveId(exists.id);
        setWindows(ws => ws.map(w => w.id === exists.id
          ? { ...w, minimized: false, z: ++zTop.current }
          : w
        ));
        return prev;
      }
      const id = `${page}-${Date.now()}`;
      const offset = (prev.length % 6) * 30;
      const newWin = {
        id,
        page,
        title: page,
        x: 80 + offset,
        y: 60 + offset,
        w: Math.min(window.innerWidth * 0.75, 1100),
        h: Math.min(window.innerHeight * 0.78, 720),
        minimized: false,
        maximized: false,
        z: ++zTop.current,
        prevPos: null,
      };
      setActiveId(id);
      return [...prev, newWin];
    });
  }, []);

  const closeWindow = useCallback((id) => {
    setWindows(prev => prev.filter(w => w.id !== id));
    setActiveId(prev => prev === id ? null : prev);
  }, []);

  const focusWindow = useCallback((id) => {
    setActiveId(id);
    setWindows(prev => prev.map(w => w.id === id ? { ...w, z: ++zTop.current } : w));
  }, []);

  const toggleMinimize = useCallback((id) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: !w.minimized } : w));
  }, []);

  const toggleMaximize = useCallback((id) => {
    setWindows(prev => prev.map(w => {
      if (w.id !== id) return w;
      if (w.maximized) {
        return { ...w, maximized: false, ...(w.prevPos || {}), prevPos: null };
      }
      return { ...w, maximized: true, prevPos: { x: w.x, y: w.y, w: w.w, h: w.h } };
    }));
  }, []);

  const updateWindow = useCallback((id, patch) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, ...patch } : w));
  }, []);

  return (
    <WorkspaceCtx.Provider value={{ windows, activeId, openWindow, closeWindow, focusWindow, toggleMinimize, toggleMaximize, updateWindow }}>
      {children}
      <WindowLayer />
    </WorkspaceCtx.Provider>
  );
}

// ─── Window Layer (renders all floating windows) ─────────────────────────────
function WindowLayer() {
  const { windows } = useWorkspace();
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 200 }}>
      {windows.map(win => <FloatingWindow key={win.id} win={win} />)}
      <Taskbar />
    </div>
  );
}

// ─── Floating Window ─────────────────────────────────────────────────────────
function FloatingWindow({ win }) {
  const { closeWindow, focusWindow, toggleMinimize, toggleMaximize, updateWindow, activeId } = useWorkspace();
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const winRef = useRef(null);
  const isActive = activeId === win.id;

  // Drag
  const onMouseDownDrag = (e) => {
    if (win.maximized) return;
    e.preventDefault();
    const startX = e.clientX - win.x;
    const startY = e.clientY - win.y;
    focusWindow(win.id);

    const onMove = (ev) => {
      updateWindow(win.id, {
        x: Math.max(0, Math.min(ev.clientX - startX, window.innerWidth - 200)),
        y: Math.max(0, Math.min(ev.clientY - startY, window.innerHeight - 60)),
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Resize
  const onMouseDownResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = win.w;
    const startH = win.h;

    const onMove = (ev) => {
      updateWindow(win.id, {
        w: Math.max(400, startW + ev.clientX - startX),
        h: Math.max(300, startH + ev.clientY - startY),
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const style = win.maximized
    ? { top: 0, left: 0, width: '100vw', height: 'calc(100vh - 48px)', zIndex: win.z }
    : win.minimized
    ? { display: 'none' }
    : { top: win.y, left: win.x, width: win.w, height: win.h, zIndex: win.z };

  // lazy load page component
  const PageComponent = usePageComponent(win.page);

  return (
    <div
      ref={winRef}
      style={style}
      className={cn(
        "absolute flex flex-col rounded-xl overflow-hidden shadow-2xl border pointer-events-auto transition-shadow duration-150",
        isActive
          ? "border-blue-300 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
          : "border-slate-300/70 shadow-[0_8px_30px_rgba(0,0,0,0.18)]",
        win.maximized && "rounded-none"
      )}
      onMouseDown={() => focusWindow(win.id)}
    >
      {/* Title Bar */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 h-10 shrink-0 select-none",
          isActive
            ? "bg-gradient-to-r from-slate-800 to-slate-700"
            : "bg-slate-700/80"
        )}
        onMouseDown={onMouseDownDrag}
        onDoubleClick={() => toggleMaximize(win.id)}
      >
        <GripHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span className="flex-1 text-[13px] font-semibold text-white truncate">{win.title}</span>

        {/* Controls */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => toggleMinimize(win.id)}
          className="w-3.5 h-3.5 rounded-full bg-yellow-400 hover:bg-yellow-300 flex items-center justify-center group transition-colors"
          title="Minimizar"
        >
          <Minus className="w-2 h-2 text-yellow-800 opacity-0 group-hover:opacity-100" />
        </button>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => toggleMaximize(win.id)}
          className="w-3.5 h-3.5 rounded-full bg-green-400 hover:bg-green-300 flex items-center justify-center group transition-colors"
          title="Maximizar"
        >
          {win.maximized
            ? <Minimize2 className="w-2 h-2 text-green-800 opacity-0 group-hover:opacity-100" />
            : <Maximize2 className="w-2 h-2 text-green-800 opacity-0 group-hover:opacity-100" />
          }
        </button>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => closeWindow(win.id)}
          className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center group transition-colors"
          title="Fechar"
        >
          <X className="w-2 h-2 text-red-900 opacity-0 group-hover:opacity-100" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white relative">
        {PageComponent
          ? <PageComponent />
          : <div className="flex items-center justify-center h-full text-slate-400 text-sm">Carregando {win.page}…</div>
        }
      </div>

      {/* Resize Handle */}
      {!win.maximized && (
        <div
          ref={resizeRef}
          onMouseDown={onMouseDownResize}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize opacity-40 hover:opacity-80 transition-opacity"
          style={{ background: 'linear-gradient(135deg, transparent 50%, #94a3b8 50%)' }}
        />
      )}
    </div>
  );
}

// ─── Taskbar ─────────────────────────────────────────────────────────────────
function Taskbar() {
  const { windows, activeId, focusWindow, toggleMinimize, closeWindow } = useWorkspace();
  if (windows.length === 0) return null;

  return (
    <div
      className="pointer-events-auto fixed bottom-0 left-0 right-0 h-12 bg-slate-900/95 backdrop-blur-md border-t border-slate-700 flex items-center gap-2 px-4 overflow-x-auto"
      style={{ zIndex: 300 }}
    >
      {windows.map(win => (
        <button
          key={win.id}
          onClick={() => win.minimized ? (focusWindow(win.id), toggleMinimize(win.id)) : (activeId === win.id ? toggleMinimize(win.id) : focusWindow(win.id))}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap max-w-[180px] transition-all border",
            activeId === win.id && !win.minimized
              ? "bg-blue-600 text-white border-blue-500"
              : "bg-slate-700/80 text-slate-300 border-slate-600 hover:bg-slate-600"
          )}
        >
          <span className={cn("w-2 h-2 rounded-full shrink-0", win.minimized ? "bg-slate-500" : "bg-emerald-400")} />
          <span className="truncate">{win.title}</span>
          <span
            onClick={e => { e.stopPropagation(); closeWindow(win.id); }}
            className="ml-1 opacity-50 hover:opacity-100 text-slate-300 hover:text-red-400"
          >✕</span>
        </button>
      ))}
    </div>
  );
}

// ─── Lazy page loader ─────────────────────────────────────────────────────────
const PAGE_MAP = {
  Pedidos:           () => import('@/pages/Pedidos'),
  Clientes:          () => import('@/pages/Clientes'),
  Representantes:    () => import('@/pages/Representantes'),
  Motoristas:        () => import('@/pages/Motoristas'),
  Produtos:          () => import('@/pages/Produtos'),
  Fornecedores:      () => import('@/pages/Fornecedores'),
  CaixaDiario:       () => import('@/pages/CaixaDiario'),
  Pagamentos:        () => import('@/pages/Pagamentos'),
  Cheques:           () => import('@/pages/Cheques'),
  Creditos:          () => import('@/pages/Creditos'),
  Balanco:           () => import('@/pages/Balanco'),
  Comissoes:         () => import('@/pages/Comissoes'),
  Orcamentos:        () => import('@/pages/Orcamentos'),
  Calendario:        () => import('@/pages/Calendario'),
  Relatorios:        () => import('@/pages/Relatorios'),
  Usuarios:          () => import('@/pages/Usuarios'),
  EntradaCaucao:     () => import('@/pages/EntradaCaucao'),
  ConfiguracoesLojas:() => import('@/pages/ConfiguracoesLojas'),
  FormasPagamento:   () => import('@/pages/FormasPagamento'),
  Logs:              () => import('@/pages/Logs'),
  Configuracoes:     () => import('@/pages/Configuracoes'),
};

function usePageComponent(page) {
  const [Comp, setComp] = useState(null);
  useEffect(() => {
    const loader = PAGE_MAP[page];
    if (!loader) return;
    loader().then(mod => setComp(() => mod.default));
  }, [page]);
  return Comp;
}