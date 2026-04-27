import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

interface Usuario {
  id: number;
  email: string;
  activo: boolean;
  roles: {
    rol: {
      id: number;
      nombre: string;
    };
  }[];
}

interface Rol {
  id: number;
  nombre: string;
}

interface UserForm {
  id?: number;
  email: string;
  password?: string;
  nombre?: string;
  apellido?: string;
  rolId: number;
  activo: boolean;
}

const INITIAL_FORM: UserForm = {
  email: '',
  password: '',
  nombre: '',
  apellido: '',
  rolId: 5, // Cliente por defecto
  activo: true,
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl transition-all">
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

const UsuariosRolesAdmin = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<UserForm>(INITIAL_FORM);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: usuarios = [], isLoading: loadingUsers, isError: usersError } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/usuarios');
        console.log('Usuarios data:', res.data);
        return res.data || [];
      } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
    },
  });

  const { data: roles = [], isLoading: loadingRoles, isError: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/usuarios/roles');
        console.log('Roles data:', res.data);
        return res.data || [];
      } catch (error) {
        console.error('Error fetching roles:', error);
        throw error;
      }
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: UserForm) => {
      if (payload.id) return api.put(`/admin/usuarios/${payload.id}`, payload);
      return api.post('/admin/usuarios/register-internal', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setIsModalOpen(false);
      setForm(INITIAL_FORM);
      toast.success(isEditing ? 'Usuario actualizado' : 'Usuario creado');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || error?.response?.data?.message || 'Error al procesar usuario';
      toast.error(message);
    }
  });

  const filteredUsers = useMemo(() => {
    return usuarios.filter((u: Usuario) => 
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [usuarios, searchTerm]);

  const handleEdit = (user: Usuario) => {
    setForm({
      id: user.id,
      email: user.email,
      rolId: user.roles[0]?.rol.id || 5,
      activo: user.activo,
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditing && (!form.password || form.password.length < 6)) {
      toast.error('La contrasena debe tener al menos 6 caracteres');
      return;
    }

    if (!form.rolId) {
      toast.error('Debes seleccionar un rol');
      return;
    }

    upsertMutation.mutate(form);
  };

  return (
    <main className="app-shell py-8 space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Usuarios y Roles</h1>
          <p className="text-slate-500 font-medium mt-1">Control de acceso y perfiles de usuario</p>
        </div>
        <button
          onClick={() => { setForm(INITIAL_FORM); setIsEditing(false); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 active:scale-95"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuevo Usuario
        </button>
      </header>

      {/* Main Table Section */}
      <section className="panel bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Listado de Usuarios</h2>
          <div className="relative w-full md:w-72">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Buscar por email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border-slate-200 pl-10 text-sm focus:border-sky-500 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Rol Principal</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingUsers ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-500 font-medium">Cargando usuarios...</td></tr>
              ) : usersError ? (
                <tr><td colSpan={5} className="py-20 text-center text-rose-600 font-medium">No se pudieron cargar los usuarios</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-500 font-medium">No se encontraron usuarios</td></tr>
              ) : (
                filteredUsers.map((user: Usuario) => (
                  <tr key={user.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">#{user.id}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-900">{user.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 border border-sky-100">
                        {user.roles[0]?.rol.nombre || 'Sin Rol'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        user.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleEdit(user)} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Upsert Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border-slate-200 text-sm focus:border-sky-500 focus:ring-sky-500"
            />
          </div>

          {!isEditing && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.nombre || ''}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className="w-full rounded-xl border-slate-200 text-sm focus:border-sky-500 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Apellido</label>
                <input
                  type="text"
                  value={form.apellido || ''}
                  onChange={e => setForm({ ...form, apellido: e.target.value })}
                  className="w-full rounded-xl border-slate-200 text-sm focus:border-sky-500 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          {!isEditing && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
              <input
                required
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                minLength={6}
                className="w-full rounded-xl border-slate-200 text-sm focus:border-sky-500 focus:ring-sky-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Rol Asignado</label>
            <select
              required
              value={form.rolId}
              onChange={e => setForm({ ...form, rolId: Number(e.target.value) })}
              disabled={loadingRoles || rolesError}
              className="w-full rounded-xl border-slate-200 text-sm focus:border-sky-500 focus:ring-sky-500"
            >
              <option value="">Selecciona un rol</option>
              {roles.map((rol: Rol) => (
                <option key={rol.id} value={rol.id}>{rol.nombre}</option>
              ))}
            </select>
            {rolesError && <p className="mt-1 text-xs font-semibold text-rose-600">No se pudieron cargar los roles</p>}
          </div>

          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="user-activo"
              checked={form.activo}
              onChange={e => setForm({ ...form, activo: e.target.checked })}
              className="rounded text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="user-activo" className="text-sm font-bold text-slate-700">Usuario Activo</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={upsertMutation.isPending}
              className="flex-1 rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sky-100 hover:bg-sky-700 transition disabled:opacity-50"
            >
              {upsertMutation.isPending ? 'Guardando...' : isEditing ? 'Actualizar Usuario' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
};

export default UsuariosRolesAdmin;
