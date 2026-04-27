import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { normalizeRole } from '../../lib/roles';
import { toast } from 'react-hot-toast';

export default function InventarioAdmin() {
  const queryClient = useQueryClient();
  const role = normalizeRole(useAuthStore((state) => state.user?.rol));
  const readOnly = role === 'VENDEDOR';

  const { data: stock = [], isLoading: loadingStock } = useQuery({
    queryKey: ['stock'],
    queryFn: async () => (await api.get('/inventario/stock')).data,
  });
  const { data: movimientos = [], isLoading: loadingMovimientos } = useQuery({
    queryKey: ['movimientos'],
    queryFn: async () => (await api.get('/inventario/movimientos')).data,
  });
  const { data: proveedores = [], isLoading: loadingProveedores } = useQuery({
    queryKey: ['proveedores'],
    queryFn: async () => (await api.get('/inventario/proveedores')).data,
  });
  const { data: ordenesCompra = [], isLoading: loadingOC } = useQuery({
    queryKey: ['ordenes-compra'],
    queryFn: async () => (await api.get('/inventario/ordenes-compra')).data,
  });

  const [form, setForm] = useState({ id_producto: '', cantidad: 0, motivo: '' });
  const [proveedorForm, setProveedorForm] = useState({ nombre: '', contacto: '', telefono: '', email: '' });
  const [ocForm, setOcForm] = useState({ id_proveedor: '', id_producto: '', cantidad: '', costo_unitario: '' });
  const [tab, setTab] = useState<'stock' | 'movimientos' | 'ajustes' | 'proveedores' | 'ordenes_compra'>('stock');
  const [stockSearch, setStockSearch] = useState('');
  const [movTipo, setMovTipo] = useState<'todos' | 'entrada' | 'salida'>('todos');

  const ajusteMutation = useMutation({
    mutationFn: (data: any) => api.post('/inventario/ajustar', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock', 'movimientos'] })
  });
  const proveedorMutation = useMutation({
    mutationFn: (data: any) => api.post('/inventario/proveedores', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proveedores'] }),
  });
  const ordenCompraMutation = useMutation({
    mutationFn: (data: any) => api.post('/inventario/ordenes-compra', data),
    onSuccess: () => {
      toast.success('Orden de compra creada');
      setOcForm({ id_proveedor: '', id_producto: '', cantidad: '', costo_unitario: '' });
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra', 'stock', 'movimientos'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'No se pudo crear la orden de compra'),
  });
  const recibirMutation = useMutation({
    mutationFn: (id: number) => api.post(`/inventario/ordenes-compra/${id}/recibir`),
    onSuccess: () => {
      toast.success('Orden de compra recibida');
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra', 'stock', 'movimientos'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'No se pudo recibir la orden de compra'),
  });

  const kpis = useMemo(() => {
    const totalSkus = stock.length;
    const totalUnidades = stock.reduce((sum: number, s: any) => sum + Number(s.cantidad || 0), 0);
    const lowStock = stock.filter((s: any) => Number(s.cantidad || 0) <= 5).length;
    const lastMov = movimientos[0];
    return { totalSkus, totalUnidades, lowStock, lastMov };
  }, [movimientos, stock]);

  const filteredStock = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    const base = q
      ? stock.filter((s: any) => {
          const name = String(s.producto?.nombre || s.variante?.sku || '').toLowerCase();
          const almacen = String(s.almacen?.nombre || '').toLowerCase();
          return name.includes(q) || almacen.includes(q);
        })
      : stock;
    return [...base].sort((a: any, b: any) => Number(a.cantidad || 0) - Number(b.cantidad || 0));
  }, [stock, stockSearch]);

  const filteredMovimientos = useMemo(() => {
    const base = movTipo === 'todos' ? movimientos : movimientos.filter((m: any) => String(m.tipo || '').toLowerCase() === movTipo);
    return base.slice(0, 40);
  }, [movTipo, movimientos]);

  return (
    <main className="app-shell space-y-6 py-6">
      <section className="panel overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900 px-6 py-8 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-200">Suite operativa</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Inventario</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-200">Stock, ajustes, proveedores, órdenes de compra y trazabilidad de movimientos.</p>
          {readOnly && <p className="mt-3 inline-flex rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-200">Modo lectura (rol vendedor)</p>}
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">SKUs monitoreados</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{kpis.totalSkus}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Unidades totales</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{kpis.totalUnidades}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Bajo stock</p>
            <p className="mt-2 text-3xl font-black text-amber-700">{kpis.lowStock}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Umbral: ≤ 5 unidades</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Último movimiento</p>
            <p className="mt-2 text-sm font-bold text-slate-900">{kpis.lastMov ? String(kpis.lastMov.motivo || 'Movimiento') : 'Sin registros'}</p>
            <p className="mt-1 text-xs text-slate-500">{kpis.lastMov ? `${kpis.lastMov.tipo} • ${kpis.lastMov.fecha}` : '-'}</p>
          </article>
        </div>
      </section>

      <section className="panel p-2">
        <div className="grid gap-2 md:grid-cols-5">
          {(
            [
              { key: 'stock', label: 'Stock' },
              { key: 'movimientos', label: 'Movimientos' },
              { key: 'ajustes', label: 'Ajustes' },
              { key: 'proveedores', label: 'Proveedores' },
              { key: 'ordenes_compra', label: 'Órdenes de compra' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                tab === t.key ? 'bg-sky-800 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {tab === 'stock' && (
        <section className="panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Stock actual</h2>
              <p className="mt-1 text-sm text-slate-600">Vista consolidada por almacén y producto.</p>
            </div>
            <div className="relative w-full md:w-96">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Buscar por producto o almacén..."
                className="w-full rounded-xl border-slate-200 pl-10 text-sm focus:border-sky-500 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">Almacén</th>
                  <th className="px-6 py-4 text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingStock ? (
                  <tr><td colSpan={3} className="py-16 text-center font-medium text-slate-500">Cargando stock...</td></tr>
                ) : filteredStock.length === 0 ? (
                  <tr><td colSpan={3} className="py-16 text-center font-medium text-slate-500">Sin resultados</td></tr>
                ) : (
                  filteredStock.map((s: any) => {
                    const nombre = s.producto?.nombre || (s.variante?.sku ? `Variante ${s.variante.sku}` : 'Producto');
                    const cantidad = Number(s.cantidad || 0);
                    const badge =
                      cantidad <= 0 ? 'bg-rose-100 text-rose-700' : cantidad <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{nombre}</p>
                          <p className="mt-1 text-xs text-slate-500">Ref: #{s.id_producto}{s.id_variante ? `-V${s.id_variante}` : ''}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-700">{s.almacen?.nombre || '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${badge}`}>{cantidad}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'movimientos' && (
        <section className="panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Movimientos</h2>
              <p className="mt-1 text-sm text-slate-600">Entradas y salidas recientes con motivo operativo.</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={movTipo} onChange={(e) => setMovTipo(e.target.value as any)} className="rounded-xl border-slate-200 text-sm focus:border-sky-500 focus:ring-sky-500">
                <option value="todos">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Motivo</th>
                  <th className="px-6 py-4 text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingMovimientos ? (
                  <tr><td colSpan={4} className="py-16 text-center font-medium text-slate-500">Cargando movimientos...</td></tr>
                ) : filteredMovimientos.length === 0 ? (
                  <tr><td colSpan={4} className="py-16 text-center font-medium text-slate-500">Sin movimientos</td></tr>
                ) : (
                  filteredMovimientos.map((m: any) => {
                    const tipo = String(m.tipo || '').toLowerCase();
                    const badge = tipo === 'salida' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700';
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4 text-slate-700">{m.fecha || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${badge}`}>{tipo || '-'}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-700">{m.motivo || '-'}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">{Number(m.cantidad || 0)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'ajustes' && (
        <section className="panel p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ajuste de stock</h2>
              <p className="mt-1 text-sm text-slate-600">Ajustes manuales por auditoría, pérdida, corrección o recuento.</p>
            </div>
            {readOnly && <p className="text-xs font-semibold text-amber-700">Rol vendedor: lectura</p>}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">ID producto</label>
              <input
                disabled={readOnly}
                placeholder="Ej: 12"
                value={form.id_producto}
                onChange={(e) => setForm({ ...form, id_producto: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Cantidad (+/-)</label>
              <input
                disabled={readOnly}
                type="number"
                placeholder="Ej: -3 o 10"
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: Number(e.target.value || 0) })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Motivo</label>
              <input
                disabled={readOnly}
                placeholder="Ej: Recuento físico / Merma / Ajuste"
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-slate-500">Almacén aplicado: #1</p>
            <button
              disabled={readOnly || ajusteMutation.isPending}
              onClick={() =>
                ajusteMutation.mutate({
                  id_producto: parseInt(form.id_producto),
                  cantidad: form.cantidad,
                  motivo: form.motivo,
                  id_almacen: 1,
                })
              }
              className="rounded-xl bg-sky-800 px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ajusteMutation.isPending ? 'Procesando...' : 'Aplicar ajuste'}
            </button>
          </div>
        </section>
      )}

      {tab === 'proveedores' && (
        <section className="panel overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 p-6">
            <h2 className="text-lg font-bold text-slate-900">Proveedores</h2>
            <p className="mt-1 text-sm text-slate-600">Alta rápida y consulta de contactos.</p>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[420px_1fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold text-slate-900">Nuevo proveedor</p>
              <div className="mt-4 grid gap-3">
                <input placeholder="Nombre" value={proveedorForm.nombre} onChange={(e) => setProveedorForm((s) => ({ ...s, nombre: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500" />
                <input placeholder="Contacto" value={proveedorForm.contacto} onChange={(e) => setProveedorForm((s) => ({ ...s, contacto: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500" />
                <div className="grid gap-3 md:grid-cols-2">
                  <input placeholder="Telefono" value={proveedorForm.telefono} onChange={(e) => setProveedorForm((s) => ({ ...s, telefono: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500" />
                  <input placeholder="Email" value={proveedorForm.email} onChange={(e) => setProveedorForm((s) => ({ ...s, email: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500" />
                </div>
                <button
                  disabled={readOnly || proveedorMutation.isPending}
                  onClick={() => proveedorMutation.mutate(proveedorForm)}
                  className="rounded-xl bg-sky-800 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {proveedorMutation.isPending ? 'Guardando...' : 'Crear proveedor'}
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                <p className="text-sm font-bold text-slate-900">Directorio</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{proveedores.length} proveedor(es)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr className="border-b border-slate-100">
                      <th className="px-5 py-3">Nombre</th>
                      <th className="px-5 py-3">Contacto</th>
                      <th className="px-5 py-3">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingProveedores ? (
                      <tr><td colSpan={3} className="py-14 text-center font-medium text-slate-500">Cargando proveedores...</td></tr>
                    ) : proveedores.length === 0 ? (
                      <tr><td colSpan={3} className="py-14 text-center font-medium text-slate-500">Sin proveedores</td></tr>
                    ) : (
                      proveedores.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="px-5 py-4 font-bold text-slate-900">{p.nombre}</td>
                          <td className="px-5 py-4 text-slate-700">{p.contacto || '-'}</td>
                          <td className="px-5 py-4 text-slate-700">{p.email || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === 'ordenes_compra' && (
        <section className="panel overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 p-6">
            <h2 className="text-lg font-bold text-slate-900">Órdenes de compra</h2>
            <p className="mt-1 text-sm text-slate-600">Creación, recepción y control de cuentas por pagar.</p>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[420px_1fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold text-slate-900">Nueva OC</p>
              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <input type="number" min={1} placeholder="ID proveedor" value={ocForm.id_proveedor} onChange={(e) => setOcForm((s) => ({ ...s, id_proveedor: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500" />
                  <input type="number" min={1} placeholder="ID producto" value={ocForm.id_producto} onChange={(e) => setOcForm((s) => ({ ...s, id_producto: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input type="number" min={1} placeholder="Cantidad" value={ocForm.cantidad} onChange={(e) => setOcForm((s) => ({ ...s, cantidad: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500" />
                  <input type="number" min={0} step="0.01" placeholder="Costo unitario" value={ocForm.costo_unitario} onChange={(e) => setOcForm((s) => ({ ...s, costo_unitario: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500" />
                </div>
                <button
                  disabled={readOnly || ordenCompraMutation.isPending}
                  onClick={() => {
                    const idProveedor = Number(ocForm.id_proveedor);
                    const idProducto = Number(ocForm.id_producto);
                    const cantidad = Number(ocForm.cantidad);
                    const costoUnitario = Number(ocForm.costo_unitario);
                    if (
                      !Number.isFinite(idProveedor) ||
                      idProveedor <= 0 ||
                      !Number.isFinite(idProducto) ||
                      idProducto <= 0 ||
                      !Number.isFinite(cantidad) ||
                      cantidad <= 0 ||
                      !Number.isFinite(costoUnitario) ||
                      costoUnitario < 0
                    ) {
                      toast.error('Completa los datos de la orden de compra con valores válidos');
                      return;
                    }
                    ordenCompraMutation.mutate({
                      id_proveedor: idProveedor,
                      id_almacen: 1,
                      detalles: [{ id_producto: idProducto, cantidad, costo_unitario: costoUnitario }],
                    });
                  }}
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ordenCompraMutation.isPending ? 'Creando...' : 'Crear orden de compra'}
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                <p className="text-sm font-bold text-slate-900">Listado</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{ordenesCompra.length} OC</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr className="border-b border-slate-100">
                      <th className="px-5 py-3">OC</th>
                      <th className="px-5 py-3">Estado</th>
                      <th className="px-5 py-3 text-right">Total</th>
                      <th className="px-5 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingOC ? (
                      <tr><td colSpan={4} className="py-14 text-center font-medium text-slate-500">Cargando órdenes...</td></tr>
                    ) : ordenesCompra.length === 0 ? (
                      <tr><td colSpan={4} className="py-14 text-center font-medium text-slate-500">Sin órdenes de compra</td></tr>
                    ) : (
                      ordenesCompra.map((oc: any) => {
                        const estado = String(oc.estado || '-');
                        const badge = estado === 'recibida' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
                        return (
                          <tr key={oc.id} className="hover:bg-slate-50/60">
                            <td className="px-5 py-4 font-bold text-slate-900">#{oc.id}</td>
                            <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${badge}`}>{estado}</span></td>
                            <td className="px-5 py-4 text-right font-bold text-slate-900">S/ {Number(oc.total || 0).toFixed(2)}</td>
                            <td className="px-5 py-4 text-right">
                              <button
                                disabled={readOnly || oc.estado === 'recibida' || recibirMutation.isPending}
                                onClick={() => recibirMutation.mutate(oc.id)}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Recibir
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
