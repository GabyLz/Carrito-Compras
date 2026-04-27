import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import HomePage from './pages/shop/Home';
import CatalogoPage from './pages/shop/Catalogo';
import ProductoDetallePage from './pages/shop/ProductoDetalle';
import CarritoPage from './pages/shop/Carrito';
import CheckoutPage from './pages/shop/Checkout';
import MisOrdenesPage from './pages/shop/MisOrdenes';
import PerfilPage from './pages/shop/Perfil';
import ListaDeseosPage from './pages/shop/ListaDeseos';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProductos from './pages/admin/ProductosAdmin';
import AdminOrdenes from './pages/admin/OrdenesAdmin';
import AdminInventario from './pages/admin/InventarioAdmin';
import AdminClientes from './pages/admin/ClientesAdmin';
import AdminReportes from './pages/admin/Reportes';
import AdminEstadisticas from './pages/admin/Estadisticas';
import AdminCupones from './pages/admin/CuponesAdmin';
import AdminCategoriasMarcas from './pages/admin/CategoriasMarcasAdmin';
import AdminUsuariosRoles from './pages/admin/UsuariosRolesAdmin';
import AdminConfiguracion from './pages/admin/ConfiguracionAdmin';
import AdminFacturas from './pages/admin/FacturasAdmin';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen bg-slate-50 lg:pl-72">
            <Navbar />
            <div className="p-4 lg:p-6">
            <Routes>
            {/* Rutas públicas */}
            <Route path="/" element={<HomePage />} />
            <Route path="/catalogo" element={<CatalogoPage />} />
            <Route path="/producto/:id" element={<ProductoDetallePage />} />
            <Route path="/carrito" element={<CarritoPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Rutas protegidas (cliente comprador) */}
            <Route element={<ProtectedRoute allowedRoles={['CLIENTE']} />}>
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/mis-ordenes" element={<MisOrdenesPage />} />
              <Route path="/perfil" element={<PerfilPage />} />
              <Route path="/lista-deseos" element={<ListaDeseosPage />} />
            </Route>
            
            {/* Rutas de staff por módulo */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE_INVENTARIO', 'VENDEDOR']} />}>
              <Route path="/admin/productos" element={<AdminProductos />} />
              <Route path="/admin/inventario" element={<AdminInventario />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE_VENTAS', 'VENDEDOR']} />}>
              <Route path="/admin/ordenes" element={<AdminOrdenes />} />
              <Route path="/admin/clientes" element={<AdminClientes />} />
              <Route path="/admin/facturas" element={<AdminFacturas />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE_VENTAS']} />}>
              <Route path="/admin/cupones" element={<AdminCupones />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR']} />}>
              <Route path="/admin/reportes" element={<AdminReportes />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO']} />}>
              <Route path="/admin/estadisticas" element={<AdminEstadisticas />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE_INVENTARIO']} />}>
              <Route path="/admin/categorias-marcas" element={<AdminCategoriasMarcas />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin/usuarios-roles" element={<AdminUsuariosRoles />} />
              <Route path="/admin/configuracion" element={<AdminConfiguracion />} />
            </Route>
            </Routes>
            </div>
          </div>
          <Toaster position="bottom-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;