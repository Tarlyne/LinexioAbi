import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../Modal';
import { RawExamCSVRow } from '../../utils/csvParser';
import { useApp } from '../../context/AppContext';
import { useUI } from '../../context/UIContext';
import { useData } from '../../context/DataContext';
import { Exam, Student, Teacher, Room, Subject } from '../../types';
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  User,
  GraduationCap,
  MapPin,
  Loader2,
  Info,
  ChevronDown,
  Calendar,
  BookOpen,
} from 'lucide-react';

interface ExamImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  rawData: RawExamCSVRow[];
}

interface MappingResult {
  row: RawExamCSVRow;
  studentId?: string;
  examinerId?: string;
  protocolId?: string;
  chairId?: string;
  roomId?: string;
  prepRoomId?: string;
  subjectId?: string;
  dayIdx?: number;
  slotIdx?: number;
  error?: string;
  isAmbiguous?: boolean;
}

export const ExamImportWizard: React.FC<ExamImportWizardProps> = ({ isOpen, onClose, rawData }) => {
  const { addExams } = useApp();
  const { showToast } = useUI();
  const { days, rooms, teachers, students, subjects } = useData();
  const [mappings, setMappings] = useState<Record<number, MappingResult>>({});

  useEffect(() => {
    if (!isOpen || rawData.length === 0) return;

    const newMappings: Record<number, MappingResult> = {};

    rawData.forEach((row, idx) => {
      const result: MappingResult = { row };

      const dayIdx = days.findIndex((d) => d.date === row.date);
      if (dayIdx !== -1) {
        result.dayIdx = dayIdx;
      } else {
        const displayDate = row.date.split('-').reverse().join('.');
        result.error = `Prüfungstag "${displayDate}" nicht in Datenbank vorhanden.`;
      }

      if (row.time) {
        const timeParts = row.time.split(':').map(Number);
        if (timeParts.length >= 2) {
          const [h, m] = timeParts;
          const slotIdx = (h - 8) * 6 + m / 10;
          if (slotIdx >= 0 && slotIdx < 60) {
            result.slotIdx = slotIdx;
          }
        }
      }

      result.roomId = rooms.find((r) => r.name.toLowerCase() === row.examRoom.toLowerCase())?.id;
      result.prepRoomId = rooms.find(
        (r) => r.name.toLowerCase() === row.prepRoom.toLowerCase()
      )?.id;

      result.examinerId = teachers.find(
        (t) => t.shortName.toLowerCase() === row.examiner.toLowerCase()
      )?.id;
      result.protocolId = teachers.find(
        (t) => t.shortName.toLowerCase() === row.protocol.toLowerCase()
      )?.id;
      result.chairId = teachers.find(
        (t) => t.shortName.toLowerCase() === row.chair.toLowerCase()
      )?.id;

      result.subjectId = subjects.find(
        (s) => s.name.toLowerCase() === row.subject.toLowerCase()
      )?.id;

      const csvNameParts = row.studentName.split(',').map((s) => s.trim().toLowerCase());
      const csvLast = csvNameParts[0];
      const csvFirstPart = csvNameParts[1] || '';

      const candidates = students.filter((s) => {
        const dbLast = s.lastName.toLowerCase();
        const dbFirst = s.firstName.toLowerCase();
        if (dbLast !== csvLast) return false;
        if (!csvFirstPart) return true;
        return dbFirst.startsWith(csvFirstPart.replace('.', ''));
      });

      if (candidates.length === 1) {
        result.studentId = candidates[0].id;
      } else if (candidates.length > 1) {
        result.isAmbiguous = true;
      }

      newMappings[idx] = result;
    });

    setMappings(newMappings);
  }, [isOpen, rawData, days, rooms, teachers, students, subjects]);

  const updateMapping = (idx: number, field: keyof MappingResult, value: any) => {
    setMappings((prev) => ({
      ...prev,
      [idx]: { ...prev[idx], [field]: value },
    }));
  };

  const mappingEntries = useMemo(() => {
    return Object.entries(mappings) as [string, MappingResult][];
  }, [mappings]);

  const missingData = useMemo(() => {
    const dates = new Set<string>();
    const unknownRooms = new Set<string>();
    const unknownTeachers = new Set<string>();
    const unknownSubjects = new Set<string>();

    mappingEntries.forEach(([_, m]) => {
      if (m.row.date && m.dayIdx === undefined)
        dates.add(m.row.date.split('-').reverse().join('.'));
      if (m.row.examRoom && !m.roomId) unknownRooms.add(m.row.examRoom);
      if (m.row.prepRoom && !m.prepRoomId) unknownRooms.add(m.row.prepRoom);
      if (m.row.examiner && !m.examinerId) unknownTeachers.add(m.row.examiner);
      if (m.row.protocol && !m.protocolId) unknownTeachers.add(m.row.protocol);
      if (m.row.chair && !m.chairId) unknownTeachers.add(m.row.chair);
      if (m.row.subject && !m.subjectId) unknownSubjects.add(m.row.subject);
    });

    return {
      dates: Array.from(dates),
      rooms: Array.from(unknownRooms),
      teachers: Array.from(unknownTeachers),
      subjects: Array.from(unknownSubjects),
    };
  }, [mappingEntries]);

  const unmappedRows = useMemo(() => {
    return mappingEntries.filter(([_, m]) => {
      const studentMissing = !m.studentId;
      const examinerMissing = !m.examinerId;
      const protocolMissing = m.row.protocol && !m.protocolId;
      const chairMissing = m.row.chair && !m.chairId;
      const examRoomMissing = !m.roomId;
      const prepRoomMissing = m.row.prepRoom && !m.prepRoomId;
      const subjectMissing = !m.subjectId;

      return (
        !!m.error ||
        studentMissing ||
        examinerMissing ||
        protocolMissing ||
        chairMissing ||
        examRoomMissing ||
        prepRoomMissing ||
        subjectMissing
      );
    });
  }, [mappingEntries]);

  const handleImport = () => {
    const examsToImport: Exam[] = (Object.values(mappings) as MappingResult[])
      .filter((m) => {
        const baseValid = !m.error && m.studentId && m.examinerId && m.roomId && m.subjectId;
        const optionalValid =
          (!m.row.prepRoom || m.prepRoomId) &&
          (!m.row.protocol || m.protocolId) &&
          (!m.row.chair || m.chairId);
        return baseValid && optionalValid;
      })
      .map((m, idx) => {
        const sub = subjects.find((s) => s.id === m.subjectId);
        return {
          id: `e-import-${Date.now()}-${idx}`,
          studentId: m.studentId!,
          teacherId: m.examinerId!,
          chairId: m.chairId,
          protocolId: m.protocolId,
          roomId: m.roomId,
          prepRoomId: m.prepRoomId,
          subject: sub?.name || m.row.subject,
          startTime:
            m.dayIdx !== undefined && m.slotIdx !== undefined ? m.dayIdx * 1000 + m.slotIdx + 1 : 0,
          status: m.dayIdx !== undefined ? 'scheduled' : 'backlog',
        };
      });

    addExams(examsToImport);
    showToast(`${examsToImport.length} Prüfungen erfolgreich importiert.`, 'success');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-7xl">
      <div className="flex flex-col h-[85vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/30 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 text-indigo-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Interaktiver Import-Wizard
              </h3>
              <p className="text-xs text-indigo-400 font-medium">Hard-Validation & Mapping</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 space-y-4 no-scrollbar">
          {(missingData.dates.length > 0 ||
            missingData.rooms.length > 0 ||
            missingData.teachers.length > 0 ||
            missingData.subjects.length > 0) && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={24} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-4 flex-1">
                <h4 className="text-sm font-bold text-amber-400">Stammdaten-Konflikt erkannt</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {missingData.dates.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">
                        Unbekannte Tage:
                      </p>
                      <p className="text-xs text-white font-medium">
                        {missingData.dates.join(', ')}
                      </p>
                    </div>
                  )}
                  {missingData.rooms.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">
                        Unbekannte Räume:
                      </p>
                      <p className="text-xs text-white font-medium">
                        {missingData.rooms.join(', ')}
                      </p>
                    </div>
                  )}
                  {missingData.teachers.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">
                        Unbekannte Lehrer:
                      </p>
                      <p className="text-xs text-white font-medium">
                        {missingData.teachers.join(', ')}
                      </p>
                    </div>
                  )}
                  {missingData.subjects.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">
                        Unbekannte Fächer:
                      </p>
                      <p className="text-xs text-white font-medium">
                        {missingData.subjects.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-amber-500/80 font-medium italic border-t border-amber-500/20 pt-2">
                  Tipp: Korrigiere die Daten manuell in den Zeilen oder lege die fehlenden Elemente
                  in der Datenbank an.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {mappingEntries.map(([key, m]) => {
              const idx = parseInt(key);
              const studentErr = !m.studentId;
              const examinerErr = !m.examinerId;
              const protocolErr = m.row.protocol && !m.protocolId;
              const chairErr = m.row.chair && !m.chairId;
              const roomErr = !m.roomId;
              const prepRoomErr = m.row.prepRoom && !m.prepRoomId;
              const subjectErr = !m.subjectId;
              const isRowError =
                !!m.error ||
                studentErr ||
                examinerErr ||
                protocolErr ||
                chairErr ||
                roomErr ||
                prepRoomErr ||
                subjectErr;

              return (
                <div
                  key={key}
                  className={`p-4 rounded-2xl border flex flex-col gap-5 transition-all ${
                    isRowError
                      ? 'bg-red-500/5 border-red-500/20'
                      : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                        ZEILE {idx + 1}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white tracking-tight">
                        <Calendar size={14} className="text-slate-500" />
                        {m.row.date.split('-').reverse().join('.')} • {m.row.time} Uhr
                      </div>
                    </div>
                    {isRowError ? (
                      <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-bold uppercase">
                        <AlertCircle size={12} /> Mapping unvollständig
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-bold uppercase">
                        <CheckCircle size={12} /> Bereit
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1 truncate">
                        <User size={10} /> Prüfling ({m.row.studentName})
                      </label>
                      <div className="relative">
                        <select
                          value={m.studentId || ''}
                          onChange={(e) => updateMapping(idx, 'studentId', e.target.value)}
                          className={`w-full h-10 appearance-none bg-slate-950 border rounded-xl px-3 text-xs transition-all ${
                            m.studentId
                              ? 'border-slate-800 text-white'
                              : 'border-red-500/50 text-red-400 bg-red-500/5'
                          }`}
                        >
                          <option value="">-- Wählen --</option>
                          {students.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.lastName}, {s.firstName}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600"
                          size={14}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1 truncate">
                        <BookOpen size={10} /> Fach ({m.row.subject})
                      </label>
                      <div className="relative">
                        <select
                          value={m.subjectId || ''}
                          onChange={(e) => updateMapping(idx, 'subjectId', e.target.value)}
                          className={`w-full h-10 appearance-none bg-slate-950 border rounded-xl px-3 text-xs transition-all ${
                            m.subjectId
                              ? 'border-slate-800 text-white font-bold'
                              : 'border-red-500/50 text-red-400 bg-red-500/5'
                          }`}
                        >
                          <option value="">-- Wählen --</option>
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600"
                          size={14}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1 truncate">
                        <GraduationCap size={10} /> Prüfer ({m.row.examiner})
                      </label>
                      <div className="relative">
                        <select
                          value={m.examinerId || ''}
                          onChange={(e) => updateMapping(idx, 'examinerId', e.target.value)}
                          className={`w-full h-10 appearance-none bg-slate-950 border rounded-xl px-3 text-xs transition-all ${
                            m.examinerId
                              ? 'border-slate-800 text-white'
                              : 'border-red-500/50 text-red-400 bg-red-500/5'
                          }`}
                        >
                          <option value="">-- Wählen --</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.shortName}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600"
                          size={14}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1 truncate">
                        <GraduationCap size={10} /> Protokoll ({m.row.protocol || '-'})
                      </label>
                      <div className="relative">
                        <select
                          value={m.protocolId || ''}
                          onChange={(e) => updateMapping(idx, 'protocolId', e.target.value)}
                          className={`w-full h-10 appearance-none bg-slate-950 border rounded-xl px-3 text-xs transition-all ${
                            m.protocolId
                              ? 'border-slate-800 text-white'
                              : m.row.protocol
                                ? 'border-red-500/50 text-red-400 bg-red-500/5'
                                : 'border-slate-800 text-slate-500'
                          }`}
                        >
                          <option value="">-- Wählen --</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.shortName}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600"
                          size={14}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1 truncate">
                        <GraduationCap size={10} /> Vorsitz ({m.row.chair || '-'})
                      </label>
                      <div className="relative">
                        <select
                          value={m.chairId || ''}
                          onChange={(e) => updateMapping(idx, 'chairId', e.target.value)}
                          className={`w-full h-10 appearance-none bg-slate-950 border rounded-xl px-3 text-xs transition-all ${
                            m.chairId
                              ? 'border-slate-800 text-white'
                              : m.row.chair
                                ? 'border-red-500/50 text-red-400 bg-red-500/5'
                                : 'border-slate-800 text-slate-500'
                          }`}
                        >
                          <option value="">-- Wählen --</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.shortName}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600"
                          size={14}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1 truncate">
                        <MapPin size={10} /> Raum ({m.row.examRoom})
                      </label>
                      <div className="relative">
                        <select
                          value={m.roomId || ''}
                          onChange={(e) => updateMapping(idx, 'roomId', e.target.value)}
                          className={`w-full h-10 appearance-none bg-slate-950 border rounded-xl px-3 text-xs transition-all ${
                            m.roomId
                              ? 'border-slate-800 text-white'
                              : 'border-red-500/50 text-red-400 bg-red-500/5'
                          }`}
                        >
                          <option value="">-- Wählen --</option>
                          {rooms
                            .filter((r) => r.type === 'Prüfungsraum')
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                        </select>
                        <ChevronDown
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600"
                          size={14}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-700/30 flex items-center justify-between shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
              Gelesene Zeilen: {rawData.length}
            </span>
            <span
              className={`text-[11px] font-bold ${unmappedRows.length > 0 ? 'text-amber-500' : 'text-emerald-500'}`}
            >
              {unmappedRows.length > 0
                ? `${unmappedRows.length} Korrekturen erforderlich`
                : 'Alle Daten valide'}
            </span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary-glass px-6 h-12 rounded-xl text-sm">
              Abbrechen
            </button>
            <button
              onClick={handleImport}
              disabled={unmappedRows.length > 0}
              className="btn-primary-aurora px-8 h-12 rounded-xl text-sm shadow-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' }}
            >
              Prüfungen final importieren <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
