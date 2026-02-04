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

// --- CONFIGURAÇÃO DE SETORES PARA PERMISSION GUARD ---
// CORREÇÃO CRÍTICA: As chaves à direita devem ser IDÊNTICAS ao 'nome' no modulosConfig do UsuarioForm.
const PAGE_PERMISSIONS = {
  // Operacional
  'Pedidos': 'Pedidos',
  'Orcamentos': 'Orcamentos',
  'Produtos': 'Produtos', // Estava certo, mas verifique se seu usuário tem essa flag marcada no banco
  'Clientes': 'Clientes',
  'Fornecedores': 'Fornecedores',
  'Representantes': 'Representantes',
  
  // Financeiro
  'Financeiro': 'Financeiro', // Financeiro Geral
  'Cheques': 'Cheques',
  'CaixaDiario': 'CaixaDiario', // Antes estava 'Caixa' (Errado)
  'Pagamentos': 'Pagamentos',   // Antes estava 'ContasPagar' (Errado)
  'Creditos': 'Creditos',
  'Comissoes': 'Comissoes',
  
  // Telas específicas que usam permissões próprias
  'EntradaCaucao': 'EntradaCaucao', // Antes estava 'Financeiro' (Errado)
  'Balanco': 'Balanco',             // Antes estava 'Financeiro' (Errado)
  'FormasPagamento': 'FormasPagamento', // Antes estava 'Configuracoes' (Errado)

  // Admin / Sistema
  'Usuarios': 'Usuarios', // Antes estava 'Admin' (Errado -> Causava o bloqueio)
  'Relatorios': 'Relatorios',
  'Logs': 'Logs',         // Antes estava 'Admin' (Errado)
  'Cadastro': 'Usuarios', // Se 'Cadastro' for configs gerais, use 'Usuarios' ou crie um módulo 'Configuracoes'
};

// --- PÁGINAS QUE NÃO USAM LAYOUT ADMINISTRATIVO (SIDEBAR) ---
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
      <Route path="/" element={
        user.role === 'cliente' ? <Navigate to="/PortalCliente" replace /> :
        user.role === 'representante' ? <Navigate to="/PortalDoRepresentante" replace /> :
        (
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        )
      } />

      {Object.entries(Pages).map(([path, Page]) => {
        const setorPermission = PAGE_PERMISSIONS[path];
        
        // Se houver permissão mapeada, envolve com o Guard
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