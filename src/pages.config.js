import Cheques from './pages/Cheques';
import Clientes from './pages/Clientes';
import Creditos from './pages/Creditos';
import Dashboard from './pages/Dashboard';
import Pedidos from './pages/Pedidos';
import PortalCliente from './pages/PortalCliente';
import PortalDoRepresentante from './pages/PortalDoRepresentante';
import Representantes from './pages/Representantes';
import Representation from './pages/Representation';
import Usuarios from './pages/Usuarios';
import Welcome from './pages/Welcome';
import Relatorios from './pages/Relatorios';
import Comissoes from './pages/Comissoes';
import Balanco from './pages/Balanco';
import ChequesPagar from './pages/ChequesPagar';
import Logs from './pages/Logs';
import CadastroFornecedor from './pages/CadastroFornecedor';
import FormasPagamento from './pages/FormasPagamento';
import SolicitacaoCadastro from './pages/SolicitacaoCadastro';
import Orcamentos from './pages/Orcamentos';
import CadastroPecas from './pages/CadastroPecas';
import AgruparOrcamentos from './pages/AgruparOrcamentos';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Cheques": Cheques,
    "Clientes": Clientes,
    "Creditos": Creditos,
    "Dashboard": Dashboard,
    "Pedidos": Pedidos,
    "PortalCliente": PortalCliente,
    "PortalDoRepresentante": PortalDoRepresentante,
    "Representantes": Representantes,
    "Representation": Representation,
    "Usuarios": Usuarios,
    "Welcome": Welcome,
    "Relatorios": Relatorios,
    "Comissoes": Comissoes,
    "Balanco": Balanco,
    "ChequesPagar": ChequesPagar,
    "Logs": Logs,
    "CadastroFornecedor": CadastroFornecedor,
    "FormasPagamento": FormasPagamento,
    "SolicitacaoCadastro": SolicitacaoCadastro,
    "Orcamentos": Orcamentos,
    "CadastroPecas": CadastroPecas,
    "AgruparOrcamentos": AgruparOrcamentos,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
    Layout: __Layout,
};