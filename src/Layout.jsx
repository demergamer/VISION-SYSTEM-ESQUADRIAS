import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { base44 } from '@/api/base44Client';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { name: 'Representantes', icon: Users, page: 'Representation' },
  { name: 'Clientes', icon: Building2, page: 'Clientes' },
  { name: 'Pedidos', icon: ShoppingCart, page: 'Pedidos' },
  { name: 'Créditos', icon: Wallet, page: 'Creditos' },
  { name: 'Cheques', icon: CreditCard, page: 'Cheques' },
  { name: 'Comissões', icon: Wallet, page: 'Comissoes' },
  { name: 'Balanço', icon: BarChart3, page: 'Balanco' },
  { name: 'Relatórios', icon: PieChart, page: 'Relatorios' },
  { name: 'Usuários', icon: Users, page: 'Usuarios' },
];

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const hasAccess = (pageName) => {
    if (!user) return false;
    
    const permissoes = user.permissoes || {};
    const perm = permissoes[pageName];
    
    return perm === true || perm?.acesso === true;
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Layout simplificado para clientes (role="user" ou página PortalCliente)
  if (user?.role === 'user' || currentPageName === 'PortalCliente') {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-xl text-slate-800">Portal do Cliente</h1>
            <p className="text-xs text-slate-500">{user?.email || ''}</p>
          </div>
          <Button
            variant="ghost"
            className="gap-2 text-slate-600 hover:text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
        <main className="pt-20">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-slate-800">Controle Financeiro</h1>
        <div className="w-10" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r transform transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <h1 className="font-bold text-xl text-slate-800">Controle</h1>
              <p className="text-xs text-slate-500">Financeiro a Receber</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems
              .filter(item => hasAccess(item.page))
              .map((item) => {
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <item.icon className={cn(
                      "w-5 h-5",
                      isActive ? "text-blue-600" : "text-slate-400"
                    )} />
                    {item.name}
                  </Link>
                );
              })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-slate-600 hover:text-red-600 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "lg:ml-64 min-h-screen",
        "pt-16 lg:pt-0" // Add padding for mobile header
      )}>
        {children}
      </main>
    </div>
  );
}