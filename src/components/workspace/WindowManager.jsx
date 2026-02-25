import React, {
  useState, useRef, useCallback, useEffect,
  createContext, useContext
} from 'react';
import { cn } from '@/lib/utils';
import { X, Minus, Maximize2, Minimize2, Square, LayoutTemplate, PanelLeft, PanelRight } from 'lucide-react';
import { usePreferences } from '@/components/hooks/usePreferences';
import GlobalSearch from '@/components/search/GlobalSearch';
import { PortalContext } from '@/components/providers/PortalContext';

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
        updateWindow, snapWindow, sidebarOpen, setSidebarOpen,
        taskbarPosition: preferences?.taskbar_position || 'top',
        uiMode: preferences?.ui_mode || 'os',
      }}>
        {children}
        <WindowLayer />
      </WorkspaceCtx.Provider>
    </SidebarCtx.Provider>
  );
}

// ─── Window Layer ─────────────────────────────────────────────────────────────
function WindowLayer() {
  const { windows, uiMode } = useWorkspace();
  const { preferences } = usePreferences();
  
  // ISOLAMENTO: Se modo clássico, não renderizar janelas
  if (preferences?.ui_mode === 'classico') return null;
  
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
  const { closeWindow, focusWindow, toggleMinimize, toggleMaximize, updateWindow, snapWindow, activeId, taskbarPosition } = useWorkspace();
  const winRef = useRef(null);
  const isActive = activeId === win.id;
  const [showSnap, setShowSnap] = useState(false);
  const [snapHover, setSnapHover] = useState(false);

  // ── Drag ──
  const onMouseDownDrag = (e) => {
    if (win.maximized) {
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
    const tbPos = taskbarPosition;
    // Snap trigger: drag to the edge where taskbar is NOT (top edge unless taskbar is top)
    const snapTriggerY = tbPos === 'bottom' ? window.innerHeight - 20 : null;
    const snapTriggerTop = tbPos !== 'bottom'; // show snap when dragging to top

    const onMove = (ev) => {
      const atTop = snapTriggerTop && ev.clientY < 20;
      const atBottom = snapTriggerY && ev.clientY > snapTriggerY;
      setShowSnap(atTop || !!atBottom);
      const minY = tbPos === 'top' ? 48 : 0;
      const maxY = tbPos === 'bottom' ? window.innerHeight - 108 : window.innerHeight - 60;
      const minX = tbPos === 'left' ? 48 : 0;
      const maxX = tbPos === 'right' ? window.innerWidth - 248 : window.innerWidth - 200;
      updateWindow(win.id, {
        x: Math.max(minX, Math.min(ev.clientX - startX, maxX)),
        y: Math.max(minY, Math.min(ev.clientY - startY, maxY)),
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
  const tbPos = taskbarPosition || 'top';
  const { preferences: winPrefs } = usePreferences();
  const autoHideOn = winPrefs?.taskbar_autohide === true;
  const BAR = autoHideOn ? 0 : 48;
  const maxStyle = {
    top:    tbPos === 'top'    ? BAR : 0,
    bottom: tbPos === 'bottom' ? BAR : 0,
    left:   tbPos === 'left'   ? BAR : 0,
    right:  tbPos === 'right'  ? BAR : 0,
    width:  ['left','right'].includes(tbPos) ? `calc(100vw - ${BAR}px)` : '100vw',
    height: ['top','bottom'].includes(tbPos) ? `calc(100vh - ${BAR}px)` : '100vh',
    zIndex: win.z,
  };

  const style = win.maximized
    ? maxStyle
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

            {/* Maximize + Snap Assist (bridged hover) */}
            <div
              className="relative"
              onMouseEnter={() => setSnapHover(true)}
              onMouseLeave={() => setSnapHover(false)}
              onMouseDown={e => e.stopPropagation()}
            >
              <button
                onClick={() => toggleMaximize(win.id)}
                className="w-3.5 h-3.5 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center group transition-colors"
                title={win.maximized ? 'Restaurar' : 'Maximizar'}
              >
                {win.maximized
                  ? <Minimize2 className="w-2 h-2 text-green-900 opacity-0 group-hover:opacity-100" />
                  : <Maximize2 className="w-2 h-2 text-green-900 opacity-0 group-hover:opacity-100" />
                }
              </button>
              {/* Snap menu — pt-2 creates invisible bridge */}
              {snapHover && !win.maximized && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-[9999]">
                  <div className="bg-slate-800/97 backdrop-blur-md border border-slate-600 rounded-xl p-2 shadow-2xl flex gap-1">
                    <button
                      onMouseDown={e => e.stopPropagation()}
                      onClick={() => { snapWindow(win.id, 'full'); setSnapHover(false); }}
                      className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-600 transition-colors group/s"
                      title="Tela Cheia"
                    >
                      <Square className="w-4 h-4 text-slate-300 group-hover/s:text-white" />
                      <span className="text-[9px] text-slate-400 group-hover/s:text-slate-200 font-medium whitespace-nowrap">Cheia</span>
                    </button>
                    <button
                      onMouseDown={e => e.stopPropagation()}
                      onClick={() => { snapWindow(win.id, 'left'); setSnapHover(false); }}
                      className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-600 transition-colors group/s"
                      title="Metade Esquerda"
                    >
                      <PanelLeft className="w-4 h-4 text-slate-300 group-hover/s:text-white" />
                      <span className="text-[9px] text-slate-400 group-hover/s:text-slate-200 font-medium whitespace-nowrap">Esquerda</span>
                    </button>
                    <button
                      onMouseDown={e => e.stopPropagation()}
                      onClick={() => { snapWindow(win.id, 'right'); setSnapHover(false); }}
                      className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-600 transition-colors group/s"
                      title="Metade Direita"
                    >
                      <PanelRight className="w-4 h-4 text-slate-300 group-hover/s:text-white" />
                      <span className="text-[9px] text-slate-400 group-hover/s:text-slate-200 font-medium whitespace-nowrap">Direita</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <span className="flex-1 text-[13px] font-semibold text-white/90 truncate text-center">{win.title}</span>
          <div className="w-14 shrink-0" /> {/* spacer to center title */}
        </div>

        {/* ── Content ── */}
        <div
          ref={winRef}
          id={`window-root-${win.id}`}
          className="flex-1 overflow-auto bg-slate-50 relative"
          style={{ position: 'relative' }}
        >
          <PortalContext.Provider value={winRef.current}>
            {PageComponent
              ? <PageComponent />
              : (
                <div className="flex items-center justify-center h-full gap-3 text-slate-400">
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Carregando {win.page}…</span>
                </div>
              )
            }
          </PortalContext.Provider>
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

// ─── OS Taskbar — position-aware, exported so Layout uses it ─────────────────
export function OSTaskbar({ onToggleSidebar }) {
  const { windows, activeId, focusWindow, toggleMinimize, closeWindow, minimizeAll, taskbarPosition } = useWorkspace();
  const { preferences } = usePreferences();
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef(null);

  // ISOLAMENTO: Se modo clássico, não renderizar taskbar
  if (preferences?.ui_mode === 'classico') return null;

  const pos = taskbarPosition || 'top';
  const isVertical = pos === 'left' || pos === 'right';
  const autoHide = preferences?.taskbar_autohide === true;

  // Autohide: zona de hover para cada posição
  const triggerStyle = {
    top:    { top: 0,    left: 0,   right: 0,    height: 6 },
    bottom: { bottom: 0, left: 0,   right: 0,    height: 6 },
    left:   { top: 0,   left: 0,   bottom: 0,   width: 6 },
    right:  { top: 0,   right: 0,  bottom: 0,   width: 6 },
  }[pos];

  const handleMouseEnter = () => {
    clearTimeout(hideTimerRef.current);
    setVisible(true);
  };

  const handleMouseLeave = () => {
    hideTimerRef.current = setTimeout(() => setVisible(false), 600);
  };

  const posStyles = {
    top:    'top-0 left-0 right-0 h-12 flex-row border-b px-3',
    bottom: 'bottom-0 left-0 right-0 h-12 flex-row border-t px-3',
    left:   'top-0 left-0 bottom-0 w-12 flex-col border-r py-2 items-center',
    right:  'top-0 right-0 bottom-0 w-12 flex-col border-l py-2 items-center',
  }[pos];

  const StartBtn = () => (
    <button
      onClick={onToggleSidebar}
      className={cn(
        "flex items-center justify-center rounded-lg hover:bg-slate-700 transition-colors shrink-0",
        isVertical ? "w-9 h-9 mb-2" : "px-2 py-1.5 mr-1 gap-2"
      )}
      title="Menu Principal"
    >
      <img
        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png"
        alt="J&C"
        className={cn("object-contain", isVertical ? "h-7 w-7" : "h-7 w-auto")}
      />
      {!isVertical && <span className="text-white font-bold text-sm hidden lg:block">J&C Vision</span>}
    </button>
  );

  const WindowTabs = () => (
    <>
      {windows.map(win => (
        <button
          key={win.id}
          onClick={() => {
            if (win.minimized) { focusWindow(win.id); toggleMinimize(win.id); }
            else if (activeId === win.id) toggleMinimize(win.id);
            else focusWindow(win.id);
          }}
          className={cn(
            "flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-all border shrink-0",
            isVertical
              ? "w-9 h-9 justify-center px-0 py-0 my-0.5"
              : "px-3 py-1.5 whitespace-nowrap max-w-[160px]",
            activeId === win.id && !win.minimized
              ? "bg-blue-600 text-white border-blue-500"
              : "bg-slate-700/70 text-slate-300 border-slate-600 hover:bg-slate-600"
          )}
          title={win.title}
        >
          {isVertical ? (
            <span className={cn("w-2 h-2 rounded-full", win.minimized ? "bg-slate-500" : "bg-emerald-400")} />
          ) : (
            <>
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", win.minimized ? "bg-slate-500" : "bg-emerald-400")} />
              <span className="truncate">{win.title}</span>
              <span
                onClick={e => { e.stopPropagation(); closeWindow(win.id); }}
                className="opacity-40 hover:opacity-100 hover:text-red-400 ml-0.5 text-[11px] leading-none"
              >✕</span>
            </>
          )}
        </button>
      ))}
    </>
  );

  // Autohide translate
  const hideTranslate = {
    top:    '-translate-y-full',
    bottom: 'translate-y-full',
    left:   '-translate-x-full',
    right:  'translate-x-full',
  }[pos];

  const taskbarVisible = !autoHide || visible;

  return (
    <>
      {/* Trigger zone when hidden */}
      {autoHide && !visible && (
        <div
          className="fixed z-[501]"
          style={triggerStyle}
          onMouseEnter={handleMouseEnter}
        />
      )}
      <div
        className={cn(
          "fixed bg-slate-900/98 backdrop-blur-md border-slate-700/60 flex select-none gap-1.5 transition-transform duration-200",
          posStyles,
          autoHide && !taskbarVisible ? hideTranslate : 'translate-x-0 translate-y-0'
        )}
        style={{ zIndex: 500 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <StartBtn />
        {!isVertical && <div className="w-px h-6 bg-slate-700 shrink-0 self-center" />}

        {/* Search bar (horizontal only) */}
        {!isVertical && (
          <div className="flex-shrink-0 w-56 xl:w-72 mx-1">
            <GlobalSearch compact />
          </div>
        )}
        {!isVertical && <div className="w-px h-6 bg-slate-700 shrink-0 self-center" />}

        {/* Window tabs */}
        <div className={cn(
          "flex gap-1.5",
          isVertical ? "flex-col flex-1 overflow-y-auto items-center" : "flex-1 flex-row overflow-x-auto items-center hide-scrollbar"
        )}>
          <WindowTabs />
        </div>

        {/* Desktop btn */}
        {windows.length > 0 && (
          <button
            onClick={minimizeAll}
            className={cn(
              "flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700 shrink-0",
              isVertical ? "w-9 h-9 mt-1" : "px-2.5 py-1.5 gap-1.5 ml-1"
            )}
            title="Área de Trabalho"
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            {!isVertical && <span className="hidden xl:block text-xs font-medium">Desktop</span>}
          </button>
        )}
      </div>
    </>
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