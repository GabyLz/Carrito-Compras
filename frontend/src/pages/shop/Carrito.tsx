import { Link } from 'react-router-dom';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const Carrito = () => {
  const placeholderImage =
    'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23e2e8f0"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-family="Arial, sans-serif" font-size="12"%3EProducto%3C/text%3E%3C/svg%3E';
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { items, removeItem, updateQuantity, clearCart, hasHydrated, coupon, setCoupon } = useCartStore();
  const [cupon, setCupon] = useState(() => coupon || '');

  const { data: resumen } = useQuery({
    queryKey: ['carrito-resumen', cupon],
    queryFn: async () => {
      const params = cupon ? `?cupon=${encodeURIComponent(cupon)}` : '';
      return (await api.get(`/carrito/resumen${params}`)).data;
    },
    enabled: isAuthenticated,
  });

  const { data: compraConfig } = useQuery({
    queryKey: ['compra-config-public'],
    queryFn: async () => (await api.get('/configuracion/public')).data,
  });

  const impuestoConfigurado = Number(compraConfig?.impuesto_porcentaje ?? 18);
  const envioGratisDesdeConfigurado = Number(compraConfig?.envio_gratis_desde ?? 250);

  const subtotalLocal = useMemo(() => items.reduce((sum, item) => sum + item.precio * item.cantidad, 0), [items]);
  const impuestoLocal = subtotalLocal * (impuestoConfigurado / 100);
  const envioLocal = subtotalLocal >= envioGratisDesdeConfigurado ? 0 : 18;
  const totalLocal = subtotalLocal + impuestoLocal + envioLocal;

  const subtotal = isAuthenticated ? Number(resumen?.subtotal || 0) : subtotalLocal;
  const impuestoPct = isAuthenticated ? Number(resumen?.impuestoPorcentaje || 18) : impuestoConfigurado;
  const impuesto = isAuthenticated ? Number(resumen?.impuesto || 0) : impuestoLocal;
  const envio = isAuthenticated ? Number(resumen?.envio || 0) : envioLocal;
  const descuento = isAuthenticated ? Number(resumen?.descuento || 0) : 0;
  const total = isAuthenticated ? Number(resumen?.total || 0) : totalLocal;

  const getAvailableStock = (item: (typeof items)[number]) => {
    const remoteItem = resumen?.items?.find(
      (it: any) => it.id_producto === item.id_producto && (it.id_variante || undefined) === item.id_variante
    );
    const remoteStock = Number(remoteItem?.variante?.stock ?? remoteItem?.producto?.stock_general ?? 0);
    const localStock = Number(item.stock ?? 0);
    return remoteStock > 0 ? remoteStock : localStock;
  };

  const isOverStock = (item: (typeof items)[number]) => {
    const stockDisponible = getAvailableStock(item);
    return stockDisponible > 0 && item.cantidad > stockDisponible;
  };

  const hasStockWarnings = items.some(isOverStock);

  const syncMutation = useMutation({
    mutationFn: async () => api.post('/carrito/sync-local', { items }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['carrito-resumen'] }),
  });

  const lastSyncKeyRef = useRef<string>('');
  const itemsSyncKey = useMemo(
    () =>
      items
        .map((it) => `${it.id_producto}:${it.id_variante || 0}:${it.cantidad}`)
        .sort()
        .join('|'),
    [items]
  );

  useEffect(() => {
    if (!isAuthenticated || !hasHydrated) return;
    if (!items.length) return;
    if (lastSyncKeyRef.current === itemsSyncKey) return;
    lastSyncKeyRef.current = itemsSyncKey;
    syncMutation.mutate();
  }, [hasHydrated, isAuthenticated, items.length, itemsSyncKey, syncMutation]);

  const remoteDeleteMutation = useMutation({
    mutationFn: async (itemId: number) => api.delete(`/carrito/items/${itemId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['carrito-resumen'] }),
  });

  const clearRemoteMutation = useMutation({
    mutationFn: async () => api.delete('/carrito'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['carrito-resumen'] }),
  });

  const onApplyCoupon = async () => {
    if (!isAuthenticated) {
      toast.error('Inicia sesion para aplicar cupones.');
      return;
    }
    try {
      const codigo = cupon.trim().toUpperCase();
      const response = await api.get('/carrito/resumen', {
        params: { cupon: codigo },
      });
      const resumenAplicado = response.data;

      if (!resumenAplicado?.cupon) {
        throw new Error('Cupon invalido o no aplicable');
      }

      queryClient.invalidateQueries({ queryKey: ['carrito-resumen'] });
      setCoupon(codigo);
      toast.success('Cupon aplicado');
    } catch {
      setCoupon(null);
      toast.error('Cupon invalido o no aplicable');
    }
  };

  const onChangeQty = (idProducto: number, qty: number, idVariante?: number, stockDisponible?: number) => {
    const safeQty = Math.max(1, qty);
    if (typeof stockDisponible === 'number' && stockDisponible > 0 && safeQty > stockDisponible) {
      toast.error(`Solo hay ${stockDisponible} unidad(es) disponibles.`);
      return;
    }

    updateQuantity(idProducto, safeQty, idVariante);
    if (isAuthenticated) {
      syncMutation.mutate();
    }
  };

  const onRemove = (idProducto: number, idVariante?: number) => {
    const remoteItem = resumen?.items?.find((it: any) => it.id_producto === idProducto && (it.id_variante || undefined) === idVariante);
    removeItem(idProducto, idVariante);
    if (isAuthenticated && remoteItem?.id) {
      remoteDeleteMutation.mutate(remoteItem.id);
    }
  };

  const onClear = () => {
    clearCart();
    if (isAuthenticated) clearRemoteMutation.mutate();
  };

  return (
    <main className="app-shell space-y-5 py-6">
      <section className="panel p-6">
        <h1 className="text-3xl font-bold text-slate-900">Carrito de compras</h1>
        <p className="mt-1 text-sm text-slate-600">Resumen de tu compra con calculo de impuesto, envio y total estimado.</p>
      </section>

      {!hasHydrated && (
        <section className="panel p-8 text-center">
          <div className="mx-auto flex w-fit items-center gap-3 text-slate-600">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
            <p className="font-semibold">Cargando carrito...</p>
          </div>
        </section>
      )}

      {hasHydrated && !items.length && (
        <section className="panel p-8 text-center">
          <p className="mb-4 text-slate-600">Tu carrito esta vacio.</p>
          <Link to="/catalogo" className="rounded-lg bg-sky-800 px-4 py-2 font-semibold text-white hover:bg-sky-900">
            Ir al catalogo
          </Link>
        </section>
      )}

      {hasHydrated && !!items.length && (
        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="panel overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              {items.length} producto(s) en tu carrito
            </div>
            <div className="divide-y divide-slate-200">
              {!!resumen?.alerts?.length && (
                <div className="space-y-2 bg-amber-50 p-4 text-sm text-amber-800">
                  {resumen.alerts.map((a: any) => (
                    <p key={`${a.id_item}-${a.tipo}`}>• {a.mensaje}</p>
                  ))}
                </div>
              )}
              {hasStockWarnings && (
                <div className="bg-rose-50 p-4 text-sm text-rose-700">
                  Hay productos que superan el stock disponible. Reduce la cantidad para poder continuar.
                </div>
              )}
              {items.map((item) => (
                <article key={`${item.id_producto}-${item.id_variante || 0}`} className="grid gap-4 p-4 md:grid-cols-[88px_1fr_auto] md:items-center">
                  <img
                    src={item.imagen || placeholderImage}
                    alt={item.nombre}
                    className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                  />
                  <div>
                    <h3 className="font-bold text-slate-800">{item.nombre}</h3>
                    <p className="text-xs text-slate-500">SKU ref: {item.id_producto}{item.id_variante ? `-V${item.id_variante}` : ''}</p>
                    <p className="mt-1 text-sm text-slate-500">Precio unitario: S/ {Number(item.precio).toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-2 py-1">
                      {(() => {
                        const stockDisponible = getAvailableStock(item);
                        return (
                          <>
                      <button
                        type="button"
                        onClick={() => onChangeQty(item.id_producto, Math.max(1, item.cantidad - 1), item.id_variante, stockDisponible)}
                        className="rounded px-2 py-1 text-slate-700 hover:bg-slate-100"
                      >
                        -
                      </button>
                      <span className="w-7 text-center text-sm font-semibold">{item.cantidad}</span>
                      <button
                        type="button"
                        onClick={() => onChangeQty(item.id_producto, item.cantidad + 1, item.id_variante, stockDisponible)}
                        disabled={stockDisponible > 0 && item.cantidad >= stockDisponible}
                        className="rounded px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                          </>
                        );
                      })()}
                    </div>
                    <p className={`text-xs ${isOverStock(item) ? 'text-rose-700' : 'text-slate-500'}`}>
                      Disponible: {getAvailableStock(item) > 0 ? getAvailableStock(item) : 'sin limite visible'}
                    </p>
                    <button
                      type="button"
                      onClick={() => onRemove(item.id_producto, item.id_variante)}
                      className="rounded border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="panel h-fit p-5">
            <h2 className="text-xl font-bold text-slate-900">Resumen del pedido</h2>
            <div className="mt-3 flex gap-2">
              <input
                value={cupon}
                onChange={(e) => {
                  setCupon(e.target.value);
                  if (!e.target.value.trim()) setCoupon(null);
                }}
                placeholder="Codigo cupon"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button type="button" onClick={onApplyCoupon} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
                Aplicar
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>S/ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Impuesto ({impuestoPct.toFixed(0)}%)</span>
                <span>S/ {impuesto.toFixed(2)}</span>
              </div>
              {descuento > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Descuento</span>
                  <span>- S/ {descuento.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>Envio</span>
                <span>{envio === 0 ? 'Gratis' : `S/ ${envio.toFixed(2)}`}</span>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between text-base font-bold text-slate-900">
                <span>Total</span>
                <span>S/ {total.toFixed(2)}</span>
              </div>
            </div>

              <button
                type="button"
                onClick={onClear}
                className="mt-3 w-full rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700"
              >
                Vaciar carrito
              </button>

            <Link
              to="/checkout"
              className="mt-5 block rounded-lg bg-sky-800 px-4 py-3 text-center font-semibold text-white hover:bg-sky-900"
            >
              Proceder al checkout
            </Link>
            <Link to="/catalogo" className="mt-2 block text-center text-sm font-semibold text-slate-600 hover:text-slate-900">
              Seguir comprando
            </Link>
          </aside>
        </section>
      )}
    </main>
  );
};

export default Carrito;
