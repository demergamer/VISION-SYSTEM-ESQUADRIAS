import Clientes from './pages/Clientes';
import Dashboard from './pages/Dashboard';
import Pedidos from './pages/Pedidos';
import Representantes from './pages/Representantes';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Clientes": Clientes,
    "Dashboard": Dashboard,
    "Pedidos": Pedidos,
    "Representantes": Representantes,
}

export const pagesConfig = {
    mainPage: "Representantes",
    Pages: PAGES,
    Layout: __Layout,
};