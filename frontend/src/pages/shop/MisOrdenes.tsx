import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const MisOrdenes = () => {
  const [estado, setEstado] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (estado) params.set('estado', estado);
    if (fechaDesde) params.set('fechaDesde', fechaDesde);
    if (fechaHasta) params.set('fechaHasta', fechaHasta);
    return params.toString();
  }, [estado, fechaDesde, fechaHasta]);

  const { data: ordenes = [], refetch } = useQuery({
    queryKey: ['mis-ordenes', query],
    queryFn: async () => (await api.get(`/ordenes/mis${query ? `?${query}` : ''}`)).data,
  });

  const { data: ordenDetalle } = useQuery({
    queryKey: ['orden-detalle', selectedId],
    queryFn: async () => (await api.get(`/ordenes/${selectedId}`)).data,
    enabled: !!selectedId,
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => api.post(`/ordenes/${id}/cancelar`),
    onSuccess: () => {
      toast.success('Orden cancelada');
      refetch();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'No se pudo cancelar'),
  });

  const descargar = async (tipo: 'factura' | 'comprobante', id: number) => {
    try {
      const response = await api.get(`/ordenes/${id}/${tipo}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tipo}-orden-${id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(`No se pudo descargar ${tipo}`);
    }
  };

  return (
    <main className="app-shell space-y-4 py-6">
      <section className="panel p-6">
        <h1 className="text-3xl font-bold text-slate-900">Mis ordenes</h1>
        <p className="mt-2 text-sm text-slate-600">Historial con filtros, detalle, timeline, cancelacion y descarga de comprobantes.</p>
      </section>

      <section className="panel p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Todos los estados</option>
            <option value="pendiente_pago">pendiente_pago</option>
            <option value="pagada">pagada</option>
            <option value="en_proceso">en_proceso</option>
            <option value="enviada">enviada</option>
            <option value="entregada">entregada</option>
            <option value="cancelada">cancelada</option>
          </select>
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button onClick={() => refetch()} className="rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white">Filtrar</button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <article className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3">Orden</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((o: any) => (
                <tr key={o.id} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50" onClick={() => setSelectedId(o.id)}>
                  <td className="px-4 py-3">#{o.id}</td>
                  <td className="px-4 py-3">{o.fecha ? new Date(o.fecha).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3">{o.estado?.nombre || '-'}</td>
                  <td className="px-4 py-3">S/ {Number(o.total || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <button type="button" onClick={(e) => { e.stopPropagation(); cancelMutation.mutate(o.id); }} className="rounded border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700">Cancelar</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); descargar('factura', o.id); }} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">Factura</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!ordenes.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">No se encontraron ordenes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </article>

        <aside className="panel p-4">
          <h2 className="text-lg font-bold text-slate-900">Detalle de orden</h2>
          {!ordenDetalle && <p className="mt-2 text-sm text-slate-600">Selecciona una orden para ver su detalle.</p>}
          {ordenDetalle && (
            <div className="mt-3 space-y-3 text-sm">
              <p><span className="font-semibold">Orden:</span> #{ordenDetalle.id}</p>
              <p><span className="font-semibold">Estado:</span> {ordenDetalle.estado?.nombre || '-'}</p>
              <p><span className="font-semibold">Metodo pago:</span> {ordenDetalle.metodo_pago?.nombre || '-'}</p>
              <p><span className="font-semibold">Tracking:</span> {ordenDetalle.numero_guia || 'Pendiente'}</p>
              <div>
                <p className="mb-1 font-semibold">Items</p>
                <ul className="space-y-1">
                  {(ordenDetalle.items || []).map((i: any) => (
                    <li key={i.id} className="rounded border border-slate-200 bg-slate-50 px-2 py-1">{i.producto?.nombre} x {i.cantidad} - S/ {Number(i.subtotal || 0).toFixed(2)}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 font-semibold">Timeline</p>
                <ul className="space-y-1">
                  {(ordenDetalle.ord_historial_estados || []).map((h: any) => (
                    <li key={h.id} className="rounded border border-slate-200 px-2 py-1">{new Date(h.fecha).toLocaleString()} - {h.ord_estados_orden?.nombre} {h.comentario ? `(${h.comentario})` : ''}</li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => descargar('factura', ordenDetalle.id)} className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Descargar factura</button>
                <button type="button" onClick={() => descargar('comprobante', ordenDetalle.id)} className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Descargar comprobante</button>
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
};

export default MisOrdenes;
