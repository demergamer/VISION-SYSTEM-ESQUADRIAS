import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PermissionGuard from "@/components/PermissionGuard";

// --- IMPORT TEMPORÁRIO PARA FORÇAR CRIAÇÃO DO ARQUIVO ---
import { usePermissions } from "@/hooks/usePermissions"; 
// --------------------------------------------------------

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const PAGE_PERMISSIONS = {
  'Fornecedores': 'Fornecedores',
  'Pedidos': 'Pedidos',
  'Orcamentos': 'Orcamentos',
  'Produtos': 'Produtos',
  'Clientes': 'Clientes',
  'Representantes': 'Representantes',
  'Financeiro': 'Financeiro',
  'Cheques': 'Cheques',
  'CaixaDiario': 'CaixaDiario',
  'Pagamentos': 'Pagamentos',
  'Creditos': 'Creditos',
  'Comissoes': 'Comissoes',
  'EntradaCaucao': 'EntradaCaucao',
  'Balanco': 'Balanco',
  'FormasPagamento': 'FormasPagamento',
  'Usuarios': 'Usuarios',
  'Relatorios': 'Relatorios',
  'Logs': 'Logs',
  'Cadastro': 'Usuarios',
};

const PORTAL_PAGES = ['PortalCliente', 'PortalDoRepresentante', 'Login', 'Welcome', 'AcessoNegado', 'Representation'];

const LayoutWrapper = ({ children, currentPageName }) => {
  const isPortal = PORTAL_PAGES.includes(currentPageName);
  if (Layout && !isPortal) {
    return <Layout currentPageName={currentPageName}>{children}</Layout>;
  }
  return <>{children}</>;
};

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // --- USO TEMPORÁRIO PARA O BUNDLER NÃO RECLAMAR DE IMPORT NÃO USADO ---
  try { console.log("Hook carregado:", usePermissions); } catch(e) {}
  // ----------------------------------------------------------------------

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    else if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  if (!user) return null;

  return (
    <Routes>
      <Route path="/" element={
        user.role === 'cliente' ? <Navigate to="/PortalCliente" replace /> :
        user.role === 'representante' ? <Navigate to="/PortalDoRepresentante" replace /> :
        (<LayoutWrapper currentPageName={mainPageKey}><MainPage /></LayoutWrapper>)
      } />
      {Object.entries(Pages).map(([path, Page]) => {
        const setorPermission = PAGE_PERMISSIONS[path];
        const PageComponent = setorPermission ? (<PermissionGuard setor={setorPermission}><Page /></PermissionGuard>) : (<Page />);
        return (<Route key={path} path={`/${path}`} element={<LayoutWrapper currentPageName={path}>{PageComponent}</LayoutWrapper>} />);
      })}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router><NavigationTracker /><AuthenticatedApp /></Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App;