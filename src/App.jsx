import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Componentes
import AuthGuard from '@/components/AuthGuard';
import PermissionGuard from '@/components/PermissionGuard';
import AdminLayout from '@/layouts/AdminLayout';
import PortalLayout from '@/layouts/PortalLayout';

// Páginas
import Login from '@/pages/Login';
import Welcome from '@/pages/Welcome';
import AcessoNegado from '@/pages/AcessoNegado';
import Dashboard from '@/pages/Dashboard';

// Operacional
import Pedidos from '@/pages/Pedidos';
import Orcamentos from '@/pages/Orcamentos';
import Produtos from '@/pages/Produtos';
import Clientes from '@/pages/Clientes';
import Fornecedores from '@/pages/Fornecedores';
import Representantes from '@/pages/Representantes';

// Financeiro
import Financeiro from '@/pages/Financeiro';
import Cheques from '@/pages/Cheques';
import CaixaDiario from '@/pages/CaixaDiario';
import Pagamentos from '@/pages/Pagamentos';
import Creditos from '@/pages/Creditos';
import Comissoes from '@/pages/Comissoes';
import EntradaCaucao from '@/pages/EntradaCaucao';
import Balanco from '@/pages/Balanco';
import FormasPagamento from '@/pages/FormasPagamento';

// Admin
import Usuarios from '@/pages/Usuarios';
import Relatorios from '@/pages/Relatorios';
import Logs from '@/pages/Logs';
import Cadastro from '@/pages/Cadastro';

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
        {/* ROTAS PÚBLICAS */}
        {/* Se já estiver logado, /login manda pra home, senão mostra login */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/acesso-negado" element={<AcessoNegado />} />

        {/* ÁREA ADMINISTRATIVA */}
        <Route element={<AuthGuard allowedRoles={['admin', 'financeiro', 'logistica', 'comercial', 'compras']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Dashboard />} />
            
            <Route path="/pedidos" element={<PermissionGuard setor="Pedidos"><Pedidos /></PermissionGuard>} />
            <Route path="/orcamentos" element={<PermissionGuard setor="Orcamentos"><Orcamentos /></PermissionGuard>} />
            <Route path="/produtos" element={<PermissionGuard setor="Produtos"><Produtos /></PermissionGuard>} />
            <Route path="/clientes" element={<PermissionGuard setor="Clientes"><Clientes /></PermissionGuard>} />
            <Route path="/fornecedores" element={<PermissionGuard setor="Fornecedores"><Fornecedores /></PermissionGuard>} />
            <Route path="/representantes" element={<PermissionGuard setor="Representantes"><Representantes /></PermissionGuard>} />

            <Route path="/financeiro" element={<PermissionGuard setor="Financeiro"><Financeiro /></PermissionGuard>} />
            <Route path="/cheques" element={<PermissionGuard setor="Cheques"><Cheques /></PermissionGuard>} />
            <Route path="/caixa-diario" element={<PermissionGuard setor="Caixa"><CaixaDiario /></PermissionGuard>} />
            <Route path="/pagamentos" element={<PermissionGuard setor="ContasPagar"><Pagamentos /></PermissionGuard>} />
            <Route path="/creditos" element={<PermissionGuard setor="Creditos"><Creditos /></PermissionGuard>} />
            <Route path="/comissoes" element={<PermissionGuard setor="Comissoes"><Comissoes /></PermissionGuard>} />
            <Route path="/entrada-caucao" element={<PermissionGuard setor="Financeiro"><EntradaCaucao /></PermissionGuard>} />
            <Route path="/balanco" element={<PermissionGuard setor="Financeiro"><Balanco /></PermissionGuard>} />
            
            <Route path="/formas-pagamento" element={<PermissionGuard setor="Configuracoes"><FormasPagamento /></PermissionGuard>} />

            <Route path="/usuarios" element={<PermissionGuard setor="Admin"><Usuarios /></PermissionGuard>} />
            <Route path="/relatorios" element={<PermissionGuard setor="Relatorios"><Relatorios /></PermissionGuard>} />
            <Route path="/logs" element={<PermissionGuard setor="Admin"><Logs /></PermissionGuard>} />
            <Route path="/cadastro" element={<PermissionGuard setor="Cadastros"><Cadastro /></PermissionGuard>} />
          </Route>
        </Route>

        {/* PORTAL DO REPRESENTANTE */}
        <Route element={<AuthGuard allowedRoles={['representante']} />}>
          <Route element={<PortalLayout title="Portal do Representante" />}>
            <Route path="/portal-representante" element={<PortalDoRepresentante />} />
          </Route>
        </Route>

        {/* PORTAL DO CLIENTE */}
        <Route element={<AuthGuard allowedRoles={['cliente']} />}>
          <Route element={<PortalLayout title="Área do Cliente" />}>
            <Route path="/portal-cliente" element={<PortalCliente />} />
          </Route>
        </Route>

        {/* FALLBACK (Rota 404 ou não encontrada) */}
        {/* SE NÃO ESTIVER LOGADO: Renderiza Login direto (sem mudar URL) */}
        {/* SE ESTIVER LOGADO: Redireciona baseado no perfil */}
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