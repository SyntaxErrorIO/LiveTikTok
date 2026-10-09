/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/layout/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { ConnectionsView } from './components/connections/ConnectionsView';
import { AutomationsView } from './components/automations/AutomationsView';
import { EffectsView } from './components/effects/EffectsView';
import { SimulatorView } from './components/simulator/SimulatorView';
import { HistoryView } from './components/history/HistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { ObsOverlayScreen } from './components/overlay/ObsOverlayScreen';
import { DeploymentModal } from './components/common/DeploymentModal';
import { AuthModal } from './components/common/AuthModal';
import { ShieldAlert } from 'lucide-react';
import {
  AppSettings,
  AutomationRule,
  ConnectionConfig,
  EngineStats,
  ExecutionLog,
  LeaderboardEntry,
  OverlayEffect,
  StreamCounter,
  TikTokEvent,
} from './types';
import { StorageService } from './services/storageService';
import { apiService, UserProfile } from './services/apiService';
import { eventBus } from './services/eventBus';
import { audioEngine } from './services/audioEngine';

export default function App() {
  // Check if opened as an OBS Browser Source overlay
  const isOverlayMode = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('mode') === 'overlay';

  // Core App State
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [effects, setEffects] = useState<OverlayEffect[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings());
  const [connection, setConnection] = useState<ConnectionConfig>(() => StorageService.getConnection());
  const [history, setHistory] = useState<ExecutionLog[]>([]);
  const [counters, setCounters] = useState<StreamCounter[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [engineStats, setEngineStats] = useState<EngineStats | null>(null);
  const [isObsModalOpen, setIsObsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [failSafe, setFailSafe] = useState<{ active: boolean; reason: string | null; triggeredAt: number | null } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persistent data from real server API (with local storage fallback)
  const refreshAllData = useCallback(async () => {
    try {
      const [
        fetchedRules,
        fetchedCounters,
        fetchedLeaderboard,
        fetchedLogs,
        fetchedSettings,
        fetchedConn,
        fetchedStats,
      ] = await Promise.all([
        apiService.getRules(),
        apiService.getCounters(),
        apiService.getLeaderboard(),
        apiService.getLogs(),
        apiService.getSettings(),
        apiService.getConnection(),
        apiService.getEngineStats(),
      ]);

      if (fetchedRules && fetchedRules.length > 0) setRules(fetchedRules);
      else setRules(StorageService.getRules());

      setEffects(StorageService.getEffects());

      if (fetchedCounters && fetchedCounters.length > 0) setCounters(fetchedCounters);
      if (fetchedLeaderboard) setLeaderboard(fetchedLeaderboard);
      if (fetchedLogs) {
        const seen = new Set<string>();
        const uniqueLogs = fetchedLogs.filter((item) => {
          if (!item.id || seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
        setHistory(uniqueLogs);
      }
      if (fetchedStats) setEngineStats(fetchedStats);

      if (fetchedSettings) {
        setSettings(fetchedSettings);
        audioEngine.setMasterVolume(fetchedSettings.masterVolume);
      } else {
        const localSettings = StorageService.getSettings();
        setSettings(localSettings);
        audioEngine.setMasterVolume(localSettings.masterVolume);
      }

      if (fetchedConn) setConnection(fetchedConn);
    } catch {
      // Fallback to local storage if API call is offline
      setRules(StorageService.getRules());
      setEffects(StorageService.getEffects());
      setSettings(StorageService.getSettings());
      setConnection(StorageService.getConnection());
      setHistory(StorageService.getHistory());
    }
  }, []);

  useEffect(() => {
    refreshAllData().then(() => setIsLoaded(true));
    apiService.getMe().then(setCurrentUser);
    apiService.getFailSafe().then(setFailSafe);
  }, [refreshAllData]);

  // Connect Server-Sent Events (SSE) listener
  useEffect(() => {
    const appendExecutionLog = (newLog: ExecutionLog) => {
      if (!newLog || !newLog.id) return;
      setHistory((prev) => {
        if (prev.some((item) => item.id === newLog.id)) {
          return prev;
        }
        return [newLog, ...prev].slice(0, 300);
      });
    };

    const unsubSSE = apiService.onSSEMessage((msg) => {
      if (msg.type === 'COUNTERS_UPDATED') {
        setCounters(msg.payload);
      } else if (msg.type === 'LEADERBOARD_UPDATED') {
        setLeaderboard(msg.payload);
      } else if (msg.type === 'CONNECTION_STATUS') {
        setConnection(msg.payload);
      } else if (msg.type === 'FAIL_SAFE_STATE') {
        setFailSafe(msg.payload);
      } else if (msg.type === 'EXECUTION_LOG') {
        appendExecutionLog(msg.payload);
        // Refresh engine stats
        apiService.getEngineStats().then((s) => s && setEngineStats(s));
      } else if (msg.type === 'MASTER_SWITCH') {
        setSettings((prev) => ({ ...prev, masterAutomationEnabled: msg.payload.enabled }));
      }
    });

    // Also listen to local bus for execution logs
    const unsubBus = eventBus.subscribe((msg) => {
      if (msg.type === 'EXECUTION_LOGGED') {
        appendExecutionLog(msg.payload);
      }
    });

    // Heartbeat to update stats
    const statsInterval = setInterval(() => {
      apiService.getEngineStats().then((s) => s && setEngineStats(s));
    }, 5000);

    return () => {
      unsubSSE();
      unsubBus();
      clearInterval(statsInterval);
    };
  }, []);

  // Master Automation Switch Toggle
  const handleToggleMaster = async () => {
    const nextState = !settings.masterAutomationEnabled;
    const updated = {
      ...settings,
      masterAutomationEnabled: nextState,
    };
    setSettings(updated);
    StorageService.saveSettings(updated);
    await apiService.toggleMasterAutomation(nextState);
  };

  // Quick Demo Trigger
  const handleFireQuickDemo = async () => {
    const demoUser = 'tiktok_supporter_' + Math.floor(100 + Math.random() * 900);
    const rawGift = {
      type: 'gift',
      user: {
        username: demoUser,
        nickname: 'Fan Destacado',
        badgeLevel: 12,
        isFollower: true,
      },
      gift: {
        giftName: 'Galaxia Neón',
        diamondCount: 1000,
        repeatCount: 1,
      },
    };

    await apiService.simulateEvent(rawGift);
    apiService.getEngineStats().then((s) => s && setEngineStats(s));
  };

  // Test Rule with custom simulated event
  const handleTestRuleWithEvent = async (rule: AutomationRule) => {
    const testUser = 'tester_vip_' + Math.floor(10 + Math.random() * 90);
    let rawPayload: any;

    switch (rule.triggerType) {
      case 'gift':
        rawPayload = {
          type: 'gift',
          user: { username: testUser, nickname: 'Donador VIP' },
          gift: {
            giftName: rule.conditions.giftName && rule.conditions.giftName !== 'all' ? rule.conditions.giftName : 'Galaxia',
            diamondCount: (rule.conditions.minDiamonds || 500),
            repeatCount: 1,
          },
        };
        break;
      case 'comment':
        rawPayload = {
          type: 'comment',
          user: { username: testUser, nickname: testUser },
          comment: rule.conditions.commentKeyword || '!alerta en directo',
        };
        break;
      case 'like':
        rawPayload = {
          type: 'like',
          user: { username: testUser, nickname: testUser },
          likeCount: rule.conditions.minLikeCount || 50,
        };
        break;
      case 'follow':
        rawPayload = {
          type: 'follow',
          user: { username: testUser, nickname: testUser },
        };
        break;
      default:
        rawPayload = {
          type: 'share',
          user: { username: testUser, nickname: testUser },
        };
    }

    await apiService.simulateEvent(rawPayload);
    apiService.getEngineStats().then((s) => s && setEngineStats(s));
  };

  const handleResetCounter = async (id: string) => {
    await apiService.resetCounter(id);
    const updated = await apiService.getCounters();
    setCounters(updated);
  };

  // If running in OBS Overlay mode, render clean transparent overlay screen
  if (isOverlayMode) {
    return <ObsOverlayScreen isPreview={false} />;
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center">
        <div className="text-cyan-400 font-mono text-sm">Iniciando motor LiveTrigger AI...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col antialiased selection:bg-violet-600 selection:text-white">
      {/* Top Bar navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        masterEnabled={settings.masterAutomationEnabled}
        onToggleMaster={handleToggleMaster}
        connection={connection}
        onOpenObsModal={() => setIsObsModalOpen(true)}
        currentUser={currentUser}
        failSafeActive={Boolean(failSafe?.active)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Fail-Safe Mode Alert Banner (Ensures no false indications of health) */}
      {failSafe?.active && (
        <div className="bg-amber-950/40 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>MODO SEGURO ACTIVO:</strong> {failSafe.reason || 'Conexión interrumpida con el proveedor'}. Automatizaciones pausadas para evitar falsos positivos y ejecuciones erróneas.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setCurrentTab('settings')}
                className="px-2.5 py-1 text-[11px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold"
              >
                Ver Diagnóstico
              </button>
              <button
                onClick={async () => {
                  await apiService.resetFailSafe();
                  setFailSafe(null);
                }}
                className="px-2.5 py-1 text-[11px] rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 font-bold"
              >
                Restablecer Modo Seguro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            rules={rules}
            connection={connection}
            settings={settings}
            history={history}
            counters={counters}
            leaderboard={leaderboard}
            engineStats={engineStats}
            onNavigate={setCurrentTab}
            onFireQuickTest={handleFireQuickDemo}
            onToggleMaster={handleToggleMaster}
            onResetCounter={handleResetCounter}
          />
        )}

        {currentTab === 'automations' && (
          <AutomationsView
            rules={rules}
            effects={effects}
            settings={settings}
            onUpdateRules={setRules}
            onTestRuleWithEvent={handleTestRuleWithEvent}
          />
        )}

        {currentTab === 'effects' && (
          <EffectsView
            effects={effects}
            onUpdateEffects={setEffects}
            onOpenObsModal={() => setIsObsModalOpen(true)}
          />
        )}

        {currentTab === 'simulator' && (
          <SimulatorView
            rules={rules}
            effects={effects}
            settings={settings}
            onRuleExecuted={() => {
              apiService.getLogs().then(setHistory);
              apiService.getCounters().then(setCounters);
              apiService.getLeaderboard().then(setLeaderboard);
              apiService.getEngineStats().then((s) => s && setEngineStats(s));
            }}
          />
        )}

        {currentTab === 'connections' && (
          <ConnectionsView
            connection={connection}
            onUpdateConnection={setConnection}
          />
        )}

        {currentTab === 'history' && (
          <HistoryView
            history={history}
            onClearHistory={async () => {
              await apiService.clearLogs();
              StorageService.clearHistory();
              setHistory([]);
            }}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={setSettings}
            onRefreshAllData={refreshAllData}
          />
        )}
      </main>

      {/* OBS Integration & Deployment Modal */}
      <DeploymentModal
        isOpen={isObsModalOpen}
        onClose={() => setIsObsModalOpen(false)}
      />

      {/* User Authentication & Account Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
      />

      {/* Quiet Footer */}
      <footer className="mt-auto border-t border-slate-800/60 py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">LiveTrigger AI</span>
          <span>·</span>
          <span>Motor de Automatización para TikTok LIVE y OBS Studio</span>
        </div>
        <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
          <span>Modo {connection.mode === 'simulation' ? 'Simulación Controlada' : 'TikTok Live Real'}</span>
          <span>·</span>
          <button
            onClick={() => setIsObsModalOpen(true)}
            className="text-cyan-400 hover:text-cyan-300"
          >
            Guía OBS Studio
          </button>
        </div>
      </footer>
    </div>
  );
}
