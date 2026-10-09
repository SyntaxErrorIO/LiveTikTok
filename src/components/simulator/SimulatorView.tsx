import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Gift,
  MessageSquare,
  Heart,
  UserPlus,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Bot,
  Flame,
  ArrowRight,
  ShieldCheck,
  Terminal,
  AlertTriangle,
  Check,
  Activity,
  FileCode,
} from 'lucide-react';
import {
  AppSettings,
  AutomationRule,
  OverlayEffect,
  TikTokEvent,
} from '../../types';
import { RuleEngine, EvaluationResult } from '../../services/ruleEngine';
import { tikTokService } from '../../services/tikTokService';
import { apiService, TestSuiteResult } from '../../services/apiService';

interface SimulatorViewProps {
  rules: AutomationRule[];
  effects: OverlayEffect[];
  settings: AppSettings;
  onRuleExecuted: () => void;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({
  rules,
  effects,
  settings,
  onRuleExecuted,
}) => {
  // Custom simulator form state
  const [senderUser, setSenderUser] = useState('carlos_gamer99');
  const [selectedPresetGift, setSelectedPresetGift] = useState('Galaxia');
  const [customDiamonds, setCustomDiamonds] = useState(1000);
  const [repeatStreak, setRepeatStreak] = useState(1);
  const [commentText, setCommentText] = useState('¡Hola streamer! !alerta');
  const [likeQuantity, setLikeQuantity] = useState(25);

  // Auto-streamer bot
  const [isBotRunning, setIsBotRunning] = useState(false);
  const botIntervalRef = useRef<number | null>(null);

  // Local evaluation traces
  const [traces, setTraces] = useState<EvaluationResult[]>([]);

  // Automated Unit Test Suite State
  const [testResults, setTestResults] = useState<TestSuiteResult | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testNotice, setTestNotice] = useState<string | null>(null);
  const [showTestsModal, setShowTestsModal] = useState(false);

  const giftPresets = [
    { name: 'Rosa', diamonds: 1, icon: '🌹', color: '#f43f5e' },
    { name: 'Café', diamonds: 5, icon: '☕', color: '#d97706' },
    { name: 'Dona', diamonds: 30, icon: '🍩', color: '#ec4899' },
    { name: 'Corazón', diamonds: 100, icon: '💖', color: '#e11d48' },
    { name: 'Galaxia', diamonds: 1000, icon: '🌌', color: '#8b5cf6' },
    { name: 'León', diamonds: 29999, icon: '🦁', color: '#eab308' },
    { name: 'Universo', diamonds: 34999, icon: '🪐', color: '#06b6d4' },
  ];

  const handleSelectGiftPreset = (p: typeof giftPresets[0]) => {
    setSelectedPresetGift(p.name);
    setCustomDiamonds(p.diamonds);
  };

  const dispatchEvent = async (event: TikTokEvent) => {
    // Notify backend engine
    apiService.simulateEvent(event).catch(() => {});

    // Notify local tikTokService and run RuleEngine for instant trace visualizer
    tikTokService.injectManualEvent(event);
    const result = RuleEngine.evaluateEvent(event, rules, effects, settings);

    setTraces((prev) => [result, ...prev].slice(0, 50));
    onRuleExecuted();
  };

  const fireGiftEvent = () => {
    const event: TikTokEvent = {
      id: 'sim-evt-' + Date.now(),
      type: 'gift',
      source: 'simulation',
      timestamp: Date.now(),
      user: {
        id: 'usr-' + senderUser,
        username: senderUser,
        nickname: senderUser.toUpperCase(),
        badgeLevel: 15,
        isFollower: true,
      },
      data: {
        giftName: selectedPresetGift,
        diamondCount: customDiamonds,
        repeatCount: repeatStreak,
      },
    };
    dispatchEvent(event);
  };

  const fireCommentEvent = () => {
    const event: TikTokEvent = {
      id: 'sim-evt-' + Date.now(),
      type: 'comment',
      source: 'simulation',
      timestamp: Date.now(),
      user: {
        id: 'usr-' + senderUser,
        username: senderUser,
        nickname: senderUser,
        badgeLevel: 5,
        isSubscriber: true,
      },
      data: {
        comment: commentText,
      },
    };
    dispatchEvent(event);
  };

  const fireLikeEvent = () => {
    const event: TikTokEvent = {
      id: 'sim-evt-' + Date.now(),
      type: 'like',
      source: 'simulation',
      timestamp: Date.now(),
      user: {
        id: 'usr-' + senderUser,
        username: senderUser,
        nickname: senderUser,
      },
      data: {
        likeCount: likeQuantity,
      },
    };
    dispatchEvent(event);
  };

  const fireFollowEvent = () => {
    const event: TikTokEvent = {
      id: 'sim-evt-' + Date.now(),
      type: 'follow',
      source: 'simulation',
      timestamp: Date.now(),
      user: {
        id: 'usr-' + senderUser,
        username: senderUser,
        nickname: senderUser,
        isFollower: true,
      },
      data: {},
    };
    dispatchEvent(event);
  };

  // Auto-bot load tester
  const toggleAutoBot = () => {
    if (isBotRunning) {
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
      botIntervalRef.current = null;
      setIsBotRunning(false);
    } else {
      setIsBotRunning(true);
      botIntervalRef.current = window.setInterval(() => {
        const randomUsers = ['mariana_gamer', 'rodrigo_pro', 'tiktok_fan_01', 'laura_stream', 'david_vip'];
        const randomUser = randomUsers[Math.floor(Math.random() * randomUsers.length)];
        const choice = Math.random();

        if (choice < 0.5) {
          // Send gift
          const randomGift = giftPresets[Math.floor(Math.random() * giftPresets.length)];
          const evt: TikTokEvent = {
            id: 'bot-' + Date.now(),
            type: 'gift',
            source: 'simulation',
            timestamp: Date.now(),
            user: { id: randomUser, username: randomUser, nickname: randomUser },
            data: {
              giftName: randomGift.name,
              diamondCount: randomGift.diamonds,
              repeatCount: Math.floor(Math.random() * 3) + 1,
            },
          };
          dispatchEvent(evt);
        } else if (choice < 0.8) {
          // Send chat
          const chats = ['!alerta', 'saludos desde colombia', 'muy buen stream!', 'gg todos', 'vamos por la victoria'];
          const randomChat = chats[Math.floor(Math.random() * chats.length)];
          const evt: TikTokEvent = {
            id: 'bot-' + Date.now(),
            type: 'comment',
            source: 'simulation',
            timestamp: Date.now(),
            user: { id: randomUser, username: randomUser, nickname: randomUser },
            data: { comment: randomChat },
          };
          dispatchEvent(evt);
        } else {
          // Follow
          const evt: TikTokEvent = {
            id: 'bot-' + Date.now(),
            type: 'follow',
            source: 'simulation',
            timestamp: Date.now(),
            user: { id: randomUser, username: randomUser, nickname: randomUser },
            data: {},
          };
          dispatchEvent(evt);
        }
      }, 3500);
    }
  };

  useEffect(() => {
    return () => {
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
    };
  }, []);

  const runTestSuite = async () => {
    setIsRunningTests(true);
    setTestNotice('Ejecutando suite automatizada de pruebas unitarias en el servidor...');
    try {
      const results = await apiService.runAutomatedTests();
      setTestResults(results);
      setShowTestsModal(true);
      setTestNotice(
        results.success
          ? `¡Éxito total! ${results.passed}/${results.total} pruebas unitarias superadas.`
          : `Se detectaron fallos en ${results.total - results.passed} prueba(s).`
      );
    } catch (err: any) {
      setTestNotice('Error ejecutando pruebas: ' + err.message);
    } finally {
      setIsRunningTests(false);
    }
  };

  const triggerPresetMock = async (preset: 'rose' | 'galaxy' | 'lion' | 'universe' | 'comment_hype' | 'likes') => {
    setTestNotice(`Disparando evento ficticio preconfigurado: [${preset.toUpperCase()}]`);
    const res = await apiService.triggerMockPresetEvent(preset);
    if (res?.result?.event) {
      const result = RuleEngine.evaluateEvent(res.result.event, rules, effects, settings);
      setTraces((prev) => [result, ...prev].slice(0, 50));
      onRuleExecuted();
    }
  };

  const handleSimulateDisconnect = async () => {
    setTestNotice('Simulando caída imprevista del socket de TikTok LIVE...');
    await apiService.simulateProviderDisconnect('Corte de red simulado por prueba del usuario');
    setTestNotice('Desconexión registrada. El conector activó el algoritmo de reconexión exponencial y guardó el motivo.');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-5 rounded-2xl bg-[#0E1322] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Simulador de Pruebas & Trazabilidad
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Genera eventos controlados de TikTok LIVE para probar la evaluación de reglas, tiempos de enfriamiento y disparo de efectos visuales sin necesidad de estar transmitiendo en vivo.
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={runTestSuite}
            disabled={isRunningTests}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg border border-cyan-500/50 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 transition-all shadow-sm"
          >
            <Activity className={`w-4 h-4 ${isRunningTests ? 'animate-spin' : ''}`} />
            <span>{isRunningTests ? 'Ejecutando Pruebas...' : 'Ejecutar Pruebas Unitarias'}</span>
          </button>

          <button
            onClick={toggleAutoBot}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
              isBotRunning
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md'
                : 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 hover:bg-indigo-600/40'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>{isBotRunning ? 'Detener Bot' : 'Bot de Estrés'}</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {testNotice && (
        <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/60 text-xs text-cyan-200 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{testNotice}</span>
          </div>
          <button onClick={() => setTestNotice(null)} className="text-cyan-400 hover:text-white font-semibold text-[11px] ml-3">
            Cerrar
          </button>
        </div>
      )}

      {/* Quick Mock Events & Disconnect Verification Strip */}
      <div className="p-4 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            Escenarios de Prueba Verificables (Eventos Ficticios & Resiliencia)
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            Prueba regalos de alto valor, comandos y tolerancia a fallos
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button
            onClick={() => triggerPresetMock('rose')}
            className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-700 text-left transition-all"
          >
            <div className="text-xs font-bold text-rose-400">🌹 Rosa (1💎)</div>
            <div className="text-[10px] text-slate-400">Alerta sutil</div>
          </button>
          <button
            onClick={() => triggerPresetMock('galaxy')}
            className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-700 text-left transition-all"
          >
            <div className="text-xs font-bold text-violet-400">🌌 Galaxia (1K💎)</div>
            <div className="text-[10px] text-slate-400">Efecto cósmico</div>
          </button>
          <button
            onClick={() => triggerPresetMock('lion')}
            className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-700 text-left transition-all"
          >
            <div className="text-xs font-bold text-amber-400">🦁 León (30K💎)</div>
            <div className="text-[10px] text-slate-400">Rugido y jackpot</div>
          </button>
          <button
            onClick={() => triggerPresetMock('universe')}
            className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-700 text-left transition-all"
          >
            <div className="text-xs font-bold text-cyan-400">🪐 Universo (35K💎)</div>
            <div className="text-[10px] text-slate-400">Premio estelar</div>
          </button>
          <button
            onClick={() => triggerPresetMock('comment_hype')}
            className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-700 text-left transition-all"
          >
            <div className="text-xs font-bold text-emerald-400">💬 !alerta Chat</div>
            <div className="text-[10px] text-slate-400">Comando de texto</div>
          </button>
          <button
            onClick={handleSimulateDisconnect}
            className="p-2.5 rounded-lg border border-amber-900/40 bg-amber-950/20 hover:bg-amber-950/40 hover:border-amber-700/60 text-left transition-all"
          >
            <div className="text-xs font-bold text-amber-300">🔌 Caída Proveedor</div>
            <div className="text-[10px] text-amber-200/70">Test reconexión</div>
          </button>
        </div>
      </div>

      {/* Unit Test Results Modal / Drawer */}
      {showTestsModal && testResults && (
        <div className="p-5 rounded-2xl bg-[#090D17] border border-cyan-500/40 space-y-4 shadow-2xl animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                testResults.success ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}>
                {testResults.passed}/{testResults.total}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Informe de Pruebas Unitarias del Motor (Automatizado)
                </h3>
                <span className="text-[11px] text-slate-400">
                  {testResults.success ? 'Todas las pruebas han sido verificadas exitosamente.' : 'Algunas pruebas requieren atención.'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowTestsModal(false)}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800"
            >
              Cerrar Informe
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {testResults.results.map((res, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5 text-xs"
              >
                {res.status === 'passed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-200">{res.test}</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{res.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Workbench Layout: Left Controls (5 cols) & Right Trace Log (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Event Generators */}
        <div className="lg:col-span-5 space-y-4">
          {/* User Identity settings for tests */}
          <div className="p-4 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-white block">Usuario Simulado</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">@</span>
              <input
                type="text"
                value={senderUser}
                onChange={(e) => setSenderUser(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* 1. Gift Simulator Card */}
          <div className="p-5 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Gift className="w-4 h-4 text-violet-400" />
                Simulador de Regalos TikTok
              </span>
              <span className="text-[10px] font-mono text-amber-400">[SIMULACIÓN]</span>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                Regalos Populares de TikTok
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {giftPresets.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handleSelectGiftPreset(p)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      selectedPresetGift === p.name
                        ? 'bg-slate-800 border-cyan-500/80 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-base">{p.icon}</div>
                    <div className="text-[10px] font-bold truncate mt-0.5">{p.name}</div>
                    <div className="text-[9px] font-mono text-slate-500">{p.diamonds}💎</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Diamonds & Repeat count */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Diamantes (💎)</label>
                <input
                  type="number"
                  min="1"
                  value={customDiamonds}
                  onChange={(e) => setCustomDiamonds(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Racha / Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={repeatStreak}
                  onChange={(e) => setRepeatStreak(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>
            </div>

            <button
              onClick={fireGiftEvent}
              className="w-full py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-violet-400 to-cyan-400 hover:opacity-90 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Gift className="w-4 h-4 fill-current" />
              <span>Disparar Regalo: {repeatStreak}x {selectedPresetGift} ({customDiamonds}💎)</span>
            </button>
          </div>

          {/* 2. Chat / Comment Simulator Card */}
          <div className="p-5 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                Simulador de Mensajes de Chat
              </span>
              <span className="text-[10px] font-mono text-amber-400">[SIMULACIÓN]</span>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Texto del Mensaje</label>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Escribe un mensaje de prueba..."
                className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              {['!alerta', '!ruleta', 'gg streamer'].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => setCommentText(cmd)}
                  className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700"
                >
                  {cmd}
                </button>
              ))}
            </div>

            <button
              onClick={fireCommentEvent}
              className="w-full py-2 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span>Enviar Mensaje de Chat</span>
            </button>
          </div>

          {/* 3. Likes & Follow Quick Taps */}
          <div className="p-4 rounded-xl bg-[#0B0F1A] border border-slate-800 flex gap-3">
            <button
              onClick={fireLikeEvent}
              className="flex-1 p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/50 text-left transition-all group"
            >
              <Heart className="w-4 h-4 text-rose-500 mb-1 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white">+25 Likes (Taps)</div>
              <div className="text-[10px] text-slate-500">Ráfaga de pantalla</div>
            </button>

            <button
              onClick={fireFollowEvent}
              className="flex-1 p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-left transition-all group"
            >
              <UserPlus className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white">Nuevo Seguidor</div>
              <div className="text-[10px] text-slate-500">Alerta de follow</div>
            </button>
          </div>
        </div>

        {/* Right Column: Execution Trace Log */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[#0B0F1A] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">
                  Trazabilidad de Evaluación en Tiempo Real
                </h2>
              </div>
              <button
                onClick={() => setTraces([])}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              Observa paso a paso qué condiciones evaluó el motor, qué reglas coincidieron y qué acciones se dispararon:
            </p>

            {traces.length === 0 ? (
              <div className="py-24 text-center">
                <Zap className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-400">Sin eventos evaluados</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Dispara un regalo o mensaje con los botones de la izquierda para ver el análisis en tiempo real.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {traces.map((trace, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#0E1322] border border-slate-800/90 text-xs space-y-2.5"
                  >
                    {/* Event Summary Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            trace.overallStatus === 'executed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : trace.overallStatus === 'cooldown'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {trace.overallStatus === 'executed'
                            ? 'ACCIONES DISPARADAS'
                            : trace.overallStatus === 'cooldown'
                            ? 'EN COOLDOWN'
                            : 'SIN DISPARO'}
                        </span>
                        <span className="font-semibold text-white">
                          @{trace.event.user.username}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ({trace.event.type.toUpperCase()})
                        </span>
                      </div>
                      <span className="font-mono text-slate-500 text-[11px]">
                        {trace.executionTimeMs} ms
                      </span>
                    </div>

                    {/* Matched Rules Breakdown */}
                    <div className="space-y-1.5 pt-1">
                      {trace.matchedRules.length === 0 ? (
                        <div className="text-[11px] text-slate-500 italic pl-2 border-l border-slate-800">
                          Ninguna regla activa coincidió con las condiciones de este evento.
                        </div>
                      ) : (
                        trace.matchedRules.map((m, mIdx) => (
                          <div
                            key={mIdx}
                            className="p-2 rounded bg-slate-900/80 border border-slate-800/60 flex items-start gap-2"
                          >
                            {m.status === 'executed' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            ) : m.status === 'cooldown_blocked' ? (
                              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-200">
                                  {m.rule.name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {m.actionsExecuted} acciones
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">{m.reason}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
