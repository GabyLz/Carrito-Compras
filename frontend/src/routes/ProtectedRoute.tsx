import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '../stores/authStore';
import { normalizeRole } from '../lib/roles';

const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const { user, isAuthenticated } = useAuthStore();
  const hydrated = useAuthStore((state) => state.hasHydrated);

  const currentRole = normalizeRole(user?.rol);

  if (!hydrated) {
    return (
      <div className="app-shell py-10 text-center text-slate-600">
        Cargando sesion...
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const normalizedAllowedRoles = allowedRoles?.map((role) => normalizeRole(role));

  if (normalizedAllowedRoles && !normalizedAllowedRoles.includes(currentRole)) {
    return <Navigate to="/" />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
