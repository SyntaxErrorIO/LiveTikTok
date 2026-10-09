import React, { useState } from 'react';
import {
  Radio,
  Wifi,
  WifiOff,
  Activity,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Terminal,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import { ConnectionConfig } from '../../types';
import { tikTokService } from '../../services/tikTokService';

interface ConnectionsViewProps {
  connection: ConnectionConfig;
  onUpdateConnection: (conn: ConnectionConfig) => void;
}

export const ConnectionsView: React.FC<ConnectionsViewProps> = ({
  connection,
  onUpdateConnection,
}) => {
  const [username, setUsername] = useState(connection.username);
  const [bridgeUrl, setBridgeUrl] = useState(connection.bridgeServerUrl);
  const [connectorType, setConnectorType] = useState<'direct' | 'bridge'>(connection.connectorType || 'direct');
  const [autoReconnect, setAutoReconnect] = useState(connection.autoReconnect);
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleModeChange = async (mode: 'simulation' | 'real_tiktok') => {
    tikTokService.setMode(mode);
    const { apiService } = await import('../../services/apiService');
    await apiService.setConnectionMode(mode);
    onUpdateConnection(tikTokService.getConfig());
    setNotice(
      mode === 'simulation'
        ? 'Cambiado a Modo Simulación. Todos los eventos se procesarán en entorno controlado.'
        : 'Cambiado a Conexión Real. Puedes conectar directamente con tiktok-live-connector o mediante el puente WebSocket.'
    );
  };

  const handleConnect = async () => {
    tikTokService.updateCredentials(username, bridgeUrl, autoReconnect);
    const { apiService } = await import('../../services/apiService');
    await apiService.saveConnectionConfig({
      username,
      bridgeServerUrl: bridgeUrl,
      connectorType,
      autoReconnect,
    });
    const success = await apiService.connect();
    if (success) {
      const updated = await apiService.getConnection();
      if (updated) onUpdateConnection(updated);
      setNotice('Conexión con TikTok LIVE establecida correctamente.');
    } else {
      const updated = await apiService.getConnection();
      if (updated) onUpdateConnection(updated);
      setNotice('No se pudo establecer la conexión. Revisa los mensajes de error.');
    }
  };

  const handleDisconnect = async () => {
    tikTokService.disconnect();
    const { apiService } = await import('../../services/apiService');
    await apiService.disconnect();
    const updated = await apiService.getConnection();
    if (updated) onUpdateConnection(updated);
    setNotice('Conexión finalizada por el usuario.');
  };

  const handleTestPing = async () => {
    setIsTestingPing(true);
    const ms = await tikTokService.testPing();
    setIsTestingPing(false);
    onUpdateConnection(tikTokService.getConfig());
    setNotice(`Latencia comprobada: ${ms}ms de tiempo de respuesta.`);
  };

  const copyConnectorCommand = () => {
    navigator.clipboard.writeText('npx @tiktok-live/connector --user ' + (username || 'tu_usuario'));
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#0E1322] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-cyan-400" />
            Integración de Conexión TikTok LIVE
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configura el origen de los eventos en tiempo real. LiveTrigger AI opera de forma transparente distinguiendo datos reales de simulaciones.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => handleModeChange('simulation')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              connection.mode === 'simulation'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Modo Simulación
          </button>
          <button
            onClick={() => handleModeChange('real_tiktok')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              connection.mode === 'real_tiktok'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Conexión TikTok Real
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-lg bg-cyan-950/30 border border-cyan-800/50 text-xs text-cyan-200 flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-cyan-400 hover:text-cyan-200">
            Cerrar
          </button>
        </div>
      )}

      {/* Connection Status Banner */}
      <div
        className={`p-5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          connection.status === 'connected'
            ? connection.mode === 'simulation'
              ? 'bg-amber-950/15 border-amber-800/40 text-amber-200'
              : 'bg-emerald-950/15 border-emerald-800/40 text-emerald-200'
            : connection.status === 'connecting'
            ? 'bg-blue-950/20 border-blue-800/40 text-blue-200'
            : 'bg-slate-900/60 border-slate-800 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border ${
              connection.status === 'connected'
                ? connection.mode === 'simulation'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {connection.status === 'connected' ? (
              <Wifi className="w-5 h-5" />
            ) : (
              <WifiOff className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {connection.status === 'connected'
                  ? connection.mode === 'simulation'
                    ? 'Entorno de Simulación Activo'
                    : 'Conectado a TikTok LIVE'
                  : connection.status === 'connecting'
                  ? 'Estableciendo Conexión...'
                  : 'Desconectado'}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  connection.mode === 'simulation'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                    : 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30'
                }`}
              >
                {connection.mode === 'simulation'
                  ? 'SIMULACIÓN VERIFICADA'
                  : connectorType === 'bridge'
                  ? 'PUENTE WEBSOCKET'
                  : 'TIKTOK LIVE DIRECTO'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {connection.mode === 'simulation'
                ? 'Los eventos provienen del generador interno para pruebas y configuración de alertas seguras.'
                : connectorType === 'bridge'
                ? 'Los eventos son transmitidos por el puente WebSocket local desde la sala en vivo.'
                : 'Los eventos son leídos directamente por el backend con tiktok-live-connector y firma segura.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {connection.status === 'connected' ? (
            <>
              <button
                onClick={handleTestPing}
                disabled={isTestingPing}
                className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Activity className={`w-3.5 h-3.5 ${isTestingPing ? 'animate-spin' : ''}`} />
                <span>Probar Ping</span>
              </button>
              <button
                onClick={async () => {
                  await (await import('../../services/apiService')).apiService.simulateProviderDisconnect('Desconexión de prueba activada por el usuario');
                  setNotice('Simulación de corte de conexión enviada. El sistema registrará el evento e iniciará la espera progresiva.');
                }}
                className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg transition-colors"
                title="Prueba la detección de desconexión y el algoritmo de reconexión exponencial"
              >
                Simular Corte
              </button>
              <button
                onClick={handleDisconnect}
                className="flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg transition-colors"
              >
                Desconectar
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connection.status === 'connecting'}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  connection.status === 'connecting' ? 'animate-spin' : ''
                }`}
              />
              <span>
                {connection.status === 'connecting'
                  ? 'Verificando...'
                  : connection.mode === 'simulation'
                  ? 'Iniciar Simulación'
                  : 'Conectar a TikTok LIVE'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Connection Setup Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Form */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Parámetros del Canal y Servidor
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nombre de Usuario TikTok LIVE (@handle)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-mono text-slate-500">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="streamer_pro"
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                No se requiere contraseña ni acceso privado. Se lee el flujo público de regalos y chat.
              </p>
            </div>

            {connection.mode === 'real_tiktok' && (
              <div className="space-y-3 p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <label className="block text-xs font-semibold text-slate-200">
                  Método de Conexión Real
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConnectorType('direct')}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      connectorType === 'direct'
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>Conector Directo Node.js</span>
                      {connectorType === 'direct' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      tiktok-live-connector nativo en el servidor. No requiere daemon en localhost.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConnectorType('bridge')}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      connectorType === 'bridge'
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>Puente WebSocket</span>
                      {connectorType === 'bridge' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Daemon externo independiente en ws://localhost:21213.
                    </div>
                  </button>
                </div>

                {connectorType === 'direct' ? (
                  <div className="p-2.5 rounded-md bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
                    <span className="text-cyan-300 font-semibold">Euler Stream Sign API:</span> Configurable de forma segura en el backend mediante la variable de entorno <code className="text-amber-300">EULER_STREAM_API_KEY</code>. Nunca expuesta al cliente.
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Dirección del Puente WebSocket (Connector Daemon)
                    </label>
                    <input
                      type="text"
                      value={bridgeUrl}
                      onChange={(e) => setBridgeUrl(e.target.value)}
                      placeholder="ws://localhost:21213"
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-white font-mono focus:border-cyan-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Puerto WebSocket local por defecto: <code className="text-cyan-400">ws://localhost:21213</code>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="autoReconnectCheck"
                checked={autoReconnect}
                onChange={(e) => setAutoReconnect(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
              />
              <label htmlFor="autoReconnectCheck" className="text-xs text-slate-300 cursor-pointer">
                Reconexión automática tras cortes temporales de red o reinicio de stream
              </label>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={async () => {
                  tikTokService.updateCredentials(username, bridgeUrl, autoReconnect);
                  const { apiService } = await import('../../services/apiService');
                  await apiService.saveConnectionConfig({
                    username,
                    bridgeServerUrl: bridgeUrl,
                    connectorType,
                    autoReconnect,
                  });
                  const updated = await apiService.getConnection();
                  if (updated) onUpdateConnection(updated);
                  else onUpdateConnection(tikTokService.getConfig());
                  setNotice('Parámetros guardados y sincronizados con el backend.');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>

        {/* Integration Instructions & Transparency card */}
        <div className="p-5 rounded-xl bg-[#0B0F1A] border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white">¿Cómo funciona la conexión real?</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Por políticas de TikTok, la API oficial está restringida a partners empresariales y no ofrece WebSockets públicos de eventos de regalos para apps de terceros. Por ello, se emplea el protocolo comunitario local <code>tiktok-live-connector</code> sin pedir contraseñas.
            </p>

            <div className="p-3 rounded-lg bg-black/60 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-[10px]">
                <span className="flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-cyan-400" />
                  Terminal / CMD en tu PC
                </span>
                <button
                  onClick={copyConnectorCommand}
                  className="hover:text-white flex items-center gap-1 text-[10px]"
                >
                  {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedScript ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <div className="text-cyan-300 overflow-x-auto whitespace-pre">
                npx @tiktok-live/connector --user {username || 'tu_usuario'}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Garantía de Privacidad y Honestidad Técnica:</strong> Nunca solicitamos contraseñas ni sesiones de TikTok. Solo se escucha el flujo público de la sala. Si la conexión con el puente se interrumpe, el sistema aplica reconexión con espera progresiva (exponential backoff) hasta un máximo de 8 intentos.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
