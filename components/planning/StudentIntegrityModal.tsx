import React, { useMemo, useState } from 'react';
import { Modal } from '../Modal';
import { useData } from '../../context/DataContext';
import { useApp } from '../../context/AppContext';
import { Search, X, UserCheck, BookOpen, Clock, BarChart3, SearchX } from 'lucide-react';
import { examSlotToMin } from '../../utils/TimeService';

interface StudentIntegrityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentIntegrityModal: React.FC<StudentIntegrityModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { students, teachers, days } = useData();
  const { exams } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  // Zentraler Date-Formatter
  const formatDateLong = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
  };

  // Basis-Datenaufbereitung: Mapping von Schülern zu ihren sortierten Prüfungen
  const studentData = useMemo(() => {
    return students
      .map((student) => {
        const studentExams = exams
          .filter((e) => e.studentId === student.id)
          .sort((a, b) => a.startTime - b.startTime);

        return {
          ...student,
          exams: studentExams,
          searchPool: [
            student.lastName,
            student.firstName,
            ...studentExams.map((e) => {
              const t = teachers.find((teacher) => teacher.id === e.teacherId);
              return `${e.subject} ${t?.shortName || ''} ${t?.lastName || ''}`;
            }),
          ]
            .join(' ')
            .toLowerCase(),
        };
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName, 'de'));
  }, [students, exams, teachers]);

  // DESTRUKTIVE FILTERUNG (NEU)
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return studentData;
    const term = searchTerm.toLowerCase().trim();
    const terms = term.split(/\s+/);
    return studentData.filter((s) => terms.every((t) => s.searchPool.includes(t)));
  }, [studentData, searchTerm]);

  // Spaltenberechnung auf Basis der GESAMT-Menge (verhindert Layout-Springen)
  const maxExamsCount = useMemo(() => {
    const counts = studentData.map((s) => s.exams.length);
    return Math.max(2, ...counts);
  }, [studentData]);

  // Statistik-Berechnung
  const stats = useMemo(() => {
    const subjectCounts: Record<string, number> = {};
    const dayCounts: Record<number, number> = {};

    exams.forEach((e) => {
      if (e.startTime > 0) {
        subjectCounts[e.subject] = (subjectCounts[e.subject] || 0) + 1;
        const dIdx = Math.floor((e.startTime - 1) / 1000);
        dayCounts[dIdx] = (dayCounts[dIdx] || 0) + 1;
      }
    });

    return {
      subjects: Object.entries(subjectCounts).sort((a, b) => b[1] - a[1]),
      days: Object.entries(dayCounts).sort((a, b) => parseInt(a[0]) - parseInt(b[0])),
    };
  }, [exams]);

  const renderDateTime = (startTime: number) => {
    if (startTime === 0) return 'Nicht terminiert';
    const totalMin = examSlotToMin(startTime);
    const h = Math.floor(totalMin / 60)
      .toString()
      .padStart(2, '0');
    const m = (totalMin % 60).toString().padStart(2, '0');
    const dIdx = Math.floor((startTime - 1) / 1000);
    const dateStr = days[dIdx]?.date;

    return (
      <span className="text-cyan-400 font-bold">
        {dateStr ? formatDateLong(dateStr) : 'Tag ' + (dIdx + 1)}, {h}:{m}
      </span>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-7xl">
      <div className="flex flex-col h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/30 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 text-cyan-400">
              <UserCheck size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Schüler-Integritätscheck
              </h3>
              <p className="text-xs text-cyan-500/80 font-medium">
                Prüfungsübersicht nach Personen
              </p>
            </div>
          </div>

          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              autoFocus
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-9 pr-8 py-2 text-xs text-white focus:ring-1 focus:ring-cyan-500/40"
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

          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white transition-colors ml-4"
          >
            <X size={20} />
          </button>
        </div>

        {/* Matrix Tabelle mit destruktiver Filterung */}
        <div className="flex-1 overflow-auto my-6 no-scrollbar rounded-2xl border border-slate-800/50 bg-slate-900/20 shadow-inner">
          <table className="w-full border-collapse text-left bg-slate-900/40">
            <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md shadow-sm">
              <tr className="border-b border-slate-700/50">
                <th className="min-w-[200px] w-56 px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900/50">
                  Prüfling
                </th>
                {Array.from({ length: maxExamsCount }).map((_, i) => (
                  <th
                    key={i}
                    className="min-w-[220px] px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest"
                  >
                    Prüfung {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-white/5 transition-colors border-b border-slate-800/40 last:border-b-0"
                >
                  <td className="px-6 py-4 align-middle">
                    <span className="text-sm font-bold text-slate-200">
                      {student.lastName}, {student.firstName}
                    </span>
                  </td>
                  {Array.from({ length: maxExamsCount }).map((_, idx) => {
                    const exam = student.exams[idx];
                    if (!exam)
                      return (
                        <td key={idx} className="px-6 py-4">
                          <span className="text-slate-700 italic text-[10px]">-- Keine --</span>
                        </td>
                      );

                    const teacher = teachers.find((t) => t.id === exam.teacherId);

                    return (
                      <td key={idx} className="px-6 py-4 align-middle">
                        <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1">
                          <div className="flex items-center justify-between gap-2 overflow-hidden">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <BookOpen size={11} className="text-cyan-500 shrink-0" />
                              <span className="text-xs font-black text-slate-200 uppercase truncate">
                                {exam.subject}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 shrink-0">
                              ({teacher?.shortName || '?'})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/60 mt-1">
                            <Clock size={10} className="text-cyan-500/50 shrink-0" />
                            <span className="text-[9px] truncate">
                              {renderDateTime(exam.startTime)}
                            </span>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={maxExamsCount + 1} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 text-slate-600">
                      <SearchX size={48} className="opacity-20" />
                      <div className="space-y-1">
                        <p className="text-lg font-bold">Keine Treffer</p>
                        <p className="text-sm italic">
                          Verfeinere deine Suche oder lösche den Suchbegriff.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Statistik Footer */}
        <div className="mt-auto pt-6 border-t border-slate-700/30 shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 size={16} className="text-cyan-400" />
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Planungs-Übersicht
            </h4>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {stats.days.map(([idx, count]) => {
                const day = days[parseInt(idx)];
                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-1 min-w-[130px] p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl transition-all hover:border-cyan-500/30"
                  >
                    <span className="text-[9px] font-black text-cyan-500 uppercase tracking-tight">
                      {day ? formatDateShort(day.date) : `Tag ${parseInt(idx) + 1}`}
                    </span>
                    <span className="text-sm font-black text-white">
                      {count}{' '}
                      <span className="text-[10px] text-slate-500 font-bold uppercase ml-1">
                        Prüfungen
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {stats.subjects.slice(0, 6).map(([name, count]) => (
                <div
                  key={name}
                  className="flex items-center gap-4 px-3.5 py-2.5 bg-slate-900/60 border border-cyan-500/30 rounded-xl"
                >
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-tight">
                    {name}
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                    <span className="text-[10px] font-black text-cyan-300">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
