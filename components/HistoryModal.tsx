import React from 'react';
import { Modal } from './Modal';
import { HistoryLog } from '../types';
import { Clock, Plus, Edit2, Trash2, Shield, X, History } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: HistoryLog[];
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, logs }) => {
  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getIcon = (type: HistoryLog['type']) => {
    switch (type) {
      case 'create':
        return <Plus size={14} className="text-emerald-400" />;
      case 'update':
        return <Edit2 size={14} className="text-cyan-400" />;
      case 'delete':
        return <Trash2 size={14} className="text-red-400" />;
      default:
        return <Shield size={14} className="text-indigo-400" />;
    }
  };

  const getBg = (type: HistoryLog['type']) => {
    switch (type) {
      case 'create':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'update':
        return 'bg-cyan-500/10 border-cyan-500/20';
      case 'delete':
        return 'bg-red-500/10 border-red-500/20';
      default:
        return 'bg-indigo-500/10 border-indigo-500/20';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/30">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 text-slate-300">
              <History size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">System-Protokoll</h3>
              <p className="text-xs text-slate-500 font-medium">Zuletzt durchgeführte Änderungen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[60vh] space-y-3 no-scrollbar pr-1">
          {logs.length === 0 ? (
            <div className="py-20 text-center text-slate-600 italic">
              Noch keine Aktionen protokolliert.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="group relative flex gap-4 p-4 bg-slate-900/40 border border-slate-800 rounded-2xl transition-all hover:bg-slate-900/60 hover:border-slate-700"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${getBg(log.type)}`}
                >
                  {getIcon(log.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <h4 className="text-sm font-bold text-slate-200 truncate">{log.label}</h4>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {formatTime(log.timestamp)}
                    </span>
                  </div>

                  {log.details && log.details.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {log.details.map((detail, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] text-slate-400 flex items-start gap-2"
                        >
                          <div className="w-1 h-1 rounded-full bg-slate-700 mt-1.5 shrink-0" />
                          <span className="leading-tight">{detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t border-slate-700/30 flex justify-end">
          <button
            onClick={onClose}
            className="btn-secondary-glass px-8 h-11 rounded-xl text-xs uppercase tracking-widest font-bold"
          >
            Schließen
          </button>
        </div>
      </div>
    </Modal>
  );
};
