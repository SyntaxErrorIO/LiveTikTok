import React from 'react';
import { Sliders, Download, Upload, RotateCcw } from 'lucide-react';

interface BackupRestoreCardProps {
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetDefaults: () => void;
}

export const BackupRestoreCard: React.FC<BackupRestoreCardProps> = ({
  onExportJson,
  onImportJson,
  onResetDefaults,
}) => {
  return (
    <div className="p-5 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <span className="text-sm font-bold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          Gestión de Datos y Copias de Seguridad Locales
        </span>
      </div>

      <div className="space-y-3 text-xs">
        <p className="text-slate-400 leading-relaxed">
          Exporta tu configuración completa (reglas, efectos, filtros de chat) para transferirla a otra PC o hacer respaldo antes de un stream importante.
        </p>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onExportJson}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg font-semibold"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Exportar JSON</span>
          </button>

          <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg font-semibold cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Importar JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={onImportJson}
              className="hidden"
            />
          </label>
        </div>

        <div className="pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onResetDefaults}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-950/20 hover:bg-rose-900/30 border border-rose-800/40 text-rose-300 rounded-lg font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Plantillas Oficiales de Fábrica</span>
          </button>
        </div>
      </div>
    </div>
  );
};
