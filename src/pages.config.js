import Clientes from './pages/Clientes';
import Dashboard from './pages/Dashboard';
import Pedidos from './pages/Pedidos';
import Representantes from './pages/Representantes';
import Welcome from './pages/Welcome';
import Representation from './pages/Representation';
import Creditos from './pages/Creditos';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Clientes": Clientes,
    "Dashboard": Dashboard,
    "Pedidos": Pedidos,
    "Representantes": Representantes,
    "Welcome": Welcome,
    "Representation": Representation,
    "Creditos": Creditos,
}

export const pagesConfig = {
    mainPage: "Representantes",
    Pages: PAGES,
    Layout: __Layout,
};