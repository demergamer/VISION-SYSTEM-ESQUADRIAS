import Cheques from './pages/Cheques';
import Clientes from './pages/Clientes';
import Creditos from './pages/Creditos';
import Dashboard from './pages/Dashboard';
import PortalCliente from './pages/PortalCliente';
import Representantes from './pages/Representantes';
import Representation from './pages/Representation';
import Welcome from './pages/Welcome';
import Pedidos from './pages/Pedidos';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Cheques": Cheques,
    "Clientes": Clientes,
    "Creditos": Creditos,
    "Dashboard": Dashboard,
    "PortalCliente": PortalCliente,
    "Representantes": Representantes,
    "Representation": Representation,
    "Welcome": Welcome,
    "Pedidos": Pedidos,
}

export const pagesConfig = {
    mainPage: "Representantes",
    Pages: PAGES,
    Layout: __Layout,
};