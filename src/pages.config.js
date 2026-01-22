import AgruparOrcamentos from './pages/AgruparOrcamentos';
import Balanco from './pages/Balanco';
import Cadastro from './pages/Cadastro';
import Cheques from './pages/Cheques';
import Clientes from './pages/Clientes';
import Comissoes from './pages/Comissoes';
import Creditos from './pages/Creditos';
import Dashboard from './pages/Dashboard';
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
import __Layout from './Layout.jsx';


export const PAGES = {
    "AgruparOrcamentos": AgruparOrcamentos,
    "Balanco": Balanco,
    "Cadastro": Cadastro,
    "Cheques": Cheques,
    "Clientes": Clientes,
    "Comissoes": Comissoes,
    "Creditos": Creditos,
    "Dashboard": Dashboard,
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
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
    Layout: __Layout,
};