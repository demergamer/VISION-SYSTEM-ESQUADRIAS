import Cheques from './pages/Cheques';
import Clientes from './pages/Clientes';
import Creditos from './pages/Creditos';
import Dashboard from './pages/Dashboard';
import Pedidos from './pages/Pedidos';
import Representantes from './pages/Representantes';
import Representation from './pages/Representation';
import Welcome from './pages/Welcome';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Cheques": Cheques,
    "Clientes": Clientes,
    "Creditos": Creditos,
    "Dashboard": Dashboard,
    "Pedidos": Pedidos,
    "Representantes": Representantes,
    "Representation": Representation,
    "Welcome": Welcome,
}

export const pagesConfig = {
    mainPage: "Representantes",
    Pages: PAGES,
    Layout: __Layout,
};