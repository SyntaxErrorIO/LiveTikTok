import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { TestSuiteResult } from '../../services/apiService';

interface SimulatorTestReportProps {
  isOpen: boolean;
  onClose: () => void;
  testResults: TestSuiteResult | null;
}

export const SimulatorTestReport: React.FC<SimulatorTestReportProps> = ({
  isOpen,
  onClose,
  testResults,
}) => {
  if (!isOpen || !testResults) return null;

  return (
    <div className="p-5 rounded-2xl bg-[#090D17] border border-cyan-500/40 space-y-4 shadow-2xl animate-in fade-in">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
              testResults.success
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            }`}
          >
            {testResults.passed}/{testResults.total}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Informe de Pruebas Unitarias del Motor (Automatizado)
            </h3>
            <span className="text-[11px] text-slate-400">
              {testResults.success
                ? 'Todas las pruebas han sido verificadas exitosamente.'
                : 'Algunas pruebas requieren atención.'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800"
        >
          Cerrar Informe
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {testResults.results.map((res, i) => (
          <div
            key={i}
            className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5 text-xs"
          >
            {res.status === 'passed' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-200">{res.test}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">{res.details}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
