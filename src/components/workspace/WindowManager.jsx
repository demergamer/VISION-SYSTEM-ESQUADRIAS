import React, {
  useState, useRef, useCallback, useEffect,
  createContext, useContext
} from 'react';
import { cn } from '@/lib/utils';
import { X, Minus, Maximize2, Minimize2, Square, LayoutTemplate, PanelLeft, PanelRight } from 'lucide-react';
import { usePreferences } from '@/components/hooks/usePreferences';

// ─── Contexts ─────────────────────────────────────────────────────────────────
const WorkspaceCtx = createContext(null);
export const useWorkspace = () => useContext(WorkspaceCtx);

// Exposed so sidebar/layout can toggle it
export const SidebarCtx = createContext(null);
export const useSidebarCtx = () => useContext(SidebarCtx);

// ─── Provider ────────────────────────────────────────────────────────────────
export function WorkspaceProvider({ children }) {
  const [windows, setWindows] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const zTop = useRef(200);
  const { preferences } = usePreferences();

  // Safe area offsets based on taskbar position
  const getSafeArea = useCallback(() => {
    const pos = preferences?.taskbar_position || 'top';
    const BAR = 48;
    if (pos === 'top')    return { x: 0,   y: BAR, w: window.innerWidth,        h: window.innerHeight - BAR };
    if (pos === 'bottom') return { x: 0,   y: 0,   w: window.innerWidth,        h: window.innerHeight - BAR };
    if (pos === 'left')   return { x: BAR, y: 0,   w: window.innerWidth - BAR,  h: window.innerHeight };
    if (pos === 'right')  return { x: 0,   y: 0,   w: window.innerWidth - BAR,  h: window.innerHeight };
    return { x: 0, y: BAR, w: window.innerWidth, h: window.innerHeight - BAR };
  }, [preferences?.taskbar_position]);

  const openWindow = useCallback((page) => {
    setSidebarOpen(false);
    setWindows(prev => {
      const exists = prev.find(w => w.page === page);
      if (exists) {
        setActiveId(exists.id);
        setWindows(ws => ws.map(w =>
          w.id === exists.id ? { ...w, minimized: false, z: ++zTop.current } : w
        ));
        return prev;
      }
      const id = `${page}-${Date.now()}`;
      const safe = {
        x: 0,
        y: (preferences?.taskbar_position === 'top' ? 48 : 0),
        w: window.innerWidth - (['left','right'].includes(preferences?.taskbar_position) ? 48 : 0),
        h: window.innerHeight - (['top','bottom'].includes(preferences?.taskbar_position) || !preferences?.taskbar_position ? 48 : 0),
      };
      const newWin = {
        id, page, title: page,
        x: safe.x, y: safe.y, w: safe.w, h: safe.h,
        minimized: false, maximized: true,
        z: ++zTop.current,
        prevPos: {
          x: safe.x + 80, y: safe.y + 40,
          w: Math.min(window.innerWidth * 0.78, 1200),
          h: Math.min(window.innerHeight * 0.78, 780),
        },
      };
      setActiveId(id);
      return [...prev, newWin];
    });
  }, [preferences?.taskbar_position]);

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

  const minimizeAll = useCallback(() => {
    setWindows(prev => prev.map(w => ({ ...w, minimized: true })));
    setActiveId(null);
  }, []);

  const toggleMaximize = useCallback((id) => {
    setWindows(prev => prev.map(w => {
      if (w.id !== id) return w;
      if (w.maximized) {
        const pos = w.prevPos || { x: 80, y: 80, w: 1000, h: 680 };
        return { ...w, maximized: false, ...pos, prevPos: null };
      }
      const safe = {
        x: ['left'].includes(preferences?.taskbar_position) ? 48 : 0,
        y: ['top'].includes(preferences?.taskbar_position) || !preferences?.taskbar_position ? 48 : 0,
        w: window.innerWidth - (['left','right'].includes(preferences?.taskbar_position) ? 48 : 0),
        h: window.innerHeight - (['top','bottom'].includes(preferences?.taskbar_position) || !preferences?.taskbar_position ? 48 : 0),
      };
      return {
        ...w, maximized: true,
        prevPos: { x: w.x, y: w.y, w: w.w, h: w.h },
        ...safe,
      };
    }));
  }, [preferences?.taskbar_position]);

  const updateWindow = useCallback((id, patch) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, ...patch } : w));
  }, []);

  const snapWindow = useCallback((id, layout) => {
    const tbPos = preferences?.taskbar_position || 'top';
    const isH = ['left','right'].includes(tbPos);
    const BAR = 48;
    const W = window.innerWidth - (isH ? BAR : 0);
    const H = window.innerHeight - (!isH ? BAR : 0);
    const X0 = tbPos === 'left' ? BAR : 0;
    const Y0 = tbPos === 'top' || !preferences?.taskbar_position ? BAR : 0;
    const snaps = {
      full:  { x: X0,       y: Y0, w: W,   h: H, maximized: false },
      left:  { x: X0,       y: Y0, w: W/2, h: H, maximized: false },
      right: { x: X0 + W/2, y: Y0, w: W/2, h: H, maximized: false },
    };
    const pos = snaps[layout];
    if (!pos) return;
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, ...pos, prevPos: { x: w.x, y: w.y, w: w.w, h: w.h } } : w
    ));
  }, [preferences?.taskbar_position]);

  return (
    <SidebarCtx.Provider value={{ sidebarOpen, setSidebarOpen }}>
      <WorkspaceCtx.Provider value={{
        windows, activeId,
        openWindow, closeWindow, focusWindow,
        toggleMinimize, toggleMaximize, minimizeAll,
        updateWindow, snapWindow, sidebarOpen, setSidebarOpen
      }}>
        {children}
        <WindowLayer />
      </WorkspaceCtx.Provider>
    </SidebarCtx.Provider>
  );
}

// ─── Window Layer ─────────────────────────────────────────────────────────────
function WindowLayer() {
  const { windows } = useWorkspace();
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 210 }}>
      {windows.map(win => <FloatingWindow key={win.id} win={win} />)}
    </div>
  );
}

// ─── Snap Assist Overlay ──────────────────────────────────────────────────────
function SnapAssist({ winId, onSnap, onClose }) {
  return (
    <div
      className="fixed top-12 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto"
      onMouseLeave={onClose}
    >
      <div className="bg-slate-800/95 backdrop-blur-md border border-slate-600 rounded-2xl p-3 shadow-2xl flex gap-2">
        <button
          onMouseUp={() => { onSnap('full'); onClose(); }}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl hover:bg-slate-600 transition-colors group"
          title="Tela Cheia"
        >
          <Square className="w-6 h-6 text-slate-300 group-hover:text-white" />
          <span className="text-[10px] text-slate-400 group-hover:text-slate-200 font-medium">Cheia</span>
        </button>
        <button
          onMouseUp={() => { onSnap('left'); onClose(); }}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl hover:bg-slate-600 transition-colors group"
          title="Metade Esquerda"
        >
          <PanelLeft className="w-6 h-6 text-slate-300 group-hover:text-white" />
          <span className="text-[10px] text-slate-400 group-hover:text-slate-200 font-medium">Esquerda</span>
        </button>
        <button
          onMouseUp={() => { onSnap('right'); onClose(); }}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl hover:bg-slate-600 transition-colors group"
          title="Metade Direita"
        >
          <PanelRight className="w-6 h-6 text-slate-300 group-hover:text-white" />
          <span className="text-[10px] text-slate-400 group-hover:text-slate-200 font-medium">Direita</span>
        </button>
      </div>
    </div>
  );
}

// ─── Floating Window ──────────────────────────────────────────────────────────
function FloatingWindow({ win }) {
  const { closeWindow, focusWindow, toggleMinimize, toggleMaximize, updateWindow, snapWindow, activeId } = useWorkspace();
  const winRef = useRef(null);
  const isActive = activeId === win.id;
  const [showSnap, setShowSnap] = useState(false);

  // ── Drag ──
  const onMouseDownDrag = (e) => {
    if (win.maximized) {
      // Unmaximize first, then start drag from a sensible position
      const prevPos = win.prevPos || { x: 80, y: 80, w: Math.min(window.innerWidth * 0.75, 1100), h: Math.min(window.innerHeight * 0.75, 750) };
      updateWindow(win.id, {
        maximized: false,
        x: e.clientX - prevPos.w / 2,
        y: e.clientY - 20,
        w: prevPos.w,
        h: prevPos.h,
        prevPos: null,
      });
      return;
    }
    e.preventDefault();
    const startX = e.clientX - win.x;
    const startY = e.clientY - win.y;
    focusWindow(win.id);

    const onMove = (ev) => {
      if (ev.clientY < 20) {
        setShowSnap(true);
      } else {
        setShowSnap(false);
      }
      updateWindow(win.id, {
        x: Math.max(0, Math.min(ev.clientX - startX, window.innerWidth - 200)),
        y: Math.max(48, Math.min(ev.clientY - startY, window.innerHeight - 60)),
      });
    };
    const onUp = () => {
      setShowSnap(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Resize ──
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

  // ── Window style ──
  const style = win.maximized
    ? { top: 48, left: 0, width: '100vw', height: 'calc(100vh - 48px)', zIndex: win.z }
    : {
        top: win.y, left: win.x, width: win.w, height: win.h,
        zIndex: win.z,
        opacity: win.minimized ? 0 : 1,
        pointerEvents: win.minimized ? 'none' : 'auto',
        transform: win.minimized ? 'scale(0.95)' : 'scale(1)',
        transition: 'opacity 0.15s, transform 0.15s',
      };

  const PageComponent = usePageComponent(win.page);

  return (
    <>
      {showSnap && (
        <SnapAssist
          winId={win.id}
          onSnap={(layout) => snapWindow(win.id, layout)}
          onClose={() => setShowSnap(false)}
        />
      )}
      <div
        style={style}
        className={cn(
          "absolute flex flex-col overflow-hidden shadow-2xl border pointer-events-auto",
          isActive
            ? "border-blue-400/60 shadow-[0_24px_70px_rgba(0,0,0,0.40)]"
            : "border-slate-700/40 shadow-[0_8px_30px_rgba(0,0,0,0.22)]",
          win.maximized ? "rounded-none" : "rounded-xl"
        )}
        onMouseDown={() => focusWindow(win.id)}
      >
        {/* ── Title Bar ── */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 h-10 shrink-0 select-none",
            isActive
              ? "bg-gradient-to-r from-slate-900 to-slate-800"
              : "bg-slate-800/90"
          )}
          onMouseDown={onMouseDownDrag}
          onDoubleClick={() => toggleMaximize(win.id)}
        >
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => closeWindow(win.id)}
              className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center group transition-colors"
              title="Fechar"
            >
              <X className="w-2 h-2 text-red-900 opacity-0 group-hover:opacity-100" />
            </button>
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
              className="w-3.5 h-3.5 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center group transition-colors"
              title={win.maximized ? 'Restaurar' : 'Maximizar'}
            >
              {win.maximized
                ? <Minimize2 className="w-2 h-2 text-green-900 opacity-0 group-hover:opacity-100" />
                : <Maximize2 className="w-2 h-2 text-green-900 opacity-0 group-hover:opacity-100" />
              }
            </button>
          </div>
          <span className="flex-1 text-[13px] font-semibold text-white/90 truncate text-center">{win.title}</span>
          <div className="w-14 shrink-0" /> {/* spacer to center title */}
        </div>

        {/* ── Content ──
            isolation: isolate creates a new stacking context so position:fixed
            children of page components stack correctly within the window.
        */}
        <div
          ref={winRef}
          id={`window-root-${win.id}`}
          className="flex-1 overflow-auto bg-slate-50 relative"
          style={{ isolation: 'isolate' }}
        >
          {PageComponent
            ? <PageComponent />
            : (
              <div className="flex items-center justify-center h-full gap-3 text-slate-400">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Carregando {win.page}…</span>
              </div>
            )
          }
        </div>

        {/* ── Resize Handle ── */}
        {!win.maximized && (
          <div
            onMouseDown={onMouseDownResize}
            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-10"
            style={{
              background: 'linear-gradient(135deg, transparent 50%, #475569 50%)',
              borderBottomRightRadius: '0.75rem',
            }}
          />
        )}
      </div>
    </>
  );
}

// ─── OS Taskbar (top) — exported so Layout uses it ───────────────────────────
export function OSTaskbar({ onToggleSidebar, menuGroups, canDo }) {
  const { windows, activeId, focusWindow, toggleMinimize, closeWindow, minimizeAll } = useWorkspace();

  return (
    <div
      className="fixed top-0 left-0 right-0 h-12 bg-slate-900/98 backdrop-blur-md border-b border-slate-700/60 flex items-center gap-2 px-3 select-none"
      style={{ zIndex: 500 }}
    >
      {/* ── Start Button ── */}
      <button
        onClick={onToggleSidebar}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors shrink-0 mr-1"
        title="Menu Principal"
      >
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png"
          alt="J&C"
          className="h-7 w-auto object-contain"
        />
        <span className="text-white font-bold text-sm hidden lg:block">J&C Vision</span>
      </button>

      <div className="w-px h-6 bg-slate-700 shrink-0" />

      {/* ── Open window tabs ── */}
      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
        {windows.map(win => (
          <button
            key={win.id}
            onClick={() => {
              if (win.minimized) { focusWindow(win.id); toggleMinimize(win.id); }
              else if (activeId === win.id) toggleMinimize(win.id);
              else focusWindow(win.id);
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap max-w-[160px] transition-all border shrink-0",
              activeId === win.id && !win.minimized
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-slate-700/70 text-slate-300 border-slate-600 hover:bg-slate-600"
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", win.minimized ? "bg-slate-500" : "bg-emerald-400")} />
            <span className="truncate">{win.title}</span>
            <span
              onClick={e => { e.stopPropagation(); closeWindow(win.id); }}
              className="opacity-40 hover:opacity-100 hover:text-red-400 ml-0.5 text-[11px] leading-none"
            >✕</span>
          </button>
        ))}
      </div>

      {/* ── Right: show desktop ── */}
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {windows.length > 0 && (
          <button
            onClick={minimizeAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700"
            title="Área de Trabalho"
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span className="hidden xl:block">Desktop</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Lazy page loader ─────────────────────────────────────────────────────────
const PAGE_MAP = {
  Pedidos:            () => import('@/pages/Pedidos'),
  Clientes:           () => import('@/pages/Clientes'),
  Representantes:     () => import('@/pages/Representantes'),
  Motoristas:         () => import('@/pages/Motoristas'),
  Produtos:           () => import('@/pages/Produtos'),
  Fornecedores:       () => import('@/pages/Fornecedores'),
  CaixaDiario:        () => import('@/pages/CaixaDiario'),
  Pagamentos:         () => import('@/pages/Pagamentos'),
  Cheques:            () => import('@/pages/Cheques'),
  Creditos:           () => import('@/pages/Creditos'),
  Balanco:            () => import('@/pages/Balanco'),
  Comissoes:          () => import('@/pages/Comissoes'),
  Orcamentos:         () => import('@/pages/Orcamentos'),
  Calendario:         () => import('@/pages/Calendario'),
  Relatorios:         () => import('@/pages/Relatorios'),
  Usuarios:           () => import('@/pages/Usuarios'),
  EntradaCaucao:      () => import('@/pages/EntradaCaucao'),
  ConfiguracoesLojas: () => import('@/pages/ConfiguracoesLojas'),
  FormasPagamento:    () => import('@/pages/FormasPagamento'),
  Logs:               () => import('@/pages/Logs'),
  Configuracoes:      () => import('@/pages/Configuracoes'),
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