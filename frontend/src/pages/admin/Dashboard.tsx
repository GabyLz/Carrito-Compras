import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { normalizeRole } from '../../lib/roles';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMemo } from 'react';

export default function AdminDashboard() {
  const role = normalizeRole(useAuthStore((state) => state.user?.rol));
  const isGerenteInventario = role === 'GERENTE_INVENTARIO';

  const {
    data: kpis,
    isLoading: isLoadingKPIs,
    isError: isErrorKPIs,
    error: errorKPIs,
    refetch: refetchKPIs,
  } = useQuery({
    queryKey: ['kpis'],
    queryFn: async () => (await api.get('/admin/dashboard/kpis')).data,
  });

  const {
    data: dashboardData,
    isLoading: isLoadingCharts,
    isError: isErrorCharts,
    error: errorCharts,
    refetch: refetchData,
  } = useQuery({
    queryKey: ['dashboard-data'],
    queryFn: async () => (await api.get('/admin/dashboard/data')).data,
  });

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const charts = useMemo(() => {
    const ventasMensuales = Array.isArray(dashboardData?.ventasMensuales) ? dashboardData.ventasMensuales : [];
    const ventasPorCategoria = Array.isArray(dashboardData?.ventasPorCategoria) ? dashboardData.ventasPorCategoria : [];
    const estados = Array.isArray(dashboardData?.estados) ? dashboardData.estados : [];
    const topProductos = Array.isArray(dashboardData?.topProductos) ? dashboardData.topProductos : [];
    const ingresosVsCostos = Array.isArray(dashboardData?.ingresosVsCostos) ? dashboardData.ingresosVsCostos : [];
    const abandonoTrend = Array.isArray(dashboardData?.abandonoTrend) ? dashboardData.abandonoTrend : [];

    const normalizeNum = (v: any) => {
      const n = Number(v?.toString?.() ?? v ?? 0);
      return Number.isFinite(n) ? n : 0;
    };

    return {
      ventasMensuales: ventasMensuales.map((r: any) => ({ mes: String(r.mes || '-'), total: normalizeNum(r.total) })),
      ventasPorCategoria: ventasPorCategoria.map((r: any) => ({ nombre: String(r.nombre || 'Sin categoría'), total: normalizeNum(r.total) })),
      estados: estados.map((r: any) => ({ nombre: String(r.nombre || 'sin_estado'), total: normalizeNum(r.total) })),
      topProductos: topProductos.map((r: any) => ({ nombre: String(r.nombre || '-'), total: normalizeNum(r.total) })),
      ingresosVsCostos: ingresosVsCostos.map((r: any) => ({ mes: String(r.mes || '-'), ingresos: normalizeNum(r.ingresos), costos: normalizeNum(r.costos) })),
      abandonoTrend: abandonoTrend.map((r: any) => ({ mes: String(r.mes || '-'), tasa: normalizeNum(r.tasa) })),
    };
  }, [dashboardData]);

  if (isLoadingKPIs || isLoadingCharts) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
        <span className="ml-3 text-lg font-medium text-slate-600">Cargando dashboard...</span>
      </div>
    );
  }

  if (isErrorKPIs || isErrorCharts) {
    return (
      <div className="m-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <h2 className="text-xl font-bold">Error al cargar el dashboard</h2>
        <p className="mt-2">{(errorKPIs as any)?.message || (errorCharts as any)?.message || 'Ocurrió un error inesperado.'}</p>
        <button 
          onClick={() => {
            refetchKPIs();
            refetchData();
          }}
          className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <main className="app-shell space-y-4 py-6">
      <section className="panel p-6">
        <h1 className="text-3xl font-bold text-slate-900">Inicio</h1>
        <p className="mt-1 text-sm text-slate-600">Resumen operativo del e-commerce para toma de decisiones rápida.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="panel p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ventas totales</p>
          <p className="mt-2 text-3xl font-black text-slate-900">S/ {formatCurrency(Number(kpis?.ventasTotales || 0))}</p>
        </article>
        <article className="panel p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Órdenes</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{kpis?.totalOrdenes ?? kpis?.ordenesTotales ?? 0}</p>
        </article>
        <article className="panel p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ticket promedio</p>
          <p className="mt-2 text-3xl font-black text-slate-900">S/ {formatCurrency(Number(kpis?.ticketPromedio || 0))}</p>
        </article>
        <article className="panel p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Stock bajo</p>
          <p className="mt-2 text-3xl font-black text-rose-700">{kpis?.productosStockBajo ?? 0}</p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="panel p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Órdenes pendientes</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{kpis?.ordenesPendientes ?? 0}</p>
        </article>
        <article className="panel p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Conversión</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{Number(kpis?.tasaConversion || 0).toFixed(1)}%</p>
        </article>
        <article className="panel p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Abandono carrito</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{Number(kpis?.tasaAbandonoCarrito || 0).toFixed(1)}%</p>
        </article>
        <article className="panel p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Reembolsos (30 días)</p>
          <p className="mt-2 text-3xl font-black text-rose-700">{kpis?.reembolsosCantidad ?? 0}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">S/ {formatCurrency(Number(kpis?.reembolsosMonto || 0))}</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel p-6">
          <h2 className="text-lg font-bold text-slate-900">Ventas mensuales</h2>
          <p className="mt-1 text-sm text-slate-600">Serie mensual de ventas (órdenes).</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.ventasMensuales} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => `S/ ${formatCurrency(Number(v || 0))}`} />
                <Line type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel p-6">
          <h2 className="text-lg font-bold text-slate-900">Ingresos vs costos</h2>
          <p className="mt-1 text-sm text-slate-600">Comparación mensual para lectura rápida.</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.ingresosVsCostos} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v: any, name: any) => {
                    const label = String(name) === 'ingresos' ? 'Ingresos' : 'Costos';
                    return [`S/ ${formatCurrency(Number(v || 0))}`, label];
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="ingresos" stroke="#16a34a" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="costos" stroke="#ef4444" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel p-6">
          <h2 className="text-lg font-bold text-slate-900">Ventas por categoría (Top 5)</h2>
          <p className="mt-1 text-sm text-slate-600">Distribución por categoría.</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip formatter={(v: any) => `S/ ${formatCurrency(Number(v || 0))}`} />
                <Legend />
                <Pie data={charts.ventasPorCategoria} dataKey="total" nameKey="nombre" outerRadius={95}>
                  {charts.ventasPorCategoria.map((_: any, idx: number) => (
                    <Cell key={idx} fill={['#0ea5e9', '#22c55e', '#f97316', '#a855f7', '#ef4444'][idx % 5]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel p-6">
          <h2 className="text-lg font-bold text-slate-900">Top productos (unidades)</h2>
          <p className="mt-1 text-sm text-slate-600">Productos más vendidos por unidades.</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.topProductos} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" hide />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 text-right">Unidades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {charts.topProductos.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-8 text-center font-semibold text-slate-500">Sin datos</td></tr>
                ) : (
                  charts.topProductos.slice(0, 10).map((r: any, idx: number) => (
                    <tr key={`${r.nombre}-${idx}`} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold text-slate-900">{r.nombre}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{r.total}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel p-6">
          <h2 className="text-lg font-bold text-slate-900">Estado de órdenes</h2>
          <p className="mt-1 text-sm text-slate-600">Conteo de órdenes por estado.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {charts.estados.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-8 text-center font-semibold text-slate-500">Sin datos</td></tr>
                ) : (
                  charts.estados.slice(0, 10).map((r: any, idx: number) => (
                    <tr key={`${r.nombre}-${idx}`} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold text-slate-900">{r.nombre}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{r.total}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel p-6">
          <h2 className="text-lg font-bold text-slate-900">Abandono (tendencia)</h2>
          <p className="mt-1 text-sm text-slate-600">Tasa mensual estimada de abandono de carrito.</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.abandonoTrend} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => `${Number(v || 0).toFixed(1)}%`} />
                <Line type="monotone" dataKey="tasa" stroke="#f59e0b" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="panel p-6">
          <h2 className="text-lg font-bold text-slate-900">Acciones rápidas</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link to="/admin/ordenes" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
              Ver órdenes
            </Link>
            <Link to="/admin/productos" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
              Gestionar productos
            </Link>
            <Link to="/admin/inventario" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
              Ir a inventario
            </Link>
            <Link to="/admin/clientes" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
              Ver clientes
            </Link>
          </div>
        </article>

        <article className="panel p-6">
          <h2 className="text-lg font-bold text-slate-900">Alertas</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span className="font-semibold text-slate-700">Órdenes pendientes</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{kpis?.ordenesPendientes ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span className="font-semibold text-slate-700">Productos con stock bajo</span>
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">{kpis?.productosStockBajo ?? 0}</span>
            </div>
            {isGerenteInventario && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span className="font-semibold text-slate-700">Valor inventario</span>
                <span className="text-xs font-bold text-slate-900">S/ {formatCurrency(Number(kpis?.valorTotalInventario || 0))}</span>
              </div>
            )}
          </div>
        </article>
      </section>

      {isGerenteInventario && (
        <section className="panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Reorden sugerido</h2>
            <Link to="/admin/inventario" className="text-sm font-bold text-sky-800 hover:underline">
              Abrir inventario
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3 text-right">Mínimo</th>
                  <th className="px-4 py-3 text-right">Faltante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(dashboardData?.productosReorden || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center font-semibold text-slate-500">Sin productos para reordenar</td>
                  </tr>
                ) : (
                  (dashboardData?.productosReorden || []).slice(0, 10).map((row: any, idx: number) => (
                    <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.sku || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.nombre}</td>
                      <td className="px-4 py-3 text-slate-700">{row.categoria}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{row.stock_actual}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{row.stock_minimo}</td>
                      <td className="px-4 py-3 text-right font-bold text-rose-700">{row.faltante}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
