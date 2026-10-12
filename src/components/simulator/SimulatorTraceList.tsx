import React from 'react';
import { Clock, RotateCcw, Zap, CheckCircle2, XCircle } from 'lucide-react';
import { EvaluationResult } from '../../services/ruleEngine';

interface SimulatorTraceListProps {
  traces: EvaluationResult[];
  onClearTraces: () => void;
}

export const SimulatorTraceList: React.FC<SimulatorTraceListProps> = ({
  traces,
  onClearTraces,
}) => {
  return (
    <div className="lg:col-span-7 p-5 rounded-2xl bg-[#0B0F1A] border border-slate-800 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">
              Trazabilidad de Evaluación en Tiempo Real
            </h2>
          </div>
          <button
            type="button"
            onClick={onClearTraces}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpiar</span>
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Observa paso a paso qué condiciones evaluó el motor, qué reglas coincidieron y qué acciones se dispararon:
        </p>

        {traces.length === 0 ? (
          <div className="py-24 text-center">
            <Zap className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-400">Sin eventos evaluados</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Dispara un regalo o mensaje con los botones de la izquierda para ver el análisis en tiempo real.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {traces.map((trace, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#0E1322] border border-slate-800/90 text-xs space-y-2.5"
              >
                {/* Event Summary Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        trace.overallStatus === 'executed'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : trace.overallStatus === 'cooldown'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {trace.overallStatus === 'executed'
                        ? 'ACCIONES DISPARADAS'
                        : trace.overallStatus === 'cooldown'
                        ? 'EN COOLDOWN'
                        : 'SIN DISPARO'}
                    </span>
                    <span className="font-semibold text-white">
                      @{trace.event.user.username}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({trace.event.type.toUpperCase()})
                    </span>
                  </div>
                  <span className="font-mono text-slate-500 text-[11px]">
                    {trace.executionTimeMs} ms
                  </span>
                </div>

                {/* Matched Rules Breakdown */}
                <div className="space-y-1.5 pt-1">
                  {trace.matchedRules.length === 0 ? (
                    <div className="text-[11px] text-slate-500 italic pl-2 border-l border-slate-800">
                      Ninguna regla activa coincidió con las condiciones de este evento.
                    </div>
                  ) : (
                    trace.matchedRules.map((m, mIdx) => (
                      <div
                        key={mIdx}
                        className="p-2 rounded bg-slate-900/80 border border-slate-800/60 flex items-start gap-2"
                      >
                        {m.status === 'executed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : m.status === 'cooldown_blocked' ? (
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">
                              {m.rule.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {m.actionsExecuted} acciones
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{m.reason}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
