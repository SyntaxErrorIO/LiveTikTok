import React, { useEffect, useState } from 'react';
import { FoodOrder } from '../types';
import { RealisticFoodItem } from './FoodRealisticVisuals';
import { Sparkles, Flame, Trophy, X, ChefHat, CheckCircle2 } from 'lucide-react';

interface FullScreenOrderShowcaseProps {
  order: FoodOrder | null;
  onClose: () => void;
  durationSec?: number;
}

export const FullScreenOrderShowcase: React.FC<FullScreenOrderShowcaseProps> = ({
  order,
  onClose,
  durationSec = 3.5,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!order) return;
    setProgress(100);

    const startTime = Date.now();
    const durationMs = durationSec * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPercent = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remainingPercent);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [order?.id, durationSec, onClose]);

  if (!order) return null;

  const isChaufa = order.dishName.toLowerCase().includes('chaufa');
  const isJugo = order.dishName.toLowerCase().includes('jugo');

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between p-4 bg-slate-950/92 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 select-none overflow-hidden">
      {/* Resplandor radial cinemático */}
      <div
        className={`absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] ${
          order.isVip
            ? 'from-amber-500 via-red-900 to-transparent'
            : isJugo
            ? 'from-cyan-400 via-blue-900 to-transparent'
            : 'from-amber-600 via-orange-950 to-transparent'
        }`}
      />

      {/* Partículas y destellos de celebración flotantes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-8 text-2xl animate-bounce delay-100">✨</div>
        <div className="absolute top-1/3 right-10 text-xl animate-pulse">🌟</div>
        <div className="absolute bottom-1/3 left-12 text-3xl animate-bounce delay-200">
          {order.isVip ? '🔥' : '✨'}
        </div>
        <div className="absolute bottom-1/4 right-8 text-2xl animate-pulse delay-300">🎉</div>
      </div>

      {/* BARRA SUPERIOR: Banner de Anuncio & Botón Cerrar */}
      <div className="relative z-10 w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-red-600 border border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center gap-1.5">
            <ChefHat className="w-4 h-4 text-white" />
            <span className="text-[11px] font-black tracking-widest text-white uppercase">
              ¡ORDEN EN TODA LA PANTALLA!
            </span>
          </div>
          {order.isVip && (
            <span className="px-2 py-0.5 rounded-full bg-red-600/40 border border-red-400 text-[10px] font-black text-red-200 flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-400 fill-red-400" />
              VIP FLAMBÉ
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Cerrar presentación"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ZONA CENTRAL: Visual Realista del Plato Servido + Vapor / Resplandor */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-2 max-w-full">
        {/* Renderizado de alta definición del plato */}
        <div className="relative transform hover:scale-105 transition-transform duration-300">
          <RealisticFoodItem dishName={order.dishName} dishEmoji={order.dishEmoji} size="xl" />
        </div>

        {/* Nombre del plato con tipografía imponente de transmisión en vivo */}
        <div className="text-center mt-3 max-w-sm px-2">
          <div className="inline-block px-3 py-0.5 rounded-full bg-black/60 border border-amber-500/40 text-[10px] font-bold text-amber-300 mb-1">
            {order.giftName ? `Regalo: ${order.giftName} (${order.diamonds} 💎)` : '¡Regalo de TikTok LIVE!'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] bg-gradient-to-r from-amber-200 via-white to-amber-300 bg-clip-text text-transparent">
            {order.dishName}
          </h2>
          <p className="text-xs text-slate-300 font-medium mt-0.5">
            {isChaufa
              ? 'Arroz chaufa al wok humeante preparado al momento para el Live'
              : isJugo
              ? 'Solo Jugo frutal helado con cañita y cubos de hielo refrescantes'
              : 'Preparación especial directo a la mesa del espectador'}
          </p>
        </div>
      </div>

      {/* ZONA INFERIOR: Tarjeta del Espectador / Cliente de TikTok */}
      <div className="relative z-10 w-full max-w-md">
        <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-950/95 to-slate-900/90 border-2 border-amber-400/60 shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.3)] backdrop-blur-xl flex items-center justify-between gap-3">
          {/* Avatar del espectador */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 bg-slate-800 shadow-[0_0_12px_rgba(245,158,11,0.5)] shrink-0">
              {order.avatarUrl ? (
                <img src={order.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-amber-300 text-lg bg-gradient-to-br from-amber-900 to-slate-950">
                  {order.username[0]?.toUpperCase()}
                </div>
              )}
              {order.isVip && (
                <span className="absolute -top-1 -right-1 text-sm filter drop-shadow">👑</span>
              )}
            </div>

            {/* Datos del usuario */}
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ¡Cliente que ordenó!
              </span>
              <span className="text-sm font-black text-white truncate max-w-[180px]">
                @{order.username}
              </span>
              <span className="text-[11px] text-slate-300 truncate">
                {order.nickname || order.username}
              </span>
            </div>
          </div>

          {/* Puntos y recompensa */}
          <div className="flex flex-col items-end shrink-0 pl-2 border-l border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono">Puntos Ganados</span>
            <span className="font-mono font-black text-sm text-emerald-400 tabular-nums">
              +{order.pointsEarned} pts
            </span>
            <span className="text-[9px] font-bold text-amber-300 font-mono">
              Top #{Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1))} Hoy
            </span>
          </div>
        </div>

        {/* Barra de progreso de tiempo restante antes de volver al juego */}
        <div className="mt-2 w-full bg-slate-900/80 h-1.5 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
