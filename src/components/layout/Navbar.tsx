import React from 'react';
import {
  Power,
  Radio,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  User,
  ShieldAlert,
} from 'lucide-react';
import { ConnectionConfig } from '../../types';
import { UserProfile } from '../../services/apiService';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  masterEnabled: boolean;
  onToggleMaster: () => void;
  connection: ConnectionConfig;
  onOpenObsModal: () => void;
  currentUser?: UserProfile | null;
  failSafeActive?: boolean;
  onOpenAuthModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  masterEnabled,
  onToggleMaster,
  connection,
  onOpenObsModal,
  currentUser,
  failSafeActive,
  onOpenAuthModal,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'automations', label: 'Automatizaciones' },
    { id: 'effects', label: 'Efectos & OBS' },
    { id: 'simulator', label: 'Simulador' },
    { id: 'connections', label: 'Conexión' },
    { id: 'history', label: 'Historial' },
    { id: 'settings', label: 'Ajustes' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#080B12]/95 backdrop-blur-md border-b border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onTabChange('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-violet-950/40">
              <div className="w-full h-full bg-[#090D17] rounded-[7px] flex items-center justify-center">
                <Radio className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-white whitespace-nowrap">
                LiveTrigger <span className="text-cyan-400">AI</span>
              </span>
            </div>
          </button>

          {/* Fail-Safe Alert Badge if Active */}
          {failSafeActive ? (
            <div
              onClick={() => onTabChange('settings')}
              className="cursor-pointer hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold animate-pulse"
              title="Fallo detectado en el proveedor. Modo seguro activo para evitar falsos positivos."
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo Seguro Activo</span>
            </div>
          ) : (
            /* Connection Mode Pill-Free Badge */
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 pl-2 border-l border-slate-800">
              {connection.mode === 'simulation' ? (
                <span className="text-amber-400/90 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  Simulación
                </span>
              ) : connection.status === 'connected' ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  TikTok LIVE Real
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  Desconectado
                </span>
              )}
              <span className="text-slate-600">·</span>
              <span className="font-mono text-slate-400 truncate max-w-[120px]">
                @{connection.username}
              </span>
            </div>
          )}
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* User Account / Auth Button */}
          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              title={currentUser ? `Cuenta: @${currentUser.username}` : 'Iniciar Sesión / Cuenta'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap"
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline max-w-[100px] truncate">
                {currentUser ? `@${currentUser.username}` : 'Cuenta'}
              </span>
            </button>
          )}

          {/* OBS Quick URL button */}
          <button
            onClick={onOpenObsModal}
            title="Abrir URL para OBS Studio"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Fuente OBS</span>
          </button>

          {/* Master Automation Toggle */}
          <button
            onClick={onToggleMaster}
            title={masterEnabled ? 'Pausar motor de automatizaciones' : 'Reanudar motor de automatizaciones'}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all whitespace-nowrap ${
              masterEnabled
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25 shadow-sm shadow-emerald-950/30'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25'
            }`}
          >
            <Power className={`w-3.5 h-3.5 ${masterEnabled ? 'text-emerald-400' : 'text-rose-400'}`} />
            <span>{masterEnabled ? 'Motor Activo' : 'Motor Pausado'}</span>
          </button>
        </div>
      </div>

      {/* Mobile nav scrollbar */}
      <div className="md:hidden flex items-center gap-1 px-4 py-2 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 ${
              currentTab === item.id
                ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-700/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
