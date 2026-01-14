import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { Clock, Search, X, Printer, Loader2, CheckCircle, ShieldAlert, AlertCircle, AlertTriangle, Trash2, Download } from 'lucide-react';
import { checkTeacherAvailability, getTeacherBlockedPeriods, getTeacherSubjectPeriods } from '../utils/engine';
import { Supervision } from '../types';
import { Modal } from './Modal';
import { PdfExportService } from '../services/PdfExportService';
import { runPreflightCheck } from '../utils/validationEngine';
import { GridTimeColumn } from './common/GridTimeColumn';
import { WorkloadIndicator } from './stats/WorkloadIndicator';
import { SupervisionPrintView } from './SupervisionPrintView';

interface StatsViewProps {
  onSetHeaderActions?: (actions: React.ReactNode) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ onSetHeaderActions }) => {
  const { exams, supervisions, addSupervision, removeSupervision, getTeacherStats, showToast } = useApp();
  const { days, rooms, teachers, subjects } = useData();
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredSlot, setHoveredSlot] = useState<{ stationId: string; slotIdx: number; subIdx: number } | null>(null);
  const [draggingTeacherId, setDraggingTeacherId] = useState<string | null>(null);
  const [draggingSupId, setDraggingSupId] = useState<string | null>(null);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [workloadInfo, setWorkloadInfo] = useState<{ time: string, count: number } | null>(null);

  const SLOT_HEIGHT = 44;
  const START_MIN_DAY = 450; // 07:30 Uhr

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 7.5; h <= 18.0; h += 0.5) {
      const hh = Math.floor(h);
      const mm = h % 1 === 0 ? '00' : '30';
      slots.push(`${hh.toString().padStart(2, '0')}:${mm}`);
    }
    return slots;
  }, []);

  const stations = useMemo(() => rooms.filter(r => r.isSupervisionStation || r.type === 'Aufsicht-Station'), [rooms]);

  const filteredTeachers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    
    // Zweistufige Sortierung: 
    // 1. Stundenanzahl (Punkte) aufsteigend
    // 2. Nachname alphabetisch
    const sorted = [...teachers].sort((a, b) => {
      const pA = getTeacherStats(a.id).points;
      const pB = getTeacherStats(b.id).points;
      
      if (pA !== pB) {
        return pA - pB;
      }
      
      return a.lastName.localeCompare(b.lastName, 'de');
    });

    if (!term) return sorted;
    return sorted.filter(t => 
      t.lastName.toLowerCase().includes(term) || 
      t.firstName.toLowerCase().includes(term) || 
      t.shortName.toLowerCase().includes(term)
    );
  }, [teachers, searchTerm, getTeacherStats]);

  const handleDrop = useCallback((stationId: string, subIdx: number, slotIdx: number) => {
    setHoveredSlot(null);
    if (!draggingTeacherId) return;

    if (slotIdx >= timeSlots.length - 1) {
      showToast('Nicht genügend Zeit für eine volle Aufsicht (60 Min).', 'warning');
      return;
    }

    const time = timeSlots[slotIdx];
    const startTimeMin = START_MIN_DAY + slotIdx * 30;
    
    const availability = checkTeacherAvailability(
      draggingTeacherId, 
      activeDayIdx, 
      startTimeMin, 
      60, 
      exams, 
      supervisions, 
      draggingSupId || undefined
    );

    if (availability.isBusy) {
      showToast(`${availability.reason}`, 'warning');
      return;
    }

    if (draggingSupId) removeSupervision(draggingSupId);

    const newSup: Supervision = {
      id: `s-${Date.now()}`,
      stationId,
      teacherId: draggingTeacherId,
      dayIdx: activeDayIdx,
      startTime: time,
      durationMinutes: 60,
      points: 1.0, 
      subSlotIdx: subIdx
    };

    addSupervision(newSup);
    setDraggingTeacherId(null);
    setDraggingSupId(null);
  }, [draggingTeacherId, draggingSupId, activeDayIdx, exams, supervisions, timeSlots, addSupervision, removeSupervision, showToast]);

  const handleExport = async () => {
    setIsExporting(true);
    const dayLabel = days[activeDayIdx]?.label || "Aufsichtsplan";
    const filename = `Aufsichtsplan_${dayLabel.replace(/\s/g, '_')}`;
    try {
      await PdfExportService.generateSupervisionPdf({ exams, supervisions, days, rooms, teachers, subjects } as any, activeDayIdx, filename);
      showToast('Aufsichtsplan erfolgreich gespeichert', 'success');
    } catch (err) {
      console.error("PDF Export Error:", err);
      showToast('Speichern fehlgeschlagen', 'error');
    } finally {
      setIsExporting(false);
      setShowExportPreview(false);
    }
  };

  useEffect(() => {
    if (onSetHeaderActions) {
      onSetHeaderActions(
        <button onClick={() => setShowExportPreview(true)} className="btn-secondary-glass h-9 px-4 rounded-xl shadow-lg border-indigo-500/30 text-slate-200">
          <Printer size={15} className="text-indigo-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">Export Aufsichten</span>
        </button>
      );
    }
  }, [onSetHeaderActions]);

  const dragSubjectBlocked = useMemo(() => {
    if (!draggingTeacherId) return [];
    return getTeacherBlockedPeriods(draggingTeacherId, activeDayIdx, exams);
  }, [draggingTeacherId, activeDayIdx, exams]);

  const dragSubjectAmber = useMemo(() => {
    if (!draggingTeacherId) return [];
    return getTeacherSubjectPeriods(draggingTeacherId, activeDayIdx, exams, teachers, subjects);
  }, [draggingTeacherId, activeDayIdx, exams, teachers, subjects]);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden animate-page-in select-none">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Aufsichtsplan</h2>
          <p className="text-cyan-500/80 text-[10px] font-bold tracking-wide mt-0.5">Lehrer-Einteilung & Deputat-Kontrolle</p>
        </div>
        <div className="segmented-control-wrapper w-full max-w-md shrink-0">
          <div className="segmented-control-slider" style={{ width: `calc((100% - 6px) / ${days.length})`, transform: `translateX(calc(${activeDayIdx} * 100%))` }} />
          {days.map((day, idx) => (
            <button key={day.id} onClick={() => setActiveDayIdx(idx)} className={`segmented-control-item h-10 ${activeDayIdx === idx ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              <div className="flex flex-col items-center"><span className="text-[10px]">{day.label}</span><span className="text-[8px] opacity-60 normal-case">{new Date(day.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span></div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        <div 
          className={`w-80 flex flex-col glass-nocturne border-slate-700/30 overflow-hidden shrink-0 transition-all ${draggingSupId ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-900/40'}`}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
          onDrop={(e) => {
            if (draggingSupId) {
              removeSupervision(draggingSupId);
              showToast('Aufsicht entfernt', 'info');
              setDraggingSupId(null);
              setDraggingTeacherId(null);
            }
          }}
        >
          <div className="p-4 border-b border-slate-700/30 space-y-3">
            <h3 className="font-bold text-white text-xs uppercase tracking-widest flex items-center gap-2">
              <Clock size={14} className="text-cyan-400" /> Lehrkräfte
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input type="text" placeholder="Lehrer suchen..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-cyan-500/40" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 no-scrollbar">
            {filteredTeachers.map(teacher => {
              const stats = getTeacherStats(teacher.id);
              const isDragging = draggingTeacherId === teacher.id && !draggingSupId;
              return (
                <div 
                  key={teacher.id} 
                  draggable 
                  onDragStart={(e) => { 
                    e.dataTransfer.setData('teacherId', teacher.id); 
                    e.dataTransfer.dropEffect = 'move'; 
                    setTimeout(() => setDraggingTeacherId(teacher.id), 0);
                  }} 
                  onDragEnd={() => setDraggingTeacherId(null)} 
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-grab active:cursor-grabbing transition-all hover:border-cyan-500/50 bg-[#1e293b] border-slate-700/50 shadow-sm ${isDragging ? 'opacity-20 scale-95' : ''}`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-slate-200 truncate leading-none">{teacher.lastName}, {teacher.firstName}</span>
                    <span className="text-[10px] text-cyan-500 font-mono mt-1">{teacher.shortName}</span>
                  </div>
                  <div className="badge badge-cyan px-2 py-1 min-w-[32px] text-xs font-black shadow-inner border-cyan-500/30 bg-cyan-500/10">
                    {Math.round(stats.points)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 glass-nocturne border-slate-700/30 overflow-hidden flex flex-col min-w-0 relative">
          <div className="sticky top-0 z-40 flex bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/60 h-[44px] min-w-max w-full">
            <div className="w-20 shrink-0 border-r border-slate-700/60 flex items-center justify-center bg-slate-900 sticky left-0 z-50"><Clock size={16} className="text-slate-500" /></div>
            {stations.map(station => (
              <div key={station.id} className="flex-1 min-w-[120px] flex border-r border-slate-700/40 overflow-hidden">
                {Array.from({ length: station.requiredSupervisors || 1 }).map((_, subIdx) => (
                  <div key={subIdx} className="flex-1 min-w-[60px] flex flex-col items-center justify-center border-r last:border-r-0 border-slate-800/20 px-1">
                    <span className="text-[10px] font-black text-slate-200 uppercase truncate w-full text-center">{station.name}</span>
                    <span className="text-[7px] text-slate-500 font-bold uppercase">Anzahl: {subIdx + 1}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-auto relative scroll-smooth no-scrollbar">
            <div className="relative flex min-h-full">
              <GridTimeColumn timeSlots={timeSlots} slotHeight={SLOT_HEIGHT} renderSlot={(time, idx) => {
                const isFullHour = idx % 2 !== 0; 
                return (
                  <div className="w-full h-full flex items-start justify-center pt-1">
                    <span className={`text-[11px] font-bold transition-all duration-300 ${isFullHour ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-slate-500 opacity-60'}`}>
                      {time}
                    </span>
                  </div>
                );
              }} />
              
              <div className="flex-1 flex bg-slate-900/5 relative min-w-max">
                {stations.map(station => (
                  <div key={station.id} className="flex-1 min-w-[120px] flex border-r border-slate-800/40 relative">
                    {Array.from({ length: station.requiredSupervisors || 1 }).map((_, subIdx) => (
                      <div key={subIdx} className="flex-1 min-w-[60px] border-r last:border-r-0 border-slate-800/20 relative">
                        {timeSlots.map((time, slotIdx) => {
                          const sup = supervisions.find(s => s.dayIdx === activeDayIdx && s.stationId === station.id && s.subSlotIdx === subIdx && s.startTime === time);
                          const teacher = sup ? teachers.find(t => t.id === sup.teacherId) : null;
                          
                          // Hover-Logic für 60-Min-Blöcke (2 Slots)
                          const isHoveredTop = hoveredSlot?.stationId === station.id && hoveredSlot?.slotIdx === slotIdx && hoveredSlot?.subIdx === subIdx;
                          
                          const cellMin = START_MIN_DAY + slotIdx * 30;
                          const isBlocked = draggingTeacherId && dragSubjectBlocked.some(p => cellMin < p.end && (cellMin + 30) > p.start);
                          const isAmber = draggingTeacherId && !isBlocked && dragSubjectAmber.some(p => cellMin < p.end && (cellMin + 30) > p.start);

                          const isZebra = slotIdx % 2 !== 0; 

                          return (
                            <div 
                              key={slotIdx} 
                              onDragOver={(e) => { 
                                e.preventDefault(); 
                                e.stopPropagation(); 
                                e.dataTransfer.dropEffect = 'move'; 
                                if (hoveredSlot?.slotIdx !== slotIdx) setHoveredSlot({ stationId: station.id, slotIdx, subIdx }); 
                              }} 
                              onDragLeave={() => setHoveredSlot(null)} 
                              onDrop={(e) => { 
                                e.preventDefault(); 
                                e.stopPropagation(); 
                                handleDrop(station.id, subIdx, slotIdx); 
                              }} 
                              style={{ height: SLOT_HEIGHT }} 
                              className={`w-full relative transition-colors border-b
                                ${isZebra ? 'bg-slate-800/25' : 'bg-transparent'}
                                ${isBlocked ? 'bg-red-500/20' : ''}
                                ${isAmber ? 'bg-amber-500/15' : ''}
                                ${isHoveredTop ? 'border-b-transparent' : 'border-b-slate-800/40'}
                              `}
                            >
                              {isHoveredTop && (
                                <div 
                                  className="absolute inset-x-0 top-0 z-30 pointer-events-none ring-1 ring-inset ring-cyan-500 bg-cyan-500/10 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                                  style={{ height: SLOT_HEIGHT * 2 }}
                                />
                              )}

                              {sup && (
                                <div 
                                  draggable 
                                  onDragStart={(e) => { 
                                    e.dataTransfer.setData('teacherId', sup.teacherId); 
                                    e.dataTransfer.setData('supId', sup.id); 
                                    e.dataTransfer.dropEffect = 'move'; 
                                    setTimeout(() => {
                                      setDraggingTeacherId(sup.teacherId); 
                                      setDraggingSupId(sup.id);
                                    }, 0);
                                  }} 
                                  onDragEnd={() => { setDraggingTeacherId(null); setDraggingSupId(null); }} 
                                  className={`absolute inset-x-1 top-1 rounded-xl bg-[#1e293b] border border-slate-700/50 shadow-2xl z-20 flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden group/sup transition-all hover:border-cyan-500/50 ${draggingSupId === sup.id ? 'opacity-20 scale-95' : 'opacity-100'}`}
                                  style={{ height: (SLOT_HEIGHT * 2) - 8 }}
                                >
                                  <span className="text-[11px] font-black text-slate-200 tracking-widest drop-shadow-md group-hover/sup:text-cyan-400">
                                    {teacher?.shortName || '?'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <WorkloadIndicator info={workloadInfo} onClose={() => setWorkloadInfo(null)} />

      <Modal isOpen={showExportPreview} onClose={() => setShowExportPreview(false)} maxWidth="max-w-[1200px]">
        <div className="flex flex-col gap-6 h-[85vh] overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/30 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Export Aufsichtsplan</h3>
                <p className="text-xs text-indigo-400 font-medium">Vorschau für {days[activeDayIdx]?.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleExport} 
                disabled={isExporting} 
                className="btn-aurora-base btn-indigo-aurora px-6 py-2.5 rounded-xl text-sm disabled:opacity-50"
              >
                {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                <span>PDF <span className="normal-case">speichern</span></span>
              </button>
              <button onClick={() => setShowExportPreview(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-slate-950/40 rounded-2xl p-6 border border-slate-700/30 shadow-inner no-scrollbar">
            <div className="mx-auto bg-white rounded-sm shadow-2xl">
              <SupervisionPrintView activeDayIdx={activeDayIdx} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};