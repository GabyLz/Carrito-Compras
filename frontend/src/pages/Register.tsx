import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../services/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (form.password !== form.confirmPassword) throw new Error('Las contrasenas no coinciden');
      return api.post('/auth/register', {
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email,
        password: form.password,
      });
    },
    onSuccess: () => {
      toast.success('Usuario creado. Ya puedes iniciar sesion.');
      navigate('/login');
    },
    onError: (error: any) => toast.error(error?.message || 'No se pudo registrar'),
  });

  return (
    <main className="app-shell py-8">
      <section className="panel mx-auto max-w-lg p-6">
        <h1 className="text-3xl font-bold text-slate-900">Crear usuario</h1>
        <p className="mt-1 text-sm text-slate-600">Registro de cliente con correo y confirmacion de contrasena.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))} />
          <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Apellido" value={form.apellido} onChange={(e) => setForm((s) => ({ ...s, apellido: e.target.value }))} />
          <input className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          <div className="relative">
            <input 
              className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10" 
              placeholder="Contrasena" 
              type={showPassword ? "text" : "password"} 
              value={form.password} 
              onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
              )}
            </button>
          </div>
          <div className="relative">
            <input 
              className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10" 
              placeholder="Confirmar contrasena" 
              type={showConfirmPassword ? "text" : "password"} 
              value={form.confirmPassword} 
              onChange={(e) => setForm((s) => ({ ...s, confirmPassword: e.target.value }))} 
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            >
              {showConfirmPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
              )}
            </button>
          </div>
        </div>
        <button onClick={() => mutation.mutate()} className="mt-5 w-full rounded-lg bg-sky-800 py-2 font-semibold text-white">
          Crear cuenta
        </button>
      </section>
    </main>
  );
}