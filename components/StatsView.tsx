import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';
import { useHeader } from '../context/HeaderContext';
import { useDnD } from '../context/DnDContext';
import {
  Clock,
  Search,
  X,
  Printer,
  Loader2,
  ShieldAlert,
  GraduationCap,
  Download,
  RotateCcw,
} from 'lucide-react';
import {
  checkTeacherAvailability,
  getTeacherBlockedPeriods,
  getTeacherSubjectPeriods,
} from '../utils/engine';
import { timeToMin, examSlotToMin } from '../utils/TimeService';
import { Supervision, Teacher } from '../types';
import { Modal } from './Modal';
import { PdfExportService } from '../services/PdfExportService';
import { GridTimeColumn } from './common/GridTimeColumn';
import { WorkloadIndicator } from './stats/WorkloadIndicator';
import { SupervisionPrintView } from './SupervisionPrintView';

interface SupervisionCardProps {
  sup: Supervision;
  teacher?: Teacher;
  isTeacherMatch: (t?: Teacher) => boolean;
  activeDraggingSupId: string | null;
  isDraggingReal: boolean;
  startDrag: any;
  handleDrop: any;
  timeSlots: string[];
  SLOT_MIN_HEIGHT: number;
}

const SupervisionCard = React.memo<SupervisionCardProps>(({
  sup,
  teacher,
  isTeacherMatch,
  activeDraggingSupId,
  isDraggingReal,
  startDrag,
  handleDrop,
  timeSlots,
  SLOT_MIN_HEIGHT
}) => {
  const hasHighlight = isTeacherMatch(teacher);
  const slotIdx = timeSlots.indexOf(sup.startTime);
  const isDraggingThis = activeDraggingSupId === sup.id && isDraggingReal;
  const cardRef = useRef<HTMLDivElement>(null);

  // Robuster Event-Listener für Drop (Swap)
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const onDropHandler = (e: CustomEvent) => {
      e.stopPropagation(); // VERHINDERT DOPPEL-DROP
      const { dragId, dropInfo, extraData } = e.detail;
      // Benutze handleDrop prop direkt, React sorgt für Re-Subscription falls es sich ändert
      // ODER wir könnten hier auch ein Ref nutzen, aber handleDrop ist im Dependency-Array
      handleDrop(
        dragId,
        dropInfo.stationId,
        dropInfo.subIdx,
        dropInfo.slotIdx,
        extraData?.supId
      );
    };

    el.addEventListener('linexio-drop', onDropHandler as EventListener);
    return () => el.removeEventListener('linexio-drop', onDropHandler as EventListener);
  }, [handleDrop]);

  const ghostUI = (
    <div className="w-fit max-w-[240px] px-4 py-2.5 flex items-center bg-[#1e293b] border border-cyan-500 rounded-xl shadow-2xl">
      <span className="text-sm font-bold text-white truncate leading-none">
        {teacher?.lastName}, {teacher?.firstName}
      </span>
    </div>
  );

  return (
    <div
      key={sup.id}
      data-drop-zone="true"
      data-drop-info={JSON.stringify({
        type: 'supervision-slot',
        stationId: sup.stationId,
        subIdx: sup.subSlotIdx,
        slotIdx,
        onDrop: true,
      })}
      ref={cardRef}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        startDrag(
          sup.teacherId,
          'teacher',
          e,
          { supId: sup.id },
          ghostUI
        );
      }}
      className={`draggable-item absolute inset-x-1 rounded-xl border flex items-center justify-center shadow-2xl pointer-events-auto transition-all duration-300
        ${hasHighlight
          ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] z-30'
          : 'bg-[#1e293b] border-slate-700/50 hover:border-cyan-500/50'
        } ${isDraggingThis ? 'opacity-20 scale-95' : 'opacity-100'}`}
      style={{
        top: slotIdx * SLOT_MIN_HEIGHT + 4,
        height: SLOT_MIN_HEIGHT * 2 - 8,
        transition:
          'top 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s, transform 0.2s',
        zIndex: isDraggingThis ? 100 : 20,
        pointerEvents: activeDraggingSupId && !isDraggingReal ? 'none' : 'auto',
      }}
    >
      <span
        className={`text-[11px] font-black tracking-widest drop-shadow-md pointer-events-none text-center ${hasHighlight ? 'text-cyan-300' : 'text-slate-200'}`}
      >
        {teacher?.shortName || '?'}
      </span>
    </div>
  );
});

export const StatsView: React.FC = () => {
  const {
    exams,
    supervisions,
    addSupervision,
    updateSupervision,
    removeSupervision,
    getTeacherStats,
    undo,
    canUndo,
  } = useApp();
  const { days, rooms, teachers, subjects } = useData();
  const { showToast } = useUI();
  const { startDrag, activeDrag, dropTarget } = useDnD();

  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredSlot, setHoveredSlot] = useState<{
    stationId: string;
    slotIdx: number;
    subIdx: number;
  } | null>(null);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [workloadInfo, setHoveredWorkloadInfo] = useState<{ time: string; count: number } | null>(
    null
  );

  const SLOT_MIN_HEIGHT = 44;
  const START_MIN_DAY = 450;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (canUndo) {
          e.preventDefault();
          undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, canUndo]);

  const isSpotlightActive = searchTerm.trim().length >= 2;
  const isTeacherMatch = (t?: Teacher) => {
    if (!t || !isSpotlightActive) return false;
    const term = searchTerm.toLowerCase().trim();
    return t.shortName.toLowerCase().includes(term) || t.lastName.toLowerCase().includes(term);
  };

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 7.5; h <= 18.0; h += 0.5) {
      const hh = Math.floor(h);
      const mm = h % 1 === 0 ? '00' : '30';
      slots.push(`${hh.toString().padStart(2, '0')}:${mm}`);
    }
    return slots;
  }, []);

  useEffect(() => {
    if (dropTarget && dropTarget.info.type === 'supervision-slot') {
      setHoveredSlot({
        stationId: dropTarget.info.stationId,
        slotIdx: dropTarget.info.slotIdx,
        subIdx: dropTarget.info.subIdx,
      });
    } else {
      setHoveredSlot(null);
    }
  }, [dropTarget]);

  const stations = useMemo(
    () => rooms.filter((r) => r.isSupervisionStation || r.type === 'Aufsicht-Station'),
    [rooms]
  );

  const filteredTeachers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const sorted = [...teachers].sort((a, b) => {
      const pA = getTeacherStats(a.id).points;
      const pB = getTeacherStats(b.id).points;
      if (pA !== pB) return pA - pB;
      return a.lastName.localeCompare(b.lastName, 'de');
    });

    if (!term) return sorted;
    return sorted.filter(
      (t) =>
        t.lastName.toLowerCase().includes(term) ||
        t.firstName.toLowerCase().includes(term) ||
        t.shortName.toLowerCase().includes(term)
    );
  }, [teachers, searchTerm, getTeacherStats]);

  const handleDrop = useCallback(
    (
      teacherId: string,
      stationId: string,
      subIdx: number,
      slotIdx: number,
      existingSupId?: string
    ) => {
      if (!teacherId) return;

      if (slotIdx >= timeSlots.length - 1) {
        showToast('Nicht genügend Zeit für eine volle Aufsicht (60 Min).', 'warning');
        return;
      }

      const time = timeSlots[slotIdx];
      const startTimeMin = START_MIN_DAY + slotIdx * 30;

      const targetSup = supervisions.find(
        (s) =>
          s.dayIdx === activeDayIdx &&
          s.stationId === stationId &&
          s.subSlotIdx === subIdx &&
          s.startTime === time
      );

      // LOGIK: TAUSCH (Lehrer A auf Lehrer B ziehen)
      if (existingSupId && targetSup) {
        if (existingSupId === targetSup.id) return;

        const sourceSup = supervisions.find((s) => s.id === existingSupId);
        if (!sourceSup) return;

        const teacherA = sourceSup.teacherId;
        const teacherB = targetSup.teacherId;

        // Verfügbarkeit prüfen: Passt A an den Ort von B? (Ignoriere beide beim Check)
        const availA = checkTeacherAvailability(
          teacherA,
          activeDayIdx,
          startTimeMin,
          60,
          exams,
          supervisions,
          existingSupId
        );
        // Achtung: Wenn wir tauschen, muss auch B an den Ort von A passen
        const sourceSlotIdx = timeSlots.indexOf(sourceSup.startTime);
        const sourceTimeMin = START_MIN_DAY + sourceSlotIdx * 30;
        const availB = checkTeacherAvailability(
          teacherB,
          activeDayIdx,
          sourceTimeMin,
          60,
          exams,
          supervisions,
          targetSup.id
        );

        if (availA.isBusy) {
          showToast(`Tausch blockiert (A): ${availA.reason}`, 'warning');
          return;
        }
        if (availB.isBusy) {
          showToast(`Tausch blockiert (B): ${availB.reason}`, 'warning');
          return;
        }

        // TAUSCH: Behalte IDs bei, tausche Koordinaten für den Gleit-Effekt
        updateSupervision([
          {
            ...sourceSup,
            startTime: targetSup.startTime,
            stationId: targetSup.stationId,
            subSlotIdx: targetSup.subSlotIdx,
          },
          {
            ...targetSup,
            startTime: sourceSup.startTime,
            stationId: sourceSup.stationId,
            subSlotIdx: sourceSup.subSlotIdx,
          },
        ]);

        showToast('Aufsichten getauscht', 'success');
        return;
      }

      // LOGIK: ERSETZEN (Lehrer aus Liste auf besetzten Slot ziehen)
      if (!existingSupId && targetSup) {
        const avail = checkTeacherAvailability(
          teacherId,
          activeDayIdx,
          startTimeMin,
          60,
          exams,
          supervisions,
          targetSup.id
        );
        if (avail.isBusy) {
          showToast(avail.reason!, 'warning');
          return;
        }
        updateSupervision({ ...targetSup, teacherId });
        showToast('Lehrkraft ersetzt', 'success');
        return;
      }

      // LOGIK: VERSCHIEBEN (Lehrer auf leeren Slot ziehen)
      if (existingSupId && !targetSup) {
        const sourceSup = supervisions.find((s) => s.id === existingSupId);
        if (!sourceSup) return;
        const avail = checkTeacherAvailability(
          teacherId,
          activeDayIdx,
          startTimeMin,
          60,
          exams,
          supervisions,
          existingSupId
        );
        if (avail.isBusy) {
          showToast(avail.reason!, 'warning');
          return;
        }

        updateSupervision({ ...sourceSup, startTime: time, stationId, subSlotIdx: subIdx });
        return;
      }

      // LOGIK: NEUANLAGE (Lehrer aus Liste auf leeren Slot ziehen)
      if (!existingSupId && !targetSup) {
        const avail = checkTeacherAvailability(
          teacherId,
          activeDayIdx,
          startTimeMin,
          60,
          exams,
          supervisions
        );
        if (avail.isBusy) {
          showToast(avail.reason!, 'warning');
          return;
        }
        const newSup: Supervision = {
          id: `s-${Date.now()}`,
          stationId,
          teacherId: teacherId,
          dayIdx: activeDayIdx,
          startTime: time,
          durationMinutes: 60,
          points: 1.0,
          subSlotIdx: subIdx,
        };
        addSupervision(newSup);
      }
    },
    [activeDayIdx, exams, supervisions, timeSlots, addSupervision, updateSupervision, showToast]
  );

  const handleDropRef = useRef(handleDrop);
  const removeSupervisionRef = useRef(removeSupervision);

  // Synchronize refs with latest callbacks on every render
  handleDropRef.current = handleDrop;
  removeSupervisionRef.current = removeSupervision;
  const handleExport = async () => {
    setIsExporting(true);
    const dayLabel = days[activeDayIdx]?.label || 'Aufsichtsplan';
    const filename = `Aufsichtsplan_${dayLabel.replace(/\s/g, '_')}`;
    try {
      await PdfExportService.generateSupervisionPdf(
        { exams, supervisions, days, rooms, teachers, subjects } as any,
        activeDayIdx,
        filename
      );
      showToast('Aufsichtsplan erfolgreich gespeichert', 'success');
    } catch (err) {
      console.error('PDF Export Error:', err);
      showToast('Speichern fehlgeschlagen', 'error');
    } finally {
      setIsExporting(false);
      setShowExportPreview(false);
    }
  };

  const headerContent = useMemo(() => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => undo()}
        disabled={!canUndo}
        className={`btn-secondary-glass w-9 h-9 p-0 rounded-xl shadow-lg border-indigo-500/30 transition-all ${canUndo ? 'text-indigo-400' : 'text-slate-600 opacity-30 cursor-not-allowed'}`}
        title="Rückgängig (Cmd+Z)"
      >
        <RotateCcw size={15} />
      </button>
      <button
        onClick={() => setShowExportPreview(true)}
        className="btn-secondary-glass h-9 px-4 rounded-xl shadow-lg border-indigo-500/30 text-slate-200"
      >
        <Printer size={15} className="text-indigo-400" />
        <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">
          Export PDF
        </span>
      </button>
    </div>
  ), [undo, canUndo, setShowExportPreview]);

  useHeader(headerContent);

  const isDraggingReal = activeDrag?.isDraggingStarted;
  const activeDraggingTeacherId =
    activeDrag?.type === 'teacher' && isDraggingReal ? activeDrag.id : null;
  const activeDraggingSupId = activeDrag?.type === 'teacher' ? activeDrag.extraData?.supId : null;

  const dragSubjectBlocked = useMemo(() => {
    if (!activeDraggingTeacherId) return [];
    return getTeacherBlockedPeriods(activeDraggingTeacherId, activeDayIdx, exams);
  }, [activeDraggingTeacherId, activeDayIdx, exams]);

  const dragSubjectAmber = useMemo(() => {
    if (!activeDraggingTeacherId) return [];
    return getTeacherSubjectPeriods(
      activeDraggingTeacherId,
      activeDayIdx,
      exams,
      teachers,
      subjects
    );
  }, [activeDraggingTeacherId, activeDayIdx, exams, teachers, subjects]);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden animate-page-in select-none">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Aufsichtsplan</h2>
          <p className="text-cyan-500/80 text-[10px] font-bold tracking-wide mt-0.5">
            Lehrer-Einteilung & Deputat-Kontrolle
          </p>
        </div>
        <div className="segmented-control-wrapper w-full max-w-md shrink-0">
          <div
            className="segmented-control-slider"
            style={{
              width: `calc((100% - 6px) / ${days.length})`,
              transform: `translateX(calc(${activeDayIdx} * 100%))`,
            }}
          />
          {days.map((day, idx) => (
            <button
              key={day.id}
              onClick={() => setActiveDayIdx(idx)}
              className={`segmented-control-item h-10 ${activeDayIdx === idx ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <div className="flex flex-col items-center">
                <span className="text-[10px]">{day.label}</span>
                <span className="text-[8px] opacity-60 normal-case">
                  {new Date(day.date).toLocaleDateString('de-DE', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        <div
          data-drop-zone="true"
          data-drop-info={JSON.stringify({ type: 'trash-sup', onDrop: true })}
          ref={(el) => {
            if (el && !el.dataset.listenerAdded) {
              el.addEventListener('linexio-drop', ((e: CustomEvent) => {
                const { extraData } = e.detail;
                if (extraData?.supId) {
                  removeSupervisionRef.current(extraData.supId);
                }
              }) as EventListener);
              el.dataset.listenerAdded = 'true';
            }
          }}
          className={`w-80 flex flex-col glass-nocturne border-slate-700/30 overflow-hidden shrink-0 transition-all ${activeDraggingSupId && isDraggingReal ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-slate-900/40'}`}
        >
          <div className="p-4 border-b border-slate-700/30 space-y-3">
            <h3 className="font-bold text-white text-xs uppercase tracking-widest flex items-center gap-2">
              <Clock size={14} className="text-cyan-400" /> Lehrkräfte
            </h3>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={14}
              />
              <input
                type="text"
                placeholder="Lehrer suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-cyan-500/40"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 no-scrollbar">
            {filteredTeachers.map((teacher) => {
              const stats = getTeacherStats(teacher.id);
              const isDraggingThis =
                activeDrag?.id === teacher.id && !activeDraggingSupId && isDraggingReal;

              const ghostUI = (
                <div className="w-fit max-w-[240px] px-4 py-2.5 flex items-center bg-[#1e293b] border border-cyan-500 rounded-xl shadow-2xl">
                  <span className="text-sm font-bold text-white truncate leading-none">
                    {teacher.lastName}, {teacher.firstName}
                  </span>
                </div>
              );

              return (
                <div
                  key={teacher.id}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    startDrag(teacher.id, 'teacher', e, { supId: null }, ghostUI);
                  }}
                  className={`draggable-item py-1.5 px-2.5 rounded-xl border flex items-center gap-3 transition-all duration-300 hover:border-cyan-500/50 bg-[#1e293b] border-slate-700/50 shadow-sm 
                    ${isDraggingThis ? 'opacity-20 scale-95' : ''}`}
                >
                  <div className="flex flex-col min-w-0 flex-1 pointer-events-none">
                    <span className="text-[14.5px] font-bold truncate leading-tight text-slate-200">
                      {teacher.lastName}, {teacher.firstName}
                      {teacher.isPartTime && (
                        <span className="text-cyan-500 ml-1" title="Teilzeit">
                          °
                        </span>
                      )}
                      {teacher.isLeadership && (
                        <span className="text-amber-500 ml-1" title="Schulleitung">
                          *
                        </span>
                      )}
                    </span>
                    <span className="text-[11.5px] font-black font-mono text-cyan-500">
                      {teacher.shortName}
                    </span>
                  </div>
                  <div className="badge px-2 py-1 min-w-[32px] text-xs font-black shadow-inner border transition-all badge-cyan border-cyan-500/30 bg-cyan-500/10 pointer-events-none">
                    {Math.round(stats.points)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-slate-900/60 border-t border-slate-700/30 px-4 py-2 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {filteredTeachers.length} Lehrkräfte
            </span>
            <div className="flex gap-4">
              <span className="text-[10px] font-bold text-cyan-500/80 tracking-widest">
                ° Teilzeit
              </span>
              <span className="text-[10px] font-bold text-amber-500/80 tracking-widest">
                * Leitung
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 glass-nocturne border-slate-700/30 overflow-hidden flex flex-col min-w-0 relative">
          <div className="flex-1 overflow-auto relative scroll-smooth no-scrollbar">
            <div className="flex flex-col min-w-max w-full min-h-full">
              {/* Sticky Header Row */}
              <div className="sticky top-0 z-50 flex bg-[#0f172a] border-b border-slate-700/60 h-[44px] min-w-max w-full shadow-xl">
                <div className="w-20 shrink-0 border-r border-slate-700/60 flex items-center justify-center bg-[#0f172a] sticky left-0 z-[60] shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
                  <Clock size={16} className="text-slate-500" />
                </div>
                {/* Synchronisierter Wrapper für Header-Spalten passend zum Body */}
                <div className="flex-1 flex min-w-max w-full">
                  {stations.map((station) => (
                    <div
                      key={station.id}
                      className="flex-1 min-w-max flex border-r last:border-r-0 border-slate-700/40 h-full"
                    >
                      {Array.from({ length: station.requiredSupervisors || 1 }).map((_, subIdx) => (
                        <div
                          key={subIdx}
                          className="flex-1 min-w-[80px] flex items-center justify-center border-r last:border-r-0 border-slate-700/10 px-1 hover:bg-slate-800/20 transition-colors"
                        >
                          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.2em] truncate w-full text-center">
                            {station.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative flex min-h-full">
                <GridTimeColumn
                  timeSlots={timeSlots}
                  slotHeight={SLOT_MIN_HEIGHT}
                  useFlexibleGrid={false}
                  renderSlot={(time, idx) => {
                    const isFullHour = idx % 2 !== 0;

                    // Workload-Berechnung für den Slot
                    const startMin = timeToMin(time);
                    const endMin = startMin + 30;

                    const count = exams.reduce((acc, exam) => {
                      if (exam.status === 'cancelled') return acc;
                      const day = Math.floor((exam.startTime - 1) / 1000);
                      if (day !== activeDayIdx) return acc;

                      const eStart = examSlotToMin(exam.startTime);
                      // Standard-Dauer 30 Min gemäß Engine
                      const eEnd = eStart + 30;

                      // Overlap Check
                      if (eStart < endMin && eEnd > startMin) {
                        return acc + 1;
                      }
                      return acc;
                    }, 0);

                    // Farblogik gemäß User-Request
                    let barColor = 'bg-slate-700/50';
                    if (count >= 6) barColor = 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]';
                    else if (count >= 4) barColor = 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]';
                    else if (count >= 2) barColor = 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]';
                    else if (count > 0) barColor = 'bg-slate-600';

                    return (
                      <div
                        className="w-full h-full flex items-start justify-center pt-1 relative group cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => count > 0 && setHoveredWorkloadInfo({ time, count })}
                      >
                        {count > 0 && (
                          <div
                            className={`absolute left-0 top-0 bottom-0 w-2 transition-all duration-500 ${barColor}`}
                            style={{ clipPath: 'polygon(0 0, 100% 25%, 100% 75%, 0 100%)' }}
                          />
                        )}
                        <span
                          className={`text-[11px] font-bold transition-all duration-300 ${isFullHour ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-slate-500 opacity-60'}`}
                        >
                          {time}
                        </span>
                      </div>
                    );
                  }}
                />

                <div className="flex-1 flex bg-slate-900/5 relative min-w-max w-full">
                  {stations.map((station) => (
                    <div
                      key={station.id}
                      className="flex-1 min-w-max flex border-r last:border-r-0 border-slate-700/40 relative"
                    >
                      {Array.from({ length: station.requiredSupervisors || 1 }).map((_, subIdx) => (
                        <div
                          key={subIdx}
                          className="flex-1 min-w-[80px] border-r last:border-r-0 border-slate-700/10 relative"
                        >
                          {/* Raster Drop-Zonen & Markierungen */}
                          <div
                            className="grid h-full w-full"
                            style={{
                              gridTemplateRows: `repeat(${timeSlots.length}, ${SLOT_MIN_HEIGHT}px)`,
                            }}
                          >
                            {timeSlots.map((time, slotIdx) => {
                              const isHoveredTop =
                                hoveredSlot?.stationId === station.id &&
                                hoveredSlot?.slotIdx === slotIdx &&
                                hoveredSlot?.subIdx === subIdx;
                              const cellMin = START_MIN_DAY + slotIdx * 30;
                              const isBlocked =
                                activeDraggingTeacherId &&
                                dragSubjectBlocked.some(
                                  (p) => cellMin < p.end && cellMin + 30 > p.start
                                );
                              const isAmber =
                                activeDraggingTeacherId &&
                                !isBlocked &&
                                dragSubjectAmber.some(
                                  (p) => cellMin < p.end && cellMin + 30 > p.start
                                );
                              const isZebra = slotIdx % 2 !== 0;

                              return (
                                <div
                                  key={slotIdx}
                                  data-drop-zone="true"
                                  data-drop-info={JSON.stringify({
                                    type: 'supervision-slot',
                                    stationId: station.id,
                                    subIdx,
                                    slotIdx,
                                    onDrop: true,
                                  })}
                                  ref={(el) => {
                                    if (el && !el.dataset.listenerAdded) {
                                      el.addEventListener('linexio-drop', ((e: CustomEvent) => {
                                        e.stopPropagation(); // STOPP PROPAGATION
                                        const { dragId, extraData, dropInfo } = e.detail;
                                        handleDropRef.current(
                                          dragId,
                                          dropInfo.stationId,
                                          dropInfo.subIdx,
                                          dropInfo.slotIdx,
                                          extraData?.supId
                                        );
                                      }) as EventListener);
                                      el.dataset.listenerAdded = 'true';
                                    }
                                  }}
                                  className={`w-full relative transition-all duration-300 border-b
                                    ${isBlocked ? 'bg-red-500/30' : isAmber ? 'bg-amber-500/20' : isZebra ? 'bg-slate-800/25' : 'bg-transparent'}
                                    ${isHoveredTop ? 'border-b-transparent' : 'border-b-slate-800/40'}
                                  `}
                                >
                                  {isHoveredTop && (
                                    <div
                                      className="absolute inset-x-0 top-0 z-30 pointer-events-none ring-1 ring-inset ring-cyan-500 bg-cyan-500/10 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                                      style={{ height: '200%' }}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Absolute Layer für Sanftes Gleiten der Aufsichts-Cards */}
                          <div className="absolute inset-0 pointer-events-none z-20">
                            {supervisions
                              .filter(
                                (s) =>
                                  s.dayIdx === activeDayIdx &&
                                  s.stationId === station.id &&
                                  s.subSlotIdx === subIdx
                              )
                              .map((sup) => (
                                <SupervisionCard
                                  key={sup.id}
                                  sup={sup}
                                  teacher={teachers.find((t) => t.id === sup.teacherId)}
                                  isTeacherMatch={isTeacherMatch}
                                  activeDraggingSupId={activeDraggingSupId}
                                  isDraggingReal={isDraggingReal}
                                  startDrag={startDrag}
                                  handleDrop={handleDrop}
                                  timeSlots={timeSlots}
                                  SLOT_MIN_HEIGHT={SLOT_MIN_HEIGHT}
                                />
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <WorkloadIndicator info={workloadInfo} onClose={() => setHoveredWorkloadInfo(null)} />

      <Modal
        isOpen={showExportPreview}
        onClose={() => setShowExportPreview(false)}
        maxWidth="max-w-[1200px]"
      >
        <div className="flex flex-col gap-6 h-[85vh] overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/30 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Export Aufsichtsplan
                </h3>
                <p className="text-xs text-indigo-400 font-medium">
                  Vorschau für {days[activeDayIdx]?.label}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="btn-aurora-base btn-indigo-aurora px-6 py-2.5 rounded-xl text-sm disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                <span>
                  PDF <span className="normal-case">speichern</span>
                </span>
              </button>
              <button
                onClick={() => setShowExportPreview(false)}
                className="p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-slate-950/40 rounded-2xl p-6 border border-slate-700/30 shadow-inner no-scrollbar">
            <div className="mx-auto bg-white rounded-sm shadow-2xl">
              <SupervisionPrintView activeDayIdx={activeDayIdx} isPreview={true} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
