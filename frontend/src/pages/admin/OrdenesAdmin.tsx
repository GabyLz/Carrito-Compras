import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const OrdenesAdmin = () => {
  const [estado, setEstado] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [cliente, setCliente] = useState('');
  const [montoMin, setMontoMin] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [nextEstado, setNextEstado] = useState<string>('en_proceso');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (estado) params.set('estado', estado);
    if (fechaDesde) params.set('fechaDesde', fechaDesde);
    if (fechaHasta) params.set('fechaHasta', fechaHasta);
    if (cliente) params.set('cliente', cliente);
    if (montoMin) params.set('montoMin', montoMin);
    return params.toString();
  }, [estado, fechaDesde, fechaHasta, cliente, montoMin]);

  const { data: ordenes = [], refetch } = useQuery({
    queryKey: ['admin-ordenes', query],
    queryFn: async () => (await api.get(`/ordenes/admin/all${query ? `?${query}` : ''}`)).data,
  });

  const { data: selectedOrder, isLoading: loadingSelected } = useQuery({
    queryKey: ['orden-detalle', selectedOrderId],
    queryFn: async () => (await api.get(`/ordenes/${selectedOrderId}`)).data,
    enabled: !!selectedOrderId,
  });

  const estadoMutation = useMutation({
    mutationFn: async (payload: { id: number; estado: string }) => api.put(`/ordenes/admin/${payload.id}/estado`, { estado: payload.estado, comentario: 'Actualizacion desde panel admin' }),
    onSuccess: () => {
      toast.success('Estado actualizado');
      refetch();
    },
  });

  const devolucionMutation = useMutation({
    mutationFn: async (id: number) => api.post(`/ordenes/admin/${id}/devolucion`, { motivo: 'Solicitud operativa', montoReembolsado: 0, comentarioAdministrador: 'Registrada desde panel admin' }),
    onSuccess: () => {
      toast.success('Devolucion registrada');
      refetch();
    },
  });

  return (
    <main className="app-shell space-y-6 py-6">
      <section className="panel p-6">
        <h1 className="text-3xl font-bold text-slate-900">Gestión de órdenes</h1>
        <p className="mt-2 text-sm text-slate-600">
          Filtros avanzados, cambio de estado, devoluciones y trazabilidad operativa.
        </p>
      </section>

      <section className="panel p-4">
        <div className="grid gap-2 md:grid-cols-6">
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Todos</option>
            <option value="pendiente_pago">pendiente_pago</option>
            <option value="pagada">pagada</option>
            <option value="en_proceso">en_proceso</option>
            <option value="enviada">enviada</option>
            <option value="entregada">entregada</option>
            <option value="cancelada">cancelada</option>
            <option value="devuelta">devuelta</option>
          </select>
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Monto min" value={montoMin} onChange={(e) => setMontoMin(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button onClick={() => refetch()} className="rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white">Aplicar</button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="panel overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 p-5">
            <h2 className="text-lg font-bold text-slate-900">Órdenes</h2>
            <p className="mt-1 text-sm text-slate-600">Selecciona una fila para ver el resumen y acciones operativas.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Orden</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-6 py-4">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordenes.length === 0 ? (
                  <tr><td colSpan={5} className="py-16 text-center font-medium text-slate-500">Sin órdenes</td></tr>
                ) : (
                  ordenes.map((o: any) => {
                    const isSelected = selectedOrderId === o.id;
                    return (
                      <tr
                        key={o.id}
                        onClick={() => {
                          setSelectedOrderId(o.id);
                          setNextEstado(o.estado?.nombre || 'en_proceso');
                        }}
                        className={`cursor-pointer transition-colors hover:bg-slate-50/70 ${isSelected ? 'bg-sky-50/70' : ''}`}
                      >
                        <td className="px-6 py-4 font-bold text-slate-900">#{o.id}</td>
                        <td className="px-6 py-4 text-slate-700">{o.cliente?.email || '-'}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {o.estado?.nombre || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">S/ {Number(o.total || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-slate-700">{o.fecha ? new Date(o.fecha).toLocaleDateString() : '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="panel h-fit overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 p-5">
            <h2 className="text-lg font-bold text-slate-900">Acciones</h2>
            <p className="mt-1 text-sm text-slate-600">Panel operativo por orden seleccionada.</p>
          </div>

          {!selectedOrderId ? (
            <div className="p-6 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Sin selección</p>
              <p className="mt-1">Haz clic en una orden para ver el detalle, cambiar estado y registrar devoluciones.</p>
            </div>
          ) : loadingSelected ? (
            <div className="p-6">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="h-9 w-9 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
                <p className="text-sm font-semibold">Cargando detalle...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5 p-6">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-900">Orden #{selectedOrder?.id}</p>
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{selectedOrder?.estado?.nombre || '-'}</span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-700">
                  <p><span className="font-semibold">Cliente:</span> {selectedOrder?.cliente?.email || '-'}</p>
                  <p><span className="font-semibold">Fecha:</span> {selectedOrder?.fecha ? new Date(selectedOrder.fecha).toLocaleString() : '-'}</p>
                  <p><span className="font-semibold">Total:</span> S/ {Number(selectedOrder?.total || 0).toFixed(2)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-bold text-slate-900">Resumen de items</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {(selectedOrder?.items || []).length === 0 ? (
                    <li className="text-slate-500">Sin items</li>
                  ) : (
                    selectedOrder.items.map((it: any) => (
                      <li key={it.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                        <div>
                          <p className="font-semibold text-slate-900">{it.producto?.nombre || `Producto #${it.id_producto}`}</p>
                          <p className="text-xs text-slate-500">SKU: {it.id_producto}{it.id_variante ? `-V${it.id_variante}` : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{it.cantidad}u</p>
                          <p className="text-xs text-slate-500">S/ {Number(it.subtotal || 0).toFixed(2)}</p>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-bold text-slate-900">Cambiar estado</p>
                <div className="mt-3 grid gap-2">
                  <select value={nextEstado} onChange={(e) => setNextEstado(e.target.value)} className="w-full rounded-xl border-slate-200 text-sm focus:border-sky-500 focus:ring-sky-500">
                    {['pendiente_pago', 'pagada', 'en_proceso', 'enviada', 'entregada', 'cancelada', 'devuelta'].map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => estadoMutation.mutate({ id: selectedOrderId, estado: nextEstado })}
                    disabled={estadoMutation.isPending}
                    className="rounded-xl bg-sky-800 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {estadoMutation.isPending ? 'Actualizando...' : 'Actualizar estado'}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-bold text-rose-900">Devolución</p>
                <p className="mt-1 text-sm text-rose-800">Registra una devolución operativa para esta orden.</p>
                <button
                  type="button"
                  onClick={() => devolucionMutation.mutate(selectedOrderId)}
                  disabled={devolucionMutation.isPending}
                  className="mt-3 w-full rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {devolucionMutation.isPending ? 'Procesando...' : 'Registrar devolución'}
                </button>
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
};

export default OrdenesAdmin;
