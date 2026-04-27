import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, clearCart, hasHydrated, coupon } = useCartStore();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [sessionId] = useState(() => `checkout-${Date.now()}`);
  const [direccionId, setDireccionId] = useState<number>();
  const [metodoEnvioId, setMetodoEnvioId] = useState(1);
  const [metodoPagoId, setMetodoPagoId] = useState(1);
  const [nuevaDireccion, setNuevaDireccion] = useState({
    nombre_destinatario: '',
    calle: '',
    ciudad: '',
    provincia: '',
    codigo_postal: '',
    telefono_contacto: '',
  });

  const { data: direcciones } = useQuery({
    queryKey: ['direcciones'],
    queryFn: async () => {
      const res = await api.get('/clientes/direcciones');
      return res.data;
    },
    enabled: !!user,
  });

  const { data: metodosEnvio } = useQuery({
    queryKey: ['metodos-envio'],
    queryFn: async () => (await api.get('/ordenes/metodos-envio')).data,
    enabled: !!user && step >= 3,
  });

  const { data: resumen } = useQuery({
    queryKey: ['carrito-resumen-checkout', coupon, metodoEnvioId],
    queryFn: async () =>
      (
        await api.get('/carrito/resumen', {
          params: { cupon: coupon || undefined, metodoEnvioId },
        })
      ).data,
    enabled: !!user && hasHydrated,
  });

  const syncCartMutation = useMutation({
    mutationFn: async () => {
      const localItems = items.map((item) => ({
        id_producto: item.id_producto,
        id_variante: item.id_variante,
        cantidad: item.cantidad,
      }));
      return (await api.post('/carrito/sync-local', { items: localItems })).data;
    },
  });

  const reserveMutation = useMutation({
    mutationFn: async () => api.post('/ordenes/reservar-stock', { sessionId }),
    onSuccess: () => toast.success('Stock reservado por 15 minutos'),
    onError: (e: any) => toast.error(e?.response?.data?.error || 'No se pudo reservar stock'),
  });

  const createDireccionMutation = useMutation({
    mutationFn: async () => (await api.post('/clientes/direcciones', nuevaDireccion)).data,
    onSuccess: (d) => {
      setDireccionId(d.id);
      toast.success('Direccion creada');
    },
  });

  const { mutate: crearOrden, isPending } = useMutation({
    mutationFn: async () => {
      const res = await api.post('/ordenes', { direccionId, metodoEnvioId, metodoPagoId, sessionId, couponCode: coupon || undefined });
      return res.data;
    },
    onSuccess: () => {
      clearCart();
      toast.success('Orden creada exitosamente');
      navigate('/mis-ordenes');
    },
  });

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.precio * i.cantidad, 0), [items]);
  const total = Number(resumen?.total ?? subtotal);
  const subtotalMostrar = Number(resumen?.subtotal ?? subtotal);
  const descuentoMostrar = Number(resumen?.descuento ?? 0);
  const impuestoPorcentajeMostrar = Number(resumen?.impuestoPorcentaje ?? 18);
  const impuestoMostrar = Number(resumen?.impuesto ?? 0);
  const envioMostrar = Number(resumen?.envio ?? 0);
  const baseImponibleMostrar = Number(Math.max(subtotalMostrar - descuentoMostrar, 0).toFixed(2));

  const steps = ['Login', 'Direccion', 'Envio', 'Pago', 'Revision'];

  const nextStep = async () => {
    if (step === 1) {
      if (!user) {
        toast.error('Debes iniciar sesion para continuar con la compra.');
        navigate('/login');
        return;
      }
      if (hasHydrated && items.length === 0) {
        toast.error('Tu carrito esta vacio.');
        navigate('/carrito');
        return;
      }
      try {
        await syncCartMutation.mutateAsync();
      } catch (e: any) {
        toast.error(e?.response?.data?.error || 'No se pudo sincronizar el carrito.');
        return;
      }
      await reserveMutation.mutateAsync();
    }

    if (step === 2 && !direccionId) {
      toast.error('Selecciona o crea una direccion.');
      return;
    }

    setStep((s) => Math.min(s + 1, 5));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  if (!hasHydrated) {
    return (
      <main className="app-shell py-6">
        <section className="panel max-w-3xl p-8">
          <div className="flex items-center gap-3 text-slate-700">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
            <p className="text-sm font-semibold">Cargando checkout...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell py-6">
      <section className="panel max-w-3xl p-6">
        <h2 className="text-3xl font-bold text-slate-900">Checkout wizard</h2>
        <p className="mt-1 text-sm text-slate-600">Proceso guiado: identificacion, direccion, envio, pago y revision.</p>

        <div className="mt-4 grid grid-cols-5 gap-2 text-xs font-semibold">
          {steps.map((label, idx) => (
            <div key={label} className={`rounded-lg px-2 py-2 text-center ${step >= idx + 1 ? 'bg-sky-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {idx + 1}. {label}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">Total del pedido</p>
          <p className="text-3xl font-extrabold text-sky-900">S/ {total.toFixed(2)}</p>
          <div className="mt-3 grid gap-1 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-semibold">S/ {subtotalMostrar.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Descuento</span>
              <span className="font-semibold text-emerald-700">- S/ {descuentoMostrar.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Base</span>
              <span className="font-semibold">S/ {baseImponibleMostrar.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Impuesto ({impuestoPorcentajeMostrar}%)</span>
              <span className="font-semibold">S/ {impuestoMostrar.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Envío</span>
              <span className="font-semibold">S/ {envioMostrar.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {step === 1 && (
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">Login requerido</p>
                  <p className="mt-1 text-sm text-slate-600">Para completar el pago, la compra debe estar asociada a tu cuenta.</p>
                  <div className="mt-3 space-y-1 text-sm text-slate-700">
                    <p className="font-semibold">Carrito: {items.length} item(s)</p>
                    {coupon && <p className="text-emerald-700 font-semibold">Cupón: {coupon}</p>}
                    {user ? (
                      <p className="text-slate-600">Sesion: <span className="font-semibold text-slate-900">{user.email}</span></p>
                    ) : (
                      <p className="text-amber-700 font-semibold">No has iniciado sesion.</p>
                    )}
                  </div>
                </div>
                {!user && (
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="shrink-0 rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-900"
                  >
                    Ir a login
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Direccion de envio guardada</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                onChange={(e) => setDireccionId(Number(e.target.value))}
                defaultValue=""
              >
                <option value="" disabled>Selecciona direccion</option>
                {direcciones?.map((d: any) => <option key={d.id} value={d.id}>{`${d.calle} - ${d.ciudad || ''}`}</option>)}
              </select>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Nombre y apellido" value={nuevaDireccion.nombre_destinatario} onChange={(e) => setNuevaDireccion((s) => ({ ...s, nombre_destinatario: e.target.value }))} />
              <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Telefono" value={nuevaDireccion.telefono_contacto} onChange={(e) => setNuevaDireccion((s) => ({ ...s, telefono_contacto: e.target.value }))} />
              <input className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2" placeholder="Direccion" value={nuevaDireccion.calle} onChange={(e) => setNuevaDireccion((s) => ({ ...s, calle: e.target.value }))} />
              <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Ciudad" value={nuevaDireccion.ciudad} onChange={(e) => setNuevaDireccion((s) => ({ ...s, ciudad: e.target.value }))} />
              <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Departamento" value={nuevaDireccion.provincia} onChange={(e) => setNuevaDireccion((s) => ({ ...s, provincia: e.target.value }))} />
              <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Codigo postal" value={nuevaDireccion.codigo_postal} onChange={(e) => setNuevaDireccion((s) => ({ ...s, codigo_postal: e.target.value }))} />
            </div>
            <button type="button" onClick={() => createDireccionMutation.mutate()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
              Guardar nueva direccion
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="mt-5 space-y-3">
            <label className="block text-sm font-semibold text-slate-700">Metodo de envio</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={metodoEnvioId} onChange={(e) => setMetodoEnvioId(Number(e.target.value))}>
              {(metodosEnvio || [
                { id: 1, nombre: 'Estandar', costo: 18, tiempo_estimado: '2-4 dias' },
                { id: 2, nombre: 'Express', costo: 30, tiempo_estimado: '24h' },
              ]).map((m: any) => (
                <option key={m.id} value={m.id}>{`${m.nombre} - S/ ${Number(m.costo || 0).toFixed(2)} (${m.tiempo_estimado || 'N/A'})`}</option>
              ))}
            </select>
            <p className="text-xs font-semibold text-slate-500">El envío se suma al total final.</p>
          </div>
        )}

        {step === 4 && (
          <div className="mt-5 space-y-3">
            <label className="block text-sm font-semibold text-slate-700">Metodo de pago</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={metodoPagoId} onChange={(e) => setMetodoPagoId(Number(e.target.value))}>
              <option value={1}>Tarjeta credito/debito (simulado)</option>
              <option value={2}>Transferencia bancaria</option>
              <option value={3}>Contra entrega</option>
            </select>
          </div>
        )}

        {step === 5 && (
          <div className="mt-5 space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Revision final</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              {items.map((i) => (
                <li key={`${i.id_producto}-${i.id_variante || 0}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  {i.nombre} x {i.cantidad} - S/ {(i.precio * i.cantidad).toFixed(2)}
                </li>
              ))}
            </ul>
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-bold">S/ {subtotalMostrar.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>Descuento</span>
                <span className="font-bold text-emerald-700">- S/ {descuentoMostrar.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>Base</span>
                <span className="font-bold">S/ {baseImponibleMostrar.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>Impuesto ({impuestoPorcentajeMostrar}%)</span>
                <span className="font-bold">S/ {impuestoMostrar.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>Envío</span>
                <span className="font-bold">S/ {envioMostrar.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-base">
                <span className="font-extrabold text-slate-900">Total</span>
                <span className="font-extrabold text-sky-900">S/ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={prevStep} disabled={step === 1} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40">
            Anterior
          </button>
          {step < 5 ? (
            <button type="button" onClick={nextStep} className="rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white">
              Siguiente
            </button>
          ) : (
            <button
              onClick={() => crearOrden()}
              disabled={isPending || !direccionId}
              className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Procesando...' : 'Confirmar pedido'}
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              try {
                await api.post('/ordenes/liberar-reserva', { sessionId });
              } catch (e: any) {
                toast.error(e?.response?.data?.error || 'No se pudo liberar la reserva');
              }
              toast.success('Checkout cancelado');
              navigate('/carrito');
            }}
            className="ml-auto rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700"
          >
            Cancelar checkout
          </button>
        </div>
      </section>
    </main>
  );
}
