import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Play,
  Search,
  Trash2,
  Copy,
  Edit2,
  Gift,
  MessageSquare,
  Heart,
  UserPlus,
  Share2,
  Sparkles,
  Volume2,
  CheckCircle,
  X,
  Sliders,
} from 'lucide-react';
import {
  AutomationRule,
  OverlayEffect,
  RulePriority,
  SoundPresetId,
  TriggerType,
  RuleAction,
} from '../../types';
import { StorageService } from '../../services/storageService';
import { RuleEngine } from '../../services/ruleEngine';
import { AppSettings } from '../../types';

interface AutomationsViewProps {
  rules: AutomationRule[];
  effects: OverlayEffect[];
  settings: AppSettings;
  onUpdateRules: (rules: AutomationRule[]) => void;
  onTestRuleWithEvent: (rule: AutomationRule) => void;
}

export const AutomationsView: React.FC<AutomationsViewProps> = ({
  rules,
  effects,
  settings,
  onUpdateRules,
  onTestRuleWithEvent,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [testNotice, setTestNotice] = useState<string | null>(null);

  // Filtered rules
  const filteredRules = rules.filter((rule) => {
    const matchesFilter = filterType === 'all' || rule.triggerType === filterType;
    const matchesSearch =
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleToggleRule = (id: string) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    onUpdateRules(updated);
    StorageService.saveRules(updated);
  };

  const handleDeleteRule = (id: string) => {
    if (confirm('¿Deseas eliminar esta regla de automatización?')) {
      const updated = rules.filter((r) => r.id !== id);
      onUpdateRules(updated);
      StorageService.saveRules(updated);
    }
  };

  const handleDuplicateRule = (rule: AutomationRule) => {
    const newRule: AutomationRule = {
      ...rule,
      id: 'rule-' + Math.random().toString(36).substring(2, 9),
      name: `${rule.name} (Copia)`,
      executionsCount: 0,
      createdAt: Date.now(),
      lastTriggeredAt: undefined,
    };
    const updated = [newRule, ...rules];
    onUpdateRules(updated);
    StorageService.saveRules(updated);
  };

  const handleSaveRule = (saved: AutomationRule) => {
    let updated: AutomationRule[];
    if (isCreatingNew) {
      updated = [saved, ...rules];
    } else {
      updated = rules.map((r) => (r.id === saved.id ? saved : r));
    }
    onUpdateRules(updated);
    StorageService.saveRules(updated);
    setEditingRule(null);
    setIsCreatingNew(false);
  };

  const startCreateRule = () => {
    const blank: AutomationRule = {
      id: 'rule-' + Math.random().toString(36).substring(2, 9),
      name: 'Nueva Regla de Automatización',
      description: 'Disparar efectos cuando ocurra este evento en directo.',
      enabled: true,
      priority: 'medium',
      triggerType: 'gift',
      conditions: {
        minDiamonds: 1,
      },
      actions: [
        {
          id: 'act-' + Math.random().toString(36).substring(2, 9),
          type: 'overlay_effect',
          enabled: true,
          effectId: effects[0]?.id || 'eff-confetti-burst',
        },
        {
          id: 'act-' + Math.random().toString(36).substring(2, 9),
          type: 'sound_fx',
          enabled: true,
          soundId: 'chime',
          volume: 80,
        },
      ],
      cooldownSeconds: 3,
      maxPerHour: 200,
      executionsCount: 0,
      createdAt: Date.now(),
    };
    setEditingRule(blank);
    setIsCreatingNew(true);
  };

  const triggerTestRule = (rule: AutomationRule) => {
    onTestRuleWithEvent(rule);
    setTestNotice(`Evento de prueba disparado para "${rule.name}"`);
    setTimeout(() => setTestNotice(null), 3000);
  };

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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-5 rounded-2xl bg-[#0E1322] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-violet-400" />
            Motor de Automatizaciones & Reglas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configura qué efectos, sonidos y acciones se disparan automáticamente en vivo según el tipo de evento recibido.
          </p>
        </div>

        <button
          onClick={startCreateRule}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 rounded-lg shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nueva Regla</span>
        </button>
      </div>

      {testNotice && (
        <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{testNotice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#0B0F1A] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o descripción..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'gift', label: 'Regalos' },
            { id: 'comment', label: 'Comentarios' },
            { id: 'like', label: 'Likes' },
            { id: 'follow', label: 'Seguidores' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                filterType === tab.id
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-800/60 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rule Cards Grid */}
      {filteredRules.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-slate-800/80 bg-[#0B0F1A]">
          <Sliders className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">No se encontraron reglas</h3>
          <p className="text-xs text-slate-500 mt-1">
            Prueba ajustando los filtros de búsqueda o crea una nueva regla para comenzar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRules.map((rule) => {
            const hasOverlay = rule.actions.some((a) => a.type === 'overlay_effect' && a.enabled);
            const hasSound = rule.actions.some((a) => a.type === 'sound_fx' && a.enabled);
            const hasTTS = rule.actions.some((a) => a.type === 'tts_speech' && a.enabled);

            return (
              <div
                key={rule.id}
                className={`p-5 rounded-xl bg-[#0B0F1A] border transition-all flex flex-col justify-between space-y-4 ${
                  rule.enabled
                    ? 'border-slate-800/90 hover:border-slate-700 shadow-sm'
                    : 'border-slate-800/40 opacity-70'
                }`}
              >
                <div>
                  {/* Top Bar of Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                        {getTriggerIcon(rule.triggerType)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white truncate">{rule.name}</h3>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                              rule.priority === 'high'
                                ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                                : rule.priority === 'medium'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {rule.priority}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          ID: {rule.id}
                        </span>
                      </div>
                    </div>

                    {/* Enable Toggle Switch */}
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        rule.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          rule.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                    {rule.description}
                  </p>

                  {/* Conditions Summary */}
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80 text-[11px] text-slate-300 font-mono space-y-1">
                    <div className="text-slate-500 font-semibold uppercase text-[10px]">
                      Condición de Activación:
                    </div>
                    <div>
                      {rule.triggerType === 'gift' && (
                        <span>
                          Regalo {rule.conditions.giftName ? `"${rule.conditions.giftName}"` : 'Cualquiera'}
                          {rule.conditions.minDiamonds ? ` · Mínimo ${rule.conditions.minDiamonds} 💎` : ''}
                        </span>
                      )}
                      {rule.triggerType === 'comment' && (
                        <span>
                          Chat contiene "{rule.conditions.commentKeyword || '*'}"
                        </span>
                      )}
                      {rule.triggerType === 'like' && (
                        <span>
                          Taps recibidos &ge; {rule.conditions.minLikeCount || 1}
                        </span>
                      )}
                      {rule.triggerType === 'follow' && <span>Cualquier nuevo seguidor</span>}
                      {rule.triggerType === 'share' && <span>Transmisión compartida</span>}
                    </div>
                  </div>

                  {/* Action Badges */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {hasOverlay && (
                      <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-800/40">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        Alerta Overlay
                      </span>
                    )}
                    {hasSound && (
                      <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-violet-950/40 text-violet-300 border border-violet-800/40">
                        <Volume2 className="w-3 h-3 text-violet-400" />
                        Sonido FX
                      </span>
                    )}
                    {hasTTS && (
                      <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                        Voz TTS
                      </span>
                    )}
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
                      onClick={() => triggerTestRule(rule)}
                      title="Probar regla con evento simulado"
                      className="p-1.5 rounded-md text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    {/* Duplicate */}
                    <button
                      onClick={() => handleDuplicateRule(rule)}
                      title="Duplicar regla"
                      className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {/* Edit */}
                    <button
                      onClick={() => {
                        setEditingRule(rule);
                        setIsCreatingNew(false);
                      }}
                      title="Editar regla"
                      className="p-1.5 rounded-md text-violet-400 hover:text-violet-300 hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      title="Eliminar regla"
                      className="p-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Create Rule Modal */}
      {editingRule && (
        <RuleEditModal
          rule={editingRule}
          effects={effects}
          isNew={isCreatingNew}
          onSave={handleSaveRule}
          onClose={() => {
            setEditingRule(null);
            setIsCreatingNew(false);
          }}
        />
      )}
    </div>
  );
};

// Subcomponent: Rule Edit Modal
interface RuleEditModalProps {
  rule: AutomationRule;
  effects: OverlayEffect[];
  isNew: boolean;
  onSave: (rule: AutomationRule) => void;
  onClose: () => void;
}

const RuleEditModal: React.FC<RuleEditModalProps> = ({
  rule,
  effects,
  isNew,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<AutomationRule>({ ...rule });

  const updateCondition = (key: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        [key]: value,
      },
    }));
  };

  const handleToggleAction = (index: number) => {
    const updatedActions = [...formData.actions];
    updatedActions[index].enabled = !updatedActions[index].enabled;
    setFormData({ ...formData, actions: updatedActions });
  };

  const handleUpdateAction = (index: number, partial: Partial<RuleAction>) => {
    const updatedActions = [...formData.actions];
    updatedActions[index] = { ...updatedActions[index], ...partial };
    setFormData({ ...formData, actions: updatedActions });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#0E1322] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            {isNew ? 'Nueva Automatización' : `Editar: ${rule.name}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 text-xs">
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

          {/* Actions List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white block">Acciones a Ejecutar ({formData.actions.length})</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const newAct: RuleAction = {
                      id: 'act-' + Math.random().toString(36).substring(2, 9),
                      type: 'custom_message',
                      enabled: true,
                      customMessageText: '¡Atención al directo: {user} activó evento!',
                    };
                    setFormData({ ...formData, actions: [...formData.actions, newAct] });
                  }}
                  className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                >
                  + Mensaje
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newAct: RuleAction = {
                      id: 'act-' + Math.random().toString(36).substring(2, 9),
                      type: 'update_counter',
                      enabled: true,
                      counterId: 'cnt-roses-goal',
                      counterOperation: 'increment',
                      counterAmount: 'event_amount',
                    };
                    setFormData({ ...formData, actions: [...formData.actions, newAct] });
                  }}
                  className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700"
                >
                  + Contador
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newAct: RuleAction = {
                      id: 'act-' + Math.random().toString(36).substring(2, 9),
                      type: 'add_leaderboard_points',
                      enabled: true,
                      leaderboardCategory: 'general',
                      leaderboardPoints: 'event_diamonds',
                    };
                    setFormData({ ...formData, actions: [...formData.actions, newAct] });
                  }}
                  className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700"
                >
                  + Puntos MVP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newAct: RuleAction = {
                      id: 'act-' + Math.random().toString(36).substring(2, 9),
                      type: 'iot_device_order',
                      enabled: true,
                      deviceEndpoint: 'http://192.168.1.150/relay/0?turn=on',
                      deviceMethod: 'POST',
                      deviceCommandPayload: '{"state":"ON","trigger":"{gift}"}',
                      deviceTimeoutMs: 2000,
                    };
                    setFormData({ ...formData, actions: [...formData.actions, newAct] });
                  }}
                  className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-violet-300 rounded border border-slate-700"
                >
                  + Dispositivo IoT
                </button>
              </div>
            </div>

            {formData.actions.map((act, idx) => (
              <div
                key={act.id}
                className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={act.enabled}
                      onChange={() => handleToggleAction(idx)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500"
                    />
                    <span className="font-semibold text-slate-200">
                      {act.type === 'overlay_effect'
                        ? 'Alerta en Pantalla OBS'
                        : act.type === 'sound_fx'
                        ? 'Reproducir Sonido'
                        : act.type === 'tts_speech'
                        ? 'Locución de Voz (TTS)'
                        : act.type === 'custom_message'
                        ? 'Mensaje en Pantalla'
                        : act.type === 'update_counter'
                        ? 'Actualizar Contador de Transmisión'
                        : act.type === 'add_leaderboard_points'
                        ? 'Añadir Puntos a la Clasificación'
                        : act.type === 'iot_device_order'
                        ? 'Orden a Dispositivo / IoT Seguro'
                        : 'Acción personalizada'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = formData.actions.filter((_, i) => i !== idx);
                      setFormData({ ...formData, actions: updated });
                    }}
                    className="text-slate-500 hover:text-rose-400 p-0.5"
                    title="Eliminar acción"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {act.type === 'overlay_effect' && (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Diseño de Alerta</label>
                    <select
                      value={act.effectId}
                      onChange={(e) => handleUpdateAction(idx, { effectId: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                    >
                      {effects.map((eff) => (
                        <option key={eff.id} value={eff.id}>
                          {eff.name} ({eff.animationType})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {act.type === 'sound_fx' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Sonido Sintetizado</label>
                      <select
                        value={act.soundId}
                        onChange={(e) =>
                          handleUpdateAction(idx, { soundId: e.target.value as SoundPresetId })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                      >
                        <option value="chime">Chime Neón (Melódico)</option>
                        <option value="fanfare">Fanfarria Real (Épico)</option>
                        <option value="laser">Láser Cyber (Zap)</option>
                        <option value="coin">Monedas Arcade</option>
                        <option value="powerup">Power Up Ascendente</option>
                        <option value="explosion">Explosión con Filtro</option>
                        <option value="airhorn">Stream Airhorn</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Volumen ({act.volume}%)</label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={act.volume || 80}
                        onChange={(e) =>
                          handleUpdateAction(idx, { volume: Number(e.target.value) })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {act.type === 'tts_speech' && (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Mensaje a leer (Variables: {'{user}'}, {'{gift}'}, {'{amount}'}, {'{diamonds}'})
                    </label>
                    <input
                      type="text"
                      value={act.ttsTemplate || ''}
                      onChange={(e) => handleUpdateAction(idx, { ttsTemplate: e.target.value })}
                      placeholder="{user} envió {amount}x {gift}!"
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-mono"
                    />
                  </div>
                )}

                {act.type === 'custom_message' && (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Texto del Mensaje en Pantalla
                    </label>
                    <input
                      type="text"
                      value={act.customMessageText || ''}
                      onChange={(e) => handleUpdateAction(idx, { customMessageText: e.target.value })}
                      placeholder="¡Atención al directo: {user} activó evento!"
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-mono"
                    />
                  </div>
                )}

                {act.type === 'update_counter' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Contador Destino</label>
                      <select
                        value={act.counterId || 'cnt-roses-goal'}
                        onChange={(e) => handleUpdateAction(idx, { counterId: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                      >
                        <option value="cnt-roses-goal">Meta de Rosas</option>
                        <option value="cnt-diamonds-session">Diamantes Acumulados</option>
                        <option value="cnt-likes-rush">Ráfaga de Likes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Cantidad a Sumar</label>
                      <select
                        value={act.counterAmount || 'event_amount'}
                        onChange={(e) => handleUpdateAction(idx, { counterAmount: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                      >
                        <option value="event_amount">Cantidad del evento (ej. Rosas x5)</option>
                        <option value="event_diamonds">Diamantes del regalo</option>
                        <option value="1">+1 Unidad fija</option>
                      </select>
                    </div>
                  </div>
                )}

                {act.type === 'add_leaderboard_points' && (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Cálculo de Puntos MVP</label>
                    <select
                      value={act.leaderboardPoints || 'event_diamonds'}
                      onChange={(e) => handleUpdateAction(idx, { leaderboardPoints: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                    >
                      <option value="event_diamonds">Valor en Diamantes donados</option>
                      <option value="50">+50 Puntos fijos</option>
                      <option value="100">+100 Puntos fijos</option>
                    </select>
                  </div>
                )}

                {act.type === 'iot_device_order' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Dirección del Dispositivo / Smart Plug (HTTP/HTTPS)</label>
                      <input
                        type="text"
                        value={act.deviceEndpoint || ''}
                        onChange={(e) => handleUpdateAction(idx, { deviceEndpoint: e.target.value })}
                        placeholder="http://192.168.1.50/relay/0?turn=on"
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Método HTTP</label>
                        <select
                          value={act.deviceMethod || 'POST'}
                          onChange={(e) => handleUpdateAction(idx, { deviceMethod: e.target.value as any })}
                          className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                        >
                          <option value="POST">POST (JSON payload)</option>
                          <option value="GET">GET (URL query)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Timeout (ms)</label>
                        <input
                          type="number"
                          value={act.deviceTimeoutMs || 2000}
                          onChange={(e) => handleUpdateAction(idx, { deviceTimeoutMs: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-md transition-colors"
            >
              Guardar Regla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
