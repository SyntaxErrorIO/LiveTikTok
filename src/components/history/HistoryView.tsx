import React, { useState } from 'react';
import {
  History,
  Search,
  Trash2,
  Download,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  Gift,
  MessageSquare,
  Heart,
  UserPlus,
  Share2,
  FileText,
} from 'lucide-react';
import { ExecutionLog, TriggerType } from '../../types';
import { StorageService } from '../../services/storageService';

interface HistoryViewProps {
  history: ExecutionLog[];
  onClearHistory: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onClearHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<ExecutionLog | null>(null);

  const filteredLogs = history.filter((log) => {
    const matchesSearch =
      log.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.eventSummary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.overallStatus === statusFilter;
    const matchesType = typeFilter === 'all' || log.eventType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const exportCSV = () => {
    if (history.length === 0) return;
    const headers = ['ID', 'Fecha', 'Tipo', 'Origen', 'Usuario', 'Resumen', 'Estado', 'Tiempo(ms)'];
    const rows = history.map((h) => [
      h.id,
      new Date(h.eventTimestamp).toISOString(),
      h.eventType,
      h.source,
      `"${h.senderName}"`,
      `"${h.eventSummary.replace(/"/g, '""')}"`,
      h.overallStatus,
      h.executionTimeMs,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `livetrigger_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusIcon = (status: ExecutionLog['overallStatus']) => {
    switch (status) {
      case 'executed':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      case 'cooldown':
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case 'error':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      case 'no_match':
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getEventIcon = (type: TriggerType) => {
    switch (type) {
      case 'gift':
        return <Gift className="w-3.5 h-3.5 text-violet-400" />;
      case 'comment':
        return <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />;
      case 'like':
        return <Heart className="w-3.5 h-3.5 text-rose-400" />;
      case 'follow':
        return <UserPlus className="w-3.5 h-3.5 text-emerald-400" />;
      case 'share':
        return <Share2 className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#0E1322] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <History className="w-5 h-5 text-cyan-400" />
            Historial & Auditoría de Automatizaciones
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registro cronológico de eventos de transmisión procesados, acciones disparadas, tiempos de ejecución y bloqueos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={() => {
              if (confirm('¿Deseas vaciar todo el registro de historial?')) {
                onClearHistory();
              }
            }}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 disabled:opacity-40 border border-rose-800/40 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Vaciar Historial</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#0B0F1A] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por creador, usuario o regalo..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300"
          >
            <option value="all">Todos los estados</option>
            <option value="executed">Ejecutados</option>
            <option value="cooldown">En Cooldown</option>
            <option value="no_match">Sin Coincidencia</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300"
          >
            <option value="all">Todos los tipos</option>
            <option value="gift">Regalos</option>
            <option value="comment">Comentarios</option>
            <option value="like">Likes</option>
            <option value="follow">Follows</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl bg-[#0B0F1A] border border-slate-800 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="py-20 text-center">
            <History className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-400">No hay registros coincidentes</h3>
            <p className="text-xs text-slate-500 mt-1">
              Los eventos procesados por el motor de automatizaciones aparecerán listados aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Hora</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Resumen del Evento</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredLogs.map((log, idx) => (
                  <tr
                    key={`${log.id}-${idx}`}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-900/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap tabular-nums">
                      {new Date(log.eventTimestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {getEventIcon(log.eventType)}
                        <span className="capitalize text-slate-300">{log.eventType}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                      @{log.senderName}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                      {log.eventSummary}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(log.overallStatus)}
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            log.overallStatus === 'executed'
                              ? 'text-emerald-400'
                              : log.overallStatus === 'cooldown'
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {log.overallStatus === 'executed'
                            ? 'EJECUTADO'
                            : log.overallStatus === 'cooldown'
                            ? 'COOLDOWN'
                            : 'OMITIDO'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400 tabular-nums">
                      {log.executionTimeMs} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0E1322] border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Detalle del Evento #{selectedLog.id}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">
                    Usuario
                  </span>
                  <span className="font-bold text-white">@{selectedLog.senderName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">
                    Origen
                  </span>
                  <span className="font-mono text-cyan-400">{selectedLog.source}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">
                    Fecha y Hora
                  </span>
                  <span className="text-slate-300">
                    {new Date(selectedLog.eventTimestamp).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">
                    Tiempo Proceso
                  </span>
                  <span className="text-emerald-400 font-mono">
                    {selectedLog.executionTimeMs} ms
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-bold block mb-1">
                  Reglas Evaluadas ({selectedLog.matchedRules.length})
                </span>
                <div className="space-y-1.5">
                  {selectedLog.matchedRules.map((r, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-200">{r.ruleName}</span>
                      <span className="font-mono text-[10px] uppercase text-cyan-400">
                        {r.status} ({r.executedActionsCount} acciones)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
