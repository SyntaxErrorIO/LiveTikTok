import React, { useState } from 'react';
import { X, Play, Sparkles, Copy, Check, Radio, Target, Trophy, ExternalLink } from 'lucide-react';
import { ObsOverlayScreen } from './ObsOverlayScreen';
import { eventBus } from '../../services/eventBus';
import { OverlayEffect, TikTokEvent } from '../../types';

interface OverlayPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  overlayToken?: string;
  effects: OverlayEffect[];
}

export const OverlayPreviewModal: React.FC<OverlayPreviewModalProps> = ({
  isOpen,
  onClose,
  overlayToken,
  effects,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  const obsUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?mode=overlay${overlayToken ? `&overlayToken=${overlayToken}` : ''}`
    : '';

  const handleCopyObsUrl = () => {
    navigator.clipboard.writeText(obsUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const simulateAlert = (giftName: string, diamonds: number, repeat: number, effectAnimation: string) => {
    const effect = effects.find((e) => e.animationType === effectAnimation) || effects[0] || {
      id: 'eff-preview',
      name: `Alerta ${giftName}`,
      animationType: effectAnimation as any,
      titleTemplate: `¡REGALO DE TIKTOK: ${giftName.toUpperCase()}!`,
      subtitleTemplate: '{user} envió {amount}x {gift}',
      primaryColor: diamonds >= 1000 ? '#eab308' : '#f43f5e',
      secondaryColor: '#38bdf8',
      durationMs: 4500,
      soundId: 'chime',
      soundVolume: 80,
      enableTTS: false,
      ttsTemplate: '',
      position: 'top',
      badgeIcon: diamonds >= 1000 ? 'Crown' : 'Flame',
    };

    const mockEvent: TikTokEvent = {
      id: 'mock-' + Date.now(),
      type: 'gift',
      source: 'simulation',
      timestamp: Date.now(),
      user: {
        id: 'usr-' + Math.floor(Math.random() * 1000),
        username: 'ViewerVIP_' + Math.floor(10 + Math.random() * 90),
        nickname: 'Super Fan VIP',
        badgeLevel: diamonds >= 1000 ? 30 : 10,
        isSubscriber: true,
      },
      data: {
        giftName,
        diamondCount: diamonds,
        repeatCount: repeat,
        comment: `¡Apoyando con ${giftName}! 🚀`,
      },
    };

    eventBus.broadcast({
      type: 'TRIGGER_OVERLAY',
      payload: {
        effect,
        event: mockEvent,
        formattedTitle: `¡${giftName.toUpperCase()} EN VIVO!`,
        formattedSubtitle: `${mockEvent.user.nickname} envió ${repeat}x ${giftName}`,
        timestamp: Date.now(),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-5xl bg-[#0B0F1A] border border-cyan-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0E1322] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Vista Previa del Overlay de OBS Studio
              </h2>
              <p className="text-xs text-slate-400">
                Prueba tus efectos, barra de metas de diamantes y ranking de top donadores en tiempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyObsUrl}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all ${
                copiedUrl
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? '¡URL Copiada!' : 'Copiar URL para OBS'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Interactive Virtual Canvas */}
        <div className="relative flex-1 min-h-[460px] bg-slate-950 p-4 overflow-hidden border-b border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
          <ObsOverlayScreen isPreview={true} />
        </div>

        {/* Quick Testing Control Panel */}
        <div className="p-4 bg-[#0E1322] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Simular Alerta:</span>
            </span>

            <button
              onClick={() => simulateAlert('Rosa', 1, 5, 'rose_shower')}
              className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-semibold flex items-center gap-1.5"
            >
              <span>🌹 Rosa x5 (5💎)</span>
            </button>

            <button
              onClick={() => simulateAlert('Galaxia Neón', 1000, 1, 'confetti_burst')}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-300 font-semibold flex items-center gap-1.5"
            >
              <span>🌌 Galaxia (1000💎)</span>
            </button>

            <button
              onClick={() => simulateAlert('León Rugiente', 29999, 1, 'jackpot_gold')}
              className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold flex items-center gap-1.5"
            >
              <span>🦁 León (29999💎)</span>
            </button>

            <button
              onClick={() => simulateAlert('Cohete Cyber', 500, 1, 'cyber_strike')}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-semibold flex items-center gap-1.5"
            >
              <span>🚀 Cohete (500💎)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={obsUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1.5 border border-slate-700"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir Pantalla Completa</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OverlayPreviewModal;
