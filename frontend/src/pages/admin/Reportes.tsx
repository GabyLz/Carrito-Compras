import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

type Categoria = { id: number; nombre: string; activo?: boolean };

const Reportes = () => {
  const token = useAuthStore((state) => state.accessToken);
  const [loading, setLoading] = useState<string | null>(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todas');

  const { data: categorias = [] } = useQuery<Categoria[]>({
    queryKey: ['categorias-reportes'],
    queryFn: async () => {
      const res = await api.get('/productos/categorias');
      const payload = res.data?.data ?? res.data ?? [];
      if (!Array.isArray(payload)) return [];
      return payload
        .filter((c: any) => c && typeof c.id !== 'undefined' && typeof c.nombre === 'string')
        .map((c: any) => ({ id: Number(c.id), nombre: String(c.nombre), activo: c.activo }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    },
  });

  const descargarPdf = async (endpoint: string, filename: string) => {
    try {
      setLoading(filename);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}${endpoint}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'No se pudo generar el PDF');
      }

      const blob = await response.blob();
      if (blob.type === 'application/json') {
        const text = await blob.text();
        const error = JSON.parse(text);
        throw new Error(error.detail || error.message || 'Error en el servidor');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error al descargar PDF:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const operacionales = [
    { tipo: 'ordenes', nombre: 'Listado de ordenes del periodo' },
    { tipo: 'inventario_valorizado', nombre: 'Inventario actual valorizado por categoria' },
    { tipo: 'movimientos_inventario', nombre: 'Movimientos de inventario del periodo' },
    { tipo: 'stock_bajo', nombre: 'Productos con stock bajo o agotado' },
    { tipo: 'pagos', nombre: 'Detalle de pagos recibidos' },
    { tipo: 'devoluciones', nombre: 'Listado de devoluciones' },
  ];

  const gestion = [
    'Rentabilidad por producto',
    'Ventas por categoria comparativa',
    'Comportamiento de carritos',
    'Clientes nuevos/recurrentes/inactivos/VIP',
    'Rotacion de inventario',
    'Ingresos vs costos mensual',
  ];

  return (
    <main className="app-shell space-y-8 py-8">
      <section className="panel p-8">
        <h1 className="text-3xl font-bold text-slate-900">Centro de reportes</h1>
        <p className="mt-2 text-sm text-slate-600">Generación de reportes detallados en PDF para la gestión operativa y estratégica del negocio.</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="panel p-6 border border-sky-100 bg-sky-50/40">
          <h2 className="text-xl font-bold text-slate-900">Reporte Operacional</h2>
          <p className="mt-2 text-sm text-slate-600">
            Listado del Inventario Actual en PDF con SKU, nombre, stock y valor total. Puedes filtrar por categoría antes de generarlo.
          </p>
          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Categoría</label>
            <select
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="todas">Todas las categorías</option>
              {categorias.map((cat: any) => (
                <option key={cat.id} value={String(cat.id)}>{cat.nombre}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              if (categoriaSeleccionada !== 'todas' && !categorias.some((cat) => String(cat.id) === categoriaSeleccionada)) {
                alert('La categoría seleccionada no es válida. Intenta recargar la página.');
                return;
              }
              const queryCategoria = categoriaSeleccionada !== 'todas' ? `&categoria=${encodeURIComponent(categoriaSeleccionada)}` : '';
              descargarPdf(
                `/admin/reportes/operacional?tipo=inventario_actual${queryCategoria}`,
                `reporte-inventario-actual-${categoriaSeleccionada}.pdf`
              );
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800"
          >
            {loading?.startsWith('reporte-inventario-actual-') ? 'Generando...' : 'Generar PDF Operacional'}
          </button>
        </article>

        <article className="panel p-6 border border-emerald-100 bg-emerald-50/40">
          <h2 className="text-xl font-bold text-slate-900">Reporte de Gestión</h2>
          <p className="mt-2 text-sm text-slate-600">
            Análisis de Inventario y Bajo Stock: incluye KPIs, gráfico de barras, gráfico de pastel y listado de productos a reordenar.
          </p>
          <button
            onClick={() => descargarPdf('/admin/reportes/gestion?tipo=inventario_stock', 'reporte-gestion-inventario-bajo-stock.pdf')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            {loading === 'reporte-gestion-inventario-bajo-stock.pdf' ? 'Generando...' : 'Generar PDF de Gestión'}
          </button>
        </article>
      </section>

      <section className="grid gap-10 md:grid-cols-2">
        <article className="panel p-8">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <svg className="w-7 h-7 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Reportes operacionales
          </h2>
          <p className="text-sm text-slate-500 mt-2 mb-8 border-b border-slate-100 pb-4">Documentos técnicos optimizados para la operación diaria.</p>
          <div className="grid gap-4">
            {operacionales.map((r) => (
              <button
                key={r.tipo}
                onClick={() => descargarPdf(`/admin/reportes/operacional?tipo=${r.tipo}`, `reporte-${r.tipo}.pdf`)}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-5 text-left text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-900 hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                  <span>{r.nombre}</span>
                </div>
                {loading === `reporte-${r.tipo}.pdf` ? (
                  <svg className="h-5 w-5 animate-spin text-sky-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                )}
              </button>
            ))}
          </div>
        </article>

        <article className="panel p-8">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            Reportes de gestión
          </h2>
          <p className="text-sm text-slate-500 mt-2 mb-8 border-b border-slate-100 pb-4">Análisis estratégico con visualizaciones avanzadas.</p>
          <div className="grid gap-4">
            {gestion.map((item, idx) => (
              <button
                key={item}
                onClick={() => descargarPdf(`/admin/reportes/gestion?tipo=${idx + 1}`, `reporte-gestion-${idx + 1}.pdf`)}
                className="flex items-center justify-between rounded-xl bg-slate-900 px-6 py-5 text-left text-sm font-semibold text-white shadow-lg transition-all hover:bg-slate-800 hover:shadow-xl active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <span>{item}</span>
                </div>
                {loading === `reporte-gestion-${idx + 1}.pdf` ? (
                  <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path></svg>
                )}
              </button>
            ))}
            <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-xs text-emerald-800 border border-emerald-100 leading-relaxed">
              <span className="font-bold block mb-1">Nota del sistema:</span> 
              Estos reportes son procesados mediante Puppeteer para garantizar una presentación profesional, incluyendo gráficos vectoriales y estilos CSS avanzados.
            </div>
          </div>
        </article>
      </section>
    </main>
  );
};

export default Reportes;
