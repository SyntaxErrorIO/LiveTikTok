import React from 'react';
import { FileText } from 'lucide-react';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: any[];
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({
  isOpen,
  onClose,
  logs,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[#0B0F1A] border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            Registro de Auditoría y Eventos del Servidor
          </span>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
          >
            Cerrar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-1 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-center py-10 text-slate-500 font-sans">
              Sin registros de auditoría recientes.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-3 text-[11px]"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold text-[9px] uppercase ${
                        log.level === 'ERROR'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : log.level === 'WARN'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {log.category}
                    </span>
                    <span className="text-slate-300 font-sans font-medium">{log.message}</span>
                  </div>
                  {log.details && (
                    <div className="text-[10px] text-slate-500 truncate max-w-lg">
                      {JSON.stringify(log.details)}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
