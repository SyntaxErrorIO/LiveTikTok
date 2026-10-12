import React from 'react';
import { AutomationRule, RulePriority, TriggerType } from '../../types';

interface RuleConditionFormProps {
  formData: AutomationRule;
  setFormData: React.Dispatch<React.SetStateAction<AutomationRule>>;
  updateCondition: (key: string, value: unknown) => void;
}

export const RuleConditionForm: React.FC<RuleConditionFormProps> = ({
  formData,
  setFormData,
  updateCondition,
}) => {
  return (
    <>
      {/* Rule Basic Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-slate-300 font-medium mb-1">Nombre de la Regla</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-1">Prioridad de Ejecución</label>
          <select
            value={formData.priority}
            onChange={(e) =>
              setFormData({ ...formData, priority: e.target.value as RulePriority })
            }
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="high">Alta (Regalos épicos, donaciones masivas)</option>
            <option value="medium">Media (Regalos estándar, follows)</option>
            <option value="low">Baja (Comandos de chat frecuentes, likes)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-slate-300 font-medium mb-1">Descripción</label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
        />
      </div>

      {/* Trigger selector */}
      <div className="pt-2 border-t border-slate-800">
        <label className="block text-slate-300 font-bold mb-2">
          Tipo de Evento Desencadenante
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {[
            { id: 'gift', label: 'Regalo 🎁' },
            { id: 'comment', label: 'Comentario 💬' },
            { id: 'like', label: 'Likes ❤️' },
            { id: 'follow', label: 'Follow 👤' },
            { id: 'share', label: 'Share 🔁' },
          ].map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setFormData({ ...formData, triggerType: t.id as TriggerType })}
              className={`py-2 px-2 text-center rounded-lg border font-semibold transition-all ${
                formData.triggerType === t.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conditions */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <span className="font-bold text-white block">Configurar Condiciones</span>

        {formData.triggerType === 'gift' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Nombre del Regalo (o 'all')</label>
              <input
                type="text"
                value={formData.conditions.giftName || ''}
                placeholder="Ej. Rosa, León, Galaxia o vacío para cualquiera"
                onChange={(e) => updateCondition('giftName', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Diamantes Mínimos (💎)</label>
              <input
                type="number"
                min="1"
                value={formData.conditions.minDiamonds ?? 1}
                onChange={(e) => updateCondition('minDiamonds', Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none"
              />
            </div>
          </div>
        )}

        {formData.triggerType === 'comment' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Palabra Clave en Chat</label>
              <input
                type="text"
                value={formData.conditions.commentKeyword || ''}
                placeholder="Ej. !alerta, gg, hola"
                onChange={(e) => updateCondition('commentKeyword', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Tipo de Coincidencia</label>
              <select
                value={formData.conditions.commentMatchType || 'contains'}
                onChange={(e) => updateCondition('commentMatchType', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none"
              >
                <option value="contains">Contiene la palabra</option>
                <option value="exact">Coincidencia exacta</option>
                <option value="starts_with">Comienza con</option>
              </select>
            </div>
          </div>
        )}

        {formData.triggerType === 'like' && (
          <div>
            <label className="block text-slate-400 mb-1">Cantidad Mínima de Likes por Ráfaga</label>
            <input
              type="number"
              min="1"
              value={formData.conditions.minLikeCount ?? 15}
              onChange={(e) => updateCondition('minLikeCount', Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none"
            />
          </div>
        )}

        {/* General Cooldown & Limits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-slate-400 mb-1">Tiempo de Enfriamiento (Cooldown en segundos)</label>
            <input
              type="number"
              min="0"
              max="600"
              value={formData.cooldownSeconds}
              onChange={(e) => setFormData({ ...formData, cooldownSeconds: Number(e.target.value) })}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Límite Máximo por Hora</label>
            <input
              type="number"
              min="1"
              max="5000"
              value={formData.maxPerHour}
              onChange={(e) => setFormData({ ...formData, maxPerHour: Number(e.target.value) })}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none font-mono"
            />
          </div>
        </div>
      </div>
    </>
  );
};
