import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { canAccessModule, isStaffRole, normalizeRole } from '../../lib/roles';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const items = useCartStore((state) => state.items);
  const [cartHydrated, setCartHydrated] = useState(() => useCartStore.persist.hasHydrated());
  const role = normalizeRole(user?.rol);

  useEffect(() => {
    const unsubStart = useCartStore.persist.onHydrate(() => setCartHydrated(false));
    const unsubFinish = useCartStore.persist.onFinishHydration(() => setCartHydrated(true));

    setCartHydrated(useCartStore.persist.hasHydrated());

    return () => {
      unsubStart();
      unsubFinish();
    };
  }, []);

  const itemCount = cartHydrated ? items.reduce((acc, item) => acc + item.cantidad, 0) : 0;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition ${
      isActive ? 'bg-sky-100 text-sky-900' : 'text-slate-700 hover:bg-slate-100'
    }`;

  return (
    <aside className="sticky top-0 z-40 flex h-auto w-full flex-col border-b border-slate-200 bg-white/95 backdrop-blur lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 lg:justify-start lg:px-5">
        <div className="flex items-center gap-2">
          <Link to="/" className="rounded-lg px-3 py-2 text-base font-extrabold text-slate-900 hover:bg-slate-100">
            Commerce Suite
          </Link>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">v1</span>
        </div>
      </div>

      <nav className="flex flex-wrap items-center gap-2 px-4 py-3 lg:flex-1 lg:flex-col lg:items-stretch lg:gap-1 lg:overflow-y-auto">
          {isStaffRole(role) ? (
            <>
              {canAccessModule(role, 'dashboard') && (
                <NavLink to="/admin/dashboard" className={linkClass}>
                  Dashboard
                </NavLink>
              )}
              {canAccessModule(role, 'productos') && (
                <NavLink to="/admin/productos" className={linkClass}>
                  Productos
                </NavLink>
              )}
              {canAccessModule(role, 'categorias_marcas') && (
                <NavLink to="/admin/categorias-marcas" className={linkClass}>
                  Categorias/Marcas
                </NavLink>
              )}
              {canAccessModule(role, 'inventario') && (
                <NavLink to="/admin/inventario" className={linkClass}>
                  Inventario
                </NavLink>
              )}
              {canAccessModule(role, 'ordenes') && (
                <NavLink to="/admin/ordenes" className={linkClass}>
                  Ordenes
                </NavLink>
              )}
              {canAccessModule(role, 'clientes') && (
                <NavLink to="/admin/clientes" className={linkClass}>
                  Clientes
                </NavLink>
              )}
              {canAccessModule(role, 'cupones') && (
                <NavLink to="/admin/cupones" className={linkClass}>
                  Cupones
                </NavLink>
              )}
              {canAccessModule(role, 'facturas') && (
                <NavLink to="/admin/facturas" className={linkClass}>
                  Facturas
                </NavLink>
              )}
              {canAccessModule(role, 'reportes') && (
                <NavLink to="/admin/reportes" className={linkClass}>
                  Reportes
                </NavLink>
              )}
              {canAccessModule(role, 'estadisticas') && (
                <NavLink to="/admin/estadisticas" className={linkClass}>
                  Estadisticas
                </NavLink>
              )}
              {canAccessModule(role, 'usuarios_roles') && (
                <NavLink to="/admin/usuarios-roles" className={linkClass}>
                  Usuarios/Roles
                </NavLink>
              )}
              {canAccessModule(role, 'configuracion') && (
                <NavLink to="/admin/configuracion" className={linkClass}>
                  Configuracion
                </NavLink>
              )}
            </>
          ) : (
            <>
              <NavLink to="/" className={linkClass}>
                Inicio
              </NavLink>
              <NavLink to="/catalogo" className={linkClass}>
                Catalogo
              </NavLink>
              <NavLink to="/carrito" className={linkClass}>
                Carrito ({itemCount})
              </NavLink>
              {isAuthenticated && (
                <NavLink to="/mis-ordenes" className={linkClass}>
                  Mis ordenes
                </NavLink>
              )}
              {isAuthenticated && (
                <NavLink to="/lista-deseos" className={linkClass}>
                  Lista de deseos
                </NavLink>
              )}
              {isAuthenticated && (
                <NavLink to="/perfil" className={linkClass}>
                  Perfil
                </NavLink>
              )}
            </>
          )}
      </nav>

      <div className="mt-auto border-t border-slate-200 px-4 py-4">
        {isAuthenticated ? (
          <>
            <span className="mb-3 block rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
              {user?.email}
            </span>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Salir
            </button>
          </>
        ) : (
          <NavLink
            to="/login"
            className="block rounded-lg bg-sky-800 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-sky-900"
          >
            Ingresar
          </NavLink>
        )}
      </div>
    </aside>
  );
};

export default Navbar;
