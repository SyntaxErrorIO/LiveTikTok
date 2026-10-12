import React from 'react';
import { Gift, MessageSquare, Heart, UserPlus } from 'lucide-react';

interface PresetGift {
  name: string;
  diamonds: number;
  icon: string;
  color: string;
}

interface SimulatorControlPanelProps {
  senderUser: string;
  setSenderUser: (val: string) => void;
  giftPresets: PresetGift[];
  selectedPresetGift: string;
  onSelectGiftPreset: (p: PresetGift) => void;
  customDiamonds: number;
  setCustomDiamonds: (val: number) => void;
  repeatStreak: number;
  setRepeatStreak: (val: number) => void;
  onFireGift: () => void;
  commentText: string;
  setCommentText: (val: string) => void;
  onFireComment: () => void;
  onFireLike: () => void;
  onFireFollow: () => void;
}

export const SimulatorControlPanel: React.FC<SimulatorControlPanelProps> = ({
  senderUser,
  setSenderUser,
  giftPresets,
  selectedPresetGift,
  onSelectGiftPreset,
  customDiamonds,
  setCustomDiamonds,
  repeatStreak,
  setRepeatStreak,
  onFireGift,
  commentText,
  setCommentText,
  onFireComment,
  onFireLike,
  onFireFollow,
}) => {
  return (
    <div className="space-y-4">
      {/* User Identity settings for tests */}
      <div className="p-4 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-2">
        <span className="text-xs font-bold text-white block">Usuario Simulado</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">@</span>
          <input
            type="text"
            value={senderUser}
            onChange={(e) => setSenderUser(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* 1. Gift Simulator Card */}
      <div className="p-5 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-xs font-bold text-white flex items-center gap-2">
            <Gift className="w-4 h-4 text-violet-400" />
            Simulador de Regalos TikTok
          </span>
          <span className="text-[10px] font-mono text-amber-400">[SIMULACIÓN]</span>
        </div>

        {/* Quick Presets */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
            Regalos Populares de TikTok
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {giftPresets.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => onSelectGiftPreset(p)}
                className={`p-2 rounded-lg border text-center transition-all ${
                  selectedPresetGift === p.name
                    ? 'bg-slate-800 border-cyan-500/80 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-base">{p.icon}</div>
                <div className="text-[10px] font-bold truncate mt-0.5">{p.name}</div>
                <div className="text-[9px] font-mono text-slate-500">{p.diamonds}💎</div>
              </button>
            ))}
          </div>
        </div>

        {/* Diamonds & Repeat count */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Diamantes (💎)</label>
            <input
              type="number"
              min="1"
              value={customDiamonds}
              onChange={(e) => setCustomDiamonds(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Racha / Cantidad</label>
            <input
              type="number"
              min="1"
              value={repeatStreak}
              onChange={(e) => setRepeatStreak(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onFireGift}
          className="w-full py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-violet-400 to-cyan-400 hover:opacity-90 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
        >
          <Gift className="w-4 h-4 fill-current" />
          <span>Disparar Regalo: {repeatStreak}x {selectedPresetGift} ({customDiamonds}💎)</span>
        </button>
      </div>

      {/* 2. Chat / Comment Simulator Card */}
      <div className="p-5 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-xs font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            Simulador de Mensajes de Chat
          </span>
          <span className="text-[10px] font-mono text-amber-400">[SIMULACIÓN]</span>
        </div>

        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Texto del Mensaje</label>
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Escribe un mensaje de prueba..."
            className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {['!alerta', '!ruleta', 'gg streamer'].map((cmd) => (
            <button
              key={cmd}
              type="button"
              onClick={() => setCommentText(cmd)}
              className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700"
            >
              {cmd}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onFireComment}
          className="w-full py-2 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
          <span>Enviar Mensaje de Chat</span>
        </button>
      </div>

      {/* 3. Likes & Follow Quick Taps */}
      <div className="p-4 rounded-xl bg-[#0B0F1A] border border-slate-800 flex gap-3">
        <button
          type="button"
          onClick={onFireLike}
          className="flex-1 p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/50 text-left transition-all group"
        >
          <Heart className="w-4 h-4 text-rose-500 mb-1 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-bold text-white">+25 Likes (Taps)</div>
          <div className="text-[10px] text-slate-500">Ráfaga de pantalla</div>
        </button>

        <button
          type="button"
          onClick={onFireFollow}
          className="flex-1 p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-left transition-all group"
        >
          <UserPlus className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-bold text-white">Nuevo Seguidor</div>
          <div className="text-[10px] text-slate-500">Alerta de follow</div>
        </button>
      </div>
    </div>
  );
};
