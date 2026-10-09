import React, { useState } from 'react';
import { X, Sparkles, Volume2, Gift, Play, Check, Flame } from 'lucide-react';
import { AutomationRule, OverlayEffect, SoundPresetId, OverlayAnimationType } from '../../types';
import { audioEngine } from '../../services/audioEngine';

interface QuickGiftAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRule: (rule: AutomationRule) => void;
  effects: OverlayEffect[];
}

interface GiftPreset {
  name: string;
  diamonds: number;
  icon: string;
  defaultAnimation: OverlayAnimationType;
  defaultSound: SoundPresetId;
  defaultMessage: string;
}

const GIFT_PRESETS: GiftPreset[] = [
  {
    name: 'Rosa',
    diamonds: 1,
    icon: '🌹',
    defaultAnimation: 'rose_shower',
    defaultSound: 'chime',
    defaultMessage: '¡Gracias {user} por la Rosa! 🌹',
  },
  {
    name: 'Corazón',
    diamonds: 1,
    icon: '💖',
    defaultAnimation: 'neon_pulse',
    defaultSound: 'powerup',
    defaultMessage: '¡{user} envió amor con un Corazón! 💖',
  },
  {
    name: 'Donut',
    diamonds: 30,
    icon: '🍩',
    defaultAnimation: 'confetti_burst',
    defaultSound: 'coin',
    defaultMessage: '¡{user} donó un Donut delicioso! 🍩',
  },
  {
    name: 'Cohete',
    diamonds: 500,
    icon: '🚀',
    defaultAnimation: 'cyber_strike',
    defaultSound: 'laser',
    defaultMessage: '🚀 ¡Despegue espacial! {user} lanzó un Cohete ({diamonds} 💎)',
  },
  {
    name: 'Galaxia',
    diamonds: 1000,
    icon: '🌌',
    defaultAnimation: 'confetti_burst',
    defaultSound: 'fanfare',
    defaultMessage: '🌌 ¡ALERTA ÉPICA! {user} envió una Galaxia Neón ({diamonds} 💎)',
  },
  {
    name: 'León',
    diamonds: 29999,
    icon: '🦁',
    defaultAnimation: 'jackpot_gold',
    defaultSound: 'airhorn',
    defaultMessage: '🦁 ¡RUGIDO LEGENDARIO! {user} desató el León Supremo ({diamonds} 💎)',
  },
  {
    name: 'Universo',
    diamonds: 34999,
    icon: '🪐',
    defaultAnimation: 'jackpot_gold',
    defaultSound: 'fanfare',
    defaultMessage: '🪐 ¡EL UNIVERSO ENTERO! {user} es el MVP de la sesión ({diamonds} 💎)',
  },
];

const SOUND_PRESETS: { id: SoundPresetId; name: string }[] = [
  { id: 'chime', name: 'Campana Suave (Chime)' },
  { id: 'fanfare', name: 'Fanfarria Triunfal' },
  { id: 'laser', name: 'Disparo Láser Cyber' },
  { id: 'coin', name: 'Moneda / Recompensa' },
  { id: 'powerup', name: 'Power Up Arcade' },
  { id: 'airhorn', name: 'Bocina de Hype (Airhorn)' },
  { id: 'cyber_pulse', name: 'Pulso Futurista' },
  { id: 'notification', name: 'Notificación VIP' },
  { id: 'explosion', name: 'Explosión de Hype' },
];

export const QuickGiftAlertModal: React.FC<QuickGiftAlertModalProps> = ({
  isOpen,
  onClose,
  onSaveRule,
  effects,
}) => {
  const [selectedGift, setSelectedGift] = useState<GiftPreset>(GIFT_PRESETS[0]);
  const [customGiftName, setCustomGiftName] = useState('');
  const [customDiamonds, setCustomDiamonds] = useState(1);
  const [isCustom, setIsCustom] = useState(false);

  const [soundId, setSoundId] = useState<SoundPresetId>('chime');
  const [volume, setVolume] = useState(80);
  const [message, setMessage] = useState(GIFT_PRESETS[0].defaultMessage);
  const [enableTTS, setEnableTTS] = useState(true);
  const [cooldownSec, setCooldownSec] = useState(3);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: GiftPreset) => {
    setSelectedGift(preset);
    setIsCustom(false);
    setSoundId(preset.defaultSound);
    setMessage(preset.defaultMessage);
  };

  const playPreviewSound = (sId: SoundPresetId) => {
    audioEngine.playSound(sId, volume);
  };

  const handleSave = () => {
    const giftName = isCustom ? customGiftName.trim() || 'Regalo' : selectedGift.name;
    const diamonds = isCustom ? customDiamonds : selectedGift.diamonds;

    // Pick matching or default effect
    const effect =
      effects.find((e) => e.animationType === selectedGift.defaultAnimation) ||
      effects[0] || {
        id: 'eff-quick-alert',
        name: `Efecto ${giftName}`,
        animationType: selectedGift.defaultAnimation,
        titleTemplate: `¡REGALO DE TIKTOK: ${giftName.toUpperCase()}!`,
        subtitleTemplate: '{user} envió {amount}x {gift}',
        primaryColor: diamonds >= 1000 ? '#eab308' : '#f43f5e',
        secondaryColor: '#38bdf8',
        durationMs: diamonds >= 1000 ? 6000 : 4000,
        soundId,
        soundVolume: volume,
        enableTTS,
        ttsTemplate: message,
        position: 'top',
        badgeIcon: diamonds >= 1000 ? 'Crown' : 'Flame',
      };

    const newRule: AutomationRule = {
      id: 'rule-quick-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      name: `Alerta Rápida: ${giftName}`,
      description: `Alerta de overlay y sonido para regalo "${giftName}" (${diamonds} 💎)`,
      enabled: true,
      priority: diamonds >= 1000 ? 'high' : diamonds >= 100 ? 'medium' : 'low',
      triggerType: 'gift',
      conditions: {
        giftName: giftName,
        minDiamonds: diamonds,
      },
      actions: [
        {
          id: 'act-ovl-' + Math.random().toString(36).substring(2, 7),
          type: 'overlay_effect',
          enabled: true,
          effectId: effect.id,
        },
        {
          id: 'act-snd-' + Math.random().toString(36).substring(2, 7),
          type: 'sound_fx',
          enabled: true,
          soundId: soundId,
          volume: volume,
        },
        ...(enableTTS
          ? [
              {
                id: 'act-tts-' + Math.random().toString(36).substring(2, 7),
                type: 'tts_speech' as const,
                enabled: true,
                ttsTemplate: message,
                ttsSpeed: 1.0,
              },
            ]
          : []),
        {
          id: 'act-cnt-' + Math.random().toString(36).substring(2, 7),
          type: 'update_counter',
          enabled: true,
          counterId: 'counter-diamonds-goal',
          counterOperation: 'increment',
          counterAmount: 'event_diamonds',
        },
        {
          id: 'act-lead-' + Math.random().toString(36).substring(2, 7),
          type: 'add_leaderboard_points',
          enabled: true,
          leaderboardPoints: 'event_diamonds',
        },
      ],
      cooldownSeconds: cooldownSec,
      maxPerHour: 500,
      executionsCount: 0,
      createdAt: Date.now(),
    };

    onSaveRule(newRule);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl bg-[#0E1322] border border-cyan-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-[#12192B] to-[#0E1322] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Asistente de Alertas Rápidas de Regalo
              </h2>
              <p className="text-xs text-slate-400">
                Configura tu alerta en 3 clics sin entrar al editor avanzado.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Step 1: Pick Gift */}
          <div>
            <label className="block text-slate-300 font-bold mb-2 flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-violet-400" />
              <span>1. Elige el Regalo de TikTok:</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {GIFT_PRESETS.map((p) => {
                const isSelected = !isCustom && selectedGift.name === p.name;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md shadow-cyan-950/50 scale-[1.02]'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <span className="font-bold text-xs mt-0.5">{p.name}</span>
                    <span className="text-[10px] text-cyan-300 font-mono">
                      {p.diamonds.toLocaleString()} 💎
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setIsCustom(true);
                  setMessage('¡Gracias {user} por el regalo {gift}!');
                }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                  isCustom
                    ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-2xl">✨</span>
                <span className="font-bold text-xs mt-0.5">Personalizado</span>
                <span className="text-[10px] text-slate-400 font-mono">Otro...</span>
              </button>
            </div>

            {isCustom && (
              <div className="grid grid-cols-2 gap-3 mt-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Nombre del regalo</label>
                  <input
                    type="text"
                    value={customGiftName}
                    onChange={(e) => setCustomGiftName(e.target.value)}
                    placeholder="Ej. Coche deportivo"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Diamantes mínimos</label>
                  <input
                    type="number"
                    min="1"
                    value={customDiamonds}
                    onChange={(e) => setCustomDiamonds(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Pick Sound FX */}
          <div>
            <label className="block text-slate-300 font-bold mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>2. Sonido al Activar:</span>
              </div>
              <button
                type="button"
                onClick={() => playPreviewSound(soundId)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
              >
                <Play className="w-3 h-3" />
                <span>Escuchar</span>
              </button>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SOUND_PRESETS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSoundId(s.id);
                    playPreviewSound(s.id);
                  }}
                  className={`px-3 py-2 rounded-lg border text-left flex items-center justify-between text-xs transition-colors ${
                    soundId === s.id
                      ? 'bg-cyan-500/10 border-cyan-400 text-cyan-200 font-semibold'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                  {soundId === s.id && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-3">
              <span className="text-slate-400 text-[11px] shrink-0">Volumen del Efecto:</span>
              <input
                type="range"
                min="10"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <span className="text-cyan-400 font-mono text-[11px] font-bold w-10 text-right">
                {volume}%
              </span>
            </div>
          </div>

          {/* Step 3: Message & Speech */}
          <div>
            <label className="block text-slate-300 font-bold mb-2">
              3. Mensaje en Pantalla & Voz:
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ej. ¡Gracias {user} por tu {gift}!"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium focus:border-cyan-400 focus:outline-none"
            />
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
              <span>Etiquetas disponibles: <code>{'{user}'}</code>, <code>{'{gift}'}</code>, <code>{'{diamonds}'}</code></span>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={enableTTS}
                  onChange={(e) => setEnableTTS(e.target.checked)}
                  className="rounded accent-cyan-500"
                />
                <span>Leer en voz alta (TTS)</span>
              </label>
            </div>
          </div>

          {/* Cooldown */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <span className="font-semibold text-slate-300 block">Tiempo de Enfriamiento (Cooldown)</span>
              <span className="text-[11px] text-slate-500">Evita saturación si envían muchos regalos seguidos</span>
            </div>
            <select
              value={cooldownSec}
              onChange={(e) => setCooldownSec(Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
            >
              <option value={1}>1 segundo</option>
              <option value={3}>3 segundos</option>
              <option value={5}>5 segundos</option>
              <option value={10}>10 segundos</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0E1322] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 rounded-xl shadow-lg shadow-cyan-950/50 flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Crear Alerta de Inmediato</span>
          </button>
        </div>
      </div>
    </div>
  );
};
