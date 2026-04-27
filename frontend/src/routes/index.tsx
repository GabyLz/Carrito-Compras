import { Routes, Route } from 'react-router-dom';
import Home from '../pages/shop/Home';
import ProductoDetalle from '../pages/shop/ProductoDetalle';
import ListaDeseos from '../pages/shop/ListaDeseos';
import Dashboard from '../pages/admin/Dashboard';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/producto/:id" element={<ProductoDetalle />} />
      <Route path="/wishlist" element={<ListaDeseos />} />
      <Route path="/admin" element={<Dashboard />} />
    </Routes>
  );
};

export default AppRoutes;
