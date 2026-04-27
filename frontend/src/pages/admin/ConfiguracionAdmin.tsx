import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

interface ConfigState {
  tienda_nombre: string;
  tienda_email: string;
  tienda_telefono: string;
  moneda: string;
  impuesto_porcentaje: number;
  envio_gratis_desde: number;
  modo_mantenimiento: boolean;
}

const ConfiguracionAdmin = () => {
  const [config, setConfig] = useState<ConfigState>({
    tienda_nombre: 'Mi Tienda Online',
    tienda_email: 'contacto@tienda.com',
    tienda_telefono: '+51 987 654 321',
    moneda: 'PEN',
    impuesto_porcentaje: 18,
    envio_gratis_desde: 200,
    modo_mantenimiento: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  const configQuery = useQuery({
    queryKey: ['admin-config-compra'],
    queryFn: async () => (await api.get('/configuracion/admin')).data,
  });

  useEffect(() => {
    const data = configQuery.data as { impuesto_porcentaje?: number; envio_gratis_desde?: number } | undefined;
    if (!data) return;

    setConfig((prev) => ({
      ...prev,
      impuesto_porcentaje: Number(data.impuesto_porcentaje ?? prev.impuesto_porcentaje),
      envio_gratis_desde: Number(data.envio_gratis_desde ?? prev.envio_gratis_desde),
    }));
  }, [configQuery.data]);

  const saveConfigMutation = useMutation({
    mutationFn: async (payload: { impuesto_porcentaje: number; envio_gratis_desde: number }) =>
      (await api.put('/configuracion/admin', payload)).data,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    saveConfigMutation
      .mutateAsync({
        impuesto_porcentaje: Number(config.impuesto_porcentaje),
        envio_gratis_desde: Number(config.envio_gratis_desde),
      })
      .then(() => {
        toast.success('Configuración guardada correctamente');
      })
      .catch((error: any) => {
        toast.error(error?.response?.data?.error || 'No se pudo guardar la configuración');
      })
      .finally(() => setIsSaving(false));
  };

  return (
    <main className="app-shell py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuración del Sistema</h1>
        <p className="text-slate-500 font-medium mt-1">Parámetros globales y reglas operativas</p>
      </header>

      <form onSubmit={handleSave} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* General Settings */}
        <section className="lg:col-span-2 space-y-6">
          <div className="panel bg-white border border-slate-200 shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Información de la Tienda</h2>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Nombre de la Tienda</label>
                <input
                  type="text"
                  value={config.tienda_nombre}
                  onChange={e => setConfig({ ...config, tienda_nombre: e.target.value })}
                  className="w-full rounded-xl border-slate-200 text-sm focus:border-sky-500 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Email de Contacto</label>
                <input
                  type="email"
                  value={config.tienda_email}
                  onChange={e => setConfig({ ...config, tienda_email: e.target.value })}
                  className="w-full rounded-xl border-slate-200 text-sm focus:border-sky-500 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Teléfono</label>
                <input
                  type="text"
                  value={config.tienda_telefono}
                  onChange={e => setConfig({ ...config, tienda_telefono: e.target.value })}
                  className="w-full rounded-xl border-slate-200 text-sm focus:border-sky-500 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          <div className="panel bg-white border border-slate-200 shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Impuestos y Envíos</h2>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Impuesto (IGV %)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={config.impuesto_porcentaje}
                    onChange={e => setConfig({ ...config, impuesto_porcentaje: Number(e.target.value) })}
                    className="w-full rounded-xl border-slate-200 pr-8 text-sm focus:border-sky-500 focus:ring-sky-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Envío Gratis Desde (S/)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">S/</span>
                  <input
                    type="number"
                    value={config.envio_gratis_desde}
                    onChange={e => setConfig({ ...config, envio_gratis_desde: Number(e.target.value) })}
                    className="w-full rounded-xl border-slate-200 pl-8 text-sm focus:border-sky-500 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sidebar Settings */}
        <aside className="space-y-6">
          <div className="panel bg-white border border-slate-200 shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Estado del Sistema</h2>
            
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-900">Modo Mantenimiento</p>
                <p className="text-xs text-slate-500">Desactiva el acceso público</p>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, modo_mantenimiento: !config.modo_mantenimiento })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.modo_mantenimiento ? 'bg-rose-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.modo_mantenimiento ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                )}
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-100 p-6">
            <div className="flex gap-3 text-amber-700">
              <svg className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                <p className="text-sm font-bold">Nota de Seguridad</p>
                <p className="text-xs mt-1 text-amber-600 font-medium">Estos cambios afectan a toda la plataforma en tiempo real. Procede con precaución.</p>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </main>
  );
};

export default ConfiguracionAdmin;
