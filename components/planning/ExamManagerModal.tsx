import React, { useMemo, useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useData } from '../../context/DataContext';
import { useApp } from '../../context/AppContext';
import {
  Search,
  X,
  UserCheck,
  BookOpen,
  Clock,
  SearchX,
  Plus,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { examSlotToMin } from '../../utils/TimeService';
import { Exam } from '../../types';

interface ExamManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditExam: (exam: Exam) => void;
}

export const ExamManagerModal: React.FC<ExamManagerModalProps> = ({
  isOpen,
  onClose,
  onEditExam,
}) => {
  const { students, teachers, days } = useData();
  const { exams, syncDefaultExams, addExams, checkConsistency } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-Sync beim Öffnen triggert im Hintergrund
  useEffect(() => {
    if (isOpen) syncDefaultExams();
  }, [isOpen, syncDefaultExams]);

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
  };

  const studentData = useMemo(() => {
    return students
      .map((student) => {
        const studentExams = exams
          .filter((e) => e.studentId === student.id)
          .sort((a, b) => {
            if (a.startTime === 0 && b.startTime !== 0) return 1;
            if (a.startTime !== 0 && b.startTime === 0) return -1;
            return a.startTime - b.startTime;
          });

        return {
          ...student,
          exams: studentExams,
          searchPool: [
            student.lastName,
            student.firstName,
            ...studentExams.map((e) => {
              const t = teachers.find((teacher) => teacher.id === e.teacherId);
              return `${e.subject} ${t?.shortName || ''}`;
            }),
          ]
            .join(' ')
            .toLowerCase(),
        };
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName, 'de'));
  }, [students, exams, teachers]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return studentData;
    const term = searchTerm.toLowerCase().trim();
    const terms = term.split(/\s+/);
    return studentData.filter((s) => terms.every((t) => s.searchPool.includes(t)));
  }, [studentData, searchTerm]);

  const maxExamsCount = useMemo(() => {
    const counts = studentData.map((s) => s.exams.length);
    return Math.max(3, ...counts);
  }, [studentData]);

  const handleAddManualExam = (studentId: string) => {
    const newExam: Exam = {
      id: `e-manual-${Date.now()}`,
      studentId,
      teacherId: '',
      subject: '',
      status: 'backlog',
      startTime: 0,
    };
    addExams([newExam]);
  };

  const renderDateTime = (startTime: number) => {
    if (startTime === 0)
      return <span className="text-red-500 font-bold uppercase text-[8px]">Nicht geplant</span>;
    const totalMin = examSlotToMin(startTime);
    const h = Math.floor(totalMin / 60)
      .toString()
      .padStart(2, '0');
    const m = (totalMin % 60).toString().padStart(2, '0');
    const dIdx = Math.floor((startTime - 1) / 1000);
    const dateStr = days[dIdx]?.date;
    return (
      <span className="text-cyan-400 font-bold">
        {dateStr ? formatDateShort(dateStr) : 'T' + (dIdx + 1)}, {h}:{m}
      </span>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-[1600px]">
      <div className="flex flex-col h-[85vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/30 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 text-cyan-400">
              <UserCheck size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Prüfungs-Manager</h3>
              <p className="text-xs text-cyan-500/80 font-medium">Zentrale Erfassung & Workflow</p>
            </div>
          </div>

          <div className="flex-1 flex justify-center px-8">
            <div className="relative w-full max-w-xl">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={14}
              />
              <input
                autoFocus
                type="text"
                placeholder="Schüler oder Fach suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white focus:ring-1 focus:ring-cyan-500/40"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-white transition-colors ml-2"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto my-6 no-scrollbar rounded-2xl bg-slate-900/20 shadow-inner">
          <table className="w-full border-collapse text-left bg-slate-900/40 table-fixed">
            <thead className="sticky top-0 z-20 bg-slate-800/90 border-b border-slate-700/40">
              <tr>
                <th className="w-64 px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky left-0 z-30 bg-[#1e293b]">
                  Prüfling
                </th>
                {Array.from({ length: maxExamsCount }).map((_, i) => (
                  <th
                    key={i}
                    className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest min-w-[240px] bg-[#1e293b]"
                  >
                    Prüfung {i + 1}
                  </th>
                ))}
                <th className="w-20 px-6 py-4 text-center bg-[#1e293b]"></th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-cyan-500/5 transition-colors border-b border-slate-800/40 last:border-b-0 group"
                >
                  <td className="relative px-6 py-4 align-middle sticky left-0 bg-slate-900 z-10 transition-colors after:absolute after:inset-0 after:bg-cyan-500/0 group-hover:after:bg-cyan-500/5 after:transition-colors after:pointer-events-none">
                    <span className="relative z-20 text-sm font-bold text-slate-200">
                      {student.lastName}, {student.firstName}
                    </span>
                  </td>
                  {Array.from({ length: maxExamsCount }).map((_, idx) => {
                    const exam = student.exams[idx];
                    if (!exam) return <td key={idx} className="px-6 py-4"></td>;

                    const teacher = teachers.find((t) => t.id === exam.teacherId);
                    const isNakedDraft = !exam.subject || !exam.teacherId;

                    // Synchronisierte Status-Logik (wie in ExamCard)
                    const isComplete = !!(
                      exam.teacherId &&
                      exam.chairId &&
                      exam.protocolId &&
                      exam.prepRoomId
                    );
                    const consistency = checkConsistency(exam);
                    const hasWarning = consistency.hasWarning;

                    return (
                      <td key={idx} className="px-6 py-4 align-middle">
                        <button
                          onClick={() => onEditExam(exam)}
                          className={`w-full text-left p-3 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 shadow-sm space-y-1.5 ${isNakedDraft
                            ? 'bg-red-500/5 border-red-500/30 hover:border-red-500/50'
                            : 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/40'
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2 overflow-hidden">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <BookOpen
                                size={11}
                                className={isNakedDraft ? 'text-red-400' : 'text-cyan-500'}
                              />
                              <span
                                className={`text-xs font-black uppercase truncate ${isNakedDraft ? 'text-red-400/70 italic' : 'text-slate-200'}`}
                              >
                                {exam.subject || 'Fach fehlt'} {exam.groupId && `(${exam.groupId})`}
                              </span>
                            </div>
                            {teacher && (
                              <span className="text-[10px] font-bold text-cyan-400 shrink-0">
                                ({teacher.shortName})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 mt-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Clock size={10} className="text-slate-500 shrink-0" />
                              <span className="text-[9px] truncate">
                                {renderDateTime(exam.startTime)}
                              </span>
                            </div>

                            {/* Dynamisches Status-Icon basierend auf Vollständigkeit & Konsistenz */}
                            <div className="flex items-center shrink-0">
                              {hasWarning ? (
                                <AlertTriangle size={12} className="text-amber-500" />
                              ) : isComplete ? (
                                <Check size={12} className="text-emerald-500" />
                              ) : (
                                !isNakedDraft && (
                                  <AlertTriangle size={12} className="text-red-500" />
                                )
                              )}
                            </div>
                          </div>
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 text-center align-middle">
                    <button
                      onClick={() => handleAddManualExam(student.id)}
                      title="Zusätzliche Prüfung hinzufügen"
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-800 border border-slate-700 text-slate-500 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all active:scale-90"
                    >
                      <Plus size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={maxExamsCount + 2} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 text-slate-600">
                      <SearchX size={48} className="opacity-20" />
                      <div className="space-y-1">
                        <p className="text-lg font-bold">Keine Treffer</p>
                        <p className="text-sm italic">Verfeinere deine Suche.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
