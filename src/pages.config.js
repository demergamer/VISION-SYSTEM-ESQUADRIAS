import AgruparOrcamentos from './pages/AgruparOrcamentos';
import Balanco from './pages/Balanco';
import Cheques from './pages/Cheques';
import Clientes from './pages/Clientes';
import Comissoes from './pages/Comissoes';
import Creditos from './pages/Creditos';
import Dashboard from './pages/Dashboard';
import FormasPagamento from './pages/FormasPagamento';
import Logs from './pages/Logs';
import Orcamentos from './pages/Orcamentos';
import Pedidos from './pages/Pedidos';
import PortalCliente from './pages/PortalCliente';
import PortalDoRepresentante from './pages/PortalDoRepresentante';
import Relatorios from './pages/Relatorios';
import Representantes from './pages/Representantes';
import Representation from './pages/Representation';
import Usuarios from './pages/Usuarios';
import Welcome from './pages/Welcome';
import Pagamentos from './pages/Pagamentos';
import Fornecedores from './pages/Fornecedores';
import Cadastro from './pages/Cadastro';
import Produtos from './pages/Produtos';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AgruparOrcamentos": AgruparOrcamentos,
    "Balanco": Balanco,
    "Cheques": Cheques,
    "Clientes": Clientes,
    "Comissoes": Comissoes,
    "Creditos": Creditos,
    "Dashboard": Dashboard,
    "FormasPagamento": FormasPagamento,
    "Logs": Logs,
    "Orcamentos": Orcamentos,
    "Pedidos": Pedidos,
    "PortalCliente": PortalCliente,
    "PortalDoRepresentante": PortalDoRepresentante,
    "Relatorios": Relatorios,
    "Representantes": Representantes,
    "Representation": Representation,
    "Usuarios": Usuarios,
    "Welcome": Welcome,
    "Pagamentos": Pagamentos,
    "Fornecedores": Fornecedores,
    "Cadastro": Cadastro,
    "Produtos": Produtos,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
    Layout: __Layout,
};