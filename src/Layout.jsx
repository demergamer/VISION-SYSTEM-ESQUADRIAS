import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  Settings, 
  LogOut, 
  Clock, 
  Calendar,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  LayoutDashboard
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useAuth } from '@/lib/AuthContext';
import { pagesConfig } from './pages.config';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

// Componente de Relógio em Tempo Real
const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-900/50 rounded-xl border border-white/10 text-white backdrop-blur-md mb-4 w-full">
      <div className="flex items-center gap-2 text-2xl font-bold tracking-widest font-mono">
        <Clock className="w-5 h-5 text-blue-400" />
        {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 uppercase tracking-wide">
        <Calendar className="w-3 h-3" />
        {time.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
      </div>
    </div>
  );
};

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  // --- ESTADOS DE PREFERÊNCIA (PERSISTENTES) ---
  const [isEnabled, setIsEnabled] = useState(() => localStorage.getItem('jc_sidebar_enabled') !== 'false');
  const [position, setPosition] = useState(() => localStorage.getItem('jc_sidebar_pos') || 'left');
  
  // --- ESTADO DE INTERAÇÃO (HOVER) ---
  const [isOpen, setIsOpen] = useState(false);
  const hoverTimeoutRef = useRef(null);

  // Salvar preferências
  useEffect(() => { localStorage.setItem('jc_sidebar_enabled', isEnabled); }, [isEnabled]);
  useEffect(() => { localStorage.setItem('jc_sidebar_pos', position); }, [position]);

  // Lógica de "Hover" inteligente (com delay para não piscar)
  const handleMouseEnter = () => {
    if (!isEnabled) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300); // 300ms de tolerância antes de fechar
  };

  // Ícones de Navegação
  const { Pages } = pagesConfig;
  const navItems = Object.keys(Pages).filter(key => key !== 'Login' && key !== 'Cadastro' && key !== 'AcessoNegado').map(key => ({
    name: key,
    path: `/${key}`,
    icon: LayoutDashboard // Você pode mapear ícones específicos aqui se quiser
  }));

  // Classes dinâmicas baseadas na posição
  const sidebarClasses = cn(
    "fixed z-[50] bg-slate-950/95 backdrop-blur-xl border-slate-800 text-slate-200 shadow-2xl transition-all duration-300 ease-out flex",
    // Posições
    position === 'left' && "left-0 top-0 bottom-0 w-72 border-r transform",
    position === 'right' && "right-0 top-0 bottom-0 w-72 border-l transform",
    position === 'top' && "top-0 left-0 right-0 h-auto border-b transform flex-row",
    position === 'bottom' && "bottom-0 left-0 right-0 h-auto border-t transform flex-row",
    
    // Visibilidade (Slide)
    !isOpen && position === 'left' && "-translate-x-full",
    !isOpen && position === 'right' && "translate-x-full",
    !isOpen && position === 'top' && "-translate-y-full",
    !isOpen && position === 'bottom' && "translate-y-full",
    
    // Se estiver desativado pelo olho, esconde totalmente
    !isEnabled && "opacity-0 pointer-events-none"
  );

  // Zona de Gatilho (A borda invisível)
  const triggerZoneClasses = cn(
    "fixed z-[40] bg-transparent hover:bg-blue-500/10 transition-colors duration-200",
    !isEnabled && "hidden", // Se o olho tá fechado, a zona não existe
    // Tamanho da zona
    position === 'left' && "left-0 top-0 bottom-0 w-6",
    position === 'right' && "right-0 top-0 bottom-0 w-6",
    position === 'top' && "top-0 left-0 right-0 h-6",
    position === 'bottom' && "bottom-0 left-0 right-0 h-6",
  );

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-x-hidden">
      
      {/* --- BOTÃO MESTRE (OLHO) --- */}
      <div className="fixed top-4 left-4 z-[60] flex flex-col gap-2 group">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setIsEnabled(!isEnabled)}
          className={cn(
            "rounded-full shadow-lg border border-white/20 transition-all duration-300",
            isEnabled ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-red-500 text-white hover:bg-red-600 animate-pulse"
          )}
          title={isEnabled ? "Desativar Menu Lateral" : "Ativar Menu Lateral"}
        >
          {isEnabled ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
        </Button>
        
        {/* Menu de Configuração Rápida (Aparece ao passar o mouse no olho) */}
        <div className="absolute top-12 left-0 bg-white p-2 rounded-xl shadow-xl border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto w-40 origin-top-left transform scale-95 group-hover:scale-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 px-2">Posição do Menu</p>
          <div className="grid grid-cols-4 gap-1">
            <button onClick={() => setPosition('left')} className={cn("p-1.5 rounded hover:bg-slate-100 flex justify-center", position === 'left' && "bg-blue-100 text-blue-600")} title="Esquerda"><ChevronLeft size={16}/></button>
            <button onClick={() => setPosition('right')} className={cn("p-1.5 rounded hover:bg-slate-100 flex justify-center", position === 'right' && "bg-blue-100 text-blue-600")} title="Direita"><ChevronRight size={16}/></button>
            <button onClick={() => setPosition('top')} className={cn("p-1.5 rounded hover:bg-slate-100 flex justify-center", position === 'top' && "bg-blue-100 text-blue-600")} title="Topo"><ChevronUp size={16}/></button>
            <button onClick={() => setPosition('bottom')} className={cn("p-1.5 rounded hover:bg-slate-100 flex justify-center", position === 'bottom' && "bg-blue-100 text-blue-600")} title="Baixo"><ChevronDown size={16}/></button>
          </div>
        </div>
      </div>

      {/* --- ZONA DE GATILHO (Invisível) --- */}
      <div 
        className={triggerZoneClasses} 
        onMouseEnter={handleMouseEnter}
      />

      {/* --- SIDEBAR PRINCIPAL --- */}
      <aside 
        className={sidebarClasses}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={cn("flex w-full h-full p-4", (position === 'top' || position === 'bottom') ? "flex-row items-center gap-6 overflow-x-auto" : "flex-col")}>
          
          {/* Cabeçalho do Menu */}
          <div className={cn("flex items-center gap-3 shrink-0", (position === 'top' || position === 'bottom') ? "border-r border-white/10 pr-6 mr-2" : "mb-6 border-b border-white/10 pb-6")}>
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/50">
              <span className="font-bold text-white text-xl">J&C</span>
            </div>
            <div>
              <h1 className="font-bold text-white leading-tight">Gestão B2B</h1>
              <p className="text-xs text-slate-400">Financeiro & Vendas</p>
            </div>
          </div>

          {/* Relógio (Só aparece se for vertical para não ocupar muito espaço horizontal) */}
          {(position === 'left' || position === 'right') && <LiveClock />}

          {/* Lista de Navegação */}
          <nav className={cn("flex-1 overflow-y-auto space-y-1 custom-scrollbar", (position === 'top' || position === 'bottom') && "flex flex-row space-y-0 space-x-2 items-center overflow-x-auto")}>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative overflow-hidden",
                  currentPageName === item.name
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", currentPageName === item.name ? "text-white" : "text-slate-500 group-hover:text-white")} />
                <span className="truncate">{item.name}</span>
                {currentPageName === item.name && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full opacity-50" />
                )}
              </Link>
            ))}
          </nav>

          {/* Rodapé / Usuário */}
          <div className={cn("mt-auto pt-4 border-t border-white/10", (position === 'top' || position === 'bottom') && "border-t-0 border-l ml-auto pl-4 border-white/10 mt-0 pt-0")}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                  <Avatar className="h-9 w-9 border-2 border-slate-700">
                    <AvatarImage src={user?.photoURL} />
                    <AvatarFallback className="bg-slate-800 text-slate-200">
                      {user?.email?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden hidden sm:block">
                    <p className="text-sm font-medium text-white truncate">{user?.displayName || 'Usuário'}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <Settings className="w-4 h-4 text-slate-500" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-200">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuLabel className="text-xs text-slate-500 mt-2">Posição do Menu</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
                  <DropdownMenuRadioItem value="left" className="focus:bg-slate-800 focus:text-white">Esquerda</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="right" className="focus:bg-slate-800 focus:text-white">Direita</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="top" className="focus:bg-slate-800 focus:text-white">Topo</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="bottom" className="focus:bg-slate-800 focus:text-white">Baixo</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem 
                  className="text-red-400 focus:text-red-300 focus:bg-red-950/30 cursor-pointer"
                  onClick={signOut}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sair do Sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </div>
      </aside>

      {/* --- CONTEÚDO DA PÁGINA --- */}
      <main className="w-full min-h-screen transition-all duration-300">
        {children}
      </main>

    </div>
  );
}