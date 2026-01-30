import React, { useState } from 'react';
import { useProtocols } from '../hooks/useProtocols';
import { CheckCircle2, Clock, MapPin, AlertCircle, FileStack, CheckCircle } from 'lucide-react';

export const ProtocolView: React.FC = () => {
  const { protocolBlocks, toggleProtocolCollected, now, hasData } = useProtocols();
  const [showCollected, setShowCollected] = useState(false);
  const [exitingIds, setExitingIds] = useState<string[]>([]);

  // Wrapper-Funktion für die Animation beim Abhaken
  const handleToggle = (examId: string, currentlyCollected: boolean) => {
    if (!currentlyCollected && !showCollected) {
      setExitingIds((prev) => [...prev, examId]);
      setTimeout(() => {
        toggleProtocolCollected(examId);
        setExitingIds((prev) => prev.filter((id) => id !== examId));
      }, 300);
    } else {
      toggleProtocolCollected(examId);
    }
  };

  const filteredBlocks = protocolBlocks.filter(
    (b) => showCollected || !b.isCollected || exitingIds.includes(b.lastExamId)
  );

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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 mb-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter mb-1">Protokolle</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
              <span className="text-[10px] font-bold text-indigo-400 tracking-wide mt-0.5">
                Logistik-Aufsicht
              </span>
            </div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              {now.toLocaleDateString('de-DE', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowCollected(!showCollected)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider ${
            showCollected
              ? 'bg-slate-800 border-slate-700 text-slate-300'
              : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20'
          }`}
        >
          {showCollected ? 'Erledigte ausblenden' : 'Erledigte anzeigen'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10 space-y-3">
        {filteredBlocks.length === 0 ? (
          <div className="h-64 glass-nocturne border-dashed border-slate-700/50 flex flex-col items-center justify-center gap-4 text-slate-500 italic">
            <CheckCircle size={40} className="opacity-10" />
            <p className="text-sm">Aktuell keine Protokoll-Abholungen ausstehend.</p>
          </div>
        ) : (
          filteredBlocks.map((block) => {
            const isExiting = exitingIds.includes(block.lastExamId);
            const isActuallyLate = block.status === 'LATE' && !block.isCollected;
            const isActuallyReady = block.status === 'READY' && !block.isCollected;

            return (
              <div
                key={block.lastExamId}
                className={`glass-nocturne border p-4 flex items-center justify-between transition-all duration-300 ${
                  isExiting ? 'animate-row-exit' : ''
                } ${
                  block.isCollected
                    ? 'opacity-40 border-slate-800 bg-slate-900/20 shadow-none'
                    : isActuallyLate
                      ? 'border-red-500/50 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                      : isActuallyReady
                        ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                        : 'border-slate-700/50 bg-slate-900/40'
                }`}
              >
                <div className="flex items-center gap-6 min-w-0 flex-1 mr-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border font-black transition-all shrink-0 ${
                      isActuallyLate
                        ? 'bg-red-500/20 border-red-500/40 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                        : isActuallyReady
                          ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                          : 'bg-slate-900/60 border-slate-700 text-slate-500'
                    }`}
                  >
                    <span className="text-[10px] leading-none mb-0.5 opacity-60">RAUM</span>
                    <span className="text-lg leading-none">{block.room.name}</span>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Clock
                        size={14}
                        className={
                          isActuallyLate
                            ? 'text-red-500'
                            : isActuallyReady
                              ? 'text-indigo-400'
                              : 'text-slate-500'
                        }
                      />
                      <span
                        className={`text-xl font-black tracking-tight ${
                          isActuallyLate
                            ? 'text-red-400'
                            : isActuallyReady
                              ? 'text-indigo-200'
                              : block.isCollected
                                ? 'text-slate-500'
                                : 'text-slate-300'
                        }`}
                      >
                        {block.pickupTimeStr} Uhr
                      </span>
                      {isActuallyLate && (
                        <span className="badge badge-red ml-2 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                          Überfällig
                        </span>
                      )}
                      {isActuallyReady && (
                        <span className="badge badge-indigo ml-2 shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                          Abholbereit
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium min-w-0">
                        <FileStack size={12} className="opacity-60 shrink-0" />
                        <span className="opacity-80 whitespace-nowrap">
                          {block.examsCount} {block.examsCount === 1 ? 'Protokoll' : 'Protokolle'}:
                        </span>
                        <span
                          className={`truncate font-bold ${block.isCollected ? 'text-indigo-400/50' : 'text-indigo-400'}`}
                        >
                          {block.studentNames.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleToggle(block.lastExamId, block.isCollected)}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 border-2 shrink-0 ${
                    block.isCollected
                      ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-900/40 border-slate-700 text-slate-600 hover:border-indigo-500 hover:text-indigo-400'
                  }`}
                >
                  <CheckCircle2 size={32} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
