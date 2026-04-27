import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { normalizeRole } from '../../lib/roles';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

type PerfilForm = {
  nombre: string;
  apellido: string;
  telefono: string;
};

const Perfil = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const role = normalizeRole(user?.rol);
  const [form, setForm] = useState<PerfilForm>({ nombre: '', apellido: '', telefono: '' });

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['perfil-cliente'],
    queryFn: async () => (await api.get('/clientes/perfil')).data,
  });

  useEffect(() => {
    if (!perfil) return;
    setForm({
      nombre: perfil.nombre || '',
      apellido: perfil.apellido || '',
      telefono: perfil.telefono || '',
    });
  }, [perfil]);

  const saveMutation = useMutation({
    mutationFn: async (payload: PerfilForm) => (await api.put('/clientes/perfil', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfil-cliente'] });
      toast.success('Perfil actualizado correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'No se pudo actualizar el perfil');
    },
  });

  const onReset = () => {
    if (!perfil) return;
    setForm({
      nombre: perfil.nombre || '',
      apellido: perfil.apellido || '',
      telefono: perfil.telefono || '',
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <main className="app-shell py-6">
        <section className="panel max-w-3xl p-6">
          <div className="flex items-center gap-3 text-slate-600">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
            <p className="text-sm font-semibold">Cargando perfil...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell py-6">
      <section className="panel max-w-3xl p-6">
        <h1 className="text-3xl font-bold text-slate-900">Perfil de usuario</h1>
        <p className="mt-1 text-sm text-slate-500">Edita tus datos personales no críticos y mantén tu información actualizada.</p>

        <form onSubmit={onSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
            <p className="font-semibold text-slate-700">Email (no editable)</p>
            <p className="text-slate-600">{user?.email || 'No disponible'}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <label className="mb-1 block text-sm font-semibold text-slate-700">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Tu nombre"
              required
              minLength={2}
              maxLength={100}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <label className="mb-1 block text-sm font-semibold text-slate-700">Apellido</label>
            <input
              type="text"
              value={form.apellido}
              onChange={(e) => setForm((s) => ({ ...s, apellido: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Tu apellido"
              maxLength={100}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <label className="mb-1 block text-sm font-semibold text-slate-700">Teléfono</label>
            <input
              type="text"
              value={form.telefono}
              onChange={(e) => setForm((s) => ({ ...s, telefono: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ej: +51 999 999 999"
              maxLength={20}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold text-slate-700">Rol (no editable)</p>
            <p className="text-slate-600">{role}</p>
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-900 disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={saveMutation.isPending}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Restaurar
            </button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default Perfil;
