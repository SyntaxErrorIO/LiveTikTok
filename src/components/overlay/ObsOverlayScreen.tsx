import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { eventBus, TriggerActionPayload } from '../../services/eventBus';
import { audioEngine } from '../../services/audioEngine';
import { Sparkles, Zap, Crown, Flame, Heart, Radio } from 'lucide-react';

interface ActiveOverlay {
  id: string;
  payload: TriggerActionPayload;
  expiresAt: number;
}

interface ObsOverlayScreenProps {
  isPreview?: boolean;
}

export const ObsOverlayScreen: React.FC<ObsOverlayScreenProps> = ({ isPreview = false }) => {
  const [activeOverlays, setActiveOverlays] = useState<ActiveOverlay[]>([]);
  const [isFailSafe, setIsFailSafe] = useState(false);

  useEffect(() => {
    const handleIncomingOverlay = (payload: TriggerActionPayload) => {
      // If fail-safe mode is active, prevent phantom/deceptive triggers
      if (isFailSafe) return;

      const newOverlay: ActiveOverlay = {
        id: 'ovl-' + Math.random().toString(36).substring(2, 9),
        payload,
        expiresAt: Date.now() + (payload.effect.durationMs || 4000),
      };

      setActiveOverlays((prev) => [...prev, newOverlay]);

      // Launch celebratory particles
      triggerVisualParticles(payload.effect.animationType, payload.effect.primaryColor, payload.effect.secondaryColor);

      // In OBS standalone mode, play sound if requested
      if (!isPreview && payload.effect.soundId) {
        audioEngine.playSound(payload.effect.soundId, payload.effect.soundVolume);
        if (payload.effect.enableTTS && payload.ttsVoiceText) {
          audioEngine.speakText(payload.ttsVoiceText);
        }
      }
    };

    // 1. Subscribe to local BroadcastChannel/Window bus
    const unsubscribeBus = eventBus.subscribe((msg) => {
      if (msg.type === 'TRIGGER_OVERLAY') {
        handleIncomingOverlay(msg.payload);
      }
    });

    // 2. In standalone OBS mode, also connect to server SSE stream (/api/events/stream)
    let sseSource: EventSource | null = null;
    if (!isPreview && typeof window !== 'undefined') {
      try {
        sseSource = new EventSource('/api/events/stream');
        sseSource.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            if (data.type === 'FAIL_SAFE_STATE') {
              setIsFailSafe(Boolean(data.payload?.active));
            } else if (data.type === 'TRIGGER_ACTION' && data.payload?.actionType === 'overlay_effect') {
              const p = data.payload;
              handleIncomingOverlay({
                effect: p.effect,
                event: p.event,
                formattedTitle: p.formattedTitle,
                formattedSubtitle: p.formattedSubtitle,
                ttsVoiceText: p.ttsVoiceText,
                timestamp: data.timestamp,
              });
            }
          } catch {}
        };
      } catch {}
    }

    // Cleanup interval for expired overlays
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveOverlays((prev) => prev.filter((o) => o.expiresAt > now));
    }, 250);

    return () => {
      unsubscribeBus();
      if (sseSource) sseSource.close();
      clearInterval(interval);
    };
  }, [isPreview]);

  const triggerVisualParticles = (type: string, primary: string, secondary: string) => {
    try {
      if (type === 'confetti_burst') {
        confetti({
          particleCount: 70,
          spread: 85,
          origin: { y: 0.35 },
          colors: [primary, secondary, '#ffffff', '#38bdf8', '#c084fc'],
        });
      } else if (type === 'jackpot_gold') {
        confetti({
          particleCount: 100,
          spread: 90,
          origin: { y: 0.3 },
          colors: ['#eab308', '#f59e0b', '#fbbf24', '#fef08a', '#ffffff'],
        });
      } else if (type === 'rose_shower') {
        confetti({
          particleCount: 50,
          angle: 90,
          spread: 75,
          startVelocity: 28,
          origin: { y: 0.85 },
          colors: ['#f43f5e', '#fb7185', '#e11d48', '#fda4af', '#be123c'],
        });
      } else if (type === 'cyber_strike') {
        confetti({
          particleCount: 45,
          angle: 60,
          spread: 55,
          startVelocity: 40,
          origin: { x: 0.1, y: 0.5 },
          colors: ['#06b6d4', '#3b82f6', '#8b5cf6', '#ffffff'],
        });
        confetti({
          particleCount: 45,
          angle: 120,
          spread: 55,
          startVelocity: 40,
          origin: { x: 0.9, y: 0.5 },
          colors: ['#06b6d4', '#3b82f6', '#8b5cf6', '#ffffff'],
        });
      } else if (type === 'neon_pulse') {
        confetti({
          particleCount: 60,
          spread: 120,
          startVelocity: 30,
          origin: { y: 0.4 },
          colors: ['#a855f7', '#ec4899', '#3b82f6', '#22d3ee'],
        });
      } else {
        // Default streamer card flare
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.4 },
          colors: [primary, secondary, '#ffffff'],
        });
      }
    } catch {
      // Confetti canvas error fallback
    }
  };

  const getPositionClasses = (position: string) => {
    switch (position) {
      case 'center':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'bottom':
        return 'bottom-8 left-1/2 -translate-x-1/2';
      case 'top_left':
        return 'top-8 left-8';
      case 'top_right':
        return 'top-8 right-8';
      case 'bottom_right':
        return 'bottom-8 right-8';
      case 'top':
      default:
        return 'top-8 left-1/2 -translate-x-1/2';
    }
  };

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap':
        return <Zap className="w-6 h-6 text-cyan-300" />;
      case 'Crown':
        return <Crown className="w-6 h-6 text-amber-300" />;
      case 'Flame':
        return <Flame className="w-6 h-6 text-pink-400" />;
      case 'Heart':
        return <Heart className="w-6 h-6 text-rose-400" />;
      case 'Sparkles':
      default:
        return <Sparkles className="w-6 h-6 text-violet-300" />;
    }
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden pointer-events-none select-none ${
        isPreview ? 'bg-transparent' : 'bg-transparent min-h-screen'
      }`}
    >
      {/* Active Overlay Alerts */}
      {activeOverlays.map(({ id, payload }) => {
        const { effect, formattedTitle, formattedSubtitle, event } = payload;
        const posClass = getPositionClasses(effect.position);

        return (
          <div
            key={id}
            className={`absolute z-50 ${posClass} transition-all duration-300 transform scale-100 animate-in fade-in zoom-in-95`}
          >
            {/* Cyber / Golden Alert Box */}
            <div
              className="relative px-6 py-4 rounded-xl border shadow-2xl backdrop-blur-md flex items-center gap-4 min-w-[360px] max-w-[540px]"
              style={{
                backgroundColor: 'rgba(11, 15, 25, 0.92)',
                borderColor: effect.primaryColor,
                boxShadow: `0 0 35px ${effect.primaryColor}55, 0 10px 25px rgba(0,0,0,0.8)`,
              }}
            >
              {/* Outer Glow Ring */}
              <div
                className="absolute -inset-0.5 rounded-xl opacity-35 blur-sm pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, ${effect.primaryColor}, ${effect.secondaryColor})`,
                }}
              />

              {/* Avatar / Badge icon container */}
              <div
                className="relative shrink-0 w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden border"
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  borderColor: effect.secondaryColor,
                }}
              >
                {event.user.avatarUrl ? (
                  <img
                    src={event.user.avatarUrl}
                    alt={event.user.username}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getBadgeIcon(effect.badgeIcon)
                )}
                {/* Repeat count badge */}
                {(event.data.repeatCount || 1) > 1 && (
                  <div className="absolute bottom-0 right-0 bg-rose-600 text-[10px] font-mono font-bold text-white px-1 rounded-tl">
                    x{event.data.repeatCount}
                  </div>
                )}
              </div>

              {/* Text Information */}
              <div className="relative flex-1 min-w-0">
                <div
                  className="text-xs font-mono font-bold tracking-wider uppercase mb-0.5 truncate"
                  style={{ color: effect.primaryColor }}
                >
                  {formattedTitle}
                </div>
                <div className="text-base font-bold text-white tracking-tight truncate">
                  {formattedSubtitle}
                </div>
                {event.data.comment && (
                  <div className="text-xs text-slate-300 italic truncate mt-0.5">
                    "{event.data.comment}"
                  </div>
                )}
              </div>

              {/* Visual Diamond / Value indicator */}
              {Boolean(event.data.diamondCount) && (
                <div
                  className="relative shrink-0 flex flex-col items-center justify-center px-3 py-1.5 rounded-md border text-center font-mono"
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    borderColor: `${effect.secondaryColor}66`,
                  }}
                >
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Valor</span>
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: effect.secondaryColor }}
                  >
                    {event.data.diamondCount}💎
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* OBS Clean Standalone watermark helper (only if no active overlay in standalone mode) */}
      {!isPreview && activeOverlays.length === 0 && (
        <div className="absolute top-4 right-4 flex items-center gap-2 text-[11px] font-mono text-slate-500/60 bg-black/40 px-3 py-1.5 rounded-lg border border-slate-800/60">
          <Radio className="w-3.5 h-3.5 text-emerald-500" />
          <span>OBS Browser Source Activo · Esperando Eventos</span>
        </div>
      )}
    </div>
  );
};
