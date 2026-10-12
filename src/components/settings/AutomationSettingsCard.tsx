import React from 'react';
import { ShieldAlert, Monitor } from 'lucide-react';
import { AppSettings } from '../../types';

interface AutomationSettingsCardProps {
  formData: AppSettings;
  setFormData: React.Dispatch<React.SetStateAction<AppSettings>>;
  obsTestResult: string | null;
  onTestObs: () => void;
}

export const AutomationSettingsCard: React.FC<AutomationSettingsCardProps> = ({
  formData,
  setFormData,
  obsTestResult,
  onTestObs,
}) => {
  return (
    <>
      {/* Rate Limits & Stream Protection */}
      <div className="p-5 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Protección Anti-Spam y Límites de Frecuencia
          </span>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1">
              Límite Global de Triggers por Minuto
            </label>
            <input
              type="number"
              min="10"
              max="300"
              value={formData.globalRateLimitPerMinute}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  globalRateLimitPerMinute: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Evita que una avalancha repentina sature tu pantalla u OBS Studio.
            </p>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">
              Límite de Retención de Historial (Registros)
            </label>
            <input
              type="number"
              min="50"
              max="1000"
              value={formData.historyRetentionCount}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  historyRetentionCount: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">
              Objetivo de Meta de Diamantes (Barra de Meta en OBS)
            </label>
            <input
              type="number"
              min="1"
              max="1000000"
              value={formData.goalTargetDiamonds ?? 500}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  goalTargetDiamonds: Math.max(1, Number(e.target.value)),
                }))
              }
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Define el número de diamantes objetivo que se mostrará en la barra de progreso del overlay de OBS.
            </p>
          </div>
        </div>
      </div>

      {/* OBS Studio WebSocket v5 Bridge Configuration */}
      <div className="p-5 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <Monitor className="w-4 h-4 text-cyan-400" />
            Integración con OBS WebSocket v5
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enableObsWs"
              checked={formData.obsWebSocket.enabled}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  obsWebSocket: { ...prev.obsWebSocket, enabled: e.target.checked },
                }))
              }
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
            />
            <label htmlFor="enableObsWs" className="text-slate-200 cursor-pointer">
              Habilitar control remoto de escenas en OBS Studio
            </label>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Dirección WebSocket de OBS</label>
            <input
              type="text"
              value={formData.obsWebSocket.url}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  obsWebSocket: { ...prev.obsWebSocket, url: e.target.value },
                }))
              }
              placeholder="ws://127.0.0.1:4455"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Contraseña OBS (Opcional)</label>
            <input
              type="password"
              value={formData.obsWebSocket.password || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  obsWebSocket: { ...prev.obsWebSocket, password: e.target.value },
                }))
              }
              placeholder="••••••••"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onTestObs}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700 font-semibold text-[11px]"
            >
              Probar Protocolo OBS
            </button>
            {obsTestResult && (
              <span className="text-[11px] text-cyan-400 truncate">{obsTestResult}</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
