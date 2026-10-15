import React from 'react';
import { FoodOrder } from '../types';

interface ChefCharacterProps {
  isCooking: boolean;
  isVipFlame: boolean;
  isServing: boolean;
  cookProgress: number;
}

export const ChefCharacter: React.FC<ChefCharacterProps> = ({
  isCooking,
  isVipFlame,
  isServing,
  cookProgress,
}) => {
  return (
    <div className="relative flex flex-col items-center select-none pointer-events-none">
      {/* VIP Flame Eruption above Wok */}
      {isVipFlame && (
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-bounce">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Pulsing fire aura */}
            <div className="absolute inset-0 bg-gradient-to-t from-red-600 via-amber-500 to-yellow-300 rounded-full blur-2xl opacity-90 animate-pulse" />
            {/* SVG roaring fire flame */}
            <svg viewBox="0 0 100 100" className="w-32 h-32 filter drop-shadow-[0_0_20px_#f59e0b] animate-pulse">
              <path
                d="M50 2 C62 20, 80 26, 74 55 C90 44, 86 78, 72 88 C58 98, 38 98, 26 88 C12 76, 8 44, 26 55 C20 28, 38 20, 50 2 Z"
                fill="url(#fireGradientMaster)"
              />
              <path
                d="M50 24 C58 38, 70 44, 66 64 C74 58, 70 78, 62 86 C54 92, 44 92, 36 86 C28 78, 26 58, 34 64 C30 44, 42 38, 50 24 Z"
                fill="#fef08a"
              />
              <path
                d="M50 45 C54 54, 62 58, 58 72 C62 68, 60 80, 56 84 C50 88, 46 88, 42 84 C38 80, 38 68, 42 72 C40 58, 46 54, 50 45 Z"
                fill="#ffffff"
              />
              <defs>
                <linearGradient id="fireGradientMaster" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#b91c1c" />
                  <stop offset="35%" stopColor="#ea580c" />
                  <stop offset="70%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#fef08a" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute -top-4 px-3 py-1 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-[11px] font-black text-slate-950 tracking-widest uppercase shadow-xl border-2 border-white animate-pulse">
              🔥 WOK FLAMBÉ VIP 🔥
            </div>
          </div>
        </div>
      )}

      {/* Floating Steam & Sizzle Sparks when cooking */}
      {isCooking && (
        <div className="absolute -top-14 left-16 flex gap-2 z-20">
          <span className="inline-block w-3 h-3 rounded-full bg-slate-200/60 blur-[1px] animate-ping" />
          <span className="inline-block w-4 h-4 rounded-full bg-slate-100/70 blur-[1px] animate-pulse delay-100" />
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-200/60 blur-[1px] animate-bounce delay-200" />
        </div>
      )}

      {/* Large Chef Character Illustration (Vector SVG) */}
      <div
        className={`relative transition-transform duration-200 ${
          isVipFlame
            ? 'scale-115'
            : isCooking
            ? 'translate-y-[-4px] rotate-[-1.5deg]'
            : isServing
            ? 'scale-110 translate-y-[-6px]'
            : 'translate-y-0'
        }`}
      >
        <svg viewBox="0 0 180 200" className="w-48 h-52 sm:w-56 sm:h-60 filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]">
          {/* Chef Tall Hat with Golden Accent */}
          <g className={`transition-transform duration-150 ${isCooking ? 'animate-pulse' : ''}`}>
            <ellipse cx="90" cy="46" rx="42" ry="20" fill="#ffffff" />
            <path
              d="M52 46 C50 20, 64 6, 78 8 C82 0, 98 0, 102 8 C116 6, 130 20, 128 46 Z"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="2.5"
            />
            {/* Hat Creases */}
            <path d="M74 24 Q80 38 76 46" stroke="#cbd5e1" strokeWidth="2.5" fill="none" />
            <path d="M90 16 Q90 34 90 46" stroke="#cbd5e1" strokeWidth="2.5" fill="none" />
            <path d="M106 24 Q100 38 104 46" stroke="#cbd5e1" strokeWidth="2.5" fill="none" />
            {/* Hat Band */}
            <rect x="56" y="44" width="68" height="12" rx="4" fill="#dc2626" />
            <circle cx="90" cy="50" r="3" fill="#facc15" />
          </g>

          {/* Chef Head / Face */}
          <circle cx="90" cy="70" r="26" fill="#fed7aa" stroke="#fbbf24" strokeWidth="1" />
          {/* Ears */}
          <circle cx="64" cy="70" r="6" fill="#fdba74" />
          <circle cx="116" cy="70" r="6" fill="#fdba74" />
          
          {/* Chef Eyes */}
          {isServing ? (
            // Happy cheerful eyes ^ ^
            <g stroke="#0f172a" strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M77 66 Q82 58 87 66" />
              <path d="M93 66 Q98 58 103 66" />
            </g>
          ) : isVipFlame ? (
            // Excited starry fire eyes
            <g fill="#0f172a">
              <circle cx="81" cy="65" r="4.5" fill="#f59e0b" />
              <circle cx="81" cy="65" r="2.5" fill="#0f172a" />
              <circle cx="99" cy="65" r="4.5" fill="#f59e0b" />
              <circle cx="99" cy="65" r="2.5" fill="#0f172a" />
              <circle cx="83" cy="63" r="1.2" fill="#ffffff" />
              <circle cx="101" cy="63" r="1.2" fill="#ffffff" />
            </g>
          ) : (
            // Friendly focused cooking eyes
            <g fill="#0f172a">
              <circle cx="81" cy="67" r="3.5" />
              <circle cx="99" cy="67" r="3.5" />
              <circle cx="82" cy="65.5" r="1.2" fill="#ffffff" />
              <circle cx="100" cy="65.5" r="1.2" fill="#ffffff" />
            </g>
          )}

          {/* Rosy Cheeks */}
          <circle cx="74" cy="74" r="4.5" fill="#fca5a5" opacity="0.8" />
          <circle cx="106" cy="74" r="4.5" fill="#fca5a5" opacity="0.8" />

          {/* Big Italian/Street Chef Mustache */}
          <path
            d="M90 75 C85 72, 78 72, 72 78 C79 81, 86 78, 90 75 C94 78, 101 81, 108 78 C102 72, 95 72, 90 75 Z"
            fill="#451a03"
          />
          {/* Big Warm Smile */}
          <path d="M85 81 Q90 87 95 81" stroke="#991b1b" strokeWidth="2.5" fill="none" strokeLinecap="round" />

          {/* Chef Jacket & Apron */}
          <path d="M66 94 L114 94 L124 170 L56 170 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2.5" />
          {/* Red Neckerchief */}
          <path d="M80 94 L90 106 L100 94 Z" fill="#dc2626" />
          {/* Gold Buttons */}
          <circle cx="82" cy="110" r="2.5" fill="#eab308" />
          <circle cx="98" cy="110" r="2.5" fill="#eab308" />
          <circle cx="82" cy="126" r="2.5" fill="#eab308" />
          <circle cx="98" cy="126" r="2.5" fill="#eab308" />
          <circle cx="82" cy="142" r="2.5" fill="#eab308" />
          <circle cx="98" cy="142" r="2.5" fill="#eab308" />

          {/* Left Arm holding Spatula */}
          <g
            className={`transition-transform duration-100 origin-[66px_100px] ${
              isCooking ? 'rotate-15' : ''
            }`}
          >
            <path d="M66 100 Q44 114 50 132" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" fill="none" />
            <circle cx="50" cy="132" r="6" fill="#fed7aa" />
            <line x1="50" y1="132" x2="40" y2="152" stroke="#94a3b8" strokeWidth="3.5" />
            <rect x="33" y="150" width="14" height="16" rx="2.5" fill="#64748b" transform="rotate(-15 33 150)" />
          </g>

          {/* Right Arm holding Heavy Wok */}
          <g
            className={`transition-transform duration-100 origin-[114px_100px] ${
              isCooking ? '-rotate-15 translate-y-[-3px]' : ''
            }`}
          >
            <path d="M114 100 Q136 114 130 132" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" fill="none" />
            <circle cx="130" cy="132" r="6" fill="#fed7aa" />
            {/* Pan handle */}
            <line x1="130" y1="132" x2="142" y2="142" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
            {/* Wok Bowl */}
            <ellipse cx="152" cy="148" rx="19" ry="9" fill="#0f172a" />
            <ellipse cx="152" cy="145" rx="17" ry="7" fill={isVipFlame ? '#f59e0b' : '#334155'} />
          </g>
        </svg>
      </div>

      {/* Chef speech / emotion bubble */}
      {isServing && (
        <div className="absolute -top-14 -right-10 z-30 animate-bounce">
          <div className="px-3.5 py-1.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs shadow-2xl border-2 border-white flex items-center gap-1.5">
            <span>¡Marchando orden lista! 🛎️</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const KitchenCounter: React.FC<{
  currentDish?: FoodOrder | null;
  speedMultiplier: number;
}> = ({ currentDish, speedMultiplier }) => {
  return (
    <div className="relative w-full select-none">
      {/* Upper Awning / Toldo de Puesto Callejero con Luces Neón */}
      <div className="relative w-full h-12 overflow-hidden rounded-t-2xl shadow-xl">
        <div
          className="w-full h-full flex"
          style={{
            background: 'repeating-linear-gradient(90deg, #b91c1c, #b91c1c 26px, #f8fafc 26px, #f8fafc 52px)',
          }}
        />
        {/* Scalloped cloth fringe */}
        <div
          className="absolute bottom-0 w-full h-3 flex"
          style={{
            background: 'radial-gradient(circle at 13px 0, transparent 11px, #991b1b 11px)',
            backgroundSize: '26px 12px',
          }}
        />
        {/* Neon Title Bar */}
        <div className="absolute inset-x-0 top-1.5 flex items-center justify-center">
          <div className="px-3.5 py-1 rounded-full bg-slate-950/90 backdrop-blur-md border border-amber-400/60 text-xs font-black text-amber-300 tracking-wider flex items-center gap-2 shadow-lg">
            <span>🥢 STREET FOOD RUSH</span>
            <span className="text-slate-600">·</span>
            <span className="text-cyan-400 font-mono text-[11px]">
              {speedMultiplier > 1.2 ? `🔥 BOOST x${speedMultiplier.toFixed(1)} VELOZ` : 'EN DIRECTO'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Counter Surface */}
      <div className="relative w-full bg-gradient-to-b from-[#38281f] via-[#241a14] to-[#140e0b] border-y-2 border-[#5c402c] px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
        {/* Condiments / Sauces shelf */}
        <div className="flex items-end gap-1.5 opacity-90 shrink-0">
          <div className="w-4 h-10 rounded-t-md bg-red-600 border border-red-400/60 relative shadow-sm" title="Kétchup">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-2.5 bg-yellow-400 rounded-t-sm" />
          </div>
          <div className="w-4 h-9 rounded-t-md bg-yellow-400 border border-yellow-200/60 relative shadow-sm" title="Mostaza">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-2.5 bg-red-600 rounded-t-sm" />
          </div>
          <div className="w-4 h-11 rounded-t-md bg-emerald-600 border border-emerald-400/60 relative shadow-sm" title="Ají Criollo">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-2 h-3 bg-white rounded-t-sm" />
          </div>
          <div className="w-4 h-12 rounded-t-md bg-amber-950 border border-amber-700/60 relative shadow-sm" title="Salsa de Soya">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-2 h-3 bg-red-500 rounded-t-sm" />
          </div>
        </div>

        {/* Center: Active Cooking Pan / Wok Surface */}
        <div className="flex-1 flex flex-col items-center">
          {currentDish ? (
            <div className="flex flex-col items-center gap-1.5 w-full max-w-[260px]">
              {/* Dish being cooked info card */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/80 border border-amber-500/50 backdrop-blur-md w-full justify-between shadow-lg">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-2xl animate-bounce">{currentDish.dishEmoji}</span>
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-bold text-white truncate">{currentDish.dishName}</span>
                    <span className="text-[10px] text-cyan-300 font-mono truncate">Para @{currentDish.username}</span>
                  </div>
                </div>
                {currentDish.isVip && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-300 border border-amber-400 text-[10px] font-black shrink-0 animate-pulse">
                    VIP 👑
                  </span>
                )}
              </div>

              {/* Cooking Progress Bar */}
              <div className="w-full bg-slate-950/90 h-3 rounded-full overflow-hidden border border-slate-700 relative shadow-inner">
                <div
                  className={`h-full transition-all duration-150 rounded-full ${
                    currentDish.isVip
                      ? 'bg-gradient-to-r from-red-500 via-amber-400 to-yellow-300 shadow-[0_0_15px_#f59e0b]'
                      : 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-lime-300 shadow-[0_0_10px_#22d3ee]'
                  }`}
                  style={{ width: `${currentDish.cookProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-200/80 font-mono py-2 font-bold">
              <span className="animate-pulse">🔥 Wok caliente · ¡Envía 1 🌹 para tu orden!</span>
            </div>
          )}
        </div>

        {/* Traditional Kitchen Bell */}
        <div className="flex flex-col items-center shrink-0">
          <div className="w-8 h-6 rounded-t-full bg-gradient-to-t from-amber-500 to-yellow-300 border border-amber-200 shadow-md relative">
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-800" />
          </div>
          <div className="w-10 h-2 bg-slate-700 rounded-sm" />
          <span className="text-[9px] font-extrabold text-amber-400 font-mono mt-0.5">ORDEN</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Escenario de Mercado Callejero Neón (Farolillos, Tacos & Wok, Puesto nocturno de comida)
 */
export const StreetFoodScenery: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* Night Sky Gradient with city glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0c16] via-[#141224] to-[#0a0710]" />

      {/* Atmospheric Warm Street Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[420px] h-[360px] bg-gradient-to-b from-amber-600/15 via-rose-700/15 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Hanging Festive Lanterns (Farolillos Rojos Chinos/Callejeros) */}
      <div className="absolute top-2 inset-x-4 flex justify-between items-start z-10">
        {/* Left Lantern 1 */}
        <div className="flex flex-col items-center animate-bounce duration-1000">
          <div className="w-0.5 h-6 bg-amber-400/60" />
          <div className="w-7 h-9 rounded-2xl bg-gradient-to-b from-red-600 via-rose-600 to-amber-600 shadow-[0_0_16px_rgba(239,68,68,0.7)] border border-amber-300 flex items-center justify-center">
            <span className="text-[9px] font-black text-amber-200 font-mono">福</span>
          </div>
          <div className="w-2 h-3 bg-amber-400/80 rounded-b-sm" />
        </div>

        {/* Left Lantern 2 */}
        <div className="hidden sm:flex flex-col items-center animate-pulse">
          <div className="w-0.5 h-10 bg-amber-400/60" />
          <div className="w-6 h-8 rounded-xl bg-gradient-to-b from-amber-500 to-red-600 shadow-[0_0_14px_rgba(245,158,11,0.6)] border border-yellow-200 flex items-center justify-center">
            <span className="text-[8px] font-bold text-yellow-100">食</span>
          </div>
          <div className="w-1.5 h-2.5 bg-yellow-400/80 rounded-b-sm" />
        </div>

        {/* Center Neon Market Banner */}
        <div className="flex flex-col items-center pt-1">
          <div className="px-3 py-0.5 rounded-full bg-black/60 border border-amber-500/40 backdrop-blur-sm flex items-center gap-1.5 text-[10px] text-amber-300 font-mono font-bold shadow-md">
            <span>🏮 PUESTO DE COMIDA NOCTURNO</span>
          </div>
        </div>

        {/* Right Lantern 2 */}
        <div className="hidden sm:flex flex-col items-center animate-pulse delay-150">
          <div className="w-0.5 h-10 bg-amber-400/60" />
          <div className="w-6 h-8 rounded-xl bg-gradient-to-b from-amber-500 to-red-600 shadow-[0_0_14px_rgba(245,158,11,0.6)] border border-yellow-200 flex items-center justify-center">
            <span className="text-[8px] font-bold text-yellow-100">味</span>
          </div>
          <div className="w-1.5 h-2.5 bg-yellow-400/80 rounded-b-sm" />
        </div>

        {/* Right Lantern 1 */}
        <div className="flex flex-col items-center animate-bounce duration-1000 delay-300">
          <div className="w-0.5 h-6 bg-amber-400/60" />
          <div className="w-7 h-9 rounded-2xl bg-gradient-to-b from-red-600 via-rose-600 to-amber-600 shadow-[0_0_16px_rgba(239,68,68,0.7)] border border-amber-300 flex items-center justify-center">
            <span className="text-[9px] font-black text-amber-200 font-mono">吉</span>
          </div>
          <div className="w-2 h-3 bg-amber-400/80 rounded-b-sm" />
        </div>
      </div>

      {/* Hanging Wooden Chalkboard Food Menu Planks (Left & Right) */}
      <div className="absolute top-28 left-3 z-10 hidden sm:flex flex-col gap-1.5 opacity-85">
        <div className="px-2 py-1 rounded bg-[#201611]/90 border border-[#523824] shadow-md text-[9px] font-mono text-amber-300 flex items-center gap-1">
          <span>🍟 Papas</span>
          <span className="text-slate-400">1🌹</span>
        </div>
        <div className="px-2 py-1 rounded bg-[#201611]/90 border border-[#523824] shadow-md text-[9px] font-mono text-amber-300 flex items-center gap-1">
          <span>🍲 Chaufa</span>
          <span className="text-slate-400">1🌹</span>
        </div>
      </div>

      <div className="absolute top-28 right-3 z-10 hidden sm:flex flex-col gap-1.5 opacity-85">
        <div className="px-2 py-1 rounded bg-[#201611]/90 border border-[#523824] shadow-md text-[9px] font-mono text-amber-300 flex items-center gap-1">
          <span>🍔 Burger</span>
          <span className="text-slate-400">1🌹</span>
        </div>
        <div className="px-2 py-1 rounded bg-amber-950/80 border border-amber-500/50 shadow-md text-[9px] font-mono text-amber-300 font-bold flex items-center gap-1">
          <span>👑 Wok VIP</span>
          <span className="text-amber-400">5💎</span>
        </div>
      </div>

      {/* Steaming Stock Pot on the side */}
      <div className="absolute bottom-28 left-4 z-10 opacity-75 hidden sm:block">
        <div className="relative flex flex-col items-center">
          {/* Steam puffs */}
          <div className="flex gap-1 -mb-1 animate-pulse">
            <span className="w-1.5 h-4 bg-white/40 blur-[1px] rounded-full" />
            <span className="w-2 h-5 bg-white/30 blur-[1px] rounded-full" />
          </div>
          {/* Big Pot */}
          <div className="w-10 h-10 rounded-b-xl bg-gradient-to-b from-slate-400 to-slate-600 border border-slate-300 shadow-md flex items-center justify-center">
            <span className="text-[8px] font-mono font-bold text-slate-800">CALDO</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Guía visual de la interfaz de TikTok LIVE (para previsualizar en GamesView)
 */
export const TikTokLiveSafeZoneGuide: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-between p-3 select-none">
      {/* Top TikTok UI Mock */}
      <div className="w-full flex items-center justify-between opacity-75">
        <div className="flex items-center gap-2 bg-black/60 px-2 py-1 rounded-full border border-white/10">
          <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] font-bold text-slate-950">
            LIVE
          </div>
          <div className="flex flex-col pr-1">
            <span className="text-[10px] font-bold text-white leading-tight">@tu_canal_tiktok</span>
            <span className="text-[8px] text-slate-400">1.2k espectadores</span>
          </div>
        </div>
        <div className="px-2 py-1 rounded-full bg-black/50 text-[10px] font-mono text-slate-400 border border-white/10">
          ✕ Salir
        </div>
      </div>

      {/* Bottom TikTok UI Mock (Chat & Gift Box) */}
      <div className="w-full space-y-2 opacity-80 pb-2">
        {/* Mock scrolling chat messages */}
        <div className="max-w-[240px] space-y-1">
          <div className="bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-xl text-[10px] text-white">
            <span className="font-bold text-amber-300">@carlos_live: </span>
            <span>¡Qué rico se ve ese chaufa! 🤤</span>
          </div>
          <div className="bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-xl text-[10px] text-white">
            <span className="font-bold text-cyan-300">@maria_tiktok: </span>
            <span>¡Envié una rosa chef! 🌹</span>
          </div>
        </div>

        {/* Mock TikTok bottom action bar */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex-1 bg-black/60 border border-white/10 rounded-full px-3 py-1.5 text-[10px] text-slate-400">
            Añadir comentario...
          </div>
          <div className="w-8 h-8 rounded-full bg-rose-600/90 flex items-center justify-center text-xs shadow-lg">
            🌹
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-500/90 flex items-center justify-center text-xs shadow-lg">
            🎁
          </div>
        </div>
      </div>
    </div>
  );
};
