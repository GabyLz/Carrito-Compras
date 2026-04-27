import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const ClientesAdmin = () => {
  const [search, setSearch] = useState('');
  const [segmento, setSegmento] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (segmento) params.set('segmento', segmento);
    return params.toString();
  }, [search, segmento]);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-admin', query],
    queryFn: async () => (await api.get(`/clientes${query ? `?${query}` : ''}`)).data,
  });

  return (
    <main className="app-shell space-y-4 py-6">
      <section className="panel p-6">
        <h1 className="text-3xl font-bold text-slate-900">Gestion de clientes</h1>
        <p className="mt-2 text-sm text-slate-600">
          Segmentacion (nuevos, recurrentes, inactivos, VIP), detalle comercial y control de cuentas.
        </p>
      </section>

      <section className="panel p-4">
        <div className="grid gap-2 md:grid-cols-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o email" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select value={segmento} onChange={(e) => setSegmento(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Todos los segmentos</option>
            <option value="NUEVO">NUEVO</option>
            <option value="RECURRENTE">RECURRENTE</option>
            <option value="INACTIVO">INACTIVO</option>
            <option value="VIP">VIP</option>
          </select>
          <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">Total clientes: {clientes.length}</div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-700">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Ordenes</th>
              <th className="px-4 py-3">Total gastado</th>
              <th className="px-4 py-3">Ultima compra</th>
              <th className="px-4 py-3">Segmento</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c: any) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-800">{c.nombre} {c.apellido || ''}</td>
                <td className="px-4 py-3">{c.email}</td>
                <td className="px-4 py-3">{c._count?.ordenes || 0}</td>
                <td className="px-4 py-3">S/ {Number(c.totalGastado || 0).toFixed(2)}</td>
                <td className="px-4 py-3">{c.ultimaCompra ? new Date(c.ultimaCompra).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{c.segmento}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
};

export default ClientesAdmin;
