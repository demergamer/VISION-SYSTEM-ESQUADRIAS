import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, Users, Building2, ShoppingCart, CreditCard, Wallet,
  BarChart3, PieChart, LogOut, Lock, Search, Bell, Menu, X, FileText,
  ChevronRight, Command, Truck, UserPlus, Package, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

// Importando os componentes da Sidebar
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarGroup,
  SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarFooter, SidebarInset, SidebarTrigger, SidebarSeparator
} from "@/components/ui/sidebar";

// --- Estrutura do Menu ---
const navStructure = [
  {
    category: "Principal",
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' }
    ]
  },
  {
    category: "Cadastros",
    items: [
      { name: 'Clientes', icon: Building2, page: 'Clientes' },
      { name: 'Representantes', icon: Users, page: 'Representation' },
      { name: 'Fornecedores', icon: Truck, page: 'Fornecedores' },
      { name: 'Formas de Pagamento', icon: CreditCard, page: 'FormasPagamento' },
    ]
  },
  {
    category: "Vendas",
    items: [
      { name: 'Solicitações', icon: UserPlus, page: 'Cadastro' },
      { name: 'Orçamentos', icon: FileText, page: 'Orcamentos' },
      { name: 'Produtos', icon: Package, page: 'CadastroPecas' },
      { name: 'Agrupar Orçamentos', icon: Layers, page: 'AgruparOrcamentos' },
    ]
  },
  {
    category: "A Receber",
    items: [
      { name: 'Pedidos', icon: ShoppingCart, page: 'Pedidos' },
      { name: 'Cheques', icon: CreditCard, page: 'Cheques' },
      { name: 'Créditos', icon: Wallet, page: 'Creditos' },
    ]
  },
  {
    category: "A Pagar",
    items: [
      { name: 'Pagamentos', icon: CreditCard, page: 'Pagamentos', isDev: true }, 
      { name: 'Comissões', icon: Wallet, page: 'Comissoes' },
    ]
  },
  {
    category: "Feedback",
    items: [
      { name: 'Relatórios', icon: PieChart, page: 'Relatorios' },
      { name: 'Balanço', icon: BarChart3, page: 'Balanco' },
    ]
  },
  {
    category: "Master",
    items: [
      { name: 'Logs de Atividade', icon: FileText, page: 'Logs', isDev: true },
      { name: 'Usuários', icon: Users, page: 'Usuarios' },
    ]
  }
];

// --- Componente de Busca Global (Command Palette) ---
const GlobalSearch = ({ open, onOpenChange, navigate }) => {
  const [query, setQuery] = useState("");
  
  // Simulação de resultados (aqui você conectaria com base44.entities...)
  const mockResults = [
    { type: 'Cliente', name: 'J&C Esquadrias', id: 'CLI001', page: 'Clientes' },
    { type: 'Pedido', name: 'Pedido #60285 - Loja Jacui', id: '60285', page: 'Pedidos' },
    { type: 'Representante', name: 'Altimar', id: 'REP05', page: 'Representation' },
  ].filter(item => item.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-xl bg-white overflow-hidden rounded-2xl border-none shadow-2xl">
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input 
            className="flex-1 bg-transparent outline-none text-lg text-slate-700 placeholder:text-slate-300"
            placeholder="O que você procura?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="text-xs text-slate-300 font-mono border border-slate-100 px-1.5 py-0.5 rounded">ESC</div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {query === "" && (
            <p className="text-xs text-slate-400 p-3 text-center">Digite para buscar clientes, pedidos ou módulos...</p>
          )}
          {query !== "" && mockResults.length === 0 && (
            <p className="text-sm text-slate-500 p-4 text-center">Nenhum resultado encontrado.</p>
          )}
          {mockResults.map((result, idx) => (
            <button
              key={idx}
              onClick={() => {
                navigate(createPageUrl(result.page) + (result.type === 'Pedido' ? `?busca=${result.id}` : ''));
                onOpenChange(false);
              }}
              className="w-full flex items-center justify-between p-3 hover:bg-blue-50 rounded-xl group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${result.type === 'Pedido' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                  {result.type === 'Pedido' ? <ShoppingCart size={16} /> : <Users size={16} />}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">{result.name}</p>
                  <p className="text-xs text-slate-400">{result.type}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400" />
            </button>
          ))}
        </div>
        <div className="bg-slate-50 p-2 text-[10px] text-slate-400 text-center border-t border-slate-100">
          <strong>J&C System</strong> Global Search
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [lastInteraction, setLastInteraction] = React.useState(Date.now());

  // Atalho de Teclado CTRL+K ou CMD+K
  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Auto-collapse sidebar após 15s sem interação
  React.useEffect(() => {
    const handleActivity = () => setLastInteraction(Date.now());
    
    const checkInactivity = setInterval(() => {
      const timeSinceLastInteraction = Date.now() - lastInteraction;
      if (timeSinceLastInteraction > 15000 && sidebarOpen) {
        const sidebarTrigger = document.querySelector('[data-sidebar="trigger"]');
        if (sidebarTrigger) sidebarTrigger.click();
      }
    }, 5000);

    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('click', handleActivity);
    document.addEventListener('keydown', handleActivity);

    return () => {
      clearInterval(checkInactivity);
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('keydown', handleActivity);
    };
  }, [lastInteraction, sidebarOpen]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const hasAccess = (pageName) => {
    if (!user) return false;
    if (['Pagamentos', 'Logs', 'Fornecedores', 'FormasPagamento', 'Cadastro', 'Orcamentos', 'CadastroPecas', 'AgruparOrcamentos'].includes(pageName)) return true;
    const permissoes = user.permissoes || {};
    const perm = permissoes[pageName];
    return perm === true || perm?.acesso === true;
  };

  const handleDevClick = (e, moduleName) => {
    e.preventDefault();
    toast.info(`Módulo ${moduleName}`, {
      description: "Esta funcionalidade está em desenvolvimento (Fase Master).",
      icon: <Lock className="w-4 h-4 text-amber-500" />
    });
  };

  // --- LAYOUTS ESPECIAIS ---
  if (currentPageName === 'PortalDoRepresentante' || currentPageName === 'PortalCliente') {
    // ... (Mantido código dos portais)
    const title = currentPageName === 'PortalDoRepresentante' ? 'Portal do Representante' : 'Portal do Cliente';
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="font-bold text-xl text-slate-800">{title}</h1>
            <p className="text-xs text-slate-500">{user?.email || ''}</p>
          </div>
          <Button variant="ghost" className="gap-2 text-red-600 hover:bg-red-50" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
        <main className="pt-24 px-4 pb-10 max-w-7xl mx-auto">{children}</main>
      </div>
    );
  }

  // --- LAYOUT PRINCIPAL (ADMIN) ---
  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-3 p-2">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md">
              <Building2 className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-bold text-slate-800">J&C Esquadrias</span>
              <span className="truncate text-xs text-slate-500 font-medium">Gestão Financeira</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarSeparator />
        
        <SidebarContent>
          {navStructure.map((group, index) => (
            <SidebarGroup key={index}>
              <SidebarGroupLabel>{group.category}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items
                    .filter(item => hasAccess(item.page))
                    .map((item) => {
                      const isActive = currentPageName === item.page;
                      return (
                        <SidebarMenuItem key={item.page}>
                          <SidebarMenuButton 
                            asChild 
                            isActive={isActive}
                            tooltip={item.name}
                            size="default"
                            className={item.isDev ? "opacity-70 grayscale-[0.5]" : ""}
                          >
                            <button 
                              className="cursor-pointer flex items-center w-full"
                              onClick={item.isDev ? (e) => handleDevClick(e, item.name) : () => navigate(createPageUrl(item.page))}
                            >
                              <item.icon className={item.isDev ? "text-slate-400" : ""} />
                              <span>{item.name}</span>
                              {item.isDev && (
                                <Lock className="ml-auto w-3 h-3 text-slate-400" />
                              )}
                            </button>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Users className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user?.nome || 'Usuário'}</span>
                  <span className="truncate text-xs text-slate-500">{user?.email}</span>
                </div>
                <LogOut className="ml-auto size-4 text-red-500 hover:text-red-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleLogout(); }} />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* HEADER COM BUSCA E NOTIFICAÇÕES */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white/70 backdrop-blur-md px-4 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" data-sidebar="trigger" />
            <div className="h-4 w-px bg-slate-200 mx-2" />
            <h1 className="font-semibold text-slate-800 text-sm md:text-base">
              {navStructure.flatMap(g => g.items).find(i => i.page === currentPageName)?.name || 'J&C System'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão de Busca */}
            <div 
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 border border-slate-200/60 rounded-full cursor-pointer hover:bg-slate-100 transition-colors mr-2"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500">Buscar...</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-slate-500 opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
            
            {/* Mobile Search Icon */}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchOpen(true)}>
               <Search className="w-5 h-5 text-slate-500" />
            </Button>

            {/* Centro de Notificações */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5 text-slate-500" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                   <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                      <div className="flex justify-between w-full">
                         <span className="font-medium text-sm">Cheque a Vencer</span>
                         <span className="text-[10px] text-slate-400">Hoje</span>
                      </div>
                      <p className="text-xs text-slate-500">O cheque #123 de R$ 500,00 vence hoje.</p>
                   </DropdownMenuItem>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                      <div className="flex justify-between w-full">
                         <span className="font-medium text-sm">Pedido Atrasado</span>
                         <span className="text-[10px] text-slate-400">2h atrás</span>
                      </div>
                      <p className="text-xs text-slate-500">Pedido #60285 está atrasado há 5 dias.</p>
                   </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator />
                <Button variant="ghost" className="w-full text-xs h-8">Marcar todas como lidas</Button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <div className="flex-1 p-4 md:p-8 pt-6 overflow-x-hidden">
          {children}
        </div>

        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} navigate={navigate} />
      </SidebarInset>
    </SidebarProvider>
  );
}