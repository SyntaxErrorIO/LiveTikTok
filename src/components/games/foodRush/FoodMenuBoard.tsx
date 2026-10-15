import React, { useState } from 'react';
import { LIVE_MENU_ITEMS } from '../GameRegistry';
import { Sparkles, Utensils, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

interface FoodMenuBoardProps {
  initialExpanded?: boolean;
  isVertical?: boolean;
  onItemClick?: (menuItem: (typeof LIVE_MENU_ITEMS)[0]) => void;
}

export const FoodMenuBoard: React.FC<FoodMenuBoardProps> = ({
  initialExpanded = true,
  isVertical = true,
  onItemClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 border border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.25)] backdrop-blur-md text-amber-300 hover:text-white hover:border-amber-300 transition-all text-xs font-bold"
        title="Abrir Carta del Puesto en Pantalla"
      >
        <span className="text-sm">📜</span>
        <span>CARTA EN VIVO</span>
        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-[9px] font-mono border border-amber-400/40 text-amber-200">
          Flor 🥤 · Corazón 🍲
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
      </button>
    );
  }

  return (
    <div
      className={`relative select-none rounded-2xl overflow-hidden border border-amber-500/50 bg-gradient-to-b from-slate-950/95 via-slate-900/95 to-black/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_16px_rgba(245,158,11,0.2)] transition-all ${
        isVertical ? 'w-full max-w-[340px]' : 'w-full max-w-[380px]'
      }`}
    >
      {/* Resplandor superior sutil */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 via-amber-400 to-yellow-300" />

      {/* Cabecera de la Carta */}
      <div className="p-2.5 pb-1.5 flex items-center justify-between border-b border-slate-800/80 bg-black/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-sm shadow-md">
            📜
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wide text-white uppercase">
                Carta del Puesto
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-bold text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                EN VIVO
              </span>
            </div>
            <span className="text-[10px] text-amber-300/80 font-medium">
              Manda tu regalo en TikTok para pedir:
            </span>
          </div>
        </div>

        {/* Botón minimizar */}
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          title="Minimizar carta"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>

      {/* Lista de Platos de la Carta */}
      <div className="p-2 space-y-1.5">
        {LIVE_MENU_ITEMS.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => onItemClick && onItemClick(item)}
            className={`group relative flex items-center justify-between p-2 rounded-xl border transition-all ${
              item.isVip
                ? 'bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-slate-950/80 border-amber-500/40 hover:border-amber-400'
                : 'bg-slate-900/50 border-slate-800 hover:border-cyan-500/50'
            } ${onItemClick ? 'cursor-pointer hover:scale-[1.01]' : ''}`}
          >
            {/* Regalo Disparador y Plato */}
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              {/* Emoji de Plato con resplandor */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0 border shadow-inner ${
                  item.isVip
                    ? 'bg-amber-500/20 border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'bg-cyan-500/10 border-cyan-500/30'
                }`}
              >
                {item.emoji}
              </div>

              {/* Textos: Plato y Regalo que lo activa */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black text-white truncate group-hover:text-amber-300 transition-colors">
                    {item.dishName}
                  </span>
                  {item.isVip && (
                    <span className="px-1 py-0.2 rounded bg-red-600/30 border border-red-500/60 text-[8px] font-black text-red-300 uppercase">
                      VIP
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-amber-300 font-bold">
                  <span>{item.triggerGift}</span>
                </div>
              </div>
            </div>

            {/* Monedas requeridas */}
            <div className="shrink-0 flex flex-col items-end">
              <span className="font-mono font-black text-xs text-amber-400 tabular-nums">
                {item.coins} 💎
              </span>
              <span className="text-[9px] text-slate-400 font-medium">
                {item.coins === 1 ? 'Express' : 'Especial'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Pie de la Carta */}
      <div className="px-3 py-1.5 bg-black/60 border-t border-slate-900 flex items-center justify-between text-[9px] text-slate-400 font-mono">
        <span className="flex items-center gap-1 text-amber-300/90 font-bold">
          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
          ¡Sale en pantalla completa!
        </span>
        <span>Likes aceleran la cocción ⚡</span>
      </div>
    </div>
  );
};
