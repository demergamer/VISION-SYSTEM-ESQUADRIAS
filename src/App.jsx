import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Segurança
import AuthGuard from '@/components/AuthGuard';
import PermissionGuard from '@/components/PermissionGuard';

// Layout Único
import AdminLayout from '@/layouts';

// Páginas Públicas
import Login from '@/pages/Login';
import Welcome from '@/pages/Welcome';
import AcessoNegado from '@/pages/AcessoNegado';

// Páginas do Sistema (Admin, Financeiro, etc...)
import Dashboard from '@/pages/Dashboard';
import Pedidos from '@/pages/Pedidos';
import Cheques from '@/pages/Cheques';
import Clientes from '@/pages/Clientes';
import Financeiro from '@/pages/Financeiro';
import Fornecedores from '@/pages/Fornecedores';
// ... importar as outras páginas aqui ...

// Portais
import PortalDoRepresentante from '@/pages/PortalDoRepresentante';
import PortalCliente from '@/pages/PortalCliente';

export default function App() {
  const { data: user, isLoading } = useQuery({ 
    queryKey: ['me'], 
    queryFn: () => base44.auth.me(),
    retry: false
  });

  if (isLoading) return <div className="h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <Router>
      <Routes>
        
        {/* ROTA PÚBLICA (LOGIN AUTOMÁTICO NA MESMA URL SE PRECISAR) */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/acesso-negado" element={<AcessoNegado />} />

        {/* LAYOUT GERAL (ADMIN LAYOUT)
            Aqui dentro, o AuthGuard deixa passar qualquer um que esteja LOGADO.
            O próprio AdminLayout deve decidir se mostra o Menu Lateral ou não.
        */}
        <Route element={<AuthGuard />}>
          <Route element={<AdminLayout />}>
            
            {/* --- ÁREA ADMINISTRATIVA (PROTEGIDA POR SETOR) --- */}
            {/* Só usuários com permissão 'admin', 'financeiro', etc acessam essas rotas */}
            <Route path="/" element={<Dashboard />} />
            
            <Route path="/pedidos" element={<PermissionGuard setor="Pedidos"><Pedidos /></PermissionGuard>} />
            <Route path="/financeiro" element={<PermissionGuard setor="Financeiro"><Financeiro /></PermissionGuard>} />
            <Route path="/cheques" element={<PermissionGuard setor="Cheques"><Cheques /></PermissionGuard>} />
            <Route path="/clientes" element={<PermissionGuard setor="Clientes"><Clientes /></PermissionGuard>} />
            <Route path="/fornecedores" element={<PermissionGuard setor="Fornecedores"><Fornecedores /></PermissionGuard>} />
            {/* ... outras rotas administrativas ... */}


            {/* --- PORTAIS (ACESSO LIVRE PARA QUEM TEM A ROLE CERTA) --- */}
            {/* Não usamos PermissionGuard aqui, pois é a "home" deles */}
            
            <Route path="/portal-representante" element={
               user?.role === 'representante' ? <PortalDoRepresentante /> : <Navigate to="/acesso-negado" />
            } />

            <Route path="/portal-cliente" element={
               user?.role === 'cliente' ? <PortalCliente /> : <Navigate to="/acesso-negado" />
            } />

          </Route>
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={
          !user ? <Login /> : (
            user.role === 'cliente' ? <Navigate to="/portal-cliente" replace /> :
            user.role === 'representante' ? <Navigate to="/portal-representante" replace /> :
            <Navigate to="/" replace />
          )
        } />

      </Routes>
    </Router>
  );
}