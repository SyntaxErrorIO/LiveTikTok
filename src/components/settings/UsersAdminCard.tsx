import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Mail, Lock, User, CheckCircle, AlertCircle } from 'lucide-react';
import { apiService, UserProfile } from '../../services/apiService';

interface UsersAdminCardProps {
  currentUser: UserProfile | null;
}

export const UsersAdminCard: React.FC<UsersAdminCardProps> = ({ currentUser }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const users = await apiService.getUsers();
      setUsersList(users);
    } catch {}
  };

  if (currentUser?.role !== 'admin') {
    return null;
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await apiService.adminRegisterUser({ username, email, password });
      if (res.success && res.user) {
        setSuccessMsg(`Usuario @${res.user.username} creado exitosamente.`);
        setUsername('');
        setEmail('');
        setPassword('');
        loadUsers();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(res.error || 'No se pudo crear el usuario.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al comunicarse con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="md:col-span-2 p-5 rounded-xl bg-[#0B0F1A] border border-cyan-800/40 space-y-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Gestión de Usuarios (Panel de Administrador)</h3>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 uppercase font-semibold">
          Solo Admin
        </span>
      </div>

      <p className="text-xs text-slate-400">
        Crea nuevas cuentas de streamers o colaboradores aunque el registro público esté cerrado.
      </p>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulario de creación de usuario */}
      <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre de Usuario</label>
          <div className="relative">
            <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="nuevo_streamer"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Correo Electrónico</label>
          <div className="relative">
            <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="streamer@dominio.com"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{loading ? 'Creando...' : 'Crear Cuenta'}</span>
          </button>
        </div>
      </form>

      {/* Lista de cuentas existentes en el servidor */}
      {usersList.length > 0 && (
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cuentas Registradas en el Servidor ({usersList.length})</span>
          </div>
          <div className="divide-y divide-slate-800/60 max-h-48 overflow-y-auto">
            {usersList.map((u) => (
              <div key={u.id} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">@{u.username}</span>
                  <span className="text-slate-400 text-[11px]">({u.email})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                      u.role === 'admin'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {u.role}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
