import React, { useState, useEffect } from 'react';
import {
  Zap,
  Gift,
  MessageSquare,
  Heart,
  UserPlus,
  Play,
  Activity,
  Layers,
  Sparkles,
  Radio,
  ArrowRight,
  TrendingUp,
  Target,
  Trophy,
  ShieldCheck,
  RotateCcw,
  Cpu,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  AppSettings,
  AutomationRule,
  ConnectionConfig,
  EngineStats,
  ExecutionLog,
  LeaderboardEntry,
  StreamCounter,
} from '../../types';
import { apiService, TestSuiteResult } from '../../services/apiService';

interface DashboardViewProps {
  rules: AutomationRule[];
  connection: ConnectionConfig;
  settings: AppSettings;
  history: ExecutionLog[];
  counters: StreamCounter[];
  leaderboard: LeaderboardEntry[];
  engineStats: EngineStats | null;
  onNavigate: (tab: string) => void;
  onFireQuickTest: () => void;
  onToggleMaster: () => void;
  onResetCounter: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  rules,
  connection,
  settings,
  history,
  counters,
  leaderboard,
  engineStats,
  onNavigate,
  onFireQuickTest,
  onToggleMaster,
  onResetCounter,
}) => {
  const [testResults, setTestResults] = useState<TestSuiteResult | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const activeRules = rules.filter((r) => r.enabled);
  const totalExecutions = history.filter((h) => h.overallStatus === 'executed').length;
  const cooldownBlocked = history.filter((h) => h.overallStatus === 'cooldown').length;
  const errorLogs = history.filter((h) => h.overallStatus === 'error' || h.errorDetails);

  // Categorize received events from history
  const giftCount = history.filter((h) => h.eventType === 'gift').length;
  const commentCount = history.filter((h) => h.eventType === 'comment').length;
  const likeCount = history.filter((h) => h.eventType === 'like').length;
  const followCount = history.filter((h) => h.eventType === 'follow').length;

  const recentHistory = history.slice(0, 6);

  const handleRunTests = async () => {
    setIsRunningTests(true);
    const res = await apiService.runAutomatedTests();
    setTestResults(res);
    setIsRunningTests(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Status Bar */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0E1322] via-[#12192B] to-[#0D1627] border border-slate-800 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg ${
                settings.masterAutomationEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
              }`}
            >
              <Zap className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Centro de Operaciones LiveTrigger AI
              </h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  settings.masterAutomationEnabled
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}
              >
                {settings.masterAutomationEnabled ? 'Motor Autónomo Activo' : 'Pausado'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Evaluación autónoma continua en servidor · {activeRules.length} reglas activas en persistencia
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
          <button
            onClick={handleRunTests}
            disabled={isRunningTests}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>{isRunningTests ? 'Verificando...' : 'Pruebas Automatizadas'}</span>
          </button>
          <button
            onClick={onFireQuickTest}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-md shadow-cyan-950/40 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Disparar Evento Demo</span>
          </button>
          <button
            onClick={onToggleMaster}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors ${
              settings.masterAutomationEnabled
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>{settings.masterAutomationEnabled ? 'Pausar Motor' : 'Reanudar'}</span>
          </button>
        </div>
      </div>

      {/* Automated Tests Banner Modal/Card */}
      {testResults && (
        <div className="p-4 rounded-xl bg-[#0F1424] border border-cyan-800/60 shadow-lg space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">
                Resultado de Pruebas del Motor ({testResults.passed}/{testResults.total} Pasadas)
              </span>
            </div>
            <button
              onClick={() => setTestResults(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cerrar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-xs">
            {testResults.results.map((r, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start gap-2">
                {r.status === 'passed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-slate-200 text-[11px]">{r.test}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{r.details}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0B0F1A] border border-slate-800/90 shadow-sm flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Eventos Procesados</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {history.length}
            </span>
            <span className="text-xs text-cyan-400 font-mono">sesión</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>{giftCount} regalos · {commentCount} chats</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0B0F1A] border border-slate-800/90 shadow-sm flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Acciones Ejecutadas</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {totalExecutions}
            </span>
            <span className="text-xs text-slate-400 font-mono">triggers</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span>{cooldownBlocked} filtrados por cooldown</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0B0F1A] border border-slate-800/90 shadow-sm flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Conexión TikTok LIVE</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-base font-bold text-white truncate">
              @{connection.username}
            </span>
          </div>
          <div className="mt-2 text-[11px] font-mono flex items-center gap-1.5">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                connection.status === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
            <span className="text-slate-400">
              {connection.mode === 'simulation' ? 'Simulación Activa' : 'Puente Real'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0B0F1A] border border-slate-800/90 shadow-sm flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Salud del Motor (Cola/Dedup)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-violet-400 tabular-nums">
              {engineStats?.totalDeduplicated ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-mono">deduplicados</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-violet-400" />
            <span>Cola pendiente: {engineStats?.queuePending ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Stream Goal Counters & Leaderboard Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Stream Counters (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Metas y Contadores de Transmisión</h2>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Actualización Automática</span>
          </div>

          <div className="space-y-3.5">
            {counters.map((c) => {
              const pct = Math.min(100, Math.round((c.current / c.target) * 100));
              return (
                <div key={c.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-300 font-bold tabular-nums">
                        {c.current.toLocaleString()} / {c.target.toLocaleString()} {c.unit}
                      </span>
                      <button
                        onClick={() => onResetCounter(c.id)}
                        title="Reiniciar contador"
                        className="text-slate-500 hover:text-white p-0.5"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Supporter Leaderboard (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Clasificación de Apoyadores (Top MVPs)</h2>
            </div>
          </div>

          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Aún no hay puntos registrados en la sesión.
              </div>
            ) : (
              leaderboard.slice(0, 4).map((entry, idx) => (
                <div
                  key={`${entry.userId || 'user'}-${idx}`}
                  className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-amber-400 text-xs w-4">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-white block">@{entry.username}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {entry.giftsCount} regalos enviados
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold text-cyan-300 tabular-nums">
                    {entry.points.toLocaleString()} pts
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Event Category Breakdown & Real-time Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Traffic breakdown & Health checks */}
        <div className="space-y-6">
          {/* Stream Status Card */}
          <div className="p-5 rounded-xl bg-[#0B0F1A] border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">Estado del Enlace TikTok</h2>
              </div>
              <button
                onClick={() => onNavigate('connections')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
              >
                <span>Ajustar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Modo de Operación</span>
                <span className="font-semibold text-slate-200">
                  {connection.mode === 'simulation'
                    ? 'Simulación Controlada'
                    : 'Puente WebSocket TikTok'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Canal / Creador</span>
                <span className="font-mono text-cyan-400 font-semibold">
                  @{connection.username}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Espectadores</span>
                <span className="font-mono text-slate-200 tabular-nums font-semibold">
                  {(connection.viewerCount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Latencia</span>
                <span className="font-mono text-emerald-400 tabular-nums font-semibold">
                  {connection.pingMs || 15} ms
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">ID de Sala</span>
              <span className="font-mono text-slate-500 text-[11px] truncate max-w-[150px]">
                {connection.roomId || 'N/A'}
              </span>
            </div>
          </div>

          {/* Event Distribution */}
          <div className="p-5 rounded-xl bg-[#0B0F1A] border border-slate-800">
            <h2 className="text-sm font-bold text-white mb-4">Eventos Recibidos en Sesión</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <Gift className="w-4 h-4 text-violet-400" />
                  <span>Regalos & Donaciones</span>
                </div>
                <span className="font-mono font-bold text-white tabular-nums text-xs">
                  {giftCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <span>Comentarios & Palabras Clave</span>
                </div>
                <span className="font-mono font-bold text-white tabular-nums text-xs">
                  {commentCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span>Taps / Ráfaga de Likes</span>
                </div>
                <span className="font-mono font-bold text-white tabular-nums text-xs">
                  {likeCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>Nuevos Seguidores & Subs</span>
                </div>
                <span className="font-mono font-bold text-white tabular-nums text-xs">
                  {followCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (2 spans): Active Automations & Live Activity Stream */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Rules Snapshot */}
          <div className="p-5 rounded-xl bg-[#0B0F1A] border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-bold text-white">Reglas Listas para Disparar</h2>
              </div>
              <button
                onClick={() => onNavigate('automations')}
                className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-medium"
              >
                <span>Administrar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-800/60">
              {rules.slice(0, 4).map((rule) => (
                <div
                  key={rule.id}
                  className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">
                        {rule.name}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                          rule.priority === 'high'
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            : rule.priority === 'medium'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                        }`}
                      >
                        {rule.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {rule.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right font-mono text-xs">
                    <div>
                      <div className="text-slate-300 font-bold tabular-nums">
                        {rule.executionsCount} disparos
                      </div>
                      <div className="text-[11px] text-slate-500">
                        cd: {rule.cooldownSeconds}s
                      </div>
                    </div>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        rule.enabled ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Activity Feed */}
          <div className="p-5 rounded-xl bg-[#0B0F1A] border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">Últimas Automatizaciones Ejecutadas</h2>
              </div>
              <button
                onClick={() => onNavigate('history')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
              >
                <span>Ver historial completo</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentHistory.length === 0 ? (
              <div className="py-12 text-center">
                <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">Aún no se han registrado eventos</p>
                <p className="text-xs text-slate-500 mt-1">
                  Usa el botón "Disparar Evento Demo" o abre el Simulador para probar tus reglas.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                {recentHistory.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="p-3 rounded-lg bg-[#0E1322] border border-slate-800/70 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          item.overallStatus === 'executed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : item.overallStatus === 'cooldown'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.eventType === 'gift' ? (
                          <Gift className="w-4 h-4" />
                        ) : item.eventType === 'comment' ? (
                          <MessageSquare className="w-4 h-4" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white truncate">
                            {item.senderName}
                          </span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            {item.source === 'simulation' ? '[SIMULADO]' : '[LIVE]'}
                          </span>
                        </div>
                        <p className="text-slate-400 truncate">{item.eventSummary}</p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right font-mono">
                      <div
                        className={`font-semibold ${
                          item.overallStatus === 'executed'
                            ? 'text-emerald-400'
                            : item.overallStatus === 'cooldown'
                            ? 'text-amber-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.overallStatus === 'executed'
                          ? 'EJECUTADO'
                          : item.overallStatus === 'cooldown'
                          ? 'COOLDOWN'
                          : 'SIN COINCIDENCIA'}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {item.executionTimeMs} ms
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent error alert (if any) */}
          {errorLogs.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 text-xs">
              <span className="font-bold text-rose-300">Aviso del Sistema: </span>
              <span className="text-rose-200">
                Se detectaron {errorLogs.length} eventos con avisos o reglas omitidas en la sesión.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
