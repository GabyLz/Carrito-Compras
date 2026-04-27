import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

interface Cupon {
  id: number;
  codigo: string;
  tipo: 'porcentaje' | 'fijo';
  valor: number;
  monto_minimo: number;
  fecha_inicio: string;
  fecha_fin: string;
  usos_maximos: number | null;
  usos_actuales: number;
  activo: boolean;
  created_at: string;
}

interface CuponForm {
  id?: number;
  codigo: string;
  tipo: 'porcentaje' | 'fijo';
  valor: string;
  monto_minimo: string;
  fecha_inicio: string;
  fecha_fin: string;
  usos_maximos: string;
  activo: boolean;
}

const INITIAL_FORM: CuponForm = {
  codigo: '',
  tipo: 'porcentaje',
  valor: '',
  monto_minimo: '0',
  fecha_inicio: new Date().toISOString().split('T')[0],
  fecha_fin: '',
  usos_maximos: '',
  activo: true,
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl transition-all">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const CuponesAdmin = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<CuponForm>(INITIAL_FORM);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: cupones = [], isLoading } = useQuery({
    queryKey: ['cupones'],
    queryFn: async () => {
      const res = await api.get('/cupones');
      return res.data || [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: CuponForm) => {
      const body = {
        ...payload,
        valor: Number(payload.valor),
        monto_minimo: Number(payload.monto_minimo),
        usos_maximos: payload.usos_maximos ? Number(payload.usos_maximos) : null,
      };
      if (payload.id) return api.put(`/cupones/${payload.id}`, body);
      return api.post('/cupones', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cupones'] });
      setIsModalOpen(false);
      setForm(INITIAL_FORM);
      toast.success(isEditing ? 'Cupón actualizado correctamente' : 'Cupón creado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al guardar el cupón');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/cupones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cupones'] });
      toast.success('Cupón eliminado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al eliminar el cupón');
    }
  });

  const filteredCupones = useMemo(() => {
    return cupones.filter((c: Cupon) => 
      c.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [cupones, searchTerm]);

  const kpis = useMemo(() => ({
    total: cupones.length,
    activos: cupones.filter((c: Cupon) => c.activo).length,
    masUsado: cupones.reduce((prev: Cupon, curr: Cupon) => (prev.usos_actuales > curr.usos_actuales) ? prev : curr, { usos_actuales: 0 } as Cupon),
  }), [cupones]);

  const handleEdit = (cupon: Cupon) => {
    setForm({
      id: cupon.id,
      codigo: cupon.codigo,
      tipo: cupon.tipo,
      valor: cupon.valor.toString(),
      monto_minimo: cupon.monto_minimo.toString(),
      fecha_inicio: cupon.fecha_inicio.split('T')[0],
      fecha_fin: cupon.fecha_fin.split('T')[0],
      usos_maximos: cupon.usos_maximos?.toString() || '',
      activo: cupon.activo,
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate(form);
  };

  return (
    <main className="app-shell py-8 space-y-8">
      {/* Header & Actions */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestión de Cupones</h1>
          <p className="text-slate-500 font-medium mt-1">Administra descuentos y promociones</p>
        </div>
        <button
          onClick={() => { setForm(INITIAL_FORM); setIsEditing(false); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 active:scale-95"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuevo Cupón
        </button>
      </header>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <article className="panel p-6 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Cupones</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{kpis.total}</p>
            </div>
            <div className="rounded-xl bg-sky-50 p-3 text-sky-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 11h.01M7 15h.01M13 7h.01M13 11h.01M13 15h.01M17 7h.01M17 11h.01M17 15h.01" /></svg>
            </div>
          </div>
        </article>
        <article className="panel p-6 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cupones Activos</p>
              <p className="mt-2 text-3xl font-black text-emerald-600">{kpis.activos}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
        </article>
        <article className="panel p-6 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Más Utilizado</p>
              <p className="mt-2 text-xl font-black text-slate-900 truncate max-w-[150px]">{kpis.masUsado?.codigo || 'N/A'}</p>
              <p className="text-xs text-slate-500 font-medium">{kpis.masUsado?.usos_actuales || 0} usos</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
          </div>
        </article>
      </section>

      {/* Main Table Section */}
      <section className="panel bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Listado de Cupones</h2>
          <div className="relative w-full md:w-72">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Buscar por código..."
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
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Descuento</th>
                <th className="px-6 py-4">Vigencia</th>
                <th className="px-6 py-4">Usos</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-500 font-medium">Cargando cupones...</td></tr>
              ) : filteredCupones.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-500 font-medium">No se encontraron cupones</td></tr>
              ) : (
                filteredCupones.map((cupon: Cupon) => (
                  <tr key={cupon.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded text-sm uppercase">{cupon.codigo}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <span className="font-bold text-slate-900">{cupon.tipo === 'porcentaje' ? `${cupon.valor}%` : `S/ ${cupon.valor}`}</span>
                        <p className="text-xs text-slate-500">Min: S/ {cupon.monto_minimo}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-1">
                        <p className="text-slate-600 font-medium"><span className="text-slate-400">Inicio:</span> {new Date(cupon.fecha_inicio).toLocaleDateString()}</p>
                        <p className="text-slate-600 font-medium"><span className="text-slate-400">Fin:</span> {new Date(cupon.fecha_fin).toLocaleDateString()}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{cupon.usos_actuales}</span>
                        <span className="text-xs text-slate-400">/ {cupon.usos_maximos || '∞'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        cupon.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {cupon.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleEdit(cupon)} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                      </button>
                      <button onClick={() => { if(confirm('¿Eliminar cupón?')) deleteMutation.mutate(cupon.id); }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Upsert Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Editar Cupón' : 'Nuevo Cupón'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Código del Cupón</label>
            <input
              required
              type="text"
              value={form.codigo}
              onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
              placeholder="EJ: VERANO2026"
              className="w-full rounded-xl border-slate-200 text-sm focus:border-sky-500 focus:ring-sky-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Descuento</label>
              <select
                value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value as any })}
                className="w-full rounded-xl border-slate-200 text-sm focus:border-sky-500 focus:ring-sky-500"
              >
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="fijo">Monto Fijo (S/)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Valor</label>
              <input
                required
                type="number"
                step="0.01"
                value={form.valor}
                onChange={e => setForm({ ...form, valor: e.target.value })}
                className="w-full rounded-xl border-slate-200 text-sm focus:border-sky-500 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Monto Mínimo de Compra (S/)</label>
            <input
              required
              type="number"
              step="0.01"
              value={form.monto_minimo}
              onChange={e => setForm({ ...form, monto_minimo: e.target.value })}
              className="w-full rounded-xl border-slate-200 text-sm focus:border-sky-500 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Fecha Inicio</label>
              <input
                required
                type="date"
                value={form.fecha_inicio}
                onChange={e => setForm({ ...form, fecha_inicio: e.target.value })}
                className="w-full rounded-xl border-slate-200 text-sm focus:border-sky-500 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Fecha Fin</label>
              <input
                required
                type="date"
                value={form.fecha_fin}
                onChange={e => setForm({ ...form, fecha_fin: e.target.value })}
                className="w-full rounded-xl border-slate-200 text-sm focus:border-sky-500 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Usos Máximos (Vacio para ilimitado)</label>
            <input
              type="number"
              value={form.usos_maximos}
              onChange={e => setForm({ ...form, usos_maximos: e.target.value })}
              className="w-full rounded-xl border-slate-200 text-sm focus:border-sky-500 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="activo"
              checked={form.activo}
              onChange={e => setForm({ ...form, activo: e.target.checked })}
              className="rounded text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="activo" className="text-sm font-bold text-slate-700">Cupón Activo</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={upsertMutation.isPending}
              className="flex-1 rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sky-100 hover:bg-sky-700 transition disabled:opacity-50"
            >
              {upsertMutation.isPending ? 'Guardando...' : isEditing ? 'Actualizar Cupón' : 'Crear Cupón'}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
};

export default CuponesAdmin;
