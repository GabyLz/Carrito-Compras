import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { useCartStore } from '../../stores/cartStore';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';

const ProductoDetalle = () => {
  const placeholderImage =
    'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"%3E%3Crect width="400" height="400" fill="%23e2e8f0"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-family="Arial, sans-serif" font-size="24"%3EProducto%3C/text%3E%3C/svg%3E';
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addItem = useCartStore((state) => state.addItem);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [calificacion, setCalificacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: producto, isLoading } = useQuery({
    queryKey: ['producto', id],
    queryFn: async () => (await api.get(`/productos/${id}`)).data.data
  });

  const { data: misResenas } = useQuery({
    queryKey: ['mis-resenas'],
    queryFn: async () => (await api.get('/clientes/resenas/mis')).data,
    enabled: isAuthenticated,
  });

  const { data: resenasPublicas = [] } = useQuery({
    queryKey: ['resenas-publicas', id],
    queryFn: async () => (await api.get(`/productos/${id}/resenas`)).data.data,
    enabled: !!id,
  });

  const { data: relacionados = [] } = useQuery({
    queryKey: ['relacionados', id, producto?.id_categoria],
    queryFn: async () => (await api.get(`/productos/${id}/relacionados`)).data.data,
    enabled: !!id && !!producto?.id_categoria,
  });

  const wishMutation = useMutation({
    mutationFn: async () => api.post('/clientes/wishlist', { id_producto: Number(id), id_variante: selectedVariantId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Agregado a lista de deseos');
    },
  });

  const resenaMutation = useMutation({
    mutationFn: async () => api.post('/clientes/resenas', { id_producto: Number(id), id_variante: selectedVariantId || undefined, calificacion, comentario }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mis-resenas'] });
      setComentario('');
      toast.success('Resena publicada');
    },
    onError: () => toast.error('No se pudo publicar la resena'),
  });

  if (isLoading) return <div className="app-shell py-10 text-center text-slate-600">Cargando detalle de producto...</div>;
  if (!producto) return <div className="app-shell py-10 text-center text-slate-600">Producto no encontrado</div>;

  const gallery = producto.imagenes?.length ? producto.imagenes : [{ url: placeholderImage }];
  const activeImage = selectedImage || gallery[0]?.url;
  const selectedVariant = producto.variantes?.find((variant: any) => variant.id === selectedVariantId) || null;
  const totalStock = Number(selectedVariant?.stock ?? producto.stock_general ?? 0);
  const price = Number(producto.precio_venta || 0);
  const offerPrice = producto.precio_oferta ? Number(producto.precio_oferta) : null;
  const hasStock = totalStock > 0;

  const handleAddToCart = () => {
    if (!hasStock) {
      toast.error('Este producto no tiene stock disponible.');
      return;
    }

    addItem({
      id_producto: producto.id,
      nombre: producto.nombre,
      precio: offerPrice || price,
      cantidad: 1,
      id_variante: selectedVariantId || undefined,
      imagen: activeImage || '',
      stock: totalStock,
    });
    toast.success('Producto añadido al carrito');
  };

  return (
    <main className="app-shell py-6">
      <div className="panel flex flex-col gap-8 p-6 md:flex-row">
        <div className="md:w-1/2">
          <img 
            src={activeImage || placeholderImage} 
            alt={producto.nombre} 
            className="w-full rounded-lg border border-slate-200 object-cover shadow-sm transition-transform duration-200 hover:scale-[1.02]"
          />
          <div className="mt-3 grid grid-cols-4 gap-2">
            {gallery.map((img: any, index: number) => (
              <button key={`${img.url}-${index}`} type="button" onClick={() => setSelectedImage(img.url)} className={`overflow-hidden rounded-lg border ${activeImage === img.url ? 'border-sky-700' : 'border-slate-200'}`}>
                <img src={img.url} alt={`${producto.nombre} ${index + 1}`} className="h-20 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        <div className="md:w-1/2">
          <div className="mb-2 text-sm font-semibold uppercase tracking-wider text-sky-700">
            {producto.categoria?.nombre || 'Sin categoría'}
          </div>
          <h1 className="mb-4 text-3xl font-bold text-slate-900">{producto.nombre}</h1>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {producto.etiquetas?.map((pe: any) => (
              <span 
                key={pe.id} 
                className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
              >
                #{pe.etiqueta.nombre}
              </span>
            ))}
          </div>

          <p className="mb-6 text-slate-600">{producto.descripcion_larga}</p>
          <div className="mb-6 flex items-baseline gap-3">
            {offerPrice ? <p className="text-3xl font-extrabold text-emerald-700">S/ {offerPrice.toFixed(2)}</p> : <p className="text-3xl font-extrabold text-sky-900">S/ {price.toFixed(2)}</p>}
            {offerPrice && <p className="text-lg text-slate-400 line-through">S/ {price.toFixed(2)}</p>}
          </div>

          {producto.marca && (
            <div className="mb-4">
              <span className="font-semibold text-slate-700">Marca: </span>
              <span className="text-slate-600">{producto.marca.nombre}</span>
            </div>
          )}

          {producto.variantes && producto.variantes.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 font-semibold text-slate-800">Variantes disponibles:</h3>
              <div className="flex gap-2">
                {producto.variantes.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`px-4 py-2 border rounded ${
                      selectedVariantId === v.id ? 'border-sky-700 bg-sky-50' : 'border-slate-300'
                    }`}
                  >
                    {v.nombre_variante} ({Number(v.stock ?? 0) > 0 ? `stock ${Number(v.stock)}` : 'sin stock'})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Stock disponible en tiempo real: <span className={`font-bold ${hasStock ? 'text-emerald-700' : 'text-rose-700'}`}>{totalStock}</span>
            {selectedVariant && <span className="ml-2 text-xs text-slate-500">Variante seleccionada: {selectedVariant.nombre_variante}</span>}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!hasStock}
            className="w-full rounded-lg bg-sky-800 py-3 font-bold text-white transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Añadir al carrito
          </button>

          {isAuthenticated && (
            <button
              type="button"
              onClick={() => wishMutation.mutate()}
              className="mt-2 w-full rounded-lg border border-slate-300 py-3 font-semibold text-slate-700 hover:bg-slate-100"
            >
              Agregar a lista de deseos
            </button>
          )}

          <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-lg font-bold text-slate-900">Reseñas de clientes</h3>
            <div className="mt-3 space-y-2">
              {(resenasPublicas || []).map((r: any) => (
                <article key={r.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-slate-800">{r.cliente?.nombre || 'Cliente'}</strong>
                    <span className="text-amber-600">{'★'.repeat(Number(r.calificacion || 0))}</span>
                  </div>
                  <p className="mt-1 text-slate-600">{r.comentario || 'Sin comentario'}</p>
                </article>
              ))}
              {!resenasPublicas?.length && <p className="text-sm text-slate-500">Aun no hay reseñas publicadas.</p>}
            </div>
          </section>

          {isAuthenticated && (
            <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-lg font-bold text-slate-900">Tu resena</h3>
              <div className="mt-3 flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCalificacion(s)}
                    className={`rounded px-2 py-1 text-sm ${calificacion >= s ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-600'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Comparte tu experiencia con este producto"
                className="mt-3 w-full rounded-lg border border-slate-300 p-2 text-sm"
                rows={3}
              />
              <button
                type="button"
                onClick={() => resenaMutation.mutate()}
                className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Publicar resena
              </button>

              <p className="mt-3 text-xs text-slate-500">Resenas registradas en tu cuenta: {misResenas?.length || 0}</p>
            </section>
          )}

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-lg font-bold text-slate-900">Productos relacionados</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {relacionados.map((rel: any) => (
                <article key={rel.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase text-slate-500">{rel.categoria?.nombre || 'Sin categoria'}</p>
                  <p className="font-semibold text-slate-800">{rel.nombre}</p>
                  <p className="text-sm text-slate-600">S/ {Number(rel.precio_venta || 0).toFixed(2)}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default ProductoDetalle;
