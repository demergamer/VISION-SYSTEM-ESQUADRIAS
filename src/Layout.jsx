import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  Settings as SettingsIcon, 
  LogOut, 
  Clock, 
  Calendar,
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Wallet,
  FileText,
  BarChart3,
  Home,
  Briefcase,
  Banknote,
  ScrollText,
  CreditCard,
  Menu, // Adicionado para mobile
  Building2 // Adicionado para logo
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { AuthProvider, useAuth } from '@/components/providers/AuthContext';
import { SecurityProvider } from '@/components/providers/SecurityProvider';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePermissions } from "@/components/hooks/usePermissions";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // Importante para Mobile
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- CONFIGURAÇÃO DOS GRUPOS DE MENU ---
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
      { name: "Logs", icon: ScrollText },
      { name: "Configuracoes", icon: SettingsIcon, public: true },
    ]
  }
];

// Componente de Relógio (Tema Claro)
const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-slate-100/80 rounded-xl border border-slate-200 text-slate-700 mb-4 w-full shadow-inner mx-auto max-w-[95%]">
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


function LayoutInner({ children, currentPageName }) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { canDo } = usePermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // --- ESTADOS DE SIDEBAR FLUTUANTE ---
  const [isEnabled, setIsEnabled] = useState(() => localStorage.getItem('jc_sidebar_enabled') !== 'false');
  const [position, setPosition] = useState(() => localStorage.getItem('jc_sidebar_pos') || 'left');
  
  // Controle de Hover e Interação
  const [isOpen, setIsOpen] = useState(false);
  const [isHoveringEye, setIsHoveringEye] = useState(false);
  const hoverTimeoutRef = useRef(null);

  useEffect(() => { localStorage.setItem('jc_sidebar_enabled', isEnabled); }, [isEnabled]);
  useEffect(() => { localStorage.setItem('jc_sidebar_pos', position); }, [position]);

  const handleMouseEnter = () => {
    if (!isEnabled) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  // --- RENDERIZAÇÃO DO CONTEÚDO DO MENU (REUTILIZÁVEL) ---
  const renderMenuContent = (isHorizontal = false) => (
    <>
      {/* Header do Menu */}
      <Link
          to="/Dashboard"
          onClick={() => setMobileMenuOpen(false)}
          className={cn("flex items-center gap-3 shrink-0 hover:opacity-80 transition-opacity", isHorizontal ? "border-r border-slate-200 pr-6 mr-2" : "mb-4 border-b border-slate-200 pb-4 p-4")}
        >
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png"
            alt="J&C Vision"
            className="h-8 w-auto object-contain"
          />
          {!isHorizontal && (
            <div>
              <h1 className="font-extrabold text-slate-800 text-lg leading-tight tracking-tight">J&C <span className="text-blue-600">Vision</span></h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Sistema de Gestão</p>
            </div>
          )}
        </Link>

      {!isHorizontal && <div className="px-2"><LiveClock /></div>}

      {/* Lista de Links */}
      <nav className={cn("flex-1 overflow-y-auto custom-scrollbar px-2", isHorizontal ? "flex flex-row items-center gap-6" : "space-y-6")}>
        {menuStructure.map((group, groupIndex) => {
          
          // FILTRO DE PERMISSÕES
          const authorizedItems = group.items.filter(item => {
            if (item.public) return true;
            return canDo(item.name, 'visualizar');
          });

          if (authorizedItems.length === 0) return null;

          return (
            <div key={groupIndex} className={cn("flex", isHorizontal ? "flex-row items-center gap-2 border-l pl-4 border-slate-200 first:border-0" : "flex-col space-y-1")}>
              
              {!isHorizontal && (
                <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2">
                  {group.title}
                </h3>
              )}
              
              <div className={cn("flex", isHorizontal ? "flex-row gap-2" : "flex-col space-y-1")}>
                {authorizedItems.map((item) => (
                  <Link
                    key={item.name}
                    to={`/${item.name}`}
                    onClick={() => setMobileMenuOpen(false)} // Fecha menu mobile ao clicar
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group relative overflow-hidden",
                      currentPageName === item.name
                        ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                      isHorizontal && "whitespace-nowrap py-1.5"
                    )}
                    title={isHorizontal ? item.name : undefined}
                  >
                    <item.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", currentPageName === item.name ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                    <span className={cn(isHorizontal && "hidden lg:inline-block")}>{item.name}</span>
                    {currentPageName === item.name && !isHorizontal && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full opacity-100" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer / User Info */}
      <div className={cn("mt-auto p-4 border-t border-slate-200 bg-slate-50/50", isHorizontal && "border-t-0 border-l ml-auto pl-4 border-slate-200 mt-0 pt-0 bg-transparent")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white cursor-pointer transition-all border border-transparent hover:border-slate-200 hover:shadow-sm">
              <Avatar className="h-9 w-9 border border-white shadow-sm ring-2 ring-slate-100">
                <AvatarImage src={user?.photoURL} />
                <AvatarFallback className="bg-blue-600 text-white font-bold text-xs">
                  {user?.email?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!isHorizontal && (
                <div className="flex-1 overflow-hidden hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-700 truncate">{user?.displayName || 'Usuário'}</p>
                  <p className="text-[10px] text-slate-400 truncate capitalize">{user?.role || 'Visitante'}</p>
                </div>
              )}
              <SettingsIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/Configuracoes" className="cursor-pointer">
                <SettingsIcon className="mr-2 h-4 w-4" /> Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sair do Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  // --- CSS DINÂMICO PARA SIDEBAR FLUTUANTE ---
  const eyePositionClasses = cn(
    "fixed z-[60] flex flex-col gap-2 transition-all duration-500 ease-in-out hidden md:flex", // Esconde olho no mobile
    position === 'left' && "left-4 top-4",
    position === 'right' && "right-4 top-4",
    position === 'top' && "left-4 top-4",
    position === 'bottom' && "left-4 bottom-4"
  );

  const sidebarClasses = cn(
    "fixed z-[50] bg-white border-slate-200 text-slate-700 shadow-2xl transition-all duration-300 ease-out hidden md:flex", // Esconde sidebar original no mobile
    position === 'left' && "left-0 top-0 bottom-0 w-72 border-r transform flex-col",
    position === 'right' && "right-0 top-0 bottom-0 w-72 border-l transform flex-col",
    position === 'top' && "top-0 left-0 right-0 h-auto border-b transform flex-row items-center px-4",
    position === 'bottom' && "bottom-0 left-0 right-0 h-auto border-t transform flex-row items-center px-4",
    !isOpen && position === 'left' && "-translate-x-full",
    !isOpen && position === 'right' && "translate-x-full",
    !isOpen && position === 'top' && "-translate-y-full",
    !isOpen && position === 'bottom' && "translate-y-full",
    !isEnabled && "opacity-0 pointer-events-none"
  );

  const triggerZoneClasses = cn(
    "fixed z-[40] bg-transparent hidden md:block", 
    !isEnabled && "hidden",
    position === 'left' && "left-0 top-0 bottom-0 w-6",
    position === 'right' && "right-0 top-0 bottom-0 w-6",
    position === 'top' && "top-0 left-0 right-0 h-6",
    position === 'bottom' && "bottom-0 left-0 right-0 h-6",
  );

  const isHorizontal = position === 'top' || position === 'bottom';

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-x-hidden">
      
      {/* --- MOBILE HEADER & MENU (NOVO) --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6 text-slate-600" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0 flex flex-col bg-white">
               {renderMenuContent(false)}
            </SheetContent>
          </Sheet>
          <span className="font-bold text-lg text-slate-800">J&C Gestão</span>
        </div>
        <Avatar className="h-8 w-8">
            <AvatarImage src={user?.photoURL} />
            <AvatarFallback className="bg-blue-600 text-white text-xs">{user?.email?.substring(0,2)}</AvatarFallback>
        </Avatar>
      </div>

      {/* --- DESKTOP CONTROLS --- */}
      <div 
        className={eyePositionClasses}
        onMouseEnter={() => setIsHoveringEye(true)}
        onMouseLeave={() => setIsHoveringEye(false)}
      >
        <div className="relative group">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setIsEnabled(!isEnabled)}
            className={cn(
              "rounded-full shadow-lg border transition-all duration-500",
              "opacity-30 group-hover:opacity-100",
              isEnabled 
                ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-blue-600" 
                : "bg-red-50 text-red-500 border-red-200 hover:bg-red-100 hover:text-red-600"
            )}
            title={isEnabled ? "Ocultar Menu" : "Mostrar Menu"}
          >
            {isEnabled ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <div className={triggerZoneClasses} onMouseEnter={handleMouseEnter} />

      {/* --- SIDEBAR FLUTUANTE (DESKTOP) --- */}
      <aside 
        className={sidebarClasses}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {renderMenuContent(isHorizontal)}
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="w-full min-h-screen transition-all duration-300 pt-16 md:pt-0">
        {children}
      </main>

    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <AuthProvider>
      <LayoutInner currentPageName={currentPageName}>{children}</LayoutInner>
    </AuthProvider>
  );
}