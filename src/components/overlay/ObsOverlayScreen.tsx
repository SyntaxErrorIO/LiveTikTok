import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { eventBus, TriggerActionPayload } from '../../services/eventBus';
import { audioEngine } from '../../services/audioEngine';
import { Sparkles, Zap, Crown, Flame, Heart, Radio, Target, Trophy, Award } from 'lucide-react';
import { LeaderboardEntry, StreamCounter } from '../../types';
import { StorageService } from '../../services/storageService';

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

  // 4b: Metas de regalos (Gift Goal)
  const [goalTitle, setGoalTitle] = useState('Meta de Diamantes');
  const [goalCurrent, setGoalCurrent] = useState(320);
  const [goalTarget, setGoalTarget] = useState(500);
  const [goalReachedCelebrated, setGoalReachedCelebrated] = useState(false);
  const [showGoal, setShowGoal] = useState(true);

  // 4c: Top Donadores (Persistent top 5 ranking)
  const [topDonors, setTopDonors] = useState<LeaderboardEntry[]>([]);
  const [showTopDonors, setShowTopDonors] = useState(true);

  // Initialize data from local storage or URL query parameters
  useEffect(() => {
    try {
      const counters = StorageService.getCounters();
      const diamondsCounter = counters.find((c: StreamCounter) => c.name.toLowerCase().includes('diamante') || c.id.includes('diamond')) || counters[0];
      if (diamondsCounter) {
        setGoalTitle(diamondsCounter.name);
        setGoalCurrent(diamondsCounter.current);
        setGoalTarget(diamondsCounter.target || 500);
      }

      const leaderboard = StorageService.getLeaderboard();
      if (leaderboard && leaderboard.length > 0) {
        setTopDonors(leaderboard.slice(0, 5));
      } else {
        // Sample baseline for aesthetic rendering in OBS
        setTopDonors([
          { userId: '1', username: 'AstroVIP', nickname: 'Astro VIP', points: 1250, giftsCount: 14, lastUpdated: Date.now() },
          { userId: '2', username: 'RosaFan', nickname: 'Rosa Fan', points: 680, giftsCount: 22, lastUpdated: Date.now() },
          { userId: '3', username: 'LionKing', nickname: 'Rey León', points: 500, giftsCount: 3, lastUpdated: Date.now() },
        ]);
      }

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('showGoal') === 'false') setShowGoal(false);
        if (params.get('showTop') === 'false') setShowTopDonors(false);
        if (params.get('goalTarget')) setGoalTarget(Number(params.get('goalTarget')));
      }
    } catch {}
  }, []);

  // Check if goal reached to trigger celebratory animation
  useEffect(() => {
    if (goalCurrent >= goalTarget && !goalReachedCelebrated && goalTarget > 0) {
      setGoalReachedCelebrated(true);
      try {
        confetti({
          particleCount: 120,
          spread: 100,
          origin: { y: 0.2 },
          colors: ['#eab308', '#f59e0b', '#38bdf8', '#a855f7', '#ffffff'],
        });
      } catch {}
    }
  }, [goalCurrent, goalTarget, goalReachedCelebrated]);

  useEffect(() => {
    const handleIncomingOverlay = (payload: TriggerActionPayload) => {
      // If fail-safe mode is active, prevent phantom triggers
      if (isFailSafe) return;

      const newOverlay: ActiveOverlay = {
        id: 'ovl-' + Math.random().toString(36).substring(2, 9),
        payload,
        expiresAt: Date.now() + (payload.effect.durationMs || 4000),
      };

      setActiveOverlays((prev) => [...prev, newOverlay]);

      // Launch visual particles
      triggerVisualParticles(payload.effect.animationType, payload.effect.primaryColor, payload.effect.secondaryColor);

      // If gift event with diamond value, increase goal progress
      if (payload.event?.type === 'gift' && payload.event.data?.diamondCount) {
        const diamonds = (payload.event.data.diamondCount || 1) * (payload.event.data.repeatCount || 1);
        setGoalCurrent((curr) => curr + diamonds);

        // Update top donors
        setTopDonors((prev) => {
          const donorUser = payload.event.user.username;
          const existing = prev.find((d) => d.username === donorUser);
          let updated: LeaderboardEntry[];
          if (existing) {
            updated = prev.map((d) =>
              d.username === donorUser
                ? { ...d, points: d.points + diamonds, giftsCount: d.giftsCount + 1 }
                : d
            );
          } else {
            updated = [
              ...prev,
              {
                userId: payload.event.user.id || donorUser,
                username: donorUser,
                nickname: payload.event.user.nickname || donorUser,
                points: diamonds,
                giftsCount: 1,
                lastUpdated: Date.now(),
              },
            ];
          }
          return updated.sort((a, b) => b.points - a.points).slice(0, 5);
        });
      }

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
        const params = new URLSearchParams(window.location.search);
        const overlayToken = params.get('overlayToken') || params.get('token');
        const streamUrl = overlayToken
          ? `/api/events/stream?overlayToken=${encodeURIComponent(overlayToken)}`
          : '/api/events/stream';

        sseSource = new EventSource(streamUrl);
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
            } else if (data.type === 'COUNTERS_UPDATED' && Array.isArray(data.payload)) {
              const diamondsCounter = data.payload.find((c: StreamCounter) =>
                c.name.toLowerCase().includes('diamante') || c.id.includes('diamond')
              ) || data.payload[0];
              if (diamondsCounter) {
                setGoalTitle(diamondsCounter.name);
                setGoalCurrent(diamondsCounter.current);
                setGoalTarget(diamondsCounter.target || 500);
              }
            } else if (data.type === 'LEADERBOARD_UPDATED' && Array.isArray(data.payload)) {
              setTopDonors(data.payload.slice(0, 5));
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
  }, [isPreview, isFailSafe]);

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
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.4 },
          colors: [primary, secondary, '#ffffff'],
        });
      }
    } catch {}
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

  const goalPercentage = Math.min(100, Math.round((goalCurrent / (goalTarget || 1)) * 100));
  const isGoalCompleted = goalCurrent >= goalTarget;

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none ${
        isPreview ? 'bg-slate-950/90 rounded-2xl border border-slate-800 p-4 min-h-[460px]' : 'bg-transparent min-h-screen pointer-events-none'
      }`}
    >
      {/* 4b. METAS DE REGALOS: Barra de progreso configurable */}
      {showGoal && (
        <div className="absolute top-4 left-6 z-40 max-w-[320px] w-full">
          <div className="p-3 rounded-xl bg-slate-950/85 border border-cyan-500/40 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-white tracking-tight">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <span>{goalTitle}</span>
              </div>
              <span className="font-mono text-[11px] text-cyan-300 font-bold tabular-nums">
                {goalCurrent.toLocaleString()} / {goalTarget.toLocaleString()} 💎
              </span>
            </div>

            {/* Progress Bar */}
            <div className="relative w-full bg-slate-900/90 h-3 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isGoalCompleted
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse shadow-[0_0_12px_rgba(234,179,8,0.8)]'
                    : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                }`}
                style={{ width: `${goalPercentage}%` }}
              />
            </div>

            {/* Percentage & Completed Indicator */}
            <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
              <span className={isGoalCompleted ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                {isGoalCompleted ? '🎉 ¡META CUMPLIDA!' : `${goalPercentage}% completado`}
              </span>
              <span className="text-slate-500">
                Faltan: {Math.max(0, goalTarget - goalCurrent).toLocaleString()} 💎
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4c. TOP DONADORES: Ranking persistente de los 5 mayores donantes */}
      {showTopDonors && topDonors.length > 0 && (
        <div className="absolute bottom-6 left-6 z-40 max-w-[280px] w-full">
          <div className="p-3.5 rounded-xl bg-slate-950/85 border border-amber-500/30 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80 mb-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Top Donadores de la Sesión</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Top 5</span>
            </div>

            <div className="space-y-1.5">
              {topDonors.map((donor, idx) => (
                <div
                  key={`${donor.username}-${idx}`}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/60 border border-slate-800/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`font-mono font-bold text-[11px] w-4 ${
                        idx === 0
                          ? 'text-amber-300'
                          : idx === 1
                          ? 'text-slate-300'
                          : idx === 2
                          ? 'text-amber-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </span>
                    <span className="font-semibold text-white truncate text-[11px]">
                      @{donor.username}
                    </span>
                  </div>
                  <span className="font-mono text-cyan-300 font-bold tabular-nums text-[11px] shrink-0">
                    {donor.points.toLocaleString()} 💎
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Overlay Alerts */}
      {activeOverlays.map(({ id, payload }) => {
        const { effect, formattedTitle, formattedSubtitle, event } = payload;
        const posClass = getPositionClasses(effect.position);

        return (
          <div
            key={id}
            className={`absolute z-50 ${posClass} transition-all duration-300 transform scale-100 animate-in fade-in zoom-in-95`}
          >
            {/* Cyber Alert Box */}
            <div
              className="relative px-6 py-4 rounded-xl border shadow-2xl backdrop-blur-md flex items-center gap-4 min-w-[360px] max-w-[540px]"
              style={{
                backgroundColor: 'rgba(11, 15, 25, 0.94)',
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

      {/* Watermark helper in standalone OBS mode */}
      {!isPreview && activeOverlays.length === 0 && (
        <div className="absolute top-4 right-4 flex items-center gap-2 text-[11px] font-mono text-slate-500/60 bg-black/40 px-3 py-1.5 rounded-lg border border-slate-800/60">
          <Radio className="w-3.5 h-3.5 text-emerald-500" />
          <span>OBS Browser Source Activo · Esperando Eventos</span>
        </div>
      )}
    </div>
  );
};
export default ObsOverlayScreen;
