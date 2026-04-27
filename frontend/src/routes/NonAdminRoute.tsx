import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { normalizeRole } from '../lib/roles';

const NonAdminRoute = () => {
  const { user } = useAuthStore();
  const role = normalizeRole(user?.rol);

  if (role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
};

export default NonAdminRoute;