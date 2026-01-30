import React from 'react';
import { Clock, X } from 'lucide-react';

interface WorkloadIndicatorProps {
  info: { time: string; count: number } | null;
  onClose: () => void;
}

/**
 * Floating indicator for exam workload at a specific time.
 * Category B Refactoring: Modularization.
 */
export const WorkloadIndicator: React.FC<WorkloadIndicatorProps> = ({ info, onClose }) => {
  if (!info) return null;

  const getWorkloadColor = (count: number) => {
    if (count <= 2) return 'bg-slate-700/40';
    if (count <= 4) return 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.4)]';
    return 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]';
  };

  const getWorkloadGlowStyle = (count: number) => {
    return {
      boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.9), 0 0 80px 4px rgba(6, 182, 212, 0.35)',
      borderColor: count >= 5 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(6, 182, 212, 0.4)',
    };
  };

  return (
    <div
      className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-6 fade-in duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="glass-modal p-5 flex items-center gap-6 min-w-[320px] max-w-[90vw] transition-all duration-500"
        style={getWorkloadGlowStyle(info.count)}
      >
        <div className="flex flex-col items-center justify-center border-r border-slate-700/50 pr-5 shrink-0">
          <Clock size={16} className={info.count >= 5 ? 'text-amber-500' : 'text-cyan-500'} />
          <span className="text-sm font-black text-white uppercase tracking-widest mt-1">
            {info.time}
          </span>
        </div>

        <div className="flex-1 flex items-center gap-4 min-w-0">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border border-white/10 ${getWorkloadColor(
              info.count
            )} text-white shadow-xl shrink-0 transition-all`}
          >
            {info.count}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-bold text-slate-100 tracking-tight leading-none">
              {info.count === 1 ? 'Aktive Prüfung' : 'Zeitgleiche Prüfungen'}
            </span>
            <p className="text-[10px] text-slate-500 font-medium mt-1 leading-tight">
              {info.count >= 5
                ? 'Achtung: Erhöhtes Aufkommen in diesem Zeitraum.'
                : 'Reguläre Auslastung in diesem Zeitfenster.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pl-2 border-l border-slate-700/30 shrink-0">
          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all active:scale-90"
            title="Schließen"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
