import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  Volume2,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Palette,
  Clock,
  Mic,
  Monitor,
} from 'lucide-react';
import { OverlayAnimationType, OverlayEffect, SoundPresetId } from '../../types';
import { ObsOverlayScreen } from '../overlay/ObsOverlayScreen';
import { eventBus } from '../../services/eventBus';
import { audioEngine } from '../../services/audioEngine';
import { StorageService } from '../../services/storageService';

interface EffectsViewProps {
  effects: OverlayEffect[];
  onUpdateEffects: (effects: OverlayEffect[]) => void;
  onOpenObsModal: () => void;
}

export const EffectsView: React.FC<EffectsViewProps> = ({
  effects,
  onUpdateEffects,
  onOpenObsModal,
}) => {
  const [selectedEffectId, setSelectedEffectId] = useState<string>(
    effects[0]?.id || 'eff-confetti-burst'
  );
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [soundTested, setSoundTested] = useState(false);

  const activeEffect = effects.find((e) => e.id === selectedEffectId) || effects[0];

  const handleUpdateActive = (partial: Partial<OverlayEffect>) => {
    if (!activeEffect) return;
    const updated = effects.map((e) =>
      e.id === activeEffect.id ? { ...e, ...partial } : e
    );
    onUpdateEffects(updated);
    StorageService.saveEffects(updated);
  };

  const testTriggerEffect = () => {
    if (!activeEffect) return;

    // Dispatch simulated test overlay
    eventBus.broadcast({
      type: 'TRIGGER_OVERLAY',
      payload: {
        effect: activeEffect,
        event: {
          id: 'test-' + Date.now(),
          type: 'gift',
          source: 'simulation',
          timestamp: Date.now(),
          user: {
            id: 'demo-user',
            username: 'alex_streamer',
            nickname: 'Alex Streamer',
          },
          data: {
            giftName: 'Galaxia Cósmica',
            diamondCount: 1000,
            repeatCount: 1,
            comment: '¡Sigan apoyando el directo!',
          },
        },
        formattedTitle: activeEffect.titleTemplate
          .replace('{user}', 'Alex Streamer')
          .replace('{amount}', '1')
          .replace('{gift}', 'Galaxia Cósmica')
          .replace('{diamonds}', '1000'),
        formattedSubtitle: activeEffect.subtitleTemplate
          .replace('{user}', 'Alex Streamer')
          .replace('{amount}', '1')
          .replace('{gift}', 'Galaxia Cósmica')
          .replace('{diamonds}', '1000'),
        ttsVoiceText: activeEffect.enableTTS
          ? activeEffect.ttsTemplate
              .replace('{user}', 'Alex Streamer')
              .replace('{amount}', '1')
              .replace('{gift}', 'Galaxia Cósmica')
          : undefined,
        timestamp: Date.now(),
      },
    });

    if (activeEffect.soundId) {
      audioEngine.playSound(activeEffect.soundId, activeEffect.soundVolume);
    }
  };

  const copyObsUrl = () => {
    const url = `${window.location.origin}${window.location.pathname}?mode=overlay`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const testSoundOnly = () => {
    if (activeEffect?.soundId) {
      audioEngine.playSound(activeEffect.soundId, activeEffect.soundVolume);
      setSoundTested(true);
      setTimeout(() => setSoundTested(false), 1500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#0E1322] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Editor de Efectos & Lienzo OBS
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Personaliza animaciones en pantalla, duraciones, colores, sintetizadores de audio y posición para tus alertas de streaming.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyObsUrl}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedUrl ? '¡URL Copiada!' : 'Copiar URL OBS'}</span>
          </button>
          <button
            onClick={onOpenObsModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-md transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Guía Fuente OBS</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Effect Selector & OBS 16:9 Canvas + Customizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Preset Selector (3 cols) */}
        <div className="lg:col-span-3 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
            Efectos Disponibles
          </span>
          <div className="space-y-1.5">
            {effects.map((eff) => (
              <button
                key={eff.id}
                onClick={() => setSelectedEffectId(eff.id)}
                className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                  selectedEffectId === eff.id
                    ? 'bg-[#12192B] border-cyan-500/60 shadow-lg text-white'
                    : 'bg-[#0B0F1A] border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{eff.name}</div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {eff.animationType} · {eff.durationMs / 1000}s
                  </span>
                </div>
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0 border"
                  style={{ backgroundColor: eff.primaryColor, borderColor: eff.secondaryColor }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Center: Live 16:9 OBS Screen Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              Lienzo En Vivo (Simulación OBS 16:9)
            </span>
            <button
              onClick={testTriggerEffect}
              className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-violet-400 hover:opacity-90 rounded-md shadow-sm transition-all"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Disparar Vista Previa</span>
            </button>
          </div>

          {/* 16:9 Virtual Stream Display */}
          <div className="relative aspect-video w-full rounded-2xl border-2 border-slate-800 bg-[#06080F] overflow-hidden shadow-2xl flex items-center justify-center">
            {/* Ambient Background Simulation */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-slate-950 to-black pointer-events-none" />
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            {/* Simulated Streamer Camera placeholder box in lower corner to give realistic streaming feel */}
            <div className="absolute bottom-4 right-4 w-28 h-18 rounded-lg border border-slate-700/60 bg-slate-900/80 flex flex-col items-center justify-center text-[10px] text-slate-500 pointer-events-none">
              <div className="w-2 h-2 rounded-full bg-rose-500 mb-1 animate-pulse" />
              <span>Cámara Streamer</span>
            </div>

            {/* Real Interactive OBS Screen Engine Mounted Inside */}
            <div className="absolute inset-0">
              <ObsOverlayScreen isPreview={true} />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/70 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Presiona "Disparar Vista Previa" para ver la animación y escuchar el audio.</span>
            <button
              onClick={testSoundOnly}
              className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{soundTested ? 'Sonando...' : 'Solo Sonido'}</span>
            </button>
          </div>
        </div>

        {/* Right: Effect Customizer Form (4 cols) */}
        {activeEffect && (
          <div className="lg:col-span-4 p-5 rounded-2xl bg-[#0B0F1A] border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
              <Palette className="w-4 h-4 text-violet-400" />
              Personalizar: {activeEffect.name}
            </h2>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Plantilla de Título</label>
                <input
                  type="text"
                  value={activeEffect.titleTemplate}
                  onChange={(e) => handleUpdateActive({ titleTemplate: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Plantilla de Subtítulo</label>
                <input
                  type="text"
                  value={activeEffect.subtitleTemplate}
                  onChange={(e) => handleUpdateActive({ subtitleTemplate: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-[11px]"
                />
              </div>

              {/* Color pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Color Primario</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeEffect.primaryColor}
                      onChange={(e) => handleUpdateActive({ primaryColor: e.target.value })}
                      className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-slate-300 uppercase">
                      {activeEffect.primaryColor}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Color Secundario</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeEffect.secondaryColor}
                      onChange={(e) => handleUpdateActive({ secondaryColor: e.target.value })}
                      className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-slate-300 uppercase">
                      {activeEffect.secondaryColor}
                    </span>
                  </div>
                </div>
              </div>

              {/* Position selector */}
              <div>
                <label className="block text-slate-400 mb-1">Ubicación en Pantalla</label>
                <select
                  value={activeEffect.position}
                  onChange={(e) =>
                    handleUpdateActive({
                      position: e.target.value as OverlayEffect['position'],
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="top">Superior Centrado (Recomendado)</option>
                  <option value="center">Centro Pantalla (Épico)</option>
                  <option value="bottom">Inferior Centrado</option>
                  <option value="top_left">Superior Izquierda</option>
                  <option value="top_right">Superior Derecha</option>
                  <option value="bottom_right">Inferior Derecha</option>
                </select>
              </div>

              {/* Duration slider */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Duración en Pantalla</span>
                  <span className="font-mono text-white">
                    {(activeEffect.durationMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="1500"
                  max="12000"
                  step="500"
                  value={activeEffect.durationMs}
                  onChange={(e) => handleUpdateActive({ durationMs: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* Sound & Volume */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="block text-slate-400 mb-1">Sonido Sintetizado Vinculado</label>
                <select
                  value={activeEffect.soundId}
                  onChange={(e) =>
                    handleUpdateActive({ soundId: e.target.value as SoundPresetId })
                  }
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="chime">Chime Neón (Melódico)</option>
                  <option value="fanfare">Fanfarria Real (Triada Mayor)</option>
                  <option value="laser">Láser Sci-Fi</option>
                  <option value="coin">Monedas Retro Arcade</option>
                  <option value="powerup">Power Up Ascendente</option>
                  <option value="explosion">Explosión con Sub-Grave</option>
                  <option value="airhorn">Stream Airhorn</option>
                </select>

                <div className="flex justify-between text-slate-400 pt-1">
                  <span>Volumen del Efecto</span>
                  <span className="font-mono text-white">{activeEffect.soundVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeEffect.soundVolume}
                  onChange={(e) => handleUpdateActive({ soundVolume: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* TTS Voice Toggle */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enableTtsCheckbox"
                    checked={activeEffect.enableTTS}
                    onChange={(e) => handleUpdateActive({ enableTTS: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
                  />
                  <label htmlFor="enableTtsCheckbox" className="text-slate-300 font-semibold cursor-pointer">
                    Habilitar Locución de Voz (TTS)
                  </label>
                </div>

                {activeEffect.enableTTS && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={activeEffect.ttsTemplate}
                      onChange={(e) => handleUpdateActive({ ttsTemplate: e.target.value })}
                      placeholder="¡Muchas gracias a {user} por el regalo {gift}!"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-[11px]"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dedicated Animation Testing Screen & Fast Verifier */}
      <div className="p-5 rounded-2xl bg-[#0B0F1A] border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Pantalla de Prueba y Verificación de Animaciones (OBS Studio)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Haz clic en cualquiera de las animaciones para probar la renderización de partículas, gráficos y sonido en tiempo real tanto en esta vista como en tu fuente de OBS.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Canal SSE / Broadcast Activo
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              id: 'confetti_burst',
              name: 'Lluvia Confeti',
              color: '#38bdf8',
              icon: '🎉',
              desc: 'Explosión multicolor',
            },
            {
              id: 'jackpot_gold',
              name: 'Jackpot Dorado',
              color: '#eab308',
              icon: '🪙',
              desc: 'Monedas de oro y brillo',
            },
            {
              id: 'rose_shower',
              name: 'Lluvia de Rosas',
              color: '#f43f5e',
              icon: '🌹',
              desc: 'Pétalos ascendentes',
            },
            {
              id: 'cyber_strike',
              name: 'Rayo Cibernético',
              color: '#06b6d4',
              icon: '⚡',
              desc: 'Láser cian & violeta',
            },
            {
              id: 'neon_pulse',
              name: 'Pulso Neón',
              color: '#a855f7',
              icon: '🔮',
              desc: 'Onda púrpura expansiva',
            },
            {
              id: 'streamer_card',
              name: 'Tarjeta VIP',
              color: '#ec4899',
              icon: '👑',
              desc: 'Insignia streamer limpia',
            },
          ].map((anim) => (
            <button
              key={anim.id}
              onClick={() => {
                const target = effects.find((e) => e.animationType === anim.id) || activeEffect;
                if (target) {
                  setSelectedEffectId(target.id);
                  // Dispatch test
                  eventBus.broadcast({
                    type: 'TRIGGER_OVERLAY',
                    payload: {
                      effect: { ...target, animationType: anim.id as any },
                      event: {
                        id: 'test-anim-' + Date.now(),
                        type: 'gift',
                        source: 'simulation',
                        timestamp: Date.now(),
                        user: { id: 'u-tester', username: 'stream_fan', nickname: 'Stream Fan' },
                        data: {
                          giftName: anim.name,
                          diamondCount: anim.id === 'jackpot_gold' ? 1000 : anim.id === 'rose_shower' ? 1 : 500,
                          repeatCount: 1,
                        },
                      },
                      formattedTitle: `¡Prueba de ${anim.name}!`,
                      formattedSubtitle: 'Stream Fan activó efecto en directo',
                      timestamp: Date.now(),
                    },
                  });
                  if (target.soundId) {
                    audioEngine.playSound(target.soundId, target.soundVolume);
                  }
                }
              }}
              className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-700 text-left transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="text-xl mb-1.5">{anim.icon}</div>
                <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {anim.name}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{anim.desc}</div>
              </div>
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60">
                <span className="text-[9px] font-mono text-slate-500 uppercase">{anim.id}</span>
                <span className="text-[10px] text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                  Probar →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
