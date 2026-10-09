import React, { useState } from 'react';
import {
  X,
  User,
  Lock,
  Mail,
  Shield,
  Key,
  LogOut,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { apiService, UserProfile } from '../../services/apiService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserChange: (user: UserProfile | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiService.login(identifier, password);
      if (res.success && res.user) {
        onUserChange(res.user as UserProfile);
        setNotice('¡Sesión iniciada con éxito!');
        setTimeout(() => {
          setNotice(null);
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || 'Credenciales inválidas.');
      }
    } catch {
      setErrorMsg('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiService.register({ username, email, password });
      if (res.success && res.user) {
        onUserChange(res.user as UserProfile);
        setNotice('¡Cuenta registrada exitosamente!');
        setTimeout(() => {
          setNotice(null);
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || 'Error al registrar.');
      }
    } catch {
      setErrorMsg('Error de red al registrar.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    apiService.logout();
    onUserChange(null);
    setNotice('Sesión cerrada.');
    setTimeout(() => setNotice(null), 1500);
  };

  const handleCopyOverlayToken = () => {
    if (!currentUser?.overlayToken) return;
    navigator.clipboard.writeText(currentUser.overlayToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleRegenerateToken = async () => {
    if (
      !confirm(
        '¿Regenerar clave de OBS Overlay? Tendrás que actualizar la URL en las propiedades de fuente de navegador en OBS Studio.'
      )
    )
      return;
    const newToken = await apiService.regenerateOverlayToken();
    if (newToken && currentUser) {
      onUserChange({ ...currentUser, overlayToken: newToken });
      setNotice('Nueva clave de OBS generada.');
      setTimeout(() => setNotice(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0B0F1A] border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {notice && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* State A: Logged In User View */}
        {currentUser ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                {currentUser.username.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-white text-base">@{currentUser.username}</h3>
                <span className="text-xs text-slate-400">{currentUser.email}</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60 uppercase">
                    <Shield className="w-2.5 h-2.5" />
                    {currentUser.role}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Registrado {new Date(currentUser.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* OBS Private Overlay Token */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Token Privado de OBS Overlay
                </span>
                <button
                  onClick={handleRegenerateToken}
                  title="Regenerar clave"
                  className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Regenerar</span>
                </button>
              </div>

              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="truncate flex-1 text-slate-300">
                  {currentUser.overlayToken
                    ? `${currentUser.overlayToken.substring(0, 10)}••••••••••••••••`
                    : 'Sin token generado'}
                </span>
                <button
                  onClick={handleCopyOverlayToken}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                  title="Copiar token"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Usa este token en la URL de tu fuente de OBS para vincular tu overlay sin exponer contraseñas en stream.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-semibold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        ) : isRegistering ? (
          /* State B: Registration Form */
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-white">Crear Cuenta de Streamer</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Almacena tus reglas, ajustes y tokens de forma persistente y aislada.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de Usuario</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="streamer_pro"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="streamer@ejemplo.com"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña (Mín. 8 caracteres)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl transition-all shadow-md"
            >
              {loading ? 'Creando cuenta...' : 'Registrar Cuenta'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="text-xs text-cyan-400 hover:underline"
              >
                ¿Ya tienes una cuenta? Inicia sesión aquí
              </button>
            </div>
          </form>
        ) : (
          /* State C: Login Form */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-white">Iniciar Sesión</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Accede a tu panel y espacio de trabajo de LiveTrigger AI.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Usuario o Correo Electrónico
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin o tu_email@dominio.com"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md"
            >
              {loading ? 'Validando...' : 'Iniciar Sesión'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className="text-xs text-cyan-400 hover:underline"
              >
                ¿Nuevo aquí? Crea una cuenta de streamer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
