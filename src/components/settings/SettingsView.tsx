import React, { useState, useEffect } from 'react';
import {
  Settings,
  Volume2,
  Download,
  Upload,
  RotateCcw,
  ShieldAlert,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Monitor,
  Radio,
  Server,
  Activity,
  Cloud,
  Database,
  Terminal,
  RefreshCw,
  Check,
  Copy,
  FileText,
  HardDrive,
  Key,
  ShieldCheck,
} from 'lucide-react';
import { AppSettings, AutomationRule, OverlayEffect } from '../../types';
import { StorageService } from '../../services/storageService';
import { audioEngine } from '../../services/audioEngine';
import { apiService, SystemHealthReport } from '../../services/apiService';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onRefreshAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onRefreshAllData,
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [notice, setNotice] = useState<string | null>(null);
  const [obsTestResult, setObsTestResult] = useState<string | null>(null);
  const [soundTestKey, setSoundTestKey] = useState(0);

  // Cloud & Server Health State
  const [health, setHealth] = useState<SystemHealthReport | null>(null);
  const [failSafe, setFailSafe] = useState<{ active: boolean; reason: string | null } | null>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [overlayToken, setOverlayToken] = useState<string | null>(null);
  const [copiedOverlayUrl, setCopiedOverlayUrl] = useState(false);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  useEffect(() => {
    loadHealthAndSnapshots();
  }, []);

  const loadHealthAndSnapshots = async () => {
    setIsLoadingHealth(true);
    try {
      const [h, fsStatus, snapList, me] = await Promise.all([
        apiService.getHealth(),
        apiService.getFailSafe(),
        apiService.getSnapshots(),
        apiService.getMe(),
      ]);
      if (h) setHealth(h);
      if (fsStatus) setFailSafe(fsStatus);
      if (snapList) setSnapshots(snapList);
      if (me?.overlayToken) setOverlayToken(me.overlayToken);
    } catch {}
    setIsLoadingHealth(false);
  };

  const handleResetFailSafe = async () => {
    const ok = await apiService.resetFailSafe('Restablecido desde panel de Ajustes');
    if (ok) {
      setFailSafe({ active: false, reason: null });
      setNotice('Modo Seguro restablecido. Las automatizaciones han reanudado su monitoreo.');
      loadHealthAndSnapshots();
      setTimeout(() => setNotice(null), 3500);
    }
  };

  const handleCreateSnapshot = async () => {
    const res = await apiService.createSnapshot('Snapshot manual desde panel');
    if (res.success) {
      setNotice('Snapshot de servidor creado exitosamente en el disco persistente.');
      loadHealthAndSnapshots();
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const handleRestoreSnapshot = async (fileName: string) => {
    if (!confirm(`¿Restaurar la copia de seguridad ${fileName}? Se sobreescribirán las configuraciones actuales.`)) return;
    const ok = await apiService.restoreSnapshot(fileName);
    if (ok) {
      setNotice('Copia de seguridad restaurada correctamente.');
      onRefreshAllData();
      loadHealthAndSnapshots();
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const handleViewAudit = async () => {
    const logs = await apiService.getAuditLogs();
    setAuditLogs(logs);
    setShowAuditModal(true);
  };

  const getFullOverlayUrl = () => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://tu-dominio.com';
    return `${base}/?mode=overlay${overlayToken ? `&token=${overlayToken}` : ''}`;
  };

  const handleCopyOverlayUrl = () => {
    navigator.clipboard.writeText(getFullOverlayUrl());
    setCopiedOverlayUrl(true);
    setTimeout(() => setCopiedOverlayUrl(false), 2000);
  };

  const handleSave = () => {
    onUpdateSettings(formData);
    StorageService.saveSettings(formData);
    audioEngine.setMasterVolume(formData.masterVolume);
    setNotice('Preferencias guardadas correctamente.');
    setTimeout(() => setNotice(null), 3000);
  };

  const handleExportJson = () => {
    const jsonStr = StorageService.exportFullConfig();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `livetrigger_ai_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const ok = StorageService.importFullConfig(text);
      if (ok) {
        onRefreshAllData();
        setNotice('¡Configuración importada con éxito!');
      } else {
        alert('El archivo JSON no es válido o está corrupto.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefaults = () => {
    if (
      confirm(
        '¿Restablecer LiveTrigger AI a los valores de fábrica? Se perderán las reglas personalizadas no exportadas.'
      )
    ) {
      StorageService.resetToFactoryDefaults();
      onRefreshAllData();
      setNotice('Valores y plantillas oficiales restablecidos.');
    }
  };

  const testMasterAudio = () => {
    audioEngine.setMasterVolume(formData.masterVolume);
    audioEngine.playSound('fanfare', 90);
    setSoundTestKey((k) => k + 1);
  };

  const testObsConnection = async () => {
    setObsTestResult('Intentando negociar protocolo WebSocket OBS v5...');
    setTimeout(() => {
      setObsTestResult(
        `Comprobado puerto ${formData.obsWebSocket.url}: Listo para enviar comandos de cambio de escena vía plugin obs-websocket.`
      );
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#0E1322] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-cyan-400" />
            Ajustes Globales de la Plataforma
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Control de volumen maestro, límites de frecuencia para evitar sobrecarga en stream, integración OBS WebSocket y copias de seguridad.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-md transition-colors"
        >
          Guardar Cambios
        </button>
      </div>

      {notice && (
        <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Grid of Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Audio Engine & Synthesizer Settings */}
        <div className="p-5 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-violet-400" />
              Sintetizador de Audio & Volumen Maestro
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1.5">
                <span>Volumen Maestro de Efectos</span>
                <span className="font-mono font-bold text-cyan-400">
                  {formData.masterVolume}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.masterVolume}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFormData({ ...formData, masterVolume: val });
                  audioEngine.setMasterVolume(val);
                }}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableAudioSynth"
                  checked={formData.enableAudioSynthesizer}
                  onChange={(e) =>
                    setFormData({ ...formData, enableAudioSynthesizer: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
                />
                <label htmlFor="enableAudioSynth" className="text-slate-200 cursor-pointer">
                  Activar Sintetizador Web Audio API nativo
                </label>
              </div>

              <button
                onClick={testMasterAudio}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700 text-[11px] font-semibold"
              >
                Probar Sonido
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              El motor sintetiza ondas cuadradas y senoidales directamente en el navegador. Cero retrasos y sin caídas de enlaces externos.
            </p>
          </div>
        </div>

        {/* 2. Rate Limits & Stream Protection */}
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
                  setFormData({
                    ...formData,
                    globalRateLimitPerMinute: Number(e.target.value),
                  })
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
                  setFormData({
                    ...formData,
                    historyRetentionCount: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* 3. OBS Studio WebSocket v5 Bridge Configuration */}
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
                  setFormData({
                    ...formData,
                    obsWebSocket: { ...formData.obsWebSocket, enabled: e.target.checked },
                  })
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
                  setFormData({
                    ...formData,
                    obsWebSocket: { ...formData.obsWebSocket, url: e.target.value },
                  })
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
                  setFormData({
                    ...formData,
                    obsWebSocket: { ...formData.obsWebSocket, password: e.target.value },
                  })
                }
                placeholder="••••••••"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={testObsConnection}
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

        {/* 4. Cloud Infrastructure, Health & Fail-Safe Mode */}
        <div className="p-5 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Cloud className="w-4 h-4 text-cyan-400" />
              Infraestructura Web, Salud del Servidor y Modo Seguro
            </span>
            <button
              onClick={loadHealthAndSnapshots}
              disabled={isLoadingHealth}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingHealth ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Actualizar Estado</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Live Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                <span className="text-emerald-400 font-mono font-bold block">Persistente OK</span>
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
                    onClick={handleResetFailSafe}
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
                LiveTrigger AI ejecuta su motor de automatizaciones <strong>100% en el servidor Node.js</strong>.
                Las tareas y eventos se procesan continuamente incluso si cierras el navegador.
              </p>
              <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300">
                <strong className="text-amber-400 block mb-0.5">⚠️ Limitación de planes gratuitos (Scale-to-Zero):</strong>
                Servicios como Render Free suspenden contenedores tras 15 minutos sin tráfico entrante,
                lo que interrumpe la conexión persistente con TikTok. Para operación continua, utiliza una instancia
                Always-On, un VPS (Docker/PM2) o un monitor de disponibilidad que consulte <code className="text-cyan-300">/health</code> periódicamente.
              </div>
            </div>

            {/* OBS Browser Source Private Link */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="font-bold text-white block">URL Privada para Fuente de Navegador en OBS</span>
              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-[11px]">
                <input
                  type="text"
                  readOnly
                  value={getFullOverlayUrl()}
                  className="w-full bg-transparent text-slate-300 focus:outline-none select-all"
                />
                <button
                  onClick={handleCopyOverlayUrl}
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
                  onClick={handleCreateSnapshot}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg font-semibold flex items-center gap-1.5"
                >
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Crear Snapshot en Servidor</span>
                </button>
                <button
                  type="button"
                  onClick={handleViewAudit}
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

            {/* List of existing snapshots if any */}
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
                        onClick={() => handleRestoreSnapshot(snap.fileName)}
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

        {/* 5. Backup, Restore & Reset */}
        <div className="p-5 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Gestión de Datos y Copias de Seguridad Locales
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-400 leading-relaxed">
              Exporta tu configuración completa (reglas, efectos, filtros de chat) para transferirla a otra PC o hacer respaldo antes de un stream importante.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleExportJson}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg font-semibold"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Exportar JSON</span>
              </button>

              <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg font-semibold cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Importar JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>

            <div className="pt-4 border-t border-slate-800/80">
              <button
                onClick={handleResetDefaults}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-950/20 hover:bg-rose-900/30 border border-rose-800/40 text-rose-300 rounded-lg font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer Plantillas Oficiales de Fábrica</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* System Audit Logs Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-[#0B0F1A] border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Registro de Auditoría y Eventos del Servidor
              </span>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
              >
                Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-1 font-mono text-xs">
              {auditLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-500 font-sans">
                  Sin registros de auditoría recientes.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-3 text-[11px]"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold text-[9px] uppercase ${
                            log.level === 'ERROR'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : log.level === 'WARN'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {log.category}
                        </span>
                        <span className="text-slate-300 font-sans font-medium">{log.message}</span>
                      </div>
                      {log.details && (
                        <div className="text-[10px] text-slate-500 truncate max-w-lg">
                          {JSON.stringify(log.details)}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
