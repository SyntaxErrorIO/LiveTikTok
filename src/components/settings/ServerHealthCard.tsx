import React from 'react';
import {
  Cloud,
  RefreshCw,
  ShieldAlert,
  Server,
  HardDrive,
  FileText,
  Check,
  Copy,
} from 'lucide-react';
import { SystemHealthReport } from '../../services/apiService';

interface ServerHealthCardProps {
  health: SystemHealthReport | null;
  failSafe: { active: boolean; reason: string | null } | null;
  isLoadingHealth: boolean;
  onRefreshHealth: () => void;
  onResetFailSafe: () => void;
  fullOverlayUrl: string;
  copiedOverlayUrl: boolean;
  onCopyOverlayUrl: () => void;
  onCreateSnapshot: () => void;
  onViewAudit: () => void;
  snapshots: any[];
  onRestoreSnapshot: (fileName: string) => void;
}

export const ServerHealthCard: React.FC<ServerHealthCardProps> = ({
  health,
  failSafe,
  isLoadingHealth,
  onRefreshHealth,
  onResetFailSafe,
  fullOverlayUrl,
  copiedOverlayUrl,
  onCopyOverlayUrl,
  onCreateSnapshot,
  onViewAudit,
  snapshots,
  onRestoreSnapshot,
}) => {
  return (
    <div className="p-5 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <span className="text-sm font-bold text-white flex items-center gap-2">
          <Cloud className="w-4 h-4 text-cyan-400" />
          Infraestructura Web, Salud del Servidor y Modo Seguro
        </span>
        <button
          type="button"
          onClick={onRefreshHealth}
          disabled={isLoadingHealth}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
        >
          <RefreshCw className={`w-3 h-3 ${isLoadingHealth ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Actualizar Estado</span>
        </button>
      </div>

      <div className="space-y-4 text-xs">
        {/* Live Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-medium block">Estado General</span>
            <div className="flex items-center gap-1.5 font-bold font-mono">
              <div
                className={`w-2 h-2 rounded-full ${
                  health?.status === 'healthy'
                    ? 'bg-emerald-400'
                    : health?.status === 'fail_safe'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-400'
                }`}
              />
              <span className="capitalize text-white">
                {health?.status === 'fail_safe' ? 'Modo Seguro' : health?.status || 'Online'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-medium block">Tiempo Activo</span>
            <span className="text-white font-mono font-bold block">
              {health ? `${Math.floor(health.uptimeSeconds / 60)} min` : '--'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-medium block">Memoria RAM</span>
            <span className="text-white font-mono font-bold block">
              {health ? `${health.memory.rssMb} MB` : '--'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-medium block">Base de Datos</span>
            <span className="text-emerald-400 font-mono font-bold block">SQLite OK</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-medium block">Euler Stream</span>
            <span className={`font-mono font-bold block ${health?.connection?.eulerStreamConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
              {health?.connection?.eulerStreamConfigured ? 'Configurado' : 'Sin Configurar'}
            </span>
          </div>
        </div>

        {/* Fail-Safe Mode Status Box */}
        <div
          className={`p-3.5 rounded-xl border ${
            failSafe?.active
              ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
              : 'bg-slate-900/60 border-slate-800 text-slate-300'
          } space-y-2`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert
                className={`w-4 h-4 ${failSafe?.active ? 'text-amber-400' : 'text-slate-400'}`}
              />
              <span className="font-bold text-white text-xs">
                Modo Seguro contra Falsos Positivos: {failSafe?.active ? 'ACTIVO' : 'Standby'}
              </span>
            </div>
            {failSafe?.active && (
              <button
                type="button"
                onClick={onResetFailSafe}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[11px] rounded font-bold"
              >
                Restablecer Modo Seguro
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {failSafe?.active
              ? `Alerta: ${failSafe.reason}. Se han bloqueado las alertas visuales y sonoras para garantizar que no haya indicaciones erróneas en directo.`
              : 'Si se detecta una pérdida de conexión con TikTok, token caducado o error de red, el sistema entra en Modo Seguro automáticamente en lugar de fingir un estado operativo.'}
          </p>
        </div>

        {/* Hosting Sleep Advisory Notice */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-950/80 space-y-2">
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <Server className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Hosting en la Nube y Ejecución sin Pestaña Abierta</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            LiveTrigger AI ejecuta su motor de automatizaciones <strong>100% en el servidor Node.js</strong> con SQLite.
            Las tareas y eventos se procesan continuamente incluso si cierras el navegador.
          </p>
        </div>

        {/* OBS Browser Source Private Link */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span className="font-bold text-white block">URL Privada para Fuente de Navegador en OBS</span>
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-[11px]">
            <input
              type="text"
              readOnly
              value={fullOverlayUrl}
              className="w-full bg-transparent text-slate-300 focus:outline-none select-all"
            />
            <button
              type="button"
              onClick={onCopyOverlayUrl}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans font-semibold flex items-center gap-1 shrink-0"
            >
              {copiedOverlayUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedOverlayUrl ? 'Copiada' : 'Copiar'}</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-500">
            Esta URL utiliza un token de sesión seguro que no revela tu contraseña ni secretos maestros en OBS Studio.
          </p>
        </div>

        {/* Snapshots & Audit Log Actions */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCreateSnapshot}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg font-semibold flex items-center gap-1.5"
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Crear Snapshot en Servidor</span>
            </button>
            <button
              type="button"
              onClick={onViewAudit}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg font-semibold flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ver Auditoría de Servidor</span>
            </button>
          </div>

          {snapshots.length > 0 && (
            <span className="text-[11px] text-slate-500 font-mono">
              {snapshots.length} copia{snapshots.length === 1 ? '' : 's'} guardada{snapshots.length === 1 ? '' : 's'} en disco
            </span>
          )}
        </div>

        {/* List of existing snapshots */}
        {snapshots.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Copias de Seguridad en Disco Persistente
            </span>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="p-2 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="truncate">
                    <span className="text-white font-semibold truncate block">{snap.reason}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(snap.timestamp).toLocaleString()} · {Math.round(snap.sizeBytes / 1024)} KB
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRestoreSnapshot(snap.fileName)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-900 text-cyan-300 border border-slate-700 text-[10px] font-sans font-semibold shrink-0"
                  >
                    Restaurar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
