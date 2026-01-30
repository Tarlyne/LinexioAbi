import { Clock, AlertTriangle, CheckSquare, UserCheck } from 'lucide-react';
import React from 'react';
import { LiveExamStatus } from '../../hooks/useLive';
import { Exam, Room, Student } from '../../types';

interface LiveExamCardProps {
  exam: Exam;
  student?: Student;
  room?: Room;
  prepRoom?: Room;
  status: LiveExamStatus;
  isUrgent: boolean;
  examTimeStr: string;
  prepTimeStr: string;
  canComplete: boolean;
  onTogglePresence: (id: string) => void;
  onComplete: (id: string) => void;
}

export const LiveExamCard = React.memo(
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
    onTogglePresence,
    onComplete,
  }: LiveExamCardProps) => {
    const getStatusTextColor = () => {
      if (status.phase === 'IN_EXAM' || status.phase === 'TAXI_TO_EXAM') return 'text-cyan-400';
      if (status.phase === 'IN_PREP' || status.phase === 'TAXI_TO_PREP') return 'text-amber-500';
      if (status.phase === 'CHECK_IN_WARNING') return 'text-red-500';
      return 'text-slate-400';
    };

    return (
      <div
        className={`glass-nocturne border transition-all duration-300 flex flex-col overflow-hidden shadow-xl border-slate-700/50 hover:bg-slate-800/40`}
      >
        {/* Header Section (Pure Text Labels) */}
        <div
          className={`px-4 py-2 flex justify-between items-center ${
            status.phase === 'TAXI_TO_PREP'
              ? 'bg-amber-500/15'
              : status.phase === 'TAXI_TO_EXAM'
                ? 'bg-cyan-500/15'
                : 'bg-slate-900/60'
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {isUrgent ? (
              <AlertTriangle size={14} className="text-red-500 animate-pulse shrink-0" />
            ) : (
              <Clock size={12} className="text-slate-500 shrink-0" />
            )}

            <div className="flex items-baseline gap-2 truncate">
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${getStatusTextColor()} ${status.isBlinking ? 'animate-pulse' : ''}`}
              >
                {status.label}
              </span>
              {status.countdown && (
                <span className="text-[10px] font-bold text-white opacity-60">
                  {status.countdown}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => onTogglePresence(exam.id)}
            className="w-8 h-8 flex items-center justify-center transition-all rounded-lg hover:bg-white/5 active:scale-90 shrink-0"
          >
            <UserCheck
              size={18}
              className={`transition-colors duration-300 ${
                exam.isPresent ? 'text-emerald-500' : 'text-slate-600 hover:text-slate-400'
              }`}
            />
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-[auto_1fr_auto] gap-x-5 gap-y-1 items-center">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest text-center">
              Vorb.
            </span>
            <div />
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest text-center">
              Prüf.
            </span>

            <div className="w-14 h-11 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center justify-center">
              <span className="text-xs font-bold text-amber-500/80">{prepRoom?.name || '--'}</span>
            </div>

            <div className="flex flex-col justify-center min-w-0">
              <div className="text-base font-black text-white truncate leading-tight tracking-tight">
                {student?.lastName}
              </div>
              <div className="text-xs font-medium text-slate-400 truncate">
                {student?.firstName}
              </div>
            </div>

            <div className="w-14 h-11 bg-cyan-500/5 border border-cyan-500/20 rounded-xl flex items-center justify-center">
              <span className="text-xs font-bold text-cyan-400/80">{room?.name || '--'}</span>
            </div>

            <span className="text-[10px] font-bold text-amber-500/80 tracking-tighter text-center">
              {prepTimeStr}
            </span>

            <span className="text-[10px] font-bold text-cyan-500/60 uppercase tracking-widest truncate">
              {exam.subject}
            </span>

            <span className="text-[10px] font-bold text-cyan-500/80 tracking-tighter text-center">
              {examTimeStr}
            </span>
          </div>

          {canComplete && (
            <div className="mt-4">
              <button
                onClick={() => onComplete(exam.id)}
                className="w-full h-10 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-xl flex items-center justify-center gap-2 font-bold text-[11px] uppercase tracking-wider transition-all active:scale-95 animate-in slide-in-from-bottom-2 duration-300"
              >
                <CheckSquare size={14} /> Abschluss
              </button>
            </div>
          )}
        </div>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.exam.id === next.exam.id &&
      prev.exam.isPresent === next.exam.isPresent &&
      prev.isUrgent === next.isUrgent &&
      prev.canComplete === next.canComplete &&
      prev.status.phase === next.status.phase &&
      prev.status.countdown === next.status.countdown &&
      prev.status.label === next.status.label &&
      prev.status.isBlinking === next.status.isBlinking
    );
  }
);
