
import React from 'react';
import { Search, FileJson, PlusCircle, Check, AlertTriangle } from 'lucide-react';
import { Exam, Student, Teacher, Room } from '../../types';
import { PlanningSortOption } from '../../hooks/usePlanning';

interface BacklogSidebarProps {
  exams: Exam[];
  students: Student[];
  teachers: Teacher[];
  rooms: Room[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortOption: PlanningSortOption;
  onSortChange: (option: PlanningSortOption) => void;
  onAddExam: () => void;
  onEditExam: (exam: Exam) => void;
  onRemoveFromGrid: (examId: string) => void;
  isDraggingOver: boolean;
  onDragCounterChange: (val: number) => void;
  setIsDraggingOver: (val: boolean) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  draggingExamId: string | null;
  checkConsistency: (exam: Exam) => { hasWarning: boolean, reason?: string };
}

export const BacklogSidebar: React.FC<BacklogSidebarProps> = ({
  exams, students, teachers, rooms, searchTerm, onSearchChange, 
  sortOption, onSortChange, onAddExam, onEditExam, 
  onRemoveFromGrid, isDraggingOver, onDragCounterChange, 
  setIsDraggingOver, onDragStart, onDragEnd, draggingExamId,
  checkConsistency
}) => {
  const sortOptions: PlanningSortOption[] = ['name', 'teacher', 'subject'];

  return (
    <aside 
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        onDragCounterChange(1);
        setIsDraggingOver(true);
      }}
      onDragLeave={() => {
        onDragCounterChange(-1);
      }}
      onDrop={(e) => {
        e.preventDefault();
        const examId = e.dataTransfer.getData('examId') || draggingExamId;
        if (examId) onRemoveFromGrid(examId);
      }}
      className={`w-80 flex flex-col glass-nocturne border-slate-700/30 overflow-hidden shrink-0 transition-all duration-300 relative ${isDraggingOver ? 'bg-cyan-500/10' : 'bg-slate-900/40'}`}
    >
      <div className="p-4 border-b border-slate-700/30 space-y-4 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-sm tracking-tight flex items-center gap-2">
            <FileJson size={16} className="text-cyan-400" /> Prüfungen
          </h3>
          {/* Badge entfernt gemäß Anweisung */}
        </div>
        
        <div className="relative flex p-1 bg-slate-900/50 rounded-lg border border-slate-700/30">
          <div 
            className="absolute top-1 bottom-1 left-1 bg-slate-700/80 rounded-md shadow-sm transition-all duration-300 ease-in-out"
            style={{ 
              width: `calc((100% - 8px) / ${sortOptions.length})`, 
              transform: `translateX(calc(${sortOptions.indexOf(sortOption)} * 100%))` 
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
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-cyan-500/40"
          />
        </div>

        <button 
          onClick={onAddExam}
          className="btn-aurora-base btn-primary-aurora w-full py-2.5 rounded-xl text-[11px] uppercase tracking-wider"
        >
          <PlusCircle size={14} /> Neue Prüfung
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
        {exams.map(exam => {
          const student = students.find(s => s.id === exam.studentId);
          const teacher = teachers.find(t => t.id === exam.teacherId);
          const chair = teachers.find(t => t.id === exam.chairId);
          const protocol = teachers.find(t => t.id === exam.protocolId);
          const prepRoom = rooms.find(r => r.id === exam.prepRoomId);
          const complete = !!(exam.teacherId && exam.chairId && exam.protocolId && exam.prepRoomId);
          const isDragging = draggingExamId === exam.id;
          
          const consistency = checkConsistency(exam);
          const hasWarning = consistency.hasWarning;

          return (
            <div 
              key={exam.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('examId', exam.id);
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => onDragStart(exam.id), 0);
              }}
              onDragEnd={onDragEnd}
              onClick={() => onEditExam(exam)}
              className={`p-3 border rounded-xl cursor-grab active:cursor-grabbing hover:border-cyan-500/40 transition-all group relative ${
                isDragging ? 'opacity-20 scale-95 border-cyan-500' : 'opacity-100'
              } ${
                hasWarning ? 'bg-amber-900/20 border-amber-500/30' : 'bg-slate-800/40 border-slate-700/50'
              }`}
            >
              <div className="flex justify-between items-start mb-1 pointer-events-none">
                <div className="text-sm font-bold text-slate-200 group-hover:text-white truncate pr-2">
                  {student?.lastName}, {student?.firstName}
                </div>
                <div className="flex items-center justify-center w-5 h-5 shrink-0">
                  {hasWarning ? (
                    <AlertTriangle size={14} className="text-amber-500" />
                  ) : complete ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <AlertTriangle size={14} className="text-red-500" />
                  )}
                </div>
              </div>
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider pointer-events-none truncate">
                {exam.subject} {exam.groupId && `(${exam.groupId})`}
                {prepRoom && (
                  <span className="text-amber-500 ml-1.5 font-black">({prepRoom.name})</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1 pointer-events-none">
                <span className="text-[9px] font-mono text-cyan-500/80 bg-cyan-500/5 border border-cyan-500/20 px-1 rounded">
                  {teacher?.shortName || '?'}
                </span>
                {chair && (
                  <span className="text-[9px] font-mono text-amber-500/80 bg-amber-500/5 border border-amber-500/20 px-1 rounded">
                    {chair.shortName}
                  </span>
                )}
                {protocol && (
                  <span className="text-[9px] font-mono text-indigo-500/80 bg-indigo-500/5 border border-indigo-500/20 px-1 rounded">
                    {protocol.shortName}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {exams.length === 0 && (
          <div className="py-10 text-center text-slate-600 italic text-xs px-4">
            Keine Prüfungen gefunden.
          </div>
        )}
      </div>

      <div className="bg-slate-900/60 border-t border-slate-700/30 px-4 py-2 flex justify-between items-center shrink-0">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {exams.length} Einträge
        </span>
      </div>
    </aside>
  );
};
