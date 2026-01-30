import React from 'react';
import { Exam, Student, Teacher, Room } from '../../types';
import { Check, AlertCircle, AlertTriangle, User, Settings, Layers } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useData } from '../../context/DataContext';
import { useDnD } from '../../context/DnDContext';

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
  searchTerm?: string;
}

export const ExamCard: React.FC<ExamCardProps> = ({
  exam,
  student,
  teacher,
  chair,
  protocol,
  prepRoom,
  hasConflict,
  onEdit,
  onRemove,
  slotHeight,
  searchTerm = '',
}) => {
  const { subjects, teachers } = useData();
  const { checkConsistency, exams } = useApp();
  const { startDrag, activeDrag } = useDnD();

  const slotIdx = (exam.startTime - 1) % 1000;
  const activeDay = Math.floor((exam.startTime - 1) / 1000);
  const isComplete = !!(exam.teacherId && exam.chairId && exam.protocolId && exam.prepRoomId);
  const consistency = checkConsistency(exam);
  const hasWarning = consistency.hasWarning;

  // Spotlight Logic
  const isSpotlightActive = searchTerm.trim().length >= 2;
  const term = searchTerm.toLowerCase().trim();

  const isTeacherMatch = (t?: Teacher) => {
    if (!t || !isSpotlightActive) return false;
    return t.shortName.toLowerCase().includes(term) || t.lastName.toLowerCase().includes(term);
  };

  const matchedTeacher = isTeacherMatch(teacher);
  const matchedChair = isTeacherMatch(chair);
  const matchedProtocol = isTeacherMatch(protocol);
  const matchedSubject = isSpotlightActive && exam.subject.toLowerCase().includes(term);

  const hasSpotlightMatch = matchedTeacher || matchedChair || matchedProtocol || matchedSubject;

  // Echter Drag-Status basierend auf Bewegungsschwelle aus DnDContext
  const isDraggingReal = activeDrag?.id === exam.id && activeDrag?.isDraggingStarted;

  // Verhindert Interaktions-Konflikte
  const isAnyOtherDragging = activeDrag !== null && activeDrag.id !== exam.id;

  const subjectData = subjects.find((s) => s.name === exam.subject);
  const isCombined = subjectData?.isCombined;

  // Gruppen-Info für Badge & Ghost
  const groupCount = exam.groupId
    ? exams.filter(
        (e) =>
          e.groupId === exam.groupId &&
          e.subject === exam.subject &&
          e.teacherId === exam.teacherId &&
          e.startTime > 0 &&
          Math.floor((e.startTime - 1) / 1000) === activeDay &&
          e.roomId === exam.roomId
      ).length
    : 1;

  const ghostUI = (
    <div className="w-56 p-3 flex flex-col gap-1.5 bg-[#1e293b] border border-cyan-500 rounded-xl shadow-2xl">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
          <User size={14} />
        </div>
        <span className="text-xs font-bold text-white truncate">
          {student?.lastName}, {student?.firstName}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest leading-none">
            {exam.subject}
          </span>
        </div>
        {groupCount > 1 && (
          <div className="flex items-center gap-1 text-indigo-400">
            <Layers size={10} />
            <span className="text-[9px] font-black">+{groupCount - 1}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        startDrag(exam.id, 'exam', e, { currentSlot: exam.startTime, groupCount }, ghostUI);
      }}
      style={{
        position: 'absolute',
        top: slotIdx * slotHeight + 2,
        height: slotHeight * 3 - 4,
        left: 4,
        right: 4,
        pointerEvents: isAnyOtherDragging ? 'none' : 'auto',
      }}
      className={`draggable-item rounded-xl p-3 shadow-2xl border transition-all duration-300 z-[35] overflow-hidden flex flex-col group exam-card-shadow
        ${
          hasConflict
            ? 'bg-red-900/60 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
            : hasWarning
              ? 'bg-amber-900/40 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : isSpotlightActive && hasSpotlightMatch
                ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                : 'bg-[#1e293b] border-slate-700 hover:border-cyan-500/50'
        } 
        ${isSpotlightActive && hasSpotlightMatch ? 'ring-1 ring-cyan-400 z-[40]' : ''}
        ${isDraggingReal ? 'opacity-20 scale-95' : 'opacity-100'}`}
    >
      <div className="flex-1 flex flex-col min-w-0 pointer-events-none">
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
            <span
              className={`text-[12px] font-bold truncate leading-tight transition-colors ${
                isSpotlightActive && hasSpotlightMatch ? 'text-cyan-300' : 'text-white'
              }`}
            >
              {student?.lastName}, {student?.firstName}
            </span>

            <div className="flex items-center justify-center shrink-0">
              {groupCount > 1 && <Layers size={11} className="text-indigo-400 mr-0.5" />}
              {hasConflict ? (
                <AlertCircle size={13} className="text-white animate-pulse" />
              ) : hasWarning ? (
                <AlertTriangle size={13} className="text-amber-500" />
              ) : isComplete ? (
                <Check size={13} className="text-emerald-500" />
              ) : (
                <AlertTriangle size={13} className="text-red-500" />
              )}
            </div>
          </div>

          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(exam);
            }}
            className="w-6 h-6 -mr-1.5 -mt-1.5 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 active:scale-90 transition-all pointer-events-auto"
          >
            <Settings size={14} />
          </button>
        </div>

        <div
          className={`text-[10px] font-bold uppercase tracking-widest truncate mb-2 transition-colors ${
            matchedSubject ? 'text-cyan-400 font-black' : 'text-cyan-500/80'
          }`}
        >
          {exam.subject}
          {isCombined ? '*' : ''} {exam.groupId && `(${exam.groupId})`}
          {prepRoom && <span className="text-amber-500 ml-1.5 font-black">({prepRoom.name})</span>}
        </div>

        <div className="mt-auto grid grid-cols-3 gap-1 border-t border-slate-800/60 pt-1.5 overflow-hidden">
          <div className="flex flex-col items-center gap-0.5 min-w-0">
            <span className="text-[7px] text-slate-300 font-bold uppercase leading-none">
              Prüfer
            </span>
            <div className="w-full flex justify-center mt-0.5">
              <div
                className={`flex items-center justify-center h-5 border px-2 rounded min-w-[34px] text-center transition-all ${
                  matchedTeacher
                    ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                    : 'bg-cyan-500/10 border-cyan-500/20'
                }`}
              >
                <span
                  className={`text-[9px] font-bold font-mono leading-none ${matchedTeacher ? 'text-white' : 'text-cyan-300'}`}
                >
                  {teacher?.shortName || '?'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-0.5 min-w-0">
            <span className="text-[7px] text-slate-300 font-bold uppercase leading-none">
              Prot.
            </span>
            <div className="w-full flex justify-center mt-0.5">
              <div
                className={`flex items-center justify-center h-5 border px-2 rounded min-w-[34px] text-center transition-all ${
                  protocol
                    ? matchedProtocol
                      ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                      : 'bg-indigo-500/10 border-indigo-500/20'
                    : 'border-transparent'
                }`}
              >
                <span
                  className={`text-[9px] font-bold font-mono leading-none ${
                    protocol
                      ? matchedProtocol
                        ? 'text-white'
                        : 'text-indigo-300'
                      : 'text-transparent'
                  }`}
                >
                  {protocol?.shortName || '--'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-0.5 min-w-0">
            <span className="text-[7px] text-slate-300 font-bold uppercase leading-none">
              Vorsitz
            </span>
            <div className="w-full flex justify-center mt-0.5">
              <div
                className={`flex items-center justify-center h-5 border px-2 rounded min-w-[34px] text-center transition-all ${
                  chair
                    ? matchedChair
                      ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                      : 'bg-amber-500/10 border-amber-500/20'
                    : 'border-transparent'
                }`}
              >
                <span
                  className={`text-[9px] font-bold font-mono leading-none ${
                    chair ? (matchedChair ? 'text-white' : 'text-amber-300') : 'text-transparent'
                  }`}
                >
                  {chair?.shortName || '--'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
