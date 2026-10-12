import React from 'react';
import { Sparkles, Terminal, Bot } from 'lucide-react';

interface SimulatorPresetsBarProps {
  onTriggerPreset: (preset: 'galaxy' | 'lion' | 'universe' | 'comment_hype') => void;
  onSimulateDisconnect: () => void;
  onRunUnitTests: () => void;
  isRunningTests: boolean;
  isBotRunning: boolean;
  onToggleBot: () => void;
}

export const SimulatorPresetsBar: React.FC<SimulatorPresetsBarProps> = ({
  onTriggerPreset,
  onSimulateDisconnect,
  onRunUnitTests,
  isRunningTests,
  isBotRunning,
  onToggleBot,
}) => {
  return (
    <div className="p-4 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Disparadores Rápidos y Simulación Continua
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRunUnitTests}
            disabled={isRunningTests}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-800/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{isRunningTests ? 'Ejecutando Pruebas...' : 'Ejecutar Suite de Pruebas'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleBot}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isBotRunning
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>{isBotRunning ? 'Detener Bot Live' : 'Activar Bot Live'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        <button
          type="button"
          onClick={() => onTriggerPreset('galaxy')}
          className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-700 text-left transition-all"
        >
          <div className="text-xs font-bold text-violet-400">🌌 Galaxia (1K💎)</div>
          <div className="text-[10px] text-slate-400">Alerta épica</div>
        </button>
        <button
          type="button"
          onClick={() => onTriggerPreset('lion')}
          className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-700 text-left transition-all"
        >
          <div className="text-xs font-bold text-amber-400">🦁 León (30K💎)</div>
          <div className="text-[10px] text-slate-400">Rugido y jackpot</div>
        </button>
        <button
          type="button"
          onClick={() => onTriggerPreset('universe')}
          className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-700 text-left transition-all"
        >
          <div className="text-xs font-bold text-cyan-400">🪐 Universo (35K💎)</div>
          <div className="text-[10px] text-slate-400">Premio estelar</div>
        </button>
        <button
          type="button"
          onClick={() => onTriggerPreset('comment_hype')}
          className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-700 text-left transition-all"
        >
          <div className="text-xs font-bold text-emerald-400">💬 !alerta Chat</div>
          <div className="text-[10px] text-slate-400">Comando de texto</div>
        </button>
        <button
          type="button"
          onClick={onSimulateDisconnect}
          className="p-2.5 rounded-lg border border-amber-900/40 bg-amber-950/20 hover:bg-amber-950/40 hover:border-amber-700/60 text-left transition-all"
        >
          <div className="text-xs font-bold text-amber-300">🔌 Caída Proveedor</div>
          <div className="text-[10px] text-amber-200/70">Test reconexión</div>
        </button>
      </div>
    </div>
  );
};
