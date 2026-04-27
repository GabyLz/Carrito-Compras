import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../../services/api';
import { ProductCard } from '../../components/producto/ProductCard';
import { FilterBar } from '../../components/producto/FilterBar';
import { Pagination } from '../../components/ui/Pagination';

const fetchProductos = async (page: number, filters: any) => {
  const params = new URLSearchParams({ page: page.toString(), ...filters });
  const res = await api.get(`/productos?${params}`);
  return res.data;
};

export default function CatalogoPage() {
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState({ search: '', sortBy: 'fecha_desc', limit: '12', categoriaId: '', marcaId: '' });
  const { data, isLoading, isError } = useQuery({
    queryKey: ['productos', page, filters],
    queryFn: () => fetchProductos(page, filters),
    placeholderData: keepPreviousData,
  });

  const products = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <main className="app-shell space-y-5 py-6">
      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Catalogo de productos</h1>
            <p className="mt-2 text-sm text-slate-600">
              Vista comercial con filtros, busqueda fuzzy, ordenamiento y paginacion configurable.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded-md px-3 py-1 text-sm font-semibold ${viewMode === 'grid' ? 'bg-white text-slate-900' : 'text-slate-500'}`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded-md px-3 py-1 text-sm font-semibold ${viewMode === 'list' ? 'bg-white text-slate-900' : 'text-slate-500'}`}
            >
              Lista
            </button>
          </div>
        </div>
      </section>

      <FilterBar onFilter={setFilters} />

      {isLoading && <div className="text-center text-sm text-slate-500">Actualizando resultados...</div>}
      {isError && (
        <div className="panel p-6 text-center text-rose-700">
          Ocurrio un error al cargar el catalogo. Intenta recargar la pagina.
        </div>
      )}

      <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3' : 'grid grid-cols-1 gap-4'}>
        {products.map((producto: any) => (
          <ProductCard key={producto.id} product={producto} viewMode={viewMode} />
        ))}
      </div>

      {!isError && !products.length && <div className="panel p-6 text-center text-slate-600">No hay productos para los filtros actuales.</div>}

      <Pagination current={page} total={total} onChange={setPage} />
    </main>
  );
}