import React, { useState } from 'react';
import {
  LiveGameId,
  LiveGameConfig,
  FoodRushSettings,
} from './types';
import { AVAILABLE_GAMES, DEFAULT_GAME_CONFIG, LIVE_MENU_ITEMS } from './GameRegistry';
import { FoodRushGame } from './foodRush/FoodRushGame';
import { GameStorageService } from '../../services/gameStorageService';
import { eventBus } from '../../services/eventBus';
import { apiService } from '../../services/apiService';
import {
  Gamepad2,
  ChefHat,
  Swords,
  Trophy,
  Sliders,
  Play,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  Flame,
  Heart,
  MessageSquare,
  Sparkles,
  Volume2,
  Tv,
  Smartphone,
  ShieldCheck,
  ScrollText,
  Maximize2,
} from 'lucide-react';

interface GamesViewProps {
  onOpenObsModal?: () => void;
}

export const GamesView: React.FC<GamesViewProps> = ({ onOpenObsModal }) => {
  const [config, setConfig] = useState<LiveGameConfig>(() => GameStorageService.getConfig());
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [aspectMode, setAspectMode] = useState<'9:16' | 'responsive'>(config.aspectRatio || '9:16');

  // Handle active game switch
  const handleSelectGame = (gameId: LiveGameId) => {
    const updated = { ...config, activeGameId: gameId };
    setConfig(updated);
    GameStorageService.saveConfig(updated);
  };

  // Save Settings
  const handleSaveSettings = () => {
    GameStorageService.saveConfig(config);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Reset top customer scores
  const handleResetScores = () => {
    if (confirm('¿Deseas reiniciar la tabla de Mejores Clientes del Día para la transmisión de hoy?')) {
      GameStorageService.resetTopCustomers();
    }
  };

  // Trigger test events: Flor ➔ Solo Jugo
  const handleSimulateFlorJugo = async () => {
    const randNum = Math.floor(10 + Math.random() * 90);
    const demoEvent: any = {
      type: 'gift',
      user: {
        id: `user-sim-${randNum}`,
        username: `cliente_jugo_${randNum}`,
        nickname: `Fan del Jugo ${randNum}`,
        isFollower: true,
      },
      gift: {
        giftName: 'Flor / Rosa',
        diamondCount: 1,
        repeatCount: 1,
      },
    };
    await apiService.simulateEvent(demoEvent);
  };

  // Trigger test events: Corazón ➔ Segundo de Chaufa Especial
  const handleSimulateCorazonChaufa = async () => {
    const randNum = Math.floor(10 + Math.random() * 90);
    const demoEvent: any = {
      type: 'gift',
      user: {
        id: `user-sim-${randNum}`,
        username: `chaufero_pro_${randNum}`,
        nickname: `Amante del Chaufa ${randNum}`,
        isFollower: true,
      },
      gift: {
        giftName: 'Corazón / Quereme',
        diamondCount: 5,
        repeatCount: 1,
      },
    };
    await apiService.simulateEvent(demoEvent);
  };

  // Trigger test events: VIP Lomo Saltado
  const handleSimulateLomoVip = async () => {
    const randNum = Math.floor(10 + Math.random() * 90);
    const demoEvent: any = {
      type: 'gift',
      user: {
        id: `user-vip-${randNum}`,
        username: `vip_master_${randNum}`,
        nickname: `Súper Donador VIP ${randNum}`,
        badgeLevel: 15,
        isFollower: true,
      },
      gift: {
        giftName: 'Donas Flambeadas VIP',
        diamondCount: 15,
        repeatCount: 1,
      },
    };
    await apiService.simulateEvent(demoEvent);
  };

  // Trigger test events: Banquete Imperial
  const handleSimulateBanquete = async () => {
    const randNum = Math.floor(10 + Math.random() * 90);
    const demoEvent: any = {
      type: 'gift',
      user: {
        id: `user-imperial-${randNum}`,
        username: `rey_leon_${randNum}`,
        nickname: `Donador Legendario ${randNum}`,
        badgeLevel: 30,
        isFollower: true,
      },
      gift: {
        giftName: 'León Dorado',
        diamondCount: 50,
        repeatCount: 1,
      },
    };
    await apiService.simulateEvent(demoEvent);
  };

  const handleSimulateLikes = async () => {
    const demoEvent: any = {
      type: 'like',
      user: {
        username: 'fan_tiktok_live',
        nickname: 'Fan de la Cocina',
      },
      likeCount: 15,
    };
    await apiService.simulateEvent(demoEvent);
  };

  const handleSimulateComment = async () => {
    const phrases = [
      '¡Un Chaufa bien servido con wantán por favor!',
      '¡Qué rico ese jugo helado!',
      '¡Con todo el fuego al wok chef!',
      '¡Saludos desde el chat en vivo!',
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    const demoEvent: any = {
      type: 'comment',
      user: {
        username: 'comentador_pro',
        nickname: 'Viewer TikTok',
      },
      comment: phrase,
    };
    await apiService.simulateEvent(demoEvent);
  };

  // OBS Overlay URL for Games
  const getObsUrl = () => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    return `${origin}/?mode=overlay&game=${config.activeGameId}&aspect=${aspectMode}`;
  };

  const handleCopyObsUrl = () => {
    navigator.clipboard.writeText(getObsUrl());
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gamepad2 className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Juegos Interactivos para TikTok LIVE
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Convierte los regalos, comentarios y likes de tu transmisión en mecánicas de juego en vivo para formato vertical 9:16 (TikTok Live Studio y OBS Studio).
          </p>
        </div>

        {/* OBS Browser Source quick copy pill */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyObsUrl}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition-all shadow-sm"
          >
            {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedUrl ? '¡Copiado!' : 'Copiar URL OBS 9:16'}</span>
          </button>
          <a
            href={getObsUrl()}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors border border-slate-700"
            title="Abrir en pestaña nueva para verificar vista previa"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir Overlay</span>
          </a>
        </div>
      </div>

      {/* Game Selector Cards (Modular architecture) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            1. Seleccionar Minijuego Activo en Pantalla
          </span>
          <span className="text-[11px] text-cyan-400 font-mono">
            Juego actual: {AVAILABLE_GAMES.find((g) => g.id === config.activeGameId)?.title}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {AVAILABLE_GAMES.map((game) => {
            const isSelected = config.activeGameId === game.id;
            const isAvailable = game.status === 'active';

            return (
              <div
                key={game.id}
                onClick={() => isAvailable && handleSelectGame(game.id)}
                className={`relative p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                    : isAvailable
                    ? 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 cursor-pointer'
                    : 'bg-slate-900/20 border-slate-800/50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {game.id === 'street_food_rush' && <ChefHat className="w-5 h-5 text-amber-400" />}
                      {game.id === 'boss_battle' && <Swords className="w-5 h-5 text-rose-400" />}
                      {game.id === 'gift_race' && <Trophy className="w-5 h-5 text-emerald-400" />}
                      {game.id === 'none' && <Tv className="w-5 h-5 text-slate-400" />}
                      <span className="font-bold text-sm text-white">{game.title.split('/')[0]}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950'
                          : isAvailable
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-slate-800/60 text-slate-500'
                      }`}
                    >
                      {game.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    {game.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                  <div className="flex flex-wrap gap-1">
                    {game.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Activo
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Workspace: Left Controls (Tabs: Simulator / Settings) + Right Live 9:16 Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col: Controls & Settings (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Subtabs for Simulator vs Config */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Simular Acciones</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Reglas & Carta</span>
            </button>
          </div>

          {/* TAB 1: Fast Simulator Action Panel */}
          {activeTab === 'preview' && (
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Simular Eventos del Juego
                </span>
                <span className="text-[10px] text-slate-400">
                  Prueba en tiempo real
                </span>
              </div>

              {/* Botones de prueba exactos pedidos por el usuario */}
              <div className="grid grid-cols-2 gap-2">
                {/* 1. Flor -> Solo Jugo */}
                <button
                  onClick={handleSimulateFlorJugo}
                  className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left flex flex-col justify-between transition-all group hover:border-cyan-400/50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg">🌹 ➔ 🥤</span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded">
                      1 Moneda
                    </span>
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                    Flor / Rosa
                  </span>
                  <span className="text-[10px] text-cyan-300 font-semibold mt-0.5">
                    "Solo Jugo" (Pantalla Completa)
                  </span>
                </button>

                {/* 2. Corazón / Quereme -> Segundo de Chaufa */}
                <button
                  onClick={handleSimulateCorazonChaufa}
                  className="p-3 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/50 text-left flex flex-col justify-between transition-all group shadow-sm shadow-amber-950/40 hover:border-amber-400"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg">💖 ➔ 🍲</span>
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/40">
                      5 Monedas
                    </span>
                  </div>
                  <span className="text-xs font-bold text-amber-200 group-hover:text-white">
                    Corazón / Quereme
                  </span>
                  <span className="text-[10px] text-amber-300 font-semibold mt-0.5">
                    "Segundo de Chaufa" VIP
                  </span>
                </button>

                {/* 3. VIP Donas -> Lomo Saltado */}
                <button
                  onClick={handleSimulateLomoVip}
                  className="p-3 rounded-xl bg-red-950/30 hover:bg-red-900/40 border border-red-500/40 text-left flex flex-col justify-between transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg">🔥 ➔ 🥩</span>
                    <span className="text-[10px] font-mono text-red-300 bg-red-950/80 px-1.5 py-0.5 rounded">
                      15 Monedas
                    </span>
                  </div>
                  <span className="text-xs font-bold text-red-200 group-hover:text-white">
                    Donas / VIP
                  </span>
                  <span className="text-[10px] text-red-300/80 mt-0.5">
                    Lomo Saltado Flambeado
                  </span>
                </button>

                {/* 4. Banquete Imperial 50 Monedas */}
                <button
                  onClick={handleSimulateBanquete}
                  className="p-3 rounded-xl bg-yellow-950/30 hover:bg-yellow-900/40 border border-yellow-500/40 text-left flex flex-col justify-between transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg">👑 ➔ 🦞</span>
                    <span className="text-[10px] font-mono text-yellow-300 bg-yellow-950/80 px-1.5 py-0.5 rounded">
                      50 Monedas
                    </span>
                  </div>
                  <span className="text-xs font-bold text-yellow-200 group-hover:text-white">
                    León / Dragón
                  </span>
                  <span className="text-[10px] text-yellow-300/80 mt-0.5">
                    Banquete Imperial Supremo
                  </span>
                </button>

                {/* 5. Likes */}
                <button
                  onClick={handleSimulateLikes}
                  className="p-3 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/40 text-left flex flex-col justify-between transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Heart className="w-5 h-5 text-rose-400 fill-rose-500" />
                    <span className="text-[10px] font-mono text-rose-300 bg-rose-950/80 px-1.5 py-0.5 rounded">
                      +15 Likes
                    </span>
                  </div>
                  <span className="text-xs font-bold text-rose-200 group-hover:text-white">
                    Fiebre de Likes
                  </span>
                  <span className="text-[10px] text-rose-300/80 mt-0.5">
                    Chef cocina a x2.2 veloz
                  </span>
                </button>

                {/* 6. Comentario */}
                <button
                  onClick={handleSimulateComment}
                  className="p-3 rounded-xl bg-indigo-950/30 hover:bg-indigo-900/40 border border-indigo-500/40 text-left flex flex-col justify-between transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <MessageSquare className="w-5 h-5 text-indigo-400" />
                    <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 px-1.5 py-0.5 rounded">
                      Comentario
                    </span>
                  </div>
                  <span className="text-xs font-bold text-indigo-200 group-hover:text-white">
                    Ánimo al Chef
                  </span>
                  <span className="text-[10px] text-indigo-300/80 mt-0.5">
                    Bocadillo de chat en vivo
                  </span>
                </button>
              </div>

              {/* Reset Session Leaderboard */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Ranking de clientes acumulado
                </span>
                <button
                  onClick={handleResetScores}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 border border-slate-700"
                >
                  <RotateCcw className="w-3 h-3 text-amber-400" />
                  <span>Reiniciar Ranking Hoy</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Rules & Gift Triggers Configuration */}
          {activeTab === 'settings' && (
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Configuración de Carta & Disparadores
                </span>
                {saveSuccess && (
                  <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> ¡Guardado!
                  </span>
                )}
              </div>

              {/* Carta en Pantalla Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ScrollText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Carta / Menú de Pedidos en Pantalla:</span>
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        foodRush: { ...prev.foodRush, menuDisplayMode: 'always' },
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg border text-center font-semibold transition-colors ${
                      config.foodRush.menuDisplayMode === 'always'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Siempre Visible
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        foodRush: { ...prev.foodRush, menuDisplayMode: 'compact' },
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg border text-center font-semibold transition-colors ${
                      config.foodRush.menuDisplayMode === 'compact'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Botón Retráctil
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        foodRush: { ...prev.foodRush, menuDisplayMode: 'hidden' },
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg border text-center font-semibold transition-colors ${
                      config.foodRush.menuDisplayMode === 'hidden'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Oculto
                  </button>
                </div>
              </div>

              {/* Fullscreen Showcase Takeover Toggle */}
              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-200 font-bold flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Mostrar en toda la pantalla lo que pidió</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.foodRush.fullScreenShowcaseEnabled !== false}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        foodRush: { ...prev.foodRush, fullScreenShowcaseEnabled: e.target.checked },
                      }))
                    }
                    className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                </label>

                {/* Duration */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Duración en pantalla completa:</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {config.foodRush.fullScreenDurationSec || 3.5}s
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={6}
                  step={0.5}
                  value={config.foodRush.fullScreenDurationSec || 3.5}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      foodRush: { ...prev.foodRush, fullScreenDurationSec: Number(e.target.value) },
                    }))
                  }
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Cooking Speed Settings */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span>Velocidad Base de Cocción:</span>
                  <span className="text-cyan-400 font-mono text-[11px]">
                    {config.foodRush.baseCookingTimeSec}s por orden
                  </span>
                </label>
                <input
                  type="range"
                  min={2}
                  max={6}
                  step={0.2}
                  value={config.foodRush.baseCookingTimeSec}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      foodRush: { ...prev.foodRush, baseCookingTimeSec: Number(e.target.value) },
                    }))
                  }
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Likes & Comments Toggle */}
              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300 font-medium">
                    Acelerar chef con Likes
                  </span>
                  <input
                    type="checkbox"
                    checked={config.foodRush.likesBoostEnabled}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        foodRush: { ...prev.foodRush, likesBoostEnabled: e.target.checked },
                      }))
                    }
                    className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300 font-medium">
                    Bocadillos con Comentarios del chat
                  </span>
                  <input
                    type="checkbox"
                    checked={config.foodRush.commentsBoostEnabled}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        foodRush: { ...prev.foodRush, commentsBoostEnabled: e.target.checked },
                      }))
                    }
                    className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                </label>
              </div>

              {/* Save Settings Button */}
              <button
                onClick={handleSaveSettings}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-950/40"
              >
                Guardar Ajustes del Juego
              </button>
            </div>
          )}

          {/* OBS Integration Instructions Card */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>Configuración en OBS o TikTok Live Studio</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              1. En OBS Studio o TikTok Live Studio, añade una fuente de <strong>Navegador (Browser Source)</strong>.<br />
              2. Pega la URL de arriba con resolución <strong>1080 x 1920</strong> (formato vertical 9:16).<br />
              3. El fondo es transparente y se actualiza en tiempo real conforme lleguen regalos o pruebas del simulador.
            </p>
          </div>
        </div>

        {/* Right Col: Live Game Viewport & Aspect Switcher (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Viewport Aspect Controls Bar */}
          <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Tv className="w-4 h-4 text-cyan-400" />
              <span>Vista Previa Interactiva</span>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setAspectMode('9:16')}
                className={`px-2.5 py-1 rounded font-mono font-bold transition-colors ${
                  aspectMode === '9:16'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Vertical 9:16 (Móvil / TikTok Studio)
              </button>
              <button
                onClick={() => setAspectMode('responsive')}
                className={`px-2.5 py-1 rounded font-mono font-bold transition-colors ${
                  aspectMode === 'responsive'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Adaptable Ancho
              </button>
            </div>
          </div>

          {/* Active Minigame Render Container */}
          <div className="w-full flex justify-center items-center py-2">
            {config.activeGameId === 'street_food_rush' ? (
              <FoodRushGame
                isPreview={true}
                aspectRatio={aspectMode}
                configOverride={config}
              />
            ) : config.activeGameId === 'none' ? (
              <div className="w-full max-w-[480px] h-[480px] bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <Tv className="w-12 h-12 text-slate-600 mb-3" />
                <span className="font-bold text-white text-sm mb-1">
                  Minijuegos Desactivados
                </span>
                <span className="text-xs text-slate-500 max-w-xs">
                  En este modo el overlay solo mostrará alertas convencionales de regalos y metas de diamantes.
                </span>
              </div>
            ) : (
              <div className="w-full max-w-[480px] h-[480px] bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <Sparkles className="w-12 h-12 text-amber-400 mb-3 animate-pulse" />
                <span className="font-bold text-white text-sm mb-1">
                  Juego en Desarrollo
                </span>
                <span className="text-xs text-slate-500 max-w-xs">
                  Este minijuego está preparado arquitectónicamente en el sistema y se activará en próximas versiones.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamesView;
