import { useState, useMemo, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

type CategoryForm = {
  id?: number;
  nombre: string;
  descripcion: string;
};

type BrandForm = {
  id?: number;
  nombre: string;
  logo_url: string;
};

const INITIAL_CAT: CategoryForm = { nombre: '', descripcion: '' };
const INITIAL_BRAND: BrandForm = { nombre: '', logo_url: '' };

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl transition-all">
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

export default function CategoriasMarcasAdmin() {
  const queryClient = useQueryClient();
  const [catSearch, setCatSearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');

  const [catForm, setCatForm] = useState<CategoryForm>(INITIAL_CAT);
  const [brandForm, setBrandForm] = useState<BrandForm>(INITIAL_BRAND);

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Queries
  const { data: categories = [], isLoading: isLoadingCats } = useQuery({
    queryKey: ['categorias-admin'],
    queryFn: async () => {
      const res = await api.get('/productos/categorias');
      const payload = res.data?.data ?? res.data ?? [];
      return Array.isArray(payload) ? payload : [];
    },
  });

  const { data: brands = [], isLoading: isLoadingBrands } = useQuery({
    queryKey: ['marcas-admin'],
    queryFn: async () => {
      const res = await api.get('/productos/marcas');
      const payload = res.data?.data ?? res.data ?? [];
      return Array.isArray(payload) ? payload : [];
    },
  });

  // Mutations - Categories
  const upsertCatMutation = useMutation({
    mutationFn: async (payload: CategoryForm) => {
      if (payload.id) return api.put(`/productos/categorias/${payload.id}`, payload);
      return api.post('/productos/categorias', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-admin'] });
      setIsCatModalOpen(false);
      setCatForm(INITIAL_CAT);
      setIsEditing(false);
      toast.success('Categoria guardada correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || error?.response?.data?.message || 'No se pudo guardar la categoria');
    },
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/productos/categorias/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-admin'] });
      toast.success('Categoria eliminada correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || error?.response?.data?.message || 'No se pudo eliminar la categoria');
    },
  });

  // Mutations - Brands
  const upsertBrandMutation = useMutation({
    mutationFn: async (payload: BrandForm) => {
      if (payload.id) return api.put(`/productos/marcas/${payload.id}`, payload);
      return api.post('/productos/marcas', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marcas-admin'] });
      setIsBrandModalOpen(false);
      setBrandForm(INITIAL_BRAND);
      setIsEditing(false);
      toast.success('Marca guardada correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || error?.response?.data?.message || 'No se pudo guardar la marca');
    },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/productos/marcas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marcas-admin'] });
      toast.success('Marca eliminada correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || error?.response?.data?.message || 'No se pudo eliminar la marca');
    },
  });

  // Filters
  const filteredCats = useMemo(() => {
    return (categories || []).filter((c: any) => c.nombre.toLowerCase().includes(catSearch.toLowerCase()));
  }, [categories, catSearch]);

  const filteredBrands = useMemo(() => {
    return (brands || []).filter((b: any) => b.nombre.toLowerCase().includes(brandSearch.toLowerCase()));
  }, [brands, brandSearch]);

  const onCatSubmit = (e: FormEvent) => {
    e.preventDefault();
    upsertCatMutation.mutate(catForm);
  };

  const onBrandSubmit = (e: FormEvent) => {
    e.preventDefault();
    upsertBrandMutation.mutate(brandForm);
  };

  return (
    <main className="min-h-screen bg-slate-50/50 pb-12">
      {/* Header Empresarial */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Estructura de Catálogo</h1>
              <p className="mt-1 text-slate-500 font-medium">Gestión de taxonomías, categorías y marcas corporativas</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCatForm(INITIAL_CAT);
                  setIsEditing(false);
                  setIsCatModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white hover:bg-sky-700 shadow-lg shadow-sky-600/20 transition-all active:scale-95"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Nueva Categoría
              </button>
              <button
                onClick={() => {
                  setBrandForm(INITIAL_BRAND);
                  setIsEditing(false);
                  setIsBrandModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Nueva Marca
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Categories Section */}
          <section className="panel overflow-hidden border border-slate-200 shadow-sm bg-white rounded-2xl">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Categorías</h2>
                <span className="text-[10px] font-black bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full uppercase">{filteredCats.length} Total</span>
              </div>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </span>
                <input
                  type="text"
                  placeholder="Filtrar categorías..."
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none"
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                />
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Información de Categoría</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingCats ? (
                      <tr><td colSpan={2} className="py-12 text-center text-slate-400 font-medium">Cargando categorías...</td></tr>
                    ) : filteredCats.length === 0 ? (
                      <tr><td colSpan={2} className="py-12 text-center text-slate-400 font-medium">No se encontraron categorías</td></tr>
                    ) : filteredCats.map((c: any) => (
                      <tr key={c.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 group-hover:text-sky-700 transition-colors">{c.nombre}</div>
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{c.descripcion || 'Sin descripción corporativa'}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => {
                                setCatForm({ id: c.id, nombre: c.nombre, descripcion: c.descripcion || '' });
                                setIsEditing(true);
                                setIsCatModalOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors border border-transparent hover:border-sky-100"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                            </button>
                            <button
                              onClick={() => window.confirm('¿Estás seguro de eliminar esta categoría?') && deleteCatMutation.mutate(c.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Brands Section */}
          <section className="panel overflow-hidden border border-slate-200 shadow-sm bg-white rounded-2xl">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Marcas</h2>
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">{filteredBrands.length} Total</span>
              </div>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </span>
                <input
                  type="text"
                  placeholder="Filtrar marcas..."
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                />
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Identidad de Marca</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingBrands ? (
                      <tr><td colSpan={2} className="py-12 text-center text-slate-400 font-medium">Cargando marcas...</td></tr>
                    ) : filteredBrands.length === 0 ? (
                      <tr><td colSpan={2} className="py-12 text-center text-slate-400 font-medium">No se encontraron marcas</td></tr>
                    ) : filteredBrands.map((b: any) => (
                      <tr key={b.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-slate-50 overflow-hidden border border-slate-100 flex items-center justify-center group-hover:bg-white transition-all">
                              {b.logo_url ? (
                                <img src={b.logo_url} alt={b.nombre} className="h-full w-full object-contain p-1" />
                              ) : (
                                <div className="text-[10px] font-black text-slate-300 uppercase">Logo</div>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 group-hover:text-sky-700 transition-colors">{b.nombre}</div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">ID: #{b.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => {
                                setBrandForm({ id: b.id, nombre: b.nombre, logo_url: b.logo_url || '' });
                                setIsEditing(true);
                                setIsBrandModalOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors border border-transparent hover:border-sky-100"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                            </button>
                            <button
                              onClick={() => window.confirm('¿Estás seguro de eliminar esta marca?') && deleteBrandMutation.mutate(b.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Category Modal */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title={isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
      >
        <form onSubmit={onCatSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre *</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500/20"
              placeholder="Ej: Smartphones"
              value={catForm.nombre}
              onChange={(e) => setCatForm(s => ({ ...s, nombre: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500/20 min-h-[80px]"
              placeholder="Opcional..."
              value={catForm.descripcion}
              onChange={(e) => setCatForm(s => ({ ...s, descripcion: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsCatModalOpen(false)}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={upsertCatMutation.isPending}
              className="bg-sky-800 px-6 py-2 text-sm font-bold text-white rounded-lg hover:bg-sky-900 shadow-lg shadow-sky-900/20 transition-all active:scale-95 disabled:bg-slate-400"
            >
              {upsertCatMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Brand Modal */}
      <Modal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        title={isEditing ? 'Editar Marca' : 'Nueva Marca'}
      >
        <form onSubmit={onBrandSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre *</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500/20"
              placeholder="Ej: Apple"
              value={brandForm.nombre}
              onChange={(e) => setBrandForm(s => ({ ...s, nombre: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">URL Logo</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500/20"
              placeholder="https://ejemplo.com/logo.png"
              value={brandForm.logo_url}
              onChange={(e) => setBrandForm(s => ({ ...s, logo_url: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsBrandModalOpen(false)}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={upsertBrandMutation.isPending}
              className="bg-sky-800 px-6 py-2 text-sm font-bold text-white rounded-lg hover:bg-sky-900 shadow-lg shadow-sky-900/20 transition-all active:scale-95 disabled:bg-slate-400"
            >
              {upsertBrandMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
