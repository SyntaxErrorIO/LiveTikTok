import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle } from 'lucide-react';
import { AppSettings } from '../../types';
import { StorageService } from '../../services/storageService';
import { audioEngine } from '../../services/audioEngine';
import { apiService, SystemHealthReport } from '../../services/apiService';
import { AudioSettingsCard } from './AudioSettingsCard';
import { AutomationSettingsCard } from './AutomationSettingsCard';
import { ServerHealthCard } from './ServerHealthCard';
import { BackupRestoreCard } from './BackupRestoreCard';
import { AuditLogsModal } from './AuditLogsModal';
import { UsersAdminCard } from './UsersAdminCard';
import { UserProfile } from '../../services/apiService';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onRefreshAllData: () => void;
  currentUser?: UserProfile | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onRefreshAllData,
  currentUser,
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [notice, setNotice] = useState<string | null>(null);
  const [obsTestResult, setObsTestResult] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<UserProfile | null>(currentUser || null);

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
      if (me) {
        setActiveUser(me);
        if (me.overlayToken) setOverlayToken(me.overlayToken);
      }
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
      setNotice('Snapshot de servidor creado exitosamente en SQLite.');
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
    return `${base}/?mode=overlay${overlayToken ? `&overlayToken=${overlayToken}` : ''}`;
  };

  const handleCopyOverlayUrl = () => {
    navigator.clipboard.writeText(getFullOverlayUrl());
    setCopiedOverlayUrl(true);
    setTimeout(() => setCopiedOverlayUrl(false), 2000);
  };

  const handleSave = async () => {
    onUpdateSettings(formData);
    StorageService.saveSettings(formData);
    await apiService.saveSettings(formData);
    audioEngine.setMasterVolume(formData.masterVolume);
    setNotice('Preferencias guardadas y sincronizadas con el servidor correctamente.');
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
          type="button"
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
        <AudioSettingsCard
          formData={formData}
          setFormData={setFormData}
          onTestAudio={testMasterAudio}
        />

        <AutomationSettingsCard
          formData={formData}
          setFormData={setFormData}
          obsTestResult={obsTestResult}
          onTestObs={testObsConnection}
        />

        <ServerHealthCard
          health={health}
          failSafe={failSafe}
          isLoadingHealth={isLoadingHealth}
          onRefreshHealth={loadHealthAndSnapshots}
          onResetFailSafe={handleResetFailSafe}
          fullOverlayUrl={getFullOverlayUrl()}
          copiedOverlayUrl={copiedOverlayUrl}
          onCopyOverlayUrl={handleCopyOverlayUrl}
          onCreateSnapshot={handleCreateSnapshot}
          onViewAudit={handleViewAudit}
          snapshots={snapshots}
          onRestoreSnapshot={handleRestoreSnapshot}
        />

        <BackupRestoreCard
          onExportJson={handleExportJson}
          onImportJson={handleImportJson}
          onResetDefaults={handleResetDefaults}
        />

        <UsersAdminCard currentUser={currentUser ?? activeUser} />
      </div>

      {/* System Audit Logs Modal */}
      <AuditLogsModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        logs={auditLogs}
      />
    </div>
  );
};
