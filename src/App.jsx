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


const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// --- CONFIGURAÇÃO DE MAPEAMENTO DE PERMISSÕES ---
// Mapeia o nome da Rota (Pages) para o nome do Módulo no Banco de Dados
const PAGE_PERMISSIONS = {
  // Operacional
  'Pedidos': 'Pedidos',
  'Orcamentos': 'Orcamentos',
  'Produtos': 'Produtos',
  'Clientes': 'Clientes',
  'Fornecedores': 'Fornecedores',
  'Representantes': 'Representantes',
  
  // Financeiro
  'Financeiro': 'Financeiro',
  'Cheques': 'Cheques',
  'CaixaDiario': 'CaixaDiario',
  'Pagamentos': 'Pagamentos',
  'Creditos': 'Creditos',
  'Comissoes': 'Comissoes',
  'EntradaCaucao': 'EntradaCaucao',
  'Balanco': 'Balanco',
  
  // Cadastros Auxiliares
  'FormasPagamento': 'FormasPagamento',

  // Admin / Sistema
  'Usuarios': 'Usuarios',
  'Relatorios': 'Relatorios',
  'Logs': 'Logs',
  'Cadastro': 'Usuarios', // Assumindo que cadastro geral fica sob gestão de usuários/admin
};

// --- PÁGINAS SEM SIDEBAR (PORTAIS E PÚBLICAS) ---
const PORTAL_PAGES = [
  'PortalCliente', 
  'PortalDoRepresentante', 
  'Login', 
  'Welcome', 
  'AcessoNegado',
  'Representation'
];

const LayoutWrapper = ({ children, currentPageName }) => {
  const isPortal = PORTAL_PAGES.includes(currentPageName);

  if (Layout && !isPortal) {
    return <Layout currentPageName={currentPageName}>{children}</Layout>;
  }
  
  return <>{children}</>;
};

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Loading State
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium text-sm">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  // Error Handling
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  if (!user) return null;

  return (
    <Routes>
      {/* ROTA RAIZ (/) COM REDIRECIONAMENTO INTELIGENTE */}
      <Route path="/" element={
        user.role === 'cliente' ? <Navigate to="/PortalCliente" replace /> :
        user.role === 'representante' ? <Navigate to="/PortalDoRepresentante" replace /> :
        (
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        )
      } />

      {/* GERAÇÃO DINÂMICA DAS ROTAS */}
      {Object.entries(Pages).map(([path, Page]) => {
        const setorPermission = PAGE_PERMISSIONS[path];
        
        // Aplica o PermissionGuard se a página exigir permissão de setor
        const PageComponent = setorPermission ? (
          <PermissionGuard setor={setorPermission}>
            <Page />
          </PermissionGuard>
        ) : (
          <Page />
        );

        return (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                {PageComponent}
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