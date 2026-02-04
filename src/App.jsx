import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'; // Adicionado Navigate
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Importar o PermissionGuard que criamos
import PermissionGuard from "@/components/PermissionGuard";

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// 1. CONFIGURAÇÃO DE SETORES
// Mapeie aqui qual página pertence a qual setor para o PermissionGuard.
// Se a página não estiver aqui, ela será acessível a todos os logados (exceto Portais que têm lógica própria).
const PAGE_PERMISSIONS = {
  'Fornecedores': 'Fornecedores',
  'Pedidos': 'Pedidos',
  'Cheques': 'Cheques',
  'Financeiro': 'Financeiro',
  'Clientes': 'Clientes',
  'Produtos': 'Produtos',
  'Usuarios': 'Admin',
  // Adicione outras páginas conforme necessário
};

// 2. CONFIGURAÇÃO DE PORTAIS
// Páginas que NÃO devem ter o Layout administrativo (Sidebar)
const PORTAL_PAGES = ['PortalCliente', 'PortalDoRepresentante', 'Login', 'Welcome', 'AcessoNegado'];

const LayoutWrapper = ({ children, currentPageName }) => {
  // Se for página de portal, não renderiza o Layout (Menu Lateral)
  const isPortal = PORTAL_PAGES.includes(currentPageName);

  if (Layout && !isPortal) {
    return <Layout currentPageName={currentPageName}>{children}</Layout>;
  }
  
  return <>{children}</>;
};

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Se não tiver user carregado ainda (embora o authError devesse pegar), retorna null
  if (!user) return null;

  return (
    <Routes>
      {/* ROTA RAIZ (DASHBOARD) 
          Redirecionamento inteligente baseado no cargo (Role)
      */}
      <Route path="/" element={
        user.role === 'cliente' ? <Navigate to="/PortalCliente" replace /> :
        user.role === 'representante' ? <Navigate to="/PortalDoRepresentante" replace /> :
        (
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        )
      } />

      {/* ROTAS DINÂMICAS (DO CONFIG)
          Aqui aplicamos o PermissionGuard se a página tiver um setor definido
      */}
      {Object.entries(Pages).map(([path, Page]) => {
        const setorPermission = PAGE_PERMISSIONS[path];
        
        return (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                {setorPermission ? (
                  <PermissionGuard setor={setorPermission}>
                    <Page />
                  </PermissionGuard>
                ) : (
                  <Page />
                )}
              </LayoutWrapper>
            }
          />
        );
      })}

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App;