import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Componentes de Segurança
import AuthGuard from '@/components/AuthGuard'; // Verifica apenas se está logado
import PermissionGuard from '@/components/PermissionGuard'; // Verifica permissões granulares (Admin)

// Páginas Administrativas (Internas)
import Dashboard from '@/pages/Dashboard';
import Pedidos from '@/pages/Pedidos';
import Cheques from '@/pages/Cheques';
import Clientes from '@/pages/Clientes';
import Financeiro from '@/pages/Financeiro';

// Páginas de Portais (Externas)
import PortalDoRepresentante from '@/pages/PortalDoRepresentante';
import PortalCliente from '@/pages/PortalCliente';
import Login from '@/pages/Login';
import AcessoNegado from '@/pages/AcessoNegado';

// Layouts
import AdminLayout from '@/layouts/AdminLayout'; // Menu lateral, Topbar, etc.
import PortalLayout from '@/layouts/PortalLayout'; // Layout simplificado para portais

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
        {/* ROTA PÚBLICA */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/acesso-negado" element={<AcessoNegado />} />

        {/* --------------------------------------------------------------- */}
        {/* GRUPO 1: ÁREA ADMINISTRATIVA (COM PERMISSION GUARD)             */}
        {/* Só entra aqui quem tem role de Admin, Financeiro, Logística, etc */}
        {/* --------------------------------------------------------------- */}
        <Route element={<AuthGuard allowedRoles={['admin', 'financeiro', 'logistica', 'comercial']} />}>
          <Route element={<AdminLayout />}>
            
            <Route path="/" element={<Dashboard />} />
            
            {/* O PermissionGuard verifica permissões finas (ex: 'ver_pedidos') */}
            <Route path="/pedidos" element={
              <PermissionGuard setor="Pedidos">
                <Pedidos />
              </PermissionGuard>
            } />

            <Route path="/cheques" element={
              <PermissionGuard setor="Cheques">
                <Cheques />
              </PermissionGuard>
            } />

            <Route path="/clientes" element={
              <PermissionGuard setor="Clientes">
                <Clientes />
              </PermissionGuard>
            } />

            <Route path="/financeiro" element={
              <PermissionGuard setor="Financeiro">
                <Financeiro />
              </PermissionGuard>
            } />

          </Route>
        </Route>

        {/* --------------------------------------------------------------- */}
        {/* GRUPO 2: PORTAIS (SEM PERMISSION GUARD)                         */}
        {/* Aqui não bloqueamos por função granular, apenas pelo tipo de usuário */}
        {/* --------------------------------------------------------------- */}
        
        {/* PORTAL DO REPRESENTANTE */}
        <Route element={<AuthGuard allowedRoles={['representante']} />}>
          <Route element={<PortalLayout title="Área do Representante" />}>
            <Route path="/portal-representante" element={<PortalDoRepresentante />} />
          </Route>
        </Route>

        {/* PORTAL DO CLIENTE */}
        <Route element={<AuthGuard allowedRoles={['cliente']} />}>
          <Route element={<PortalLayout title="Área do Cliente" />}>
            <Route path="/portal-cliente" element={<PortalCliente />} />
          </Route>
        </Route>

        {/* Rota Default (Redirecionamento Inteligente) */}
        <Route path="*" element={
          user ? (
            user.role === 'cliente' ? <Navigate to="/portal-cliente" /> :
            user.role === 'representante' ? <Navigate to="/portal-representante" /> :
            <Navigate to="/" />
          ) : <Navigate to="/login" />
        } />

      </Routes>
    </Router>
  );
}