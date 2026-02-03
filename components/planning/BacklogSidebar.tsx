import React, { useRef, useEffect } from 'react';
import { Search, FileJson, Layers, Check, AlertTriangle, User, Settings } from 'lucide-react';
import { Exam, Student, Teacher, Room } from '../../types';
import { PlanningSortOption } from '../../hooks/usePlanning';
import { useDnD } from '../../context/DnDContext';

interface BacklogSidebarProps {
  exams: Exam[];
  students: Student[];
  teachers: Teacher[];
  rooms: Room[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortOption: PlanningSortOption;
  onSortChange: (option: PlanningSortOption) => void;
  onEditExam: (exam: Exam) => void;
  onRemoveFromGrid: (examId: string) => void;
  isDraggingOver: boolean;
  onDragCounterChange: (val: number) => void;
  setIsDraggingOver: (val: boolean) => void;
  checkConsistency: (exam: Exam) => { hasWarning: boolean; reason?: string };
}

interface BacklogExamCardProps {
  exam: Exam;
  student?: Student;
  teacher?: Teacher;
  protocol?: Teacher;
  chair?: Teacher;
  prepRoom?: Room;
  isDraggingReal: boolean;
  hasWarning: boolean;
  isComplete: boolean;
  isNakedDraft: boolean;
  groupCount: number;
  onEditExam: (exam: Exam) => void;
  startDrag: any;
}

const BacklogExamCard = React.memo<BacklogExamCardProps>(({
  exam,
  student,
  teacher,
  protocol,
  chair,
  prepRoom,
  isDraggingReal,
  hasWarning,
  isComplete,
  isNakedDraft,
  groupCount,
  onEditExam,
  startDrag,
}) => {
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
            {exam.subject || 'DRAFT'}
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
        startDrag(exam.id, 'exam', e, { fromBacklog: true, groupCount }, ghostUI);
      }}
      className={`draggable-item p-3 border rounded-xl hover:border-cyan-500/40 transition-all group relative flex flex-col ${isDraggingReal ? 'opacity-20 scale-95' : 'opacity-100'} ${hasWarning ? 'bg-amber-900/20 border-amber-500/30' : isNakedDraft ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-800/40 border-slate-700/50'}`}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 pointer-events-none">
          <span
            className={`text-sm font-bold truncate pr-1 transition-colors ${isNakedDraft ? 'text-red-400/80 italic' : 'text-slate-200 group-hover:text-white'}`}
          >
            {student?.lastName}, {student?.firstName}
          </span>
          <div className="shrink-0 flex items-center gap-1">
            {groupCount > 1 && (
              <Layers
                size={11}
                className="text-indigo-500"
                title={`${groupCount}er Block`}
              />
            )}
            {hasWarning ? (
              <AlertTriangle size={12} className="text-amber-500" />
            ) : isComplete ? (
              <Check size={12} className="text-emerald-500" />
            ) : (
              <AlertTriangle size={12} className="text-red-500" />
            )}
          </div>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onEditExam(exam);
          }}
          className="w-6 h-6 -mr-1 -mt-1 rounded-lg flex items-center justify-center text-slate-600 hover:text-white hover:bg-white/5 active:scale-90 transition-all pointer-events-auto"
        >
          <Settings size={14} />
        </button>
      </div>

      <div
        className={`text-[10px] font-bold uppercase tracking-wider pointer-events-none truncate mb-2 ${isNakedDraft ? 'text-red-400/60' : 'text-cyan-400'}`}
      >
        {exam.subject || 'NICHT ZUGEWIESEN'}{' '}
        {exam.groupId && <span className="text-indigo-400 ml-1">[{exam.groupId}]</span>}
        {prepRoom && (
          <span className="text-amber-500 ml-1.5 font-black">({prepRoom.name})</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1 mt-auto pt-1.5 border-t border-slate-700/30 pointer-events-none overflow-hidden">
        <div className="flex justify-center">
          <div
            className={`bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded text-[9px] font-bold text-center min-w-[34px] ${isNakedDraft ? 'text-slate-600' : 'text-cyan-300'}`}
          >
            {teacher?.shortName || '?'}
          </div>
        </div>
        <div className="flex justify-center">
          <div
            className={`px-2 py-0.5 rounded text-[9px] font-bold text-center border transition-all min-w-[34px] ${protocol ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'border-transparent text-transparent'}`}
          >
            {protocol?.shortName || '---'}
          </div>
        </div>
        <div className="flex justify-center">
          <div
            className={`px-2 py-0.5 rounded text-[9px] font-bold text-center border transition-all min-w-[34px] ${chair ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'border-transparent text-transparent'}`}
          >
            {chair?.shortName || '---'}
          </div>
        </div>
      </div>
    </div>
  );
});

export const BacklogSidebar: React.FC<BacklogSidebarProps> = ({
  exams,
  students,
  teachers,
  rooms,
  searchTerm,
  onSearchChange,
  sortOption,
  onSortChange,
  onEditExam,
  onRemoveFromGrid,
  isDraggingOver,
  onDragCounterChange,
  setIsDraggingOver,
  checkConsistency,
}) => {
  const sortOptions: PlanningSortOption[] = ['name', 'teacher', 'subject'];
  const { dropTarget, startDrag, activeDrag } = useDnD();

  const onRemoveRef = useRef(onRemoveFromGrid);
  useEffect(() => {
    onRemoveRef.current = onRemoveFromGrid;
  }, [onRemoveFromGrid]);

  const isActuallyHovered = dropTarget?.info.type === 'backlog';

  return (
    <aside
      data-drop-zone="true"
      data-drop-info={JSON.stringify({ type: 'backlog', onDrop: true })}
      ref={(el) => {
        if (el && !el.dataset.listenerAdded) {
          el.addEventListener('linexio-drop', ((e: CustomEvent) => {
            const { dragId } = e.detail;
            onRemoveRef.current(dragId);
          }) as EventListener);
          el.dataset.listenerAdded = 'true';
        }
      }}
      className={`w-80 flex flex-col glass-nocturne border-slate-700/30 overflow-hidden shrink-0 transition-all duration-300 relative ${isActuallyHovered ? 'bg-cyan-500/10' : 'bg-slate-900/40'}`}
    >
      <div className="p-4 border-b border-slate-700/30 space-y-4 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-sm tracking-tight flex items-center gap-2">
            <FileJson size={16} className="text-cyan-400" /> Backlog
          </h3>
        </div>

        <div className="relative flex p-1 bg-slate-900/50 rounded-lg border border-slate-700/30">
          <div
            className="absolute top-1 bottom-1 left-1 bg-slate-700/80 rounded-md shadow-sm transition-all duration-300 ease-in-out"
            style={{
              width: `calc((100% - 8px) / ${sortOptions.length})`,
              transform: `translateX(calc(${sortOptions.indexOf(sortOption)} * 100%))`,
            }}
          />
          {sortOptions.map((option) => (
            <button
              key={option}
              onClick={() => onSortChange(option)}
              className={`relative z-10 flex-1 flex items-center justify-center py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${sortOption === option ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {option === 'name' ? 'Name' : option === 'teacher' ? 'Lehrer' : 'Fach'}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input
            type="text"
            placeholder="Suche..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-cyan-500/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
        {exams.map((exam) => (
          <BacklogExamCard
            key={exam.id}
            exam={exam}
            student={students.find((s) => s.id === exam.studentId)}
            teacher={teachers.find((t) => t.id === exam.teacherId)}
            protocol={teachers.find((t) => t.id === exam.protocolId)}
            chair={teachers.find((t) => t.id === exam.chairId)}
            prepRoom={rooms.find((r) => r.id === exam.prepRoomId)}
            isDraggingReal={activeDrag?.id === exam.id && activeDrag?.isDraggingStarted}
            hasWarning={checkConsistency(exam).hasWarning}
            isComplete={!!(exam.teacherId && exam.chairId && exam.protocolId && exam.prepRoomId)}
            isNakedDraft={!exam.subject || !exam.teacherId}
            groupCount={exam.groupId
              ? exams.filter(
                (e) =>
                  e.groupId === exam.groupId &&
                  e.subject === exam.subject &&
                  e.teacherId === exam.teacherId
              ).length
              : 1}
            onEditExam={onEditExam}
            startDrag={startDrag}
          />
        ))}
      </div>

      <div className="bg-slate-900/60 border-t border-slate-700/30 px-4 py-2 flex justify-between items-center shrink-0">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {exams.length} Einträge
        </span>
      </div>
    </aside>
  );
};
