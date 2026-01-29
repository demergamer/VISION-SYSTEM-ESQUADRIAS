/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Balanco from './pages/Balanco';
import Cadastro from './pages/Cadastro';
import Cheques from './pages/Cheques';
import Clientes from './pages/Clientes';
import Comissoes from './pages/Comissoes';
import Creditos from './pages/Creditos';
import Dashboard from './pages/Dashboard';
import EntradaCaucao from './pages/EntradaCaucao';
import FormasPagamento from './pages/FormasPagamento';
import Fornecedores from './pages/Fornecedores';
import Logs from './pages/Logs';
import Orcamentos from './pages/Orcamentos';
import Pagamentos from './pages/Pagamentos';
import Pedidos from './pages/Pedidos';
import PortalCliente from './pages/PortalCliente';
import PortalDoRepresentante from './pages/PortalDoRepresentante';
import Produtos from './pages/Produtos';
import Relatorios from './pages/Relatorios';
import Representantes from './pages/Representantes';
import Representation from './pages/Representation';
import Usuarios from './pages/Usuarios';
import Welcome from './pages/Welcome';
import CaixaDiario from './pages/CaixaDiario';
import AcessoNegado from './pages/AcessoNegado';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Balanco": Balanco,
    "Cadastro": Cadastro,
    "Cheques": Cheques,
    "Clientes": Clientes,
    "Comissoes": Comissoes,
    "Creditos": Creditos,
    "Dashboard": Dashboard,
    "EntradaCaucao": EntradaCaucao,
    "FormasPagamento": FormasPagamento,
    "Fornecedores": Fornecedores,
    "Logs": Logs,
    "Orcamentos": Orcamentos,
    "Pagamentos": Pagamentos,
    "Pedidos": Pedidos,
    "PortalCliente": PortalCliente,
    "PortalDoRepresentante": PortalDoRepresentante,
    "Produtos": Produtos,
    "Relatorios": Relatorios,
    "Representantes": Representantes,
    "Representation": Representation,
    "Usuarios": Usuarios,
    "Welcome": Welcome,
    "CaixaDiario": CaixaDiario,
    "AcessoNegado": AcessoNegado,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
    Layout: __Layout,
};