import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';

const ListaDeseos = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { data: items, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => (await api.get('/clientes/wishlist')).data.data,
    enabled: isAuthenticated,
  });

  const removeMutation = useMutation({
    mutationFn: (id_producto: number) => api.delete(`/clientes/wishlist/${id_producto}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Eliminado de la lista de deseos');
    }
  });

  if (!isAuthenticated) {
    return (
      <div className="app-shell py-10 text-center text-slate-600">
        Debes iniciar sesion para ver la lista de deseos.
      </div>
    );
  }

  if (isLoading) return <div className="app-shell py-10 text-center text-slate-600">Cargando lista de deseos...</div>;

  return (
    <div className="app-shell space-y-5 py-6">
      <section className="panel p-6">
        <h1 className="text-3xl font-bold text-slate-900">Mi lista de deseos</h1>
        <p className="mt-1 text-sm text-slate-600">Productos guardados para comprar mas tarde.</p>
      </section>

      {items?.length === 0 ? (
        <div className="panel p-6 text-center text-slate-600">No tienes productos en tu lista de deseos.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items?.map((item: any) => (
            <div key={item.id} className="panel p-4">
              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-bold text-slate-800">{item.cat_productos?.nombre}</h3>
                <p className="text-sm text-slate-500">SKU: {item.cat_productos?.sku}</p>
                <p className="mt-1 text-lg font-extrabold text-sky-900">S/ {item.cat_productos?.precio_venta}</p>
              </div>
              {item.cat_producto_variante && (
                <p className="mb-3 text-sm text-slate-600">Variante: {item.cat_producto_variante.nombre_variante}</p>
              )}
              <button 
                onClick={() => removeMutation.mutate(item.id_producto)}
                className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListaDeseos;
