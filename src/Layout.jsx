import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon, LogOut, Clock, Calendar,
  LayoutDashboard, Users, Package, ShoppingCart, Wallet, FileText,
  BarChart3, Home, Briefcase, Banknote, ScrollText, CreditCard,
  Menu, Building2, Truck, CalendarDays, Bell, Lock, X
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSecurity } from '@/components/providers/SecurityProvider';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import NotificationCenter from '@/components/notificacoes/NotificationCenter';
import { cn } from "@/lib/utils";
import { AuthProvider, useAuth } from '@/components/providers/AuthContext';
import { SecurityProvider } from '@/components/providers/SecurityProvider';
import { useRealtimeSync } from '@/components/hooks/useRealtimeSync';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePermissions } from "@/components/hooks/usePermissions";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkspaceProvider, OSTaskbar, useWorkspace } from '@/components/workspace/WindowManager';
import { usePreferences } from '@/components/hooks/usePreferences';
import GlobalSearch from '@/components/search/GlobalSearch';
import NotificationToastManager from '@/components/notificacoes/NotificationToastManager';

const CalendarIcon = CalendarDays;

const menuStructure = [
  {
    title: "Principal",
    items: [
      { name: "Dashboard", icon: Home, public: true },
      { name: "Welcome", icon: LayoutDashboard, public: true },
    ]
  },
  {
    title: "Cadastros",
    items: [
      { name: "Clientes", icon: Users },
      { name: "Produtos", icon: Package },
      { name: "Fornecedores", icon: Briefcase },
      { name: "Representantes", icon: Users },
      { name: "Motoristas", icon: Truck },
      { name: "Calendario", icon: CalendarIcon },
      { name: "FormasPagamento", icon: CreditCard },
      { name: "Usuarios", icon: Users },
    ]
  },
  {
    title: "Vendas",
    items: [
      { name: "Pedidos", icon: ShoppingCart },
      { name: "Orcamentos", icon: FileText },
      { name: "Comissoes", icon: Banknote },
    ]
  },
  {
    title: "Financeiro",
    items: [
      { name: "CaixaDiario", icon: Wallet },
      { name: "Pagamentos", icon: Banknote },
      { name: "Cheques", icon: ScrollText },
      { name: "Creditos", icon: CreditCard },
      { name: "Balanco", icon: BarChart3 },
      { name: "EntradaCaucao", icon: Wallet },
    ]
  },
  {
    title: "Sistema",
    items: [
      { name: "Relatorios", icon: BarChart3 },
      { name: "ConfiguracoesLojas", icon: Building2 },
      { name: "Logs", icon: ScrollText },
      { name: "Configuracoes", icon: SettingsIcon, public: true },
    ]
  }
];

// Relógio compacto
const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center p-3 bg-slate-100/80 rounded-xl border border-slate-200 text-slate-700 mb-4 w-full shadow-inner">
      <div className="flex items-center gap-2 text-xl font-bold tracking-widest font-mono text-slate-800">
        <Clock className="w-4 h-4 text-blue-600" />
        {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 uppercase tracking-wide font-medium">
        <Calendar className="w-3 h-3" />
        {time.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
      </div>
    </div>
  );
};

// Sino de notificações
function NotificationBell({ userEmail }) {
  const { data: notificacoes = [] } = useQuery({
    queryKey: ['notificacoes_bell', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const todas = await base44.entities.Notificacao.list('-created_date', 50);
      return todas.filter(n => n.destinatario_email === userEmail);
    },
    enabled: !!userEmail,
    refetchInterval: 30000,
  });
  const naoLidas = notificacoes.filter(n => !n.lida).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5 text-slate-500" />
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="p-0 shadow-xl border border-slate-200 rounded-2xl overflow-hidden" style={{ width: 'auto' }}>
        <NotificationCenter />
      </PopoverContent>
    </Popover>
  );
}

// ─── Classic Sidebar ──────────────────────────────────────────────────────────
function ClassicSidebar({ open, onClose, currentPageName, canDo, user, signOut, lockScreen }) {
  const navigate = useNavigate();
  return (
    <>
      {open && <div className="fixed inset-0 z-[490] bg-black/20" onClick={onClose} />}
      <aside className={cn(
        "fixed top-0 left-0 h-full z-[495] w-64 bg-white border-r border-slate-200 flex flex-col shadow-2xl transition-transform duration-300",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png" alt="J&C" className="h-8 w-auto" />
          <div>
            <h1 className="font-extrabold text-slate-800 text-lg leading-tight">J&C <span className="text-blue-600">Vision</span></h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Sistema de Gestão</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="px-2 py-2"><LiveClock /></div>
        <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
          {menuStructure.map((group, gi) => {
            const items = group.items.filter(item => item.public || canDo(item.name, 'visualizar'));
            if (items.length === 0) return null;
            return (
              <div key={gi}>
                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{group.title}</p>
                {items.map(item => (
                  <button key={item.name} onClick={() => { navigate(`/${item.name}`); onClose(); }}
                    className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      currentPageName === item.name ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
                    )}>
                    <item.icon className={cn("w-4 h-4", currentPageName === item.name ? "text-blue-600" : "text-slate-400")} />
                    {item.name}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 p-2 flex gap-2">
          <button onClick={() => { lockScreen?.(); onClose(); }} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors">
            <Lock className="w-4 h-4" /> Bloquear
          </button>
          <button onClick={() => { signOut(); onClose(); }} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Classic Header (when ui_mode = classico) ─────────────────────────────────
function ClassicHeader({ onOpenMenu, user, userEmail }) {
  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-50 shadow-sm">
      <div className="flex items-center gap-3">
        <button onClick={onOpenMenu} className="p-2 rounded-lg hover:bg-slate-100">
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png" alt="J&C" className="h-8 w-auto" />
        <span className="font-bold text-lg text-slate-800 hidden sm:block">J&C Gestão</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden sm:block">
          <GlobalSearch compact={false} />
        </div>
        <NotificationBell userEmail={userEmail} />
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.avatar_url} className="object-cover" />
          <AvatarFallback className="bg-blue-600 text-white text-xs">
            {(user?.preferred_name || user?.full_name || user?.email || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}

// ─── Start Menu (OS mode, Sidebar flutuante) ──────────────────────────────────
function StartMenu({ open, onClose, currentPageName, canDo, user, signOut, lockScreen }) {
  const workspace = useWorkspace();

  const handleNav = (name) => {
    onClose();
    if (workspace) workspace.openWindow(name);
  };

  return (
      <div
        className="w-72 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 64px)' }}
      >
        {/* User header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-slate-50">
          <Avatar className="h-10 w-10 border border-white shadow-sm ring-2 ring-slate-100">
            <AvatarImage src={user?.avatar_url} className="object-cover" />
            <AvatarFallback className="bg-blue-600 text-white font-bold text-sm">
              {(user?.preferred_name || user?.full_name || user?.email || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold text-slate-800 truncate">{user?.preferred_name || user?.full_name || 'Usuário'}</p>
            <p className="text-[11px] text-slate-400 capitalize">{user?.role || 'Visitante'}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="px-2 py-2">
          <LiveClock />
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-3 custom-scrollbar">
          {menuStructure.map((group, gi) => {
            const items = group.items.filter(item => item.public || canDo(item.name, 'visualizar'));
            if (items.length === 0) return null;
            return (
              <div key={gi}>
                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{group.title}</p>
                {items.map(item => (
                  <button
                    key={item.name}
                    onClick={() => handleNav(item.name)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      currentPageName === item.name
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", currentPageName === item.name ? "text-blue-600" : "text-slate-400")} />
                    {item.name}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="border-t border-slate-100 p-2 flex gap-2">
          <button
            onClick={() => { lockScreen?.(); onClose(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors"
          >
            <Lock className="w-4 h-4" /> Bloquear
          </button>
          <button
            onClick={() => { signOut(); onClose(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </div>
  );
}

// ─── Inner Layout ─────────────────────────────────────────────────────────────
function LayoutInner({ children, currentPageName }) {

  const { user, signOut } = useAuth();
  const { lockScreen } = useSecurity();
  useRealtimeSync();
  const { canDo } = usePermissions();
  const { preferences } = usePreferences();
  const [menuOpen, setMenuOpen] = useState(false);
  const workspace = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();

  const uiMode = preferences?.ui_mode || 'os';
  const tbPos = preferences?.taskbar_position || 'top';
  const isOSMode = uiMode === 'os';
  
  // PONTE DE TRANSIÇÃO: Observar mudanças no ui_mode
  const prevModeRef = useRef(uiMode);
  useEffect(() => {
    const prevMode = prevModeRef.current;
    const currentMode = uiMode;
    
    if (prevMode === currentMode) return;
    prevModeRef.current = currentMode;
    
    // Classic -> OS: Transformar página atual em janela
    if (prevMode === 'classico' && currentMode === 'os') {
      const currentPath = location.pathname.replace('/', '');
      const pageName = currentPath || 'Dashboard';
      
      // Abrir a página atual como janela
      if (workspace && pageName !== 'Dashboard') {
        setTimeout(() => {
          workspace.openWindow(pageName);
          navigate('/Dashboard');
        }, 100);
      } else if (!currentPath || currentPath === 'Dashboard') {
        navigate('/Dashboard');
      }
    }
    
    // OS -> Classic: Transformar janela ativa em página
    if (prevMode === 'os' && currentMode === 'classico') {
      const activeWindow = workspace?.windows?.find(w => w.id === workspace.activeId);
      
      if (activeWindow) {
        navigate('/' + activeWindow.page);
      } else {
        navigate('/Dashboard');
      }
    }
  }, [uiMode, location.pathname, workspace, navigate]);

  const autoHide = preferences?.taskbar_autohide === true;

  // Compute safe-area padding for the main content
  const mainPadding = isOSMode ? (autoHide ? {} : {
    paddingTop:    tbPos === 'top'    ? 48 : 0,
    paddingBottom: tbPos === 'bottom' ? 48 : 0,
    paddingLeft:   tbPos === 'left'   ? 48 : 0,
    paddingRight:  tbPos === 'right'  ? 48 : 0,
  }) : { paddingTop: 56 };

  // Notification bell position
  const bellStyle = {
    zIndex: 501,
    ...(tbPos === 'top'    ? { top: 6,   right: 60 } : {}),
    ...(tbPos === 'bottom' ? { bottom: 6, right: 60 } : {}),
    ...(tbPos === 'left'   ? { top: 6,   left: 56 } : {}),
    ...(tbPos === 'right'  ? { top: 6,   right: 56 } : {}),
  };

  // Start menu anchor
  const startMenuAnchor = {
    top:    { top: 48,  left: 4 },
    bottom: { bottom: 48, left: 4 },
    left:   { top: 4,  left: 48 },
    right:  { top: 4,  right: 48 },
  }[tbPos] || { top: 48, left: 4 };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-x-hidden">
      <NotificationToastManager />

      {/* ── MOBILE HEADER (always classic on mobile) ── */}
      <div className="md:hidden">
        <ClassicHeader onOpenMenu={() => setMenuOpen(true)} user={user} userEmail={user?.email} />
        <ClassicSidebar
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          currentPageName={currentPageName}
          canDo={canDo}
          user={user}
          signOut={signOut}
          lockScreen={lockScreen}
        />
      </div>

      {/* ── DESKTOP: OS mode ── */}
      {isOSMode && (
        <div className="hidden md:block">
          <OSTaskbar onToggleSidebar={() => setMenuOpen(o => !o)} />
          {/* Start Menu — anchored to taskbar position */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[490]" onClick={() => setMenuOpen(false)} />
              <div className="fixed z-[495] w-72" style={startMenuAnchor}>
                <StartMenu
                  open={menuOpen}
                  onClose={() => setMenuOpen(false)}
                  currentPageName={currentPageName}
                  canDo={canDo}
                  user={user}
                  signOut={signOut}
                  lockScreen={lockScreen}
                />
              </div>
            </>
          )}
          <div className="fixed hidden md:block" style={bellStyle}>
            <NotificationBell userEmail={user?.email} />
          </div>
        </div>
      )}

      {/* ── DESKTOP: Classic mode ── */}
      {!isOSMode && (
        <div className="hidden md:block">
          <ClassicHeader onOpenMenu={() => setMenuOpen(true)} user={user} userEmail={user?.email} />
          <ClassicSidebar
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            currentPageName={currentPageName}
            canDo={canDo}
            user={user}
            signOut={signOut}
            lockScreen={lockScreen}
          />
        </div>
      )}

      {/* ── Page Content ── */}
      <main
        className="w-full min-h-screen transition-all duration-300 pt-14 md:pt-0"
        style={{ ...mainPadding }}
      >
        {isOSMode ? (
          // No modo OS, sempre mostrar Dashboard como background
          location.pathname === '/Dashboard' || location.pathname === '/' ? children : null
        ) : (
          // No modo clássico, renderizar normalmente
          children
        )}
      </main>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <AuthProvider>
      <SecurityProvider>
        <WorkspaceProvider>
          <LayoutInner currentPageName={currentPageName}>{children}</LayoutInner>
        </WorkspaceProvider>
      </SecurityProvider>
    </AuthProvider>
  );
}