import React from 'react';
import { FoodOrder } from '../types';

interface ServingDishTossProps {
  order: FoodOrder;
}

export const ServingDishToss: React.FC<ServingDishTossProps> = ({ order }) => {
  const diamonds = order.diamonds || 1;
  const isHighValue = diamonds >= 10;
  const isMediumValue = diamonds >= 5;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ willChange: 'transform, opacity' }}
    >
      <div
        className="relative flex flex-col items-center animate-[dishToss_1.4s_cubic-bezier(0.34,1.56,0.64,1)_forwards]"
        style={{ willChange: 'transform' }}
      >
        {/* Aura de calidad según monedas */}
        <div
          className={`absolute inset-0 rounded-full blur-xl opacity-80 animate-pulse ${
            isHighValue
              ? 'bg-gradient-to-t from-red-600 via-amber-400 to-yellow-300'
              : isMediumValue
              ? 'bg-gradient-to-t from-amber-500 via-orange-400 to-transparent'
              : 'bg-gradient-to-t from-cyan-400 via-blue-500 to-transparent'
          }`}
        />

        {/* Destellos y vapor según valor del regalo */}
        <div className="absolute -top-10 flex gap-2 items-center text-sm">
          <span className="animate-bounce text-xl">✨</span>
          {isHighValue && <span className="animate-pulse text-2xl">👑</span>}
          {isMediumValue && <span className="animate-bounce delay-100 text-lg">🌟</span>}
          <span className="w-3 h-8 bg-white/40 blur-[2px] rounded-full animate-pulse" />
        </div>

        {/* Plato servido con bandeja brillante y elastic bounce */}
        <div className="relative p-3 rounded-2xl bg-black/85 border-2 border-amber-400/80 shadow-[0_16px_36px_rgba(0,0,0,0.9),0_0_24px_rgba(245,158,11,0.6)] flex items-center gap-2.5 backdrop-blur-md">
          <div className="text-3xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] animate-bounce">
            {order.dishEmoji}
          </div>
          <div className="flex flex-col pr-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-extrabold flex items-center gap-1">
              <span>🍽️ ¡Servido para</span>
              <span className="text-white">@{order.username}!</span>
            </span>
            <span className="text-xs font-black text-white truncate max-w-[140px]">
              {order.dishName}
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400">
              +{order.pointsEarned} pts {order.comboCount && order.comboCount > 1 ? `· ¡Combo x${order.comboCount}!` : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
