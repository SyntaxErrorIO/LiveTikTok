import React, { useState } from 'react';
import { Layers, Plus, Search, CheckCircle, Sliders, Zap } from 'lucide-react';
import { AutomationRule, OverlayEffect, AppSettings } from '../../types';
import { StorageService } from '../../services/storageService';
import { RuleCard } from './RuleCard';
import { RuleEditorModal } from './RuleEditorModal';
import { QuickGiftAlertModal } from './QuickGiftAlertModal';

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
  onUpdateRules,
  onTestRuleWithEvent,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isQuickAlertOpen, setIsQuickAlertOpen] = useState(false);
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

  const handleSaveQuickAlert = (rule: AutomationRule) => {
    const updated = [rule, ...rules];
    onUpdateRules(updated);
    StorageService.saveRules(updated);
    setTestNotice(`Alerta rápida para "${rule.name}" creada con éxito.`);
    setTimeout(() => setTestNotice(null), 4000);
  };

  const startCreateRule = () => {
    const blank: AutomationRule = {
      id: 'rule-' + Math.random().toString(36).substring(2, 9),
      name: 'Nueva Regla Personalizada',
      description: 'Regla de automatización para TikTok LIVE',
      enabled: true,
      priority: 'medium',
      triggerType: 'gift',
      conditions: {
        giftName: 'all',
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

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Gift Alert Wizard Button */}
          <button
            onClick={() => setIsQuickAlertOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-cyan-200 bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/40 rounded-lg shadow-sm transition-all"
          >
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>Alertas Rápidas de Regalo</span>
          </button>

          {/* Full Advanced Rule Button */}
          <button
            onClick={startCreateRule}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 rounded-lg shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nueva Regla</span>
          </button>
        </div>
      </div>

      {testNotice && (
        <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
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
          {filteredRules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={handleToggleRule}
              onDelete={handleDeleteRule}
              onDuplicate={handleDuplicateRule}
              onEdit={(r) => {
                setEditingRule(r);
                setIsCreatingNew(false);
              }}
              onTest={triggerTestRule}
            />
          ))}
        </div>
      )}

      {/* Quick Gift Alert Wizard Modal */}
      <QuickGiftAlertModal
        isOpen={isQuickAlertOpen}
        onClose={() => setIsQuickAlertOpen(false)}
        onSaveRule={handleSaveQuickAlert}
        effects={effects}
      />

      {/* Advanced Edit / Create Rule Modal */}
      {editingRule && (
        <RuleEditorModal
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
export default AutomationsView;
