import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

interface FilterState {
  search: string;
  sortBy: string;
  limit: string;
  categoriaId: string;
  marcaId: string;
}

export const FilterBar = ({ onFilter }: { onFilter: (filters: FilterState) => void }) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('fecha_desc');
  const [limit, setLimit] = useState('12');
  const [categoriaId, setCategoriaId] = useState('');
  const [marcaId, setMarcaId] = useState('');

  const { data: categorias = [] } = useQuery({
    queryKey: ['catalogo-categorias'],
    queryFn: async () => (await api.get('/productos/categorias')).data.data,
  });

  const { data: marcas = [] } = useQuery({
    queryKey: ['catalogo-marcas'],
    queryFn: async () => (await api.get('/productos/marcas')).data.data,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilter({ search: search.trim(), sortBy, limit, categoriaId, marcaId });
    }, 350);

    return () => clearTimeout(timer);
  }, [search, sortBy, limit, categoriaId, marcaId, onFilter]);

  return (
    <div className="panel p-4">
      <h4 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-700">Filtros de catalogo</h4>
      <div className="grid gap-2 md:grid-cols-5">
        <input
          type="text"
          placeholder="Buscar por nombre, SKU o categoria"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-700"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="fecha_desc">Mas recientes</option>
          <option value="nombre_asc">Nombre A-Z</option>
          <option value="precio_asc">Precio menor</option>
          <option value="precio_desc">Precio mayor</option>
          <option value="popularidad">Mas vendidos</option>
        </select>

        <select
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
        >
          <option value="">Todas las categorias</option>
          {categorias.map((categoria: any) => (
            <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
          ))}
        </select>

        <select
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
          value={marcaId}
          onChange={(e) => setMarcaId(e.target.value)}
        >
          <option value="">Todas las marcas</option>
          {marcas.map((marca: any) => (
            <option key={marca.id} value={marca.id}>{marca.nombre}</option>
          ))}
        </select>

        <select
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
        >
          <option value="12">12 por pagina</option>
          <option value="24">24 por pagina</option>
          <option value="48">48 por pagina</option>
        </select>
      </div>
    </div>
  );
};
