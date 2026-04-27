import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export const ProductCard = ({ product, viewMode = 'grid' }: { product: any; viewMode?: 'grid' | 'list' }) => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const wishMutation = useMutation({
    mutationFn: async () => api.post('/clientes/wishlist', { id_producto: product.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Agregado a lista de deseos');
    },
    onError: () => toast.error('No se pudo agregar a lista de deseos'),
  });
  
  return (
    <div className={`panel p-4 transition-transform duration-200 hover:-translate-y-1 ${viewMode === 'list' ? 'grid gap-3 md:grid-cols-[1fr_auto]' : 'flex h-full flex-col'}`}>
      
      <div className="flex-grow">
        <div className="mb-1 text-xs uppercase tracking-wider text-slate-500">
          {product.categoria?.nombre || 'Sin categoría'}
        </div>
        <Link to={`/producto/${product.id}`} className="block">
          <h3 className="mb-2 line-clamp-2 text-lg font-bold text-slate-800 hover:text-sky-800">
            {product.nombre}
          </h3>
        </Link>

        {product.variantes?.length > 0 && (
          <p className="mb-2 text-xs font-semibold text-slate-500">
            Variantes: {product.variantes.slice(0, 3).map((v: any) => v.nombre_variante).join(', ')}
            {product.variantes.length > 3 ? '...' : ''}
          </p>
        )}

        <p className="mb-1 text-sm text-slate-500">SKU: {product.sku}</p>
        <p className="mb-4 text-xl font-extrabold text-sky-900">S/ {product.precio_venta}</p>
      </div>

      <div className="grid gap-2 md:min-w-[180px]">
        <Link 
          to={`/producto/${product.id}`}
          className="block w-full rounded-lg bg-sky-800 py-2 text-center text-sm font-semibold text-white transition hover:bg-sky-900"
        >
          Ver ficha
        </Link>

        {isAuthenticated && (
          <button
            type="button"
            onClick={() => wishMutation.mutate()}
            className="w-full rounded-lg border border-slate-300 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Agregar a deseos
          </button>
        )}
      </div>
    </div>
  );
};
