import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  ShoppingCart,
  CreditCard,
  Wallet,
  BarChart3,
  PieChart,
  LogOut,
  Lock // Ícone para indicar desenvolvimento/bloqueado
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner"; // Import para o aviso de desenvolvimento

// Importando os componentes da Sidebar
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator
} from "@/components/ui/sidebar";

// Definição da Estrutura do Menu por Tópicos
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
      { name: 'Representantes', icon: Users, page: 'Representation' }, // Link para Representantes
      { name: 'Usuários', icon: Users, page: 'Usuarios' },
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
      // Módulo em desenvolvimento
      { name: 'Cheques', icon: CreditCard, page: 'ChequesPagar', isDev: true }, 
      { name: 'Comissões', icon: Wallet, page: 'Comissoes' },
    ]
  },
  {
    category: "Feedback",
    items: [
      { name: 'Relatórios', icon: PieChart, page: 'Relatorios' },
      { name: 'Balanço', icon: BarChart3, page: 'Balanco' },
    ]
  }
];

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const hasAccess = (pageName) => {
    if (!user) return false;
    // Permite acesso se for item de desenvolvimento para mostrar o aviso, 
    // ou verifica permissões reais.
    if (pageName === 'ChequesPagar') return true; 
    
    const permissoes = user.permissoes || {};
    const perm = permissoes[pageName];
    return perm === true || perm?.acesso === true;
  };

  const handleDevClick = (e) => {
    e.preventDefault();
    toast.info("Módulo em Desenvolvimento", {
      description: "A gestão de Cheques a Pagar estará disponível em breve.",
      icon: <Lock className="w-4 h-4 text-amber-500" />
    });
  };

  // --- LAYOUTS ESPECIAIS (PORTAIS) ---
  if (currentPageName === 'PortalDoRepresentante' || currentPageName === 'PortalCliente') {
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
        <main className="pt-24 px-4 pb-10 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    );
  }

  // --- LAYOUT PRINCIPAL (ADMIN) ---
  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        {/* CABEÇALHO DA SIDEBAR */}
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

        {/* CONTEÚDO DA NAVEGAÇÃO ORGANIZADO POR GRUPOS */}
        <SidebarContent>
          {navStructure.map((group, index) => (
            <SidebarGroup key={index}>
              {/* O Label some automaticamente quando a sidebar recolhe (graças ao CSS do componente Sidebar) */}
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
                            // Se for DEV, aplica estilo desabilitado visualmente
                            className={item.isDev ? "opacity-70" : ""}
                          >
                            <button 
                              className="cursor-pointer flex items-center w-full"
                              onClick={item.isDev ? handleDevClick : () => navigate(createPageUrl(item.page))}
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

        {/* RODAPÉ DA SIDEBAR */}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Users className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user?.nome || 'Usuário'}</span>
                  <span className="truncate text-xs text-slate-500">{user?.email}</span>
                </div>
                <LogOut 
                  className="ml-auto size-4 text-red-500 hover:text-red-700 cursor-pointer" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                  }}
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* ÁREA PRINCIPAL DO CONTEÚDO */}
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white/50 backdrop-blur-sm px-4 sticky top-0 z-20">
          <SidebarTrigger className="-ml-1" />
          <div className="h-4 w-px bg-slate-200 mx-2" />
          <h1 className="font-semibold text-slate-800">
            {navStructure
              .flatMap(g => g.items)
              .find(i => i.page === currentPageName)?.name || 'J&C System'}
          </h1>
        </header>
        
        <div className="flex-1 p-4 md:p-8 pt-6 overflow-x-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}