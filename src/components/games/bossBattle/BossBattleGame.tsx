import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TikTokEvent } from '../../../types';
import { eventBus } from '../../../services/eventBus';
import { apiService } from '../../../services/apiService';
import { Swords, Shield, Heart, Zap, Trophy, Volume2, VolumeX, Sparkles, Skull, RotateCcw } from 'lucide-react';

interface DamagePop {
  id: string;
  x: number;
  y: number;
  damage: number;
  isCrit: boolean;
  username: string;
}

interface HeroAttacker {
  username: string;
  nickname: string;
  avatarUrl?: string;
  damage: number;
  attacksCount: number;
}

interface BossBattleGameProps {
  isPreview?: boolean;
  aspectRatio?: '9:16' | 'responsive';
}

export const BossBattleGame: React.FC<BossBattleGameProps> = ({
  isPreview = false,
  aspectRatio = '9:16',
}) => {
  const maxHp = 1000;
  const [bossHp, setBossHp] = useState(1000);
  const [bossState, setBossState] = useState<'idle' | 'hit' | 'enraged' | 'defeated'>('idle');
  const [shield, setShield] = useState(30);
  const [damagePops, setDamagePops] = useState<DamagePop[]>([]);
  const [heroes, setHeroes] = useState<HeroAttacker[]>([]);
  const [soundMuted, setSoundMuted] = useState(false);
  const [recentAttack, setRecentAttack] = useState<{ user: string; text: string; gift: string } | null>(null);
  const isEnraged = bossHp < maxHp * 0.4 && bossHp > 0;

  // Handle damage to boss
  const inflictDamage = useCallback(
    (user: { id?: string; username: string; nickname?: string; avatarUrl?: string }, damageAmount: number, giftName: string, isCrit = false) => {
      setBossHp((prev) => {
        const next = Math.max(0, prev - damageAmount);
        if (next === 0) {
          setBossState('defeated');
        } else {
          setBossState('hit');
          setTimeout(() => {
            setBossState(next < maxHp * 0.4 ? 'enraged' : 'idle');
          }, 350);
        }
        return next;
      });

      // Spawn damage floating number
      const popId = 'pop-' + Math.random().toString(36).substring(2, 7);
      const newPop: DamagePop = {
        id: popId,
        x: 35 + Math.random() * 30,
        y: 40 + Math.random() * 20,
        damage: damageAmount,
        isCrit,
        username: user.username,
      };
      setDamagePops((prev) => [...prev.slice(-8), newPop]);
      setTimeout(() => {
        setDamagePops((prev) => prev.filter((p) => p.id !== popId));
      }, 1400);

      // Record hero score
      setHeroes((prev) => {
        const existingIdx = prev.findIndex((h) => h.username.toLowerCase() === user.username.toLowerCase());
        let updated: HeroAttacker[];
        if (existingIdx >= 0) {
          const item = { ...prev[existingIdx] };
          item.damage += damageAmount;
          item.attacksCount += 1;
          if (user.avatarUrl) item.avatarUrl = user.avatarUrl;
          updated = [...prev];
          updated[existingIdx] = item;
        } else {
          updated = [
            ...prev,
            {
              username: user.username,
              nickname: user.nickname || user.username,
              avatarUrl: user.avatarUrl,
              damage: damageAmount,
              attacksCount: 1,
            },
          ];
        }
        updated.sort((a, b) => b.damage - a.damage);
        return updated.slice(0, 10);
      });

      setRecentAttack({
        user: user.nickname || user.username,
        text: `-${damageAmount} HP ${isCrit ? '¡GOLPE CRÍTICO!' : ''}`,
        gift: giftName,
      });
      setTimeout(() => setRecentAttack(null), 2500);
    },
    [maxHp]
  );

  // Ingest TikTok events for Boss Battle
  const handleIncomingEvent = useCallback(
    (event: TikTokEvent) => {
      if (!event || !event.type) return;

      if (event.type === 'gift') {
        const coins = (Number(event.data.diamondCount) || 1) * (Number(event.data.repeatCount) || 1);
        const giftName = event.data.giftName || 'Regalo';

        let damage = coins * 15;
        let isCrit = false;

        if (coins >= 50) {
          damage = 600;
          isCrit = true;
        } else if (coins >= 15) {
          damage = 250;
          isCrit = true;
        } else if (coins >= 5) {
          damage = 80;
        } else {
          damage = 15;
        }

        inflictDamage(event.user, damage, giftName, isCrit);
      } else if (event.type === 'like') {
        const count = Number(event.data.likeCount) || 1;
        setShield((prev) => Math.min(100, prev + count * 0.5));
      }
    },
    [inflictDamage]
  );

  useEffect(() => {
    const unsubBus = eventBus.subscribe((msg) => {
      if (msg.type === 'TIKTOK_EVENT_RECEIVED') {
        handleIncomingEvent(msg.payload);
      } else if (msg.type === 'GAME_ACTION_RECEIVED' && msg.payload?.action === 'BOSS_ATTACK') {
        inflictDamage(
          { username: 'heroe_live', nickname: 'Héroe del Chat' },
          msg.payload.damage || 50,
          msg.payload.gift || 'Ataque Especial',
          msg.payload.isCrit
        );
      }
    });

    const unsubSSE = apiService.onSSEMessage((data) => {
      if (data.type === 'TIKTOK_EVENT' && data.payload) {
        handleIncomingEvent(data.payload);
      }
    });

    return () => {
      unsubBus();
      unsubSSE();
    };
  }, [handleIncomingEvent, inflictDamage]);

  const handleResetBoss = () => {
    setBossHp(maxHp);
    setBossState('idle');
    setShield(30);
  };

  const hpPercent = (bossHp / maxHp) * 100;
  const isVertical = aspectRatio === '9:16';

  return (
    <div
      className={`relative select-none overflow-hidden flex flex-col justify-between ${
        isVertical
          ? 'w-full max-w-[480px] aspect-[9/16] mx-auto bg-gradient-to-b from-[#18090a] via-[#1f101a] to-[#0c050a] rounded-3xl border-2 border-red-950/80 shadow-2xl'
          : 'w-full h-full min-h-[580px] bg-gradient-to-b from-[#18090a] via-[#1f101a] to-[#0c050a] rounded-2xl border border-red-900/60'
      }`}
    >
      {/* Resplandor de arena de batalla */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-600 via-amber-900 to-transparent" />

      {/* Floating Damage Pops */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        {damagePops.map((pop) => (
          <div
            key={pop.id}
            className="absolute flex flex-col items-center animate-out fade-out slide-out-to-top duration-1000"
            style={{ left: `${pop.x}%`, top: `${pop.y}%` }}
          >
            <span
              className={`font-black tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,1)] ${
                pop.isCrit
                  ? 'text-3xl text-yellow-300 animate-bounce'
                  : 'text-xl text-red-400'
              }`}
            >
              -{pop.damage} HP
            </span>
            <span className="text-[10px] text-white/90 font-mono bg-black/60 px-1 rounded">
              @{pop.username}
            </span>
          </div>
        ))}
      </div>

      {/* TOP HEADER: Barra de Vida Colosal del Jefe & Escudo Comunitario */}
      <header className="relative z-20 p-3 bg-black/60 border-b border-red-950/80 backdrop-blur-md">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-amber-700 flex items-center justify-center text-white shadow-lg border border-red-400/50">
              <Skull className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Dragón Colosal Ignis
                </span>
                {isEnraged && (
                  <span className="px-1.5 py-0.2 rounded bg-red-600 text-[9px] font-black text-white animate-pulse">
                    ¡ENFURECIDO!
                  </span>
                )}
              </div>
              <span className="text-[10px] text-red-300/80 font-mono">
                {bossHp} / {maxHp} HP
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleResetBoss}
              className="p-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs"
              title="Reiniciar Jefe"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            </button>
            <button
              onClick={() => setSoundMuted(!soundMuted)}
              className="p-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs"
            >
              {soundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
          </div>
        </div>

        {/* Barra de Vida Masiva */}
        <div className="w-full h-4 rounded-full bg-slate-950 border-2 border-red-900/80 overflow-hidden relative shadow-inner">
          <div
            className={`h-full transition-all duration-200 rounded-full ${
              isEnraged
                ? 'bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 animate-pulse shadow-[0_0_16px_#ef4444]'
                : 'bg-gradient-to-r from-red-700 via-red-500 to-amber-500'
            }`}
            style={{ width: `${hpPercent}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow font-mono">
            {Math.round(hpPercent)}%
          </span>
        </div>

        {/* Escudo Comunitario por Likes */}
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-300">
          <span className="flex items-center gap-1 text-cyan-300 font-bold">
            <Shield className="w-3 h-3 text-cyan-400" />
            Escudo Comunitario:
          </span>
          <span className="font-mono text-cyan-300 font-bold">{Math.round(shield)}%</span>
        </div>
      </header>

      {/* ZONA CENTRAL: Visual del Jefe Monstruoso / Dragón animado */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-4 z-10">
        {/* Aviso de ataque reciente */}
        {recentAttack && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 animate-in fade-in zoom-in duration-150">
            <div className="px-3 py-1 rounded-full bg-black/80 border border-red-500/80 text-xs text-white shadow-xl flex items-center gap-1.5 backdrop-blur-md">
              <Swords className="w-3.5 h-3.5 text-red-400" />
              <span className="font-bold text-amber-300">@{recentAttack.user}:</span>
              <span className="font-bold text-white">{recentAttack.text}</span>
            </div>
          </div>
        )}

        {/* SVG Dragón Colosal */}
        <div
          className={`relative transition-transform duration-150 ${
            bossState === 'hit'
              ? 'scale-95 translate-y-2 filter brightness-150 hue-rotate-15'
              : isEnraged
              ? 'scale-105 animate-pulse'
              : 'scale-100'
          }`}
        >
          <svg viewBox="0 0 240 220" className="w-64 h-64 filter drop-shadow-[0_16px_32px_rgba(0,0,0,0.9)]">
            <defs>
              <radialGradient id="dragonSkin" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#991b1b" />
                <stop offset="50%" stopColor="#581c87" />
                <stop offset="100%" stopColor="#1e1b4b" />
              </radialGradient>
            </defs>

            {/* Alas de dragón extendidas */}
            <path
              d="M120 100 Q60 20 10 70 Q50 110 110 130 Z"
              fill="#4c1d95"
              stroke="#6d28d9"
              strokeWidth="2"
              opacity="0.8"
            />
            <path
              d="M120 100 Q180 20 230 70 Q190 110 130 130 Z"
              fill="#4c1d95"
              stroke="#6d28d9"
              strokeWidth="2"
              opacity="0.8"
            />

            {/* Cuerpo y Cabeza de Dragón */}
            <ellipse cx="120" cy="140" rx="45" ry="50" fill="url(#dragonSkin)" stroke="#7c3aed" strokeWidth="2" />
            <path
              d="M90 100 L120 50 L150 100 L140 140 L100 140 Z"
              fill="url(#dragonSkin)"
              stroke="#9333ea"
              strokeWidth="2"
            />

            {/* Cuernos Legendarios */}
            <path d="M100 65 Q85 30 70 40 Q85 55 98 75" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
            <path d="M140 65 Q155 30 170 40 Q155 55 142 75" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />

            {/* Ojos Ardientes */}
            <ellipse cx="108" cy="88" rx="6" ry="4" fill="#fbbf24" />
            <circle cx="108" cy="88" r="2" fill="#dc2626" />
            <ellipse cx="132" cy="88" rx="6" ry="4" fill="#fbbf24" />
            <circle cx="132" cy="88" r="2" fill="#dc2626" />

            {/* Hocico y Fuego al respirar */}
            <path d="M112 110 Q120 118 128 110" stroke="#f87171" strokeWidth="3" fill="none" />
            <circle cx="114" cy="104" r="1.5" fill="#000000" />
            <circle cx="126" cy="104" r="1.5" fill="#000000" />

            {/* Dientes afilados */}
            <polygon points="112,110 116,116 114,110" fill="#ffffff" />
            <polygon points="126,110 128,116 124,110" fill="#ffffff" />
          </svg>

          {/* Efecto de Victoria si derrotado */}
          {bossHp === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 rounded-2xl p-4 text-center animate-in zoom-in-95">
              <span className="text-4xl animate-bounce">🏆✨</span>
              <h3 className="text-xl font-black text-amber-300 mt-1">¡JEFE DERROTADO!</h3>
              <p className="text-xs text-slate-300 mt-1">La comunidad de viewers ha salvado el reino.</p>
              <button
                onClick={handleResetBoss}
                className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Jugar Siguiente Ronda
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ZONA INFERIOR: Guía de Ataque con Regalos & Top Héroes */}
      <footer className="relative z-20 p-3 bg-black/80 border-t border-red-950/80 backdrop-blur-md">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Top Héroes del Raid</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <span>🌹 Rosa: -15 HP</span>
            <span>·</span>
            <span className="text-amber-300 font-bold">👑 León: -600 HP</span>
          </div>
        </div>

        {/* Mini lista de Top atacantes */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none items-center min-h-[44px]">
          {heroes.length === 0 ? (
            <div className="w-full text-center text-slate-500 text-[11px] font-mono py-1">
              ¡Envía un regalo para infligir el primer golpe!
            </div>
          ) : (
            heroes.map((hero, idx) => (
              <div
                key={hero.username}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-700 shrink-0 text-xs"
              >
                <span className="font-mono font-bold text-amber-400 text-[10px]">#{idx + 1}</span>
                <span className="font-bold text-white truncate max-w-[70px]">@{hero.username}</span>
                <span className="font-mono text-red-400 font-extrabold text-[10px]">
                  {hero.damage} dmg
                </span>
              </div>
            ))
          )}
        </div>
      </footer>
    </div>
  );
};

export default BossBattleGame;
