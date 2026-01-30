import React, { useState, useMemo } from 'react';
import { Modal } from '../Modal';
import { Room, Exam } from '../../types';
import { calculatePrepLoadSimulation } from '../../utils/engine';
import {
  BookOpen,
  MapPin,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Users,
  X,
} from 'lucide-react';

interface PrepBalancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayExams: Exam[];
  prepRooms: Room[];
  onApply: (mapping: Record<string, string>) => void;
}

export const PrepBalancerModal: React.FC<PrepBalancerModalProps> = ({
  isOpen,
  onClose,
  dayExams,
  prepRooms,
  onApply,
}) => {
  // Alle Fächer identifizieren, die an diesem Tag im Grid liegen
  const daySubjects = useMemo(() => {
    const subjectsSet = new Set<string>();
    dayExams.forEach((e) => subjectsSet.add(e.subject));
    return Array.from(subjectsSet).sort();
  }, [dayExams]);

  // Hilfskonstante für die Anzahl der Prüfungen pro Fach
  const subjectCounts = useMemo(() => {
    const result: Record<string, number> = {};
    dayExams.forEach((e) => {
      result[e.subject] = (result[e.subject] || 0) + 1;
    });
    return result;
  }, [dayExams]);

  // Initiales Mapping basierend auf existierenden Zuweisungen (falls vorhanden)
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    daySubjects.forEach((sub) => {
      const firstExam = dayExams.find((e) => e.subject === sub && e.prepRoomId);
      if (firstExam) initial[sub] = firstExam.prepRoomId!;
    });
    return initial;
  });

  // Simulation der Peak-Last
  const loadStats = useMemo(() => {
    return calculatePrepLoadSimulation(dayExams, mapping);
  }, [dayExams, mapping]);

  // Live-Berechnung der Gesamtzahl pro Raum
  const totalByRoom = useMemo(() => {
    const totals: Record<string, number> = {};
    prepRooms.forEach((r) => (totals[r.id] = 0));

    (Object.entries(mapping) as [string, string][]).forEach(([subject, roomId]) => {
      if (totals[roomId] !== undefined) {
        totals[roomId] += (subjectCounts as Record<string, number>)[subject] || 0;
      }
    });
    return totals;
  }, [mapping, subjectCounts, prepRooms]);

  const handleApply = () => {
    onApply(mapping);
    onClose();
  };

  const isComplete = daySubjects.every((s) => !!mapping[s]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/30 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 text-amber-500">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Vorbereitungsräume planen
              </h3>
              <p className="text-xs text-amber-500/80 font-medium">
                Bulk-Zuweisung & Last-Simulation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 overflow-hidden">
          {/* Linke Seite: Fächer-Liste */}
          <div className="space-y-4 overflow-y-auto max-h-[50vh] pr-2 no-scrollbar">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={14} className="text-slate-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Fächer am heutigen Tag
              </span>
            </div>
            {daySubjects.map((subject) => {
              const examCount = subjectCounts[subject] || 0;
              return (
                <div
                  key={subject}
                  className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center justify-between group transition-all hover:border-slate-700"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-200">{subject}</span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {examCount} Prüfung{examCount === 1 ? '' : 'en'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {prepRooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => setMapping((prev) => ({ ...prev, [subject]: room.id }))}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                          mapping[subject] === room.id
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                            : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {room.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {daySubjects.length === 0 && (
              <div className="py-12 text-center text-slate-600 italic text-sm">
                Keine terminierten Prüfungen an diesem Tag.
              </div>
            )}
          </div>

          {/* Rechte Seite: Prognose & Live-Counter */}
          <div className="space-y-6 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={14} className="text-slate-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Raum-Belegung & Prognose
              </span>
            </div>

            <div className="space-y-4 flex-1">
              {prepRooms.map((room) => {
                const stat = loadStats[room.id] || { peak: 0, time: '--:--' };
                const total = totalByRoom[room.id] || 0;
                const isOverloaded = stat.peak > 6;
                const isWarning = stat.peak > 4;

                return (
                  <div
                    key={room.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isOverloaded
                        ? 'bg-red-500/10 border-red-500/30'
                        : isWarning
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white uppercase tracking-wider">
                          {room.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Users size={10} className="text-amber-500/70" />
                          <span className="text-[10px] font-bold text-amber-500/80">
                            Gesamt: {total}
                          </span>
                        </div>
                      </div>
                      {isOverloaded ? (
                        <AlertTriangle size={16} className="text-red-500 animate-pulse" />
                      ) : isWarning ? (
                        <Info size={16} className="text-amber-500" />
                      ) : (
                        <CheckCircle2 size={16} className="text-emerald-500 opacity-60" />
                      )}
                    </div>

                    <div className="flex items-end justify-between border-t border-slate-800 pt-3 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-bold uppercase mb-0.5 tracking-tight">
                          Max. Peak
                        </span>
                        <span
                          className={`text-2xl font-black ${isOverloaded ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}
                        >
                          {stat.peak}
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[9px] text-slate-500 font-bold uppercase mb-0.5 tracking-tight">
                          Zeitpunkt
                        </span>
                        <span className="text-sm font-bold text-white tracking-tight">
                          {stat.time} Uhr
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 h-1 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 ${
                          isOverloaded
                            ? 'bg-red-500'
                            : isWarning
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (stat.peak / 8) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800 space-y-2">
              <p className="text-[10px] text-slate-500 leading-relaxed italic">
                Berechnung basiert auf dem 20-Minuten Vorbereitungs-Zeitraum vor jedem
                Prüfungsbeginn. Peak-Empfehlung: max. 6 Personen.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-700/30 flex gap-4">
          <button onClick={onClose} className="btn-secondary-glass flex-1 h-12 rounded-xl text-sm">
            Abbrechen
          </button>
          <button
            onClick={handleApply}
            disabled={!isComplete}
            className="btn-warning-aurora flex-[2] h-12 rounded-xl text-sm uppercase tracking-wider disabled:opacity-30"
          >
            Zuweisung anwenden <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </Modal>
  );
};
