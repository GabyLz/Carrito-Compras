import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

interface Orden {
  id: number;
  id_cliente: number;
  cliente: {
    nombre: string;
    apellido: string;
    email: string;
  };
  fecha: string;
  total: number;
  id_estado: number;
  estado: {
    nombre: string;
  };
  numero_guia?: string;
}

const FacturasAdmin = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: ordenes = [], isLoading } = useQuery({
    queryKey: ['ordenes-facturacion'],
    queryFn: async () => {
      const res = await api.get('/ordenes/admin/all');
      return res.data || [];
    },
  });

  const filteredOrdenes = useMemo(() => {
    return ordenes.filter((o: Orden) => 
      o.id.toString().includes(searchTerm) ||
      (o.cliente?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.cliente?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [ordenes, searchTerm]);

  const kpis = useMemo(() => {
    const totalFacturado = ordenes.reduce((acc: number, o: Orden) => acc + Number(o.total), 0);
    const ordenesCompletadas = ordenes.filter((o: Orden) => o.estado.nombre.toLowerCase().includes('entregado') || o.estado.nombre.toLowerCase().includes('completado')).length;
    return { totalFacturado, ordenesCompletadas };
  }, [ordenes]);

  const handleDownloadInvoice = (ordenId: number) => {
    api
      .get(`/ordenes/${ordenId}/factura`, { responseType: 'blob' })
      .then((response) => {
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `factura-orden-${ordenId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => {
        toast.error('No se pudo descargar la factura');
      });
  };

  return (
    <main className="app-shell py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Facturación</h1>
        <p className="text-slate-500 font-medium mt-1">Consulta y genera comprobantes de venta</p>
      </header>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <article className="panel p-6 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Facturado (S/)</p>
              <p className="mt-2 text-3xl font-black text-slate-900">S/ {kpis.totalFacturado.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-sky-50 p-3 text-sky-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
        </article>
        <article className="panel p-6 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Órdenes para Facturar</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{kpis.ordenesCompletadas}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
        </article>
      </section>

      {/* Search & Table */}
      <section className="panel bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Historial de Ventas</h2>
          <div className="relative w-full md:w-72">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Buscar por ID, cliente o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border-slate-200 pl-10 text-sm focus:border-sky-500 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4">Orden ID</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-500 font-medium">Cargando órdenes...</td></tr>
              ) : filteredOrdenes.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-500 font-medium">No se encontraron órdenes</td></tr>
              ) : (
                filteredOrdenes.map((orden: Orden) => (
                  <tr key={orden.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900">#{orden.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-bold text-slate-900">{orden.cliente?.nombre || 'Consumidor'} {orden.cliente?.apellido || 'Final'}</p>
                        <p className="text-xs text-slate-500">{orden.cliente?.email || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-medium">{new Date(orden.fecha).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900">S/ {Number(orden.total).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        orden.estado.nombre.toLowerCase().includes('entregado') ? 'bg-emerald-100 text-emerald-700' : 
                        orden.estado.nombre.toLowerCase().includes('pendiente') ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {orden.estado.nombre}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDownloadInvoice(orden.id)}
                        className="inline-flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-600 transition hover:bg-sky-100 active:scale-95"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        Factura
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default FacturasAdmin;
