
import React from 'react';
import { Exam, Student, Teacher, Room } from '../../types';
import { Check, AlertCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useData } from '../../context/DataContext';

interface ExamCardProps {
  exam: Exam;
  student?: Student;
  teacher?: Teacher;
  chair?: Teacher;
  protocol?: Teacher;
  prepRoom?: Room;
  hasConflict: boolean;
  onEdit: (exam: Exam) => void;
  onRemove: (examId: string) => void;
  slotHeight: number;
  isAnyDragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

export const ExamCard: React.FC<ExamCardProps> = ({ 
  exam, student, teacher, chair, protocol, prepRoom,
  hasConflict, onEdit, onRemove, slotHeight,
  isAnyDragging, onDragStart, onDragEnd
}) => {
  const { subjects } = useData();
  const { checkConsistency } = useApp();
  const slotIdx = (exam.startTime - 1) % 1000;
  const isComplete = !!(exam.teacherId && exam.chairId && exam.protocolId && exam.prepRoomId);
  const consistency = checkConsistency(exam);
  const hasWarning = consistency.hasWarning;
  
  // Kombi-Check
  const subjectData = subjects.find(s => s.name === exam.subject);
  const isCombined = subjectData?.isCombined;

  return (
    <div 
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('examId', exam.id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => onDragStart(exam.id), 0);
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(exam);
      }}
      style={{ 
        position: 'absolute',
        top: (slotIdx * slotHeight) + 2,
        height: (slotHeight * 3) - 4,
        left: 4,
        right: 4,
        pointerEvents: isAnyDragging ? 'none' : 'auto'
      }}
      className={`rounded-xl p-2.5 shadow-2xl border transition-all z-[35] cursor-grab active:cursor-grabbing overflow-hidden flex flex-col group exam-card-shadow
        ${hasConflict 
          ? 'bg-red-900/60 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
          : hasWarning
          ? 'bg-amber-900/40 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
          : 'bg-[#1e293b] border-slate-700 hover:border-cyan-500/50'
        } ${isAnyDragging ? 'opacity-40 scale-95' : 'opacity-100'}`}
    >
      <div className="flex justify-between items-start mb-1 pointer-events-none">
        <div className="text-[12px] font-bold text-white truncate leading-tight group-hover:text-cyan-300 transition-colors">
          {student?.lastName}, {student?.firstName}
        </div>
        
        <div className="flex items-center justify-center w-5 h-5 shrink-0">
          {hasConflict ? (
            <AlertCircle size={14} className="text-white animate-pulse" />
          ) : hasWarning ? (
            <AlertTriangle size={14} className="text-amber-500" />
          ) : isComplete ? (
            <Check size={14} className="text-emerald-500" />
          ) : (
            <AlertTriangle size={14} className="text-red-500" /> 
          )}
        </div>
      </div>
      
      <div className="text-[10px] font-bold text-cyan-500/80 uppercase tracking-widest truncate mb-2 pointer-events-none">
        {exam.subject}{isCombined ? '*' : ''} {exam.groupId && `(${exam.groupId})`}
        {prepRoom && (
          <span className="text-amber-500 ml-1.5 font-black">({prepRoom.name})</span>
        )}
      </div>
      
      <div className="mt-auto flex items-end justify-between gap-1 border-t border-slate-800/60 pt-1.5 overflow-hidden pointer-events-none">
        <div className="flex flex-col items-center gap-0.5 min-w-0">
          <span className="text-[7px] text-slate-300 font-bold uppercase leading-none">Prüfer</span>
          <div className="flex items-center justify-center h-5 bg-cyan-500/10 border border-cyan-500/20 px-1.5 rounded min-w-[3.2rem] text-center">
            <span className="text-[9px] font-bold text-cyan-300 font-mono leading-none">{teacher?.shortName || '?'}</span>
          </div>
        </div>

        {protocol && (
          <div className="flex flex-col items-center gap-0.5 min-w-0">
            <span className="text-[7px] text-slate-300 font-bold uppercase leading-none">Prot.</span>
            <div className="flex items-center justify-center h-5 bg-indigo-500/10 border border-indigo-500/20 px-1.5 rounded min-w-[3.2rem] text-center">
              <span className="text-[9px] font-bold text-indigo-300 font-mono leading-none">{protocol.shortName}</span>
            </div>
          </div>
        )}

        {chair && (
          <div className="flex flex-col items-center gap-0.5 min-w-0">
            <span className="text-[7px] text-slate-300 font-bold uppercase leading-none">Vorsitz</span>
            <div className="flex items-center justify-center h-5 bg-amber-500/10 border border-amber-500/20 px-1.5 rounded min-w-[3.2rem] text-center">
              <span className="text-[9px] font-bold text-amber-300 font-mono leading-none">{chair.shortName}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
