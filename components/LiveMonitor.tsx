import React, { useMemo } from 'react';
import { useLive } from '../hooks/useLive';
import { LiveExamCard } from './live/LiveExamCard';
import { AlertCircle, Clock } from 'lucide-react';

export const LiveMonitor: React.FC = () => {
  const { liveExams, stats, togglePresence, completeExam, now, hasData } = useLive();

  if (!hasData) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 italic gap-4">
        <AlertCircle size={48} className="opacity-20" />
        <p>Keine Prüfungstage konfiguriert.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 mb-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter mb-1">Live-Monitor</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-cyan-400 tracking-wide mt-0.5">
                Echtzeit Überwachung
              </span>
            </div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              {now.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}
            </span>
          </div>
        </div>

        <div className="w-full md:w-64 space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Tagesfortschritt
            </span>
            <span className="text-xs font-bold text-cyan-400">
              {stats.completed} / {stats.total}
            </span>
          </div>
          <div className="h-2 bg-slate-900/60 rounded-full overflow-hidden border border-slate-700/30">
            <div
              className="h-full bg-cyan-600 shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-1000 ease-out"
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="flex-1 overflow-y-auto pr-2 -mr-2 no-scrollbar pb-10">
        {liveExams.length === 0 ? (
          <div className="h-64 glass-nocturne border-dashed border-slate-700/50 flex flex-col items-center justify-center gap-4 text-slate-500 italic">
            <Clock size={40} className="opacity-10" />
            <p className="text-sm">Aktuell keine anstehenden Prüfungen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveExams.map(
              ({
                exam,
                student,
                room,
                prepRoom,
                status,
                isUrgent,
                examTimeStr,
                prepTimeStr,
                canComplete,
              }) => (
                <LiveExamCard
                  key={exam.id}
                  exam={exam}
                  student={student}
                  room={room}
                  prepRoom={prepRoom}
                  status={status}
                  isUrgent={isUrgent}
                  examTimeStr={examTimeStr}
                  prepTimeStr={prepTimeStr}
                  canComplete={canComplete}
                  onTogglePresence={togglePresence}
                  onComplete={completeExam}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};
