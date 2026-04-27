import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getDefaultRouteByRole, normalizeRole } from '../lib/roles';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore((s: any) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      const role = normalizeRole(user?.rol);
      navigate(getDefaultRouteByRole(role));
      toast.success('Sesion iniciada correctamente');
    } catch {
      toast.error('No se pudo iniciar sesion. Verifica email y contrasena.');
    }
  };

  return (
    <main className="app-shell py-8">
      <section className="panel mx-auto max-w-md p-6">
        <h2 className="text-3xl font-bold text-slate-900">Iniciar sesion</h2>
        <p className="mt-1 text-sm text-slate-600">Acceso con JWT y permisos por rol.</p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contrasena"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full rounded-lg bg-sky-800 py-2 font-semibold text-white">
            Ingresar
          </button>
          <div className="text-center text-sm text-slate-600">
            ¿No tienes cuenta? <a href="/register" className="font-semibold text-sky-800 hover:underline">Crear usuario</a>
          </div>
        </form>
      </section>
    </main>
  );
}