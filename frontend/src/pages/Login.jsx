import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { correo, password });
      login(data);
      toast.success('Sesion iniciada');
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo iniciar sesion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-slate-900">SCT Transmetro</h1>
        <p className="mt-1 text-sm text-slate-500">Ingreso al sistema de control</p>
        <label className="mt-6 block text-sm font-medium text-slate-700">Correo</label>
        <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <label className="mt-4 block text-sm font-medium text-slate-700">Contrasena</label>
        <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={loading} className="mt-6 w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
