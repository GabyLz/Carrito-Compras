import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { getDefaultRouteByRole, isStaffRole, normalizeRole } from '../../lib/roles';

const Home = () => {
  const user = useAuthStore((state) => state.user);
  const role = normalizeRole(user?.rol);
  const showStaff = isStaffRole(role);
  const isGuest = !user;
  const isClient = role === 'CLIENTE';

  const heroTitle = showStaff
    ? 'Centro de operaciones comercial'
    : isClient
      ? 'Tu tienda digital en un solo lugar'
      : 'Compra facil con control profesional';

  const heroDescription = showStaff
    ? 'Monitorea ventas, inventario, ordenes y reportes desde un panel unificado con seguridad por roles.'
    : isClient
      ? 'Explora catalogo, guarda favoritos, gestiona pedidos y finaliza tu compra con un checkout guiado.'
      : 'Descubre productos, agrega al carrito y compra en minutos con seguimiento de ordenes y comprobantes.';

  const quickStats = showStaff
    ? [
        { label: 'Control', value: '360deg', tone: 'text-sky-700 bg-sky-50 border-sky-200' },
        { label: 'Seguridad', value: 'JWT + RBAC', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        { label: 'Analitica', value: 'KPIs en vivo', tone: 'text-violet-700 bg-violet-50 border-violet-200' },
      ]
    : [
        { label: 'Checkout', value: 'Flujo guiado', tone: 'text-sky-700 bg-sky-50 border-sky-200' },
        { label: 'Confianza', value: 'Compra segura', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        { label: 'Postventa', value: 'Mis ordenes', tone: 'text-violet-700 bg-violet-50 border-violet-200' },
      ];

  return (
    <main className="app-shell space-y-6 py-6">
      <section className="panel overflow-hidden border-0 shadow-xl shadow-slate-900/10">
        <div className="relative grid gap-8 overflow-hidden bg-gradient-to-br from-slate-900 via-sky-900 to-slate-800 p-8 md:grid-cols-[1.2fr_1fr] md:items-center md:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(to right, rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.16) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
          <div>
            <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-sky-100">
              Plataforma E-commerce
            </p>
            <h1 className="mb-4 text-4xl font-black tracking-tight text-white md:text-5xl">Compra facil con control profesional</h1>
            <p className="mb-6 max-w-xl text-[15px] leading-relaxed text-slate-200/90">
              {heroDescription}
            </p>
            <div className="mb-6 grid gap-2 sm:grid-cols-3">
              {quickStats.map((kpi) => (
                <div key={kpi.label} className={`rounded-xl border px-3 py-2 text-center backdrop-blur-sm ${kpi.tone}`}>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider">{kpi.label}</p>
                  <p className="mt-1 text-sm font-bold">{kpi.value}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/catalogo" className="rounded-xl bg-sky-400 px-5 py-2.5 font-bold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-300">
                Explorar catalogo
              </Link>
              {showStaff ? (
                <Link to={getDefaultRouteByRole(role)} className="rounded-xl border border-white/30 px-5 py-2.5 font-bold text-white hover:bg-white/10">
                  Ir al panel
                </Link>
              ) : isGuest ? (
                <Link to="/login" className="rounded-xl border border-white/30 px-5 py-2.5 font-bold text-white hover:bg-white/10">
                  Iniciar sesion
                </Link>
              ) : (
                <Link to="/carrito" className="rounded-xl border border-white/30 px-5 py-2.5 font-bold text-white hover:bg-white/10">
                  Revisar carrito
                </Link>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
            <h2 className="mb-3 text-xl font-bold text-white">Resumen ejecutivo</h2>
            <div className="grid gap-2 text-sm">
              <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-slate-100">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-sky-100">Suite Comercial</p>
                <p className="mt-1">Catalogo, compras, clientes y postventa en un solo flujo.</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-slate-100">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-sky-100">Operacion Interna</p>
                <p className="mt-1">Panel administrativo con inventario, ordenes, reportes y KPIs.</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-slate-100">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-sky-100">Gobierno y Seguridad</p>
                <p className="mt-1">Autenticacion JWT, permisos por rol y trazabilidad de operaciones.</p>
              </div>
            </div>
            <p className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100">Sesion actual: {user ? `${user.email} (${role})` : 'INVITADO'}</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;
