import React, { useState } from 'react';
import { X, Sliders } from 'lucide-react';
import { AutomationRule, OverlayEffect } from '../../types';
import { RuleConditionForm } from './RuleConditionForm';
import { RuleActionForm } from './RuleActionForm';

interface RuleEditorModalProps {
  rule: AutomationRule;
  effects: OverlayEffect[];
  isNew: boolean;
  onSave: (rule: AutomationRule) => void;
  onClose: () => void;
}

export const RuleEditorModal: React.FC<RuleEditorModalProps> = ({
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
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 text-xs">
          <RuleConditionForm
            formData={formData}
            setFormData={setFormData}
            updateCondition={updateCondition}
          />

          <RuleActionForm
            formData={formData}
            setFormData={setFormData}
            effects={effects}
          />

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
