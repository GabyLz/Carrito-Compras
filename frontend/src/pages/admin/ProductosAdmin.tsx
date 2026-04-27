import { useMemo, useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { normalizeRole } from '../../lib/roles';
import { toast } from 'react-hot-toast';

type ProductoForm = {
  id?: number;
  sku: string;
  nombre: string;
  descripcion: string;
  categoriaId: string;
  marcaId: string;
  precio_compra: string;
  precio_venta: string;
  stock_actual: string;
  stock_minimo: string;
  imagen_url?: string;
};

const INITIAL_FORM: ProductoForm = {
  sku: '',
  nombre: '',
  descripcion: '',
  categoriaId: '',
  marcaId: '',
  precio_compra: '',
  precio_venta: '',
  stock_actual: '',
  stock_minimo: '',
  imagen_url: '',
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl transition-all">
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

const ProductImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}>
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
};

export default function AdminProductos() {
  const queryClient = useQueryClient();
  const role = normalizeRole(useAuthStore((state) => state.user?.rol));
  const readOnly = role === 'VENDEDOR';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [brandFilter, setBrandFilter] = useState('todos');
  const [form, setForm] = useState<ProductoForm>(INITIAL_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias-admin'],
    queryFn: async () => {
      const res = await api.get('/productos/categorias');
      const payload = res.data?.data ?? res.data ?? [];
      return Array.isArray(payload) ? payload : [];
    },
  });

  const { data: marcas = [] } = useQuery({
    queryKey: ['marcas-admin'],
    queryFn: async () => {
      const res = await api.get('/productos/marcas');
      const payload = res.data?.data ?? res.data ?? [];
      return Array.isArray(payload) ? payload : [];
    },
  });

  const { data: productos = [], isLoading, isError, error } = useQuery({
    queryKey: ['productosAdmin'],
    queryFn: async () => {
      const res = await api.get('/productos?limit=500');
      const payload = res.data?.data ?? res.data ?? [];
      const rows = Array.isArray(payload) ? payload : [];
      return rows.sort((a: any, b: any) => Number(a.id) - Number(b.id));
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: ProductoForm) => {
      const body = {
        sku: payload.sku,
        nombre: payload.nombre,
        descripcion_corta: payload.descripcion,
        precio_costo: Number(payload.precio_compra),
        precio_venta: Number(payload.precio_venta),
        stock_general: Number(payload.stock_actual),
        stock_minimo: Number(payload.stock_minimo),
        imagen_url: payload.imagen_url || null,
        ...(payload.categoriaId ? { id_categoria: Number(payload.categoriaId) } : { id_categoria: null }),
        ...(payload.marcaId ? { id_marca: Number(payload.marcaId) } : { id_marca: null }),
      };

      if (payload.id) {
        return api.put(`/productos/${payload.id}`, body);
      }
      return api.post('/productos', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productosAdmin'] });
      toast.success(isEditing ? 'Producto actualizado correctamente' : 'Producto creado correctamente');
      setForm(INITIAL_FORM);
      setIsEditing(false);
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      console.error('Error al guardar producto:', error);
      const msg = error.response?.data?.error || error.response?.data?.message || 'Error al guardar el producto';
      toast.error(msg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/productos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productosAdmin'] });
      toast.success('Producto eliminado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al eliminar el producto');
    }
  });

  const filtered = useMemo(() => {
    let result = productos;

    // Filter by status
    if (statusFilter !== 'todos') {
      if (statusFilter === 'activo') result = result.filter((p: any) => (p.estado_producto || 'activo') === 'activo');
      if (statusFilter === 'inactivo') result = result.filter((p: any) => p.estado_producto === 'inactivo');
      if (statusFilter === 'bajo_stock') result = result.filter((p: any) => Number(p.stock_general || 0) <= Number(p.stock_minimo || 0));
    }

    // Filter by category
    if (categoryFilter !== 'todos') {
      result = result.filter((p: any) => String(p.id_categoria) === categoryFilter);
    }

    // Filter by brand
    if (brandFilter !== 'todos') {
      result = result.filter((p: any) => String(p.id_marca) === brandFilter);
    }

    const q = search.trim().toLowerCase();
    if (!q) return result;
    return result.filter((p: any) =>
      [p.sku, p.nombre, p.descripcion_corta, p.categoria?.nombre, p.marca?.nombre]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [productos, search, statusFilter, categoryFilter, brandFilter]);

  const kpis = useMemo(() => {
    const totalProductos = filtered.length;
    const valorInventario = filtered.reduce((acc: number, p: any) => {
      return acc + Number(p.stock_general || 0) * Number(p.precio_costo || 0);
    }, 0);
    const bajoStock = filtered.filter((p: any) => Number(p.stock_general || 0) < Number(p.stock_minimo || 0));
    const productoMasValioso =
      filtered.reduce((best: any, p: any) => {
        const valor = Number(p.stock_general || 0) * Number(p.precio_costo || 0);
        const bestValor = Number(best?.stock_general || 0) * Number(best?.precio_costo || 0);
        return valor > bestValor ? p : best;
      }, null) || null;

    return {
      totalProductos,
      valorInventario,
      bajoStockCount: bajoStock.length,
      productoMasValioso,
      reorderList: bajoStock,
    };
  }, [filtered]);

  const pieData = useMemo(() => {
    const sinStock = filtered.filter((p: any) => Number(p.stock_general || 0) <= 0).length;
    const bajoStock = filtered.filter(
      (p: any) => Number(p.stock_general || 0) > 0 && Number(p.stock_general || 0) < Number(p.stock_minimo || 0)
    ).length;
    const ok = Math.max(filtered.length - sinStock - bajoStock, 0);
    return [
      { name: 'Stock OK', value: ok, color: '#0369a1' },
      { name: 'Bajo stock', value: bajoStock, color: '#f59e0b' },
      { name: 'Sin stock', value: sinStock, color: '#e11d48' },
    ];
  }, [filtered]);

  const statsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((p: any) => {
      const cat = p.categoria?.nombre || 'Sin categoría';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filtered]);

  const onRowEdit = (p: any) => {
    setForm({
      id: p.id,
      sku: p.sku || '',
      nombre: p.nombre || '',
      descripcion: p.descripcion_corta || '',
      categoriaId: p.id_categoria ? String(p.id_categoria) : '',
      marcaId: p.id_marca ? String(p.id_marca) : '',
      precio_compra: String(p.precio_costo ?? ''),
      precio_venta: String(p.precio_venta ?? ''),
      stock_actual: String(p.stock_general ?? ''),
      stock_minimo: String(p.stock_minimo ?? ''),
      imagen_url: p.imagenes?.[0]?.url || '',
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    upsertMutation.mutate(form);
  };

  const onDelete = (id: number) => {
    if (readOnly) return;
    if (window.confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
        <span className="ml-3 text-lg font-medium text-slate-600">Cargando productos...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="m-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <h2 className="text-xl font-bold">Error al cargar productos</h2>
        <p className="mt-2">{(error as any)?.message || 'Ocurrió un error inesperado.'}</p>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['productosAdmin'] })}
          className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/50 pb-12">
      {/* Header Empresarial */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Catálogo de Productos</h1>
              <p className="mt-1 text-slate-500 font-medium">Gestión centralizada de inventario y precios corporativos</p>
            </div>
            {!readOnly && (
              <button
                onClick={() => {
                  setForm(INITIAL_FORM);
                  setIsEditing(false);
                  setIsModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white hover:bg-sky-700 shadow-lg shadow-sky-600/20 transition-all active:scale-95"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Nuevo Producto
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPIs and Charts Section */}
      <section className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          <article className="panel p-5 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Productos</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{kpis.totalProductos}</p>
                <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5V2a1 1 0 112 0v5a1 1 0 01-1 1h-6z" clipRule="evenodd" /><path d="M11 11.29l-7 7a1 1 0 01-1.42 0l-7-7a1 1 0 011.42-1.42L11 11.29z" /></svg>
                    <span>En catálogo</span>
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-sky-50 p-3 text-sky-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
            </div>
          </article>

          <article className="panel p-5 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Valorización</p>
                <p className="mt-1 text-2xl font-black text-emerald-600">S/ {kpis.valorInventario.toLocaleString()}</p>
                <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-slate-400">
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-50">Costo promedio</span>
                </div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
          </article>

          <article className="panel p-5 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alerta Stock</p>
                <p className="mt-1 text-2xl font-black text-rose-600">{kpis.bajoStockCount}</p>
                <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-rose-500">
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                    <span>Reponer urgente</span>
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-rose-50 p-3 text-rose-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
            </div>
          </article>

          <article className="panel p-5 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Líder Valor</p>
                <p className="mt-1 text-sm font-bold text-slate-900 truncate" title={kpis.productoMasValioso?.nombre}>
                  {kpis.productoMasValioso?.nombre || 'N/A'}
                </p>
                <div className="mt-1 text-[10px] text-slate-400">
                  SKU: {kpis.productoMasValioso?.sku || '---'}
                </div>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              </div>
            </div>
          </article>
        </div>

        <div className="panel p-5 bg-white border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Top 5 Categorías</p>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsByCategory} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="total" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5 bg-white border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Niveles de Stock</p>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={50}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-col gap-1.5">
            {pieData.map((entry: any) => (
              <div key={entry.name} className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="font-medium text-slate-500">{entry.name}</span>
                </div>
                <span className="font-bold text-slate-900">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search and Table */}
      <section className="panel overflow-hidden border border-slate-200 shadow-sm bg-white">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input
                type="text"
                placeholder="Buscar por SKU, nombre, categoría o marca..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2.5 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-sky-500/20 outline-none"
                >
                  <option value="todos">Todas las Categorías</option>
                  {categorias.map((c: any) => (
                    <option key={c.id} value={String(c.id)}>{c.nombre}</option>
                  ))}
                </select>
                <select 
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-sky-500/20 outline-none"
                >
                  <option value="todos">Todas las Marcas</option>
                  {marcas.map((m: any) => (
                    <option key={m.id} value={String(m.id)}>{m.nombre}</option>
                  ))}
                </select>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-sky-500/20 outline-none"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="activo">Activos</option>
                  <option value="inactivo">Inactivos</option>
                  <option value="bajo_stock">Bajo Stock</option>
                </select>
              </div>
              <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block" />
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['productosAdmin'] })}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95"
                title="Sincronizar datos"
              >
                <svg className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Categoría / Marca</th>
                <th className="px-6 py-4">Finanzas (Costo / Venta / Margen)</th>
                <th className="px-6 py-4">Inventario</th>
                <th className="px-6 py-4">Estado</th>
                {!readOnly && <th className="px-6 py-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="py-20 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent"></div>
                    <span className="font-medium">Cargando catálogo...</span>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-20 text-center text-slate-500 font-medium">No se encontraron productos coincidentes</td></tr>
              ) : (
                filtered.map((p: any) => {
                  const margin = Number(p.precio_venta) - Number(p.precio_costo);
                  const marginPercent = Number(p.precio_venta) > 0 ? (margin / Number(p.precio_venta)) * 100 : 0;
                  const isLowStock = Number(p.stock_general || 0) <= Number(p.stock_minimo || 0);

                  return (
                    <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">#{p.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 group-hover:bg-white transition-colors overflow-hidden">
                            {p.imagenes && p.imagenes.length > 0 ? (
                              <a href={p.imagenes[0].url} target="_blank" rel="noopener noreferrer" className="h-full w-full">
                                <ProductImage src={p.imagenes[0].url} alt={p.nombre} className="h-full w-full object-cover" />
                              </a>
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors flex items-center gap-1">
                              {p.nombre}
                              {p.imagenes && p.imagenes.length > 0 && (
                                <a href={p.imagenes[0].url} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:text-sky-700" title="Ver imagen">
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                              )}
                            </div>
                            <div className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">SKU: {p.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {p.categoria?.nombre || 'Sin categoría'}
                          </span>
                          <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-600">
                            {p.marca?.nombre || 'Sin marca'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Costo:</span>
                            <span className="font-mono font-medium">S/ {Number(p.precio_costo || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Venta:</span>
                            <span className="font-mono font-bold text-slate-900">S/ {Number(p.precio_venta || 0).toFixed(2)}</span>
                          </div>
                          <div className={`flex justify-between text-[10px] font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            <span>Margen:</span>
                            <span>{marginPercent.toFixed(1)}%</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-black ${isLowStock ? 'text-rose-600' : 'text-slate-900'}`}>
                              {p.stock_general || 0}
                            </span>
                            <span className="text-[10px] text-slate-400">unid.</span>
                          </div>
                          <div className="h-1 w-20 rounded-full bg-slate-100 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isLowStock ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min((Number(p.stock_general || 0) / (Number(p.stock_minimo || 1) * 2)) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Mín: {p.stock_minimo || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                          (p.estado_producto || 'activo') === 'activo' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${(p.estado_producto || 'activo') === 'activo' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {p.estado_producto || 'activo'}
                        </span>
                      </td>
                      {!readOnly && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onRowEdit(p)}
                              className="rounded-lg bg-white p-2 text-slate-600 shadow-sm border border-slate-200 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 transition-all"
                              title="Editar producto"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button
                              onClick={() => onDelete(p.id)}
                              className="rounded-lg bg-white p-2 text-slate-600 shadow-sm border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
                              title="Eliminar producto"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* CRUD Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setForm(INITIAL_FORM);
          setIsEditing(false);
        }}
        title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}
      >
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">SKU *</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none"
              placeholder="Ej: PROD-001"
              value={form.sku}
              onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre *</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none"
              placeholder="Nombre del producto"
              value={form.nombre}
              onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none min-h-[100px]"
              placeholder="Detalles del producto..."
              value={form.descripcion}
              onChange={(e) => setForm((s) => ({ ...s, descripcion: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Categoría</label>
              <select
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none"
                value={form.categoriaId}
                onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
              >
                <option value="">Seleccionar categoría</option>
                {categorias.map((c: any) => (
                  <option key={c.id} value={String(c.id)}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Marca</label>
              <select
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none"
                value={form.marcaId}
                onChange={(e) => setForm({ ...form, marcaId: e.target.value })}
              >
                <option value="">Seleccionar marca</option>
                {marcas.map((m: any) => (
                  <option key={m.id} value={String(m.id)}>{m.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Precio Compra *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm">S/</span>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none"
                value={form.precio_compra}
                onChange={(e) => setForm((s) => ({ ...s, precio_compra: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Precio Venta *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm">S/</span>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none"
                value={form.precio_venta}
                onChange={(e) => setForm((s) => ({ ...s, precio_venta: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Actual *</label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none"
              value={form.stock_actual}
              onChange={(e) => setForm((s) => ({ ...s, stock_actual: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Mínimo *</label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none"
              value={form.stock_minimo}
              onChange={(e) => setForm((s) => ({ ...s, stock_minimo: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">URL de la Imagen</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none"
              placeholder="https://ejemplo.com/imagen.jpg"
              value={form.imagen_url}
              onChange={(e) => setForm((s) => ({ ...s, imagen_url: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setForm(INITIAL_FORM);
                setIsEditing(false);
              }}
              className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={upsertMutation.isPending}
              className="rounded-lg bg-sky-800 px-6 py-2 text-sm font-bold text-white hover:bg-sky-900 shadow-lg shadow-sky-900/20 transition-all active:scale-95 disabled:bg-slate-400"
            >
              {upsertMutation.isPending ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
