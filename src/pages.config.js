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
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
    Layout: __Layout,
};