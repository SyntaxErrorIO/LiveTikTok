import React from 'react';
import {
  Play,
  Copy,
  Edit2,
  Trash2,
  Gift,
  MessageSquare,
  Heart,
  UserPlus,
  Share2,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { AutomationRule, TriggerType } from '../../types';

interface RuleCardProps {
  rule: AutomationRule;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (rule: AutomationRule) => void;
  onEdit: (rule: AutomationRule) => void;
  onTest: (rule: AutomationRule) => void;
}

export const RuleCard: React.FC<RuleCardProps> = ({
  rule,
  onToggle,
  onDelete,
  onDuplicate,
  onEdit,
  onTest,
}) => {
  const getTriggerIcon = (type: TriggerType) => {
    switch (type) {
      case 'gift':
        return <Gift className="w-4 h-4 text-violet-400" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-cyan-400" />;
      case 'like':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'share':
        return <Share2 className="w-4 h-4 text-amber-400" />;
    }
  };

  const hasOverlay = rule.actions.some((a) => a.type === 'overlay_effect' && a.enabled);
  const hasSound = rule.actions.some((a) => a.type === 'sound_fx' && a.enabled);
  const hasTTS = rule.actions.some((a) => a.type === 'tts_speech' && a.enabled);

  return (
    <div
      className={`p-5 rounded-xl bg-[#0B0F1A] border transition-all flex flex-col justify-between space-y-4 ${
        rule.enabled
          ? 'border-slate-800/90 hover:border-slate-700 shadow-sm'
          : 'border-slate-800/40 opacity-70'
      }`}
    >
      <div>
        {/* Top Bar of Card */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
              {getTriggerIcon(rule.triggerType)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate">{rule.name}</h3>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold shrink-0 ${
                    rule.priority === 'high'
                      ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                      : rule.priority === 'medium'
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                  }`}
                >
                  {rule.priority}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">{rule.description}</p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={() => onToggle(rule.id)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
              rule.enabled ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                rule.enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Trigger Condition Badges */}
        <div className="mt-3.5 flex flex-wrap gap-1.5 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            Evento: <strong className="text-cyan-400 capitalize">{rule.triggerType}</strong>
          </span>

          {rule.conditions.giftName && rule.conditions.giftName !== 'all' && (
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              Regalo: <strong className="text-rose-400">{rule.conditions.giftName}</strong>
            </span>
          )}

          {rule.conditions.minDiamonds && (
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              Min: <strong className="text-amber-400">{rule.conditions.minDiamonds}💎</strong>
            </span>
          )}

          {rule.conditions.commentKeyword && (
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              Keyword:{' '}
              <strong className="text-emerald-400 font-sans">
                "{rule.conditions.commentKeyword}"
              </strong>
            </span>
          )}
        </div>

        {/* Actions Summary Badges */}
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <span className="text-[11px] text-slate-500">Acciones:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {hasOverlay && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 text-[10px]">
                <Sparkles className="w-3 h-3" />
                <span>Overlay</span>
              </span>
            )}
            {hasSound && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px]">
                <Volume2 className="w-3 h-3" />
                <span>Sonido</span>
              </span>
            )}
            {hasTTS && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px]">
                <span>TTS</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
        <div className="text-slate-500 font-mono text-[11px]">
          <span className="text-slate-300 font-bold tabular-nums">
            {rule.executionsCount}
          </span>{' '}
          disparos · cd {rule.cooldownSeconds}s
        </div>

        <div className="flex items-center gap-1.5">
          {/* Test Button */}
          <button
            onClick={() => onTest(rule)}
            title="Probar regla con evento simulado"
            className="p-1.5 rounded-md text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
          {/* Duplicate */}
          <button
            onClick={() => onDuplicate(rule)}
            title="Duplicar regla"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {/* Edit */}
          <button
            onClick={() => onEdit(rule)}
            title="Editar regla"
            className="p-1.5 rounded-md text-violet-400 hover:text-violet-300 hover:bg-slate-800 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {/* Delete */}
          <button
            onClick={() => onDelete(rule.id)}
            title="Eliminar regla"
            className="p-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
