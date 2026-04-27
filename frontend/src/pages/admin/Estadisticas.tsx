import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useMemo, useState } from 'react';

const Estadisticas = () => {
  const [tab, setTab] = useState<'ventas' | 'clientes' | 'carrito' | 'pricing'>('ventas');

  const { data: tendencia = [], isLoading: loadingTendencia } = useQuery({
    queryKey: ['est-tendencia'],
    queryFn: async () => (await api.get('/admin/estadisticas/tendencia-ventas')).data,
  });
  const { data: abc = [], isLoading: loadingABC } = useQuery({
    queryKey: ['est-abc'],
    queryFn: async () => (await api.get('/admin/estadisticas/abc-productos')).data,
  });
  const { data: rfm = [], isLoading: loadingRFM } = useQuery({
    queryKey: ['est-rfm'],
    queryFn: async () => (await api.get('/admin/estadisticas/rfm-clientes')).data,
  });
  const { data: abandono = [], isLoading: loadingAbandono } = useQuery({
    queryKey: ['est-abandono'],
    queryFn: async () => (await api.get('/admin/estadisticas/abandono-carrito')).data,
  });
  const { data: cohortes = [], isLoading: loadingCohortes } = useQuery({
    queryKey: ['est-cohortes'],
    queryFn: async () => (await api.get('/admin/estadisticas/cohortes')).data,
  });
  const { data: correlacion = [], isLoading: loadingCorrelacion } = useQuery({
    queryKey: ['est-correlacion'],
    queryFn: async () => (await api.get('/admin/estadisticas/correlacion-descuento')).data,
  });
  const { data: tickets = [], isLoading: loadingTickets } = useQuery({
    queryKey: ['est-ticket'],
    queryFn: async () => (await api.get('/admin/estadisticas/ticket-segmentos')).data,
  });

  const tendenciaRows = useMemo(() => {
    const rows = tendencia
      .map((r: any) => ({
        mes: r.mes,
        total: Number(r.total || 0),
        movilApi: r.movil !== null && r.movil !== undefined ? Number(r.movil) : null,
      }))
      .sort((a: any, b: any) => new Date(a.mes).getTime() - new Date(b.mes).getTime());

    return rows.map((row: any, idx: number) => {
      const avg3 = idx < 2 ? null : (rows[idx - 2].total + rows[idx - 1].total + row.total) / 3;
      return {
        ...row,
        label: row.mes ? new Date(row.mes).toLocaleDateString('es-PE', { year: 'numeric', month: 'short' }) : '-',
        movil: row.movilApi ?? (avg3 === null ? null : Number(avg3.toFixed(2))),
      };
    });
  }, [tendencia]);

  const cohortesTable = useMemo(() => {
    type CohorteRow = { cohorte: string; mes_actividad: string; clientes: number };

    const parseYm = (ym: string) => {
      const [y, m] = String(ym || '').split('-').map((x) => Number(x));
      if (!y || !m) return null;
      return new Date(y, m - 1, 1);
    };
    const diffMonths = (from: Date, to: Date) => (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());

    const rows: CohorteRow[] = (cohortes || []).map((r: any) => ({
      cohorte: String(r.cohorte || ''),
      mes_actividad: String(r.mes_actividad || ''),
      clientes: Number(r.clientes || 0),
    }));

    const byCohorte = new Map<string, CohorteRow[]>();
    for (const r of rows) {
      const key = r.cohorte;
      byCohorte.set(key, [...(byCohorte.get(key) || []), r]);
    }

    const cohortKeys = [...byCohorte.keys()].sort();
    const maxMeses = 6;

    const table = cohortKeys.map((key) => {
      const cohortDate = parseYm(key);
      const cells: { n: number; pct: number | null }[] = Array.from({ length: maxMeses }, () => ({ n: 0, pct: null }));
      if (!cohortDate) return { cohorte: key, size: 0, cells };

      const group = byCohorte.get(key) || [];
      for (const r of group) {
        const actDate = parseYm(r.mes_actividad);
        if (!actDate) continue;
        const d = diffMonths(cohortDate, actDate);
        if (d < 0 || d >= maxMeses) continue;
        cells[d].n = Number(r.clientes || 0);
      }

      const size = cells[0].n || 0;
      for (let i = 0; i < maxMeses; i += 1) {
        cells[i].pct = size > 0 ? Number(((cells[i].n / size) * 100).toFixed(0)) : null;
      }

      return { cohorte: key, size, cells };
    });

    return table.reverse().slice(0, 12);
  }, [cohortes]);

  const rfmRows = useMemo(() => {
    type RfmBaseRow = {
      id: number;
      nombre: string;
      ultima_compra: string;
      recencyDays: number | null;
      frecuencia: number;
      monetario: number;
    };

    const today = Date.now();
    const base: RfmBaseRow[] = (rfm || []).map((c: any) => {
      const ultima = c.ultima_compra ? new Date(c.ultima_compra).getTime() : null;
      const recencyDays = ultima ? Math.max(Math.round((today - ultima) / (1000 * 60 * 60 * 24)), 0) : null;
      return {
        id: c.id,
        nombre: String(c.nombre || 'Cliente'),
        ultima_compra: c.ultima_compra ? new Date(c.ultima_compra).toLocaleDateString('es-PE') : '-',
        recencyDays,
        frecuencia: Number(c.frecuencia || 0),
        monetario: Number(c.monetario || 0),
      };
    });

    const scoreByQuintile = (values: number[], value: number, order: 'asc' | 'desc') => {
      const sorted = [...values].sort((a, b) => (order === 'asc' ? a - b : b - a));
      const cut = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];
      const q20 = cut(0.2);
      const q40 = cut(0.4);
      const q60 = cut(0.6);
      const q80 = cut(0.8);
      if (order === 'asc') {
        if (value <= q20) return 5;
        if (value <= q40) return 4;
        if (value <= q60) return 3;
        if (value <= q80) return 2;
        return 1;
      }
      if (value >= q20) return 5;
      if (value >= q40) return 4;
      if (value >= q60) return 3;
      if (value >= q80) return 2;
      return 1;
    };

    const recValues = base.map((x: RfmBaseRow) => (x.recencyDays === null ? 99999 : x.recencyDays));
    const freqValues = base.map((x: RfmBaseRow) => x.frecuencia);
    const monValues = base.map((x: RfmBaseRow) => x.monetario);

    const segment = (r: number, f: number, m: number) => {
      if (r >= 4 && f >= 4 && m >= 4) return 'Champions';
      if (r >= 4 && f >= 3 && m >= 3) return 'Leales';
      if (r >= 4 && f <= 2) return 'Nuevos';
      if (r <= 2 && f >= 3) return 'En riesgo';
      if (r <= 2 && f <= 2) return 'Hibernando';
      return 'Estándar';
    };

    return base
      .map((x: RfmBaseRow) => {
        const rScore = scoreByQuintile(recValues, x.recencyDays === null ? 99999 : x.recencyDays, 'asc');
        const fScore = scoreByQuintile(freqValues, x.frecuencia, 'desc');
        const mScore = scoreByQuintile(monValues, x.monetario, 'desc');
        return { ...x, rScore, fScore, mScore, segmento: segment(rScore, fScore, mScore) };
      })
      .sort((a: any, b: any) => (b.rScore + b.fScore + b.mScore) - (a.rScore + a.fScore + a.mScore))
      .slice(0, 30);
  }, [rfm]);

  const kpis = useMemo(() => {
    const totalVentas = tendenciaRows.reduce((s: number, r: any) => s + Number(r.total || 0), 0);
    const bestMonth = tendenciaRows.reduce(
      (best: any, r: any) => (Number(r.total || 0) > Number(best.total || 0) ? r : best),
      { total: 0, label: '-' }
    );
    const abandonoAvg = abandono.length
      ? abandono.reduce((s: number, r: any) => s + Number(r.tasa_abandono || 0), 0) / abandono.length
      : 0;
    return { totalVentas, bestMonth, abandonoAvg };
  }, [abandono, tendenciaRows]);

  return (
    <main className="app-shell space-y-6 py-6">
      <section className="panel overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-6 py-8 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">Analítica</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Estadísticas descriptivas</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-200">Ventas, clientes, carrito y pricing con métricas resumidas y tablas legibles.</p>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ventas acumuladas</p>
            <p className="mt-2 text-3xl font-black text-slate-900">S/ {kpis.totalVentas.toFixed(2)}</p>
            <p className="mt-1 text-xs text-slate-500">Serie: {tendenciaRows.length} mes(es)</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Mejor mes</p>
            <p className="mt-2 text-lg font-black text-slate-900">{kpis.bestMonth.label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">S/ {Number(kpis.bestMonth.total || 0).toFixed(2)}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Abandono promedio</p>
            <p className="mt-2 text-3xl font-black text-amber-700">{kpis.abandonoAvg.toFixed(1)}%</p>
            <p className="mt-1 text-xs text-slate-500">Basado en {abandono.length} registro(s)</p>
          </article>
        </div>
      </section>

      <section className="panel p-2">
        <div className="grid gap-2 md:grid-cols-4">
          {(
            [
              { key: 'ventas', label: 'Ventas' },
              { key: 'clientes', label: 'Clientes' },
              { key: 'carrito', label: 'Carrito' },
              { key: 'pricing', label: 'Pricing' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${tab === t.key ? 'bg-indigo-800 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {tab === 'ventas' && (
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="panel overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-6">
              <h2 className="text-lg font-bold text-slate-900">Tendencia mensual + promedio móvil</h2>
              <p className="mt-1 text-sm text-slate-600">Promedio móvil (3 meses) para lectura rápida.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-3">Mes</th>
                    <th className="px-6 py-3 text-right">Ventas</th>
                    <th className="px-6 py-3 text-right">Prom. móvil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingTendencia ? (
                    <tr><td colSpan={3} className="py-14 text-center font-medium text-slate-500">Cargando tendencia...</td></tr>
                  ) : tendenciaRows.length === 0 ? (
                    <tr><td colSpan={3} className="py-14 text-center font-medium text-slate-500">Sin datos</td></tr>
                  ) : (
                    tendenciaRows.slice(-12).reverse().map((r: any) => (
                      <tr key={String(r.mes)} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4 font-semibold text-slate-900">{r.label}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">S/ {r.total.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-slate-700">{r.movil === null ? '-' : `S/ ${Number(r.movil).toFixed(2)}`}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-6">
              <h2 className="text-lg font-bold text-slate-900">ABC de productos</h2>
              <p className="mt-1 text-sm text-slate-600">Top productos por ingreso y categoría ABC.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-3">Producto</th>
                    <th className="px-6 py-3">Categoría</th>
                    <th className="px-6 py-3 text-right">Ingreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingABC ? (
                    <tr><td colSpan={3} className="py-14 text-center font-medium text-slate-500">Cargando ABC...</td></tr>
                  ) : abc.length === 0 ? (
                    <tr><td colSpan={3} className="py-14 text-center font-medium text-slate-500">Sin datos</td></tr>
                  ) : (
                    abc.slice(0, 12).map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4 font-semibold text-slate-900">{r.nombre}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{r.categoria}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">S/ {Number(r.ingreso || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {tab === 'clientes' && (
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="panel overflow-hidden lg:col-span-2">
            <div className="border-b border-slate-100 bg-slate-50/50 p-6">
              <h2 className="text-lg font-bold text-slate-900">RFM clientes</h2>
              <p className="mt-1 text-sm text-slate-600">R (recencia), F (frecuencia), M (monetario) con scoring por quintiles.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3">Última compra</th>
                    <th className="px-6 py-3 text-right">Recencia (días)</th>
                    <th className="px-6 py-3 text-right">Frecuencia</th>
                    <th className="px-6 py-3 text-right">Monetario</th>
                    <th className="px-6 py-3">Segmento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingRFM ? (
                    <tr><td colSpan={6} className="py-14 text-center font-medium text-slate-500">Cargando RFM...</td></tr>
                  ) : rfmRows.length === 0 ? (
                    <tr><td colSpan={6} className="py-14 text-center font-medium text-slate-500">Sin datos</td></tr>
                  ) : (
                    rfmRows.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4 font-semibold text-slate-900">{c.nombre}</td>
                        <td className="px-6 py-4 text-slate-700">{c.ultima_compra}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">{c.recencyDays === null ? '-' : c.recencyDays}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">{c.frecuencia}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">S/ {c.monetario.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{c.segmento}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-6">
              <h2 className="text-lg font-bold text-slate-900">Cohortes de retención</h2>
              <p className="mt-1 text-sm text-slate-600">Resumen por cohortes (filas recibidas: {cohortes.length}).</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-3">Cohorte</th>
                    <th className="px-6 py-3 text-right">Tamaño</th>
                    <th className="px-6 py-3 text-right">M0</th>
                    <th className="px-6 py-3 text-right">M1</th>
                    <th className="px-6 py-3 text-right">M2</th>
                    <th className="px-6 py-3 text-right">M3</th>
                    <th className="px-6 py-3 text-right">M4</th>
                    <th className="px-6 py-3 text-right">M5</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingCohortes ? (
                    <tr><td colSpan={8} className="py-14 text-center font-medium text-slate-500">Cargando cohortes...</td></tr>
                  ) : cohortesTable.length === 0 ? (
                    <tr><td colSpan={8} className="py-14 text-center font-medium text-slate-500">Sin datos</td></tr>
                  ) : (
                    cohortesTable.map((row: any) => (
                      <tr key={row.cohorte} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4 font-semibold text-slate-900">{row.cohorte}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">{row.size}</td>
                        {row.cells.map((c: any, idx: number) => (
                          <td key={idx} className="px-6 py-4 text-right text-slate-700">
                            <span className="font-bold text-slate-900">{c.n}</span>
                            <span className="ml-2 text-xs text-slate-500">{c.pct === null ? '-' : `${c.pct}%`}</span>
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-6">
              <h2 className="text-lg font-bold text-slate-900">Ticket por segmento</h2>
              <p className="mt-1 text-sm text-slate-600">Promedio del ticket por segmento de cliente y cliente VIP.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-3">Segmento</th>
                    <th className="px-6 py-3 text-right">Clientes</th>
                    <th className="px-6 py-3 text-right">Ticket promedio</th>
                    <th className="px-6 py-3">Cliente VIP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingTickets ? (
                    <tr><td colSpan={4} className="py-14 text-center font-medium text-slate-500">Cargando ticket...</td></tr>
                  ) : tickets.length === 0 ? (
                    <tr><td colSpan={4} className="py-14 text-center font-medium text-slate-500">Sin datos</td></tr>
                  ) : (
                    tickets.slice(0, 20).map((r: any, idx: number) => (
                      <tr key={`${r.segmento}-${idx}`} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4 font-semibold text-slate-900">{r.segmento}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">{Number(r.clientes || 0)}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">S/ {Number(r.ticket_promedio || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-slate-700">{String(r.segmento || '').toUpperCase() === 'VIP' ? (r.vip_cliente || '-') : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {tab === 'carrito' && (
        <section className="panel overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 p-6">
            <h2 className="text-lg font-bold text-slate-900">Abandono de carrito</h2>
            <p className="mt-1 text-sm text-slate-600">Carritos vs órdenes por mes y tasa de abandono.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-3">Mes</th>
                  <th className="px-6 py-3 text-right">Carritos</th>
                  <th className="px-6 py-3 text-right">Órdenes</th>
                  <th className="px-6 py-3 text-right">Abandono</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingAbandono ? (
                  <tr><td colSpan={4} className="py-14 text-center font-medium text-slate-500">Cargando abandono...</td></tr>
                ) : abandono.length === 0 ? (
                  <tr><td colSpan={4} className="py-14 text-center font-medium text-slate-500">Sin datos</td></tr>
                ) : (
                  abandono.slice(0, 18).map((r: any) => (
                    <tr key={r.mes} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4 font-semibold text-slate-900">{r.mes}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">{Number(r.carritos || 0)}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">{Number(r.ordenes || 0)}</td>
                      <td className="px-6 py-4 text-right font-bold text-amber-700">{Number(r.tasa_abandono || 0).toFixed(1)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'pricing' && (
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="panel overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-6">
              <h2 className="text-lg font-bold text-slate-900">Correlación descuento vs ventas</h2>
              <p className="mt-1 text-sm text-slate-600">Promedio de descuento y total de ventas por mes.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-3">Mes</th>
                    <th className="px-6 py-3 text-right">Desc. prom.</th>
                    <th className="px-6 py-3 text-right">Ventas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingCorrelacion ? (
                    <tr><td colSpan={3} className="py-14 text-center font-medium text-slate-500">Cargando correlación...</td></tr>
                  ) : correlacion.length === 0 ? (
                    <tr><td colSpan={3} className="py-14 text-center font-medium text-slate-500">Sin datos</td></tr>
                  ) : (
                    correlacion.slice(0, 18).map((r: any) => (
                      <tr key={r.mes} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4 font-semibold text-slate-900">{r.mes}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">{Number(r.descuento_promedio || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">S/ {Number(r.ventas || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-6">
              <h2 className="text-lg font-bold text-slate-900">Guía de lectura</h2>
              <p className="mt-1 text-sm text-slate-600">Interpretación rápida de los módulos estadísticos.</p>
            </div>
            <div className="space-y-3 p-6 text-sm text-slate-700">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-bold text-slate-900">Tendencia + promedio móvil</p>
                <p className="mt-1">Sirve para entender estacionalidad y suavizar picos (3 meses).</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-bold text-slate-900">ABC productos</p>
                <p className="mt-1">Prioriza productos que explican la mayor parte del ingreso.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-bold text-slate-900">RFM clientes</p>
                <p className="mt-1">Segmenta clientes según recencia, frecuencia y monetario para campañas.</p>
              </div>
            </div>
          </article>
        </section>
      )}
    </main>
  );
};

export default Estadisticas;
