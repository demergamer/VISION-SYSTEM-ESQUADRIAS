import Representantes from './pages/Representantes';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Pedidos from './pages/Pedidos';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Representantes": Representantes,
    "Dashboard": Dashboard,
    "Clientes": Clientes,
    "Pedidos": Pedidos,
}

export const pagesConfig = {
    mainPage: "Representantes",
    Pages: PAGES,
    Layout: __Layout,
};