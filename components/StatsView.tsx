
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Clock, Search, X, Info, AlertTriangle, Printer, FileText, Download, Loader2, CheckCircle } from 'lucide-react';
import { checkTeacherAvailability, getTeacherBlockedPeriods } from '../utils/engine';
import { Supervision } from '../types';
import { examSlotToMin } from '../utils/TimeService';
import { Modal } from './Modal';
import { isAppleMobile } from '../utils/Platform';
import { PdfExportService } from '../services/PdfExportService';

interface StatsViewProps {
  onSetHeaderActions?: (actions: React.ReactNode) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ onSetHeaderActions }) => {
  const { state, addSupervision, removeSupervision, getTeacherStats, showToast } = useApp();
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredSlot, setHoveredSlot] = useState<{ stationId: string; slotIdx: number; subIdx: number } | null>(null);
  const [draggingTeacherId, setDraggingTeacherId] = useState<string | null>(null);
  const [draggingSupId, setDraggingSupId] = useState<string | null>(null);
  const [isDraggingFromGrid, setIsDraggingFromGrid] = useState(false);
  
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDownloadAnleitung, setShowDownloadAnleitung] = useState(false);

  const [workloadTimeInfo, setWorkloadTimeInfo] = useState<{ time: string, count: number } | null>(null);

  const SLOT_HEIGHT = 60; 
  const END_HOUR = 18.5;  

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 7.5; h < END_HOUR; h += 0.5) {
      const hh = Math.floor(h);
      const mm = (h % 1 === 0) ? '00' : '30';
      slots.push(`${hh.toString().padStart(2, '0')}:${mm}`);
    }
    return slots;
  }, [END_HOUR]);

  // Effekt zum Registrieren des Header-Buttons
  useEffect(() => {
    if (onSetHeaderActions) {
      onSetHeaderActions(
        <button 
          onClick={() => setShowPrintPreview(true)}
          className="btn-secondary-glass h-9 px-4 rounded-xl shadow-lg shadow-cyan-950/20"
          title="Aufsichtsplan Export"
        >
          <Printer size={15} />
          <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">Export PDF</span>
        </button>
      );
      
      return () => onSetHeaderActions(null);
    }
  }, [onSetHeaderActions, setShowPrintPreview]);

  const workloadData = useMemo(() => {
    const counts: Record<string, number> = {};
    const dayExams = state.exams.filter(e => 
      e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === activeDayIdx && e.status !== 'cancelled'
    );

    timeSlots.forEach(slotTime => {
      const [h, m] = slotTime.split(':').map(Number);
      const slotStart = h * 60 + m;
      const slotEnd = slotStart + 30;

      const concurrent = dayExams.filter(e => {
        const examStart = examSlotToMin(e.startTime);
        const examEnd = examStart + 30;
        return examStart < slotEnd && examEnd > slotStart;
      });

      counts[slotTime] = concurrent.length;
    });
    return counts;
  }, [state.exams, activeDayIdx, timeSlots]);

  const getWorkloadColor = (count: number) => {
    if (count <= 2) return 'bg-slate-700/40';
    if (count <= 4) return 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.4)]';
    return 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]';
  };

  const getWorkloadGlowStyle = (count: number) => {
    return { 
      boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.9), 0 0 80px 4px rgba(6, 182, 212, 0.35)',
      borderColor: count >= 5 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(6, 182, 212, 0.4)'
    };
  };

  const blockedPeriods = useMemo(() => {
    if (!draggingTeacherId) return [];
    return getTeacherBlockedPeriods(draggingTeacherId, activeDayIdx, state.exams);
  }, [draggingTeacherId, activeDayIdx, state.exams]);

  const isTimeBlocked = useCallback((timeStr: string) => {
    if (!draggingTeacherId) return false;
    const [h, m] = timeStr.split(':').map(Number);
    const min = h * 60 + m;
    return blockedPeriods.some(p => min >= p.start && min < p.end);
  }, [draggingTeacherId, blockedPeriods]);

  const stations = useMemo(() => 
    state.rooms.filter(r => r.isSupervisionStation),
  [state.rooms]);

  const filteredTeachers = useMemo(() => {
    const sorted = [...state.teachers].sort((a, b) => {
      const pA = getTeacherStats(a.id).points;
      const pB = getTeacherStats(b.id).points;
      return pA - pB;
    });

    if (!searchTerm.trim()) return sorted;
    
    const term = searchTerm.toLowerCase().trim();
    return sorted.filter(t => 
      t.lastName.toLowerCase().includes(term) ||
      t.firstName.toLowerCase().includes(term) ||
      t.shortName.toLowerCase().includes(term)
    );
  }, [state.teachers, getTeacherStats, searchTerm]);

  const resetDraggingState = () => {
    setDraggingTeacherId(null);
    setDraggingSupId(null);
    setIsDraggingFromGrid(false);
    setHoveredSlot(null);
  };

  const handleDropToGrid = (tIdFromEv: string, stationId: string, slotIdx: number, subIdx: number, sIdFromEv?: string) => {
    const teacherId = tIdFromEv || draggingTeacherId;
    const oldSupId = sIdFromEv || draggingSupId;
    
    if (!teacherId) {
      resetDraggingState();
      return;
    }

    const timeStr = timeSlots[slotIdx];
    const [h, m] = timeStr.split(':').map(Number);
    const startMin = h * 60 + m;
    
    const check = checkTeacherAvailability(
      teacherId, activeDayIdx, startMin, 60, state.exams, state.supervisions, oldSupId || undefined
    );

    if (check.isBusy) {
      showToast(`Kollision: ${check.reason}`, 'error');
      resetDraggingState();
      return;
    }

    if (oldSupId) removeSupervision(oldSupId);

    const newSup: Supervision = {
      id: `sup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      teacherId,
      stationId,
      dayIdx: activeDayIdx,
      startTime: timeStr,
      durationMinutes: 60,
      points: 1,
      subSlotIdx: subIdx
    };
    
    addSupervision(newSup);
    showToast(oldSupId ? 'Aufsicht verschoben' : 'Aufsicht zugewiesen', 'success');
    resetDraggingState();
  };

  const getSupervisionsForDay = useMemo(() => 
    state.supervisions.filter(s => s.dayIdx === activeDayIdx),
  [state.supervisions, activeDayIdx]);

  const initiatePdfExport = () => {
    if (isAppleMobile()) {
      setShowDownloadAnleitung(true);
    } else {
      executePdfExport();
    }
  };

  const executePdfExport = async () => {
    setShowDownloadAnleitung(false);
    setIsExporting(true);
    
    const dayLabel = state.days[activeDayIdx]?.label || "Aufsichtsplan";
    const filename = `Aufsichtsplan_${dayLabel.replace(/\s/g, '_')}`;

    try {
      await PdfExportService.generateSupervisionPdf(state, activeDayIdx, filename);
      showToast('Aufsichtsplan erfolgreich generiert.', 'success');
    } catch (err) {
      console.error(err);
      showToast('PDF-Export fehlgeschlagen.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const formattedDayInfo = useMemo(() => {
    const day = state.days[activeDayIdx];
    if (!day) return { day: '', date: '' };
    const dayStr = new Date(day.date).toLocaleDateString('de-DE', { weekday: 'long' });
    const dateStr = new Date(day.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return { day: dayStr, date: dateStr };
  }, [state.days, activeDayIdx]);

  const dayColorClass = useMemo(() => {
    const classes = ['text-cyan-600', 'text-amber-500', 'text-indigo-500'];
    return classes[activeDayIdx] || classes[0];
  }, [activeDayIdx]);

  const footerStr = useMemo(() => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `Erstellt mit LinexioAbi am ${d}.${m}.${y} um ${hh}:${mm} Uhr.`;
  }, []);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden animate-in fade-in duration-500 select-none">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Aufsichtsplan</h2>
          <p className="text-cyan-500/80 text-xs font-medium">Verwaltung der Aufsichten</p>
        </div>
        
        <div className="segmented-control-wrapper w-full max-w-md shrink-0">
          <div 
            className="segmented-control-slider"
            style={{ 
              width: `calc((100% - 6px) / ${state.days.length})`, 
              transform: `translateX(calc(${activeDayIdx} * 100%))` 
            }}
          />
          {state.days.map((day, idx) => (
            <button
              key={day.id}
              onClick={() => setActiveDayIdx(idx)}
              className={`segmented-control-item h-10 ${activeDayIdx === idx ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <div className="flex flex-col items-center">
                <span className="text-[10px]">{day.label}</span>
                <span className="text-[8px] opacity-60 normal-case font-medium">
                  {new Date(day.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden min-h-0 relative">
        <aside 
          onDragOver={e => { if (isDraggingFromGrid) e.preventDefault(); }}
          onDrop={e => {
            const supId = e.dataTransfer.getData('supId') || draggingSupId;
            if (supId) {
              removeSupervision(supId);
              showToast('Aufsicht entfernt', 'info');
            }
            resetDraggingState();
          }}
          className={`w-72 flex flex-col glass-nocturne border-slate-700/30 overflow-hidden shrink-0 transition-all duration-300 relative ${isDraggingFromGrid ? 'bg-red-500/10' : 'bg-slate-900/40'}`}
        >
          <div className="p-4 border-b border-slate-700/30 flex justify-between items-center h-[44px] shrink-0">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Lehrkräfte (Stunden)</h3>
          </div>

          <div className="px-3 py-2 border-b border-slate-700/30 bg-slate-900/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input 
                type="text" 
                placeholder="Name oder Kürzel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-9 pr-8 py-2 text-xs text-white focus:ring-1 focus:ring-cyan-500/40 outline-none transition-all"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
            {filteredTeachers.map(t => {
              const { points } = getTeacherStats(t.id);
              return (
                <div 
                  key={t.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('teacherId', t.id);
                    e.dataTransfer.effectAllowed = 'copyMove';
                    setTimeout(() => {
                      setDraggingTeacherId(t.id);
                      setIsDraggingFromGrid(false);
                    }, 0);
                  }}
                  onDragEnd={resetDraggingState}
                  className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl cursor-grab hover:border-cyan-500/50 transition-all flex items-center justify-between group active:scale-95"
                >
                  <div className="min-w-0 text-left">
                    <div className="text-sm font-bold text-white truncate group-hover:text-cyan-400">{t.lastName}, {t.shortName}</div>
                    <div className={`text-[10px] font-medium tracking-tight ${t.isPartTime ? 'text-amber-400' : 'text-cyan-400'}`}>
                      {t.isPartTime ? 'Teilzeit' : 'Vollzeit'}
                    </div>
                  </div>
                  <div className="px-2 rounded-lg bg-slate-900/50 text-emerald-400 border border-slate-700/60 font-black text-xs min-w-[2.5rem] h-7 flex items-center justify-center">
                    {Math.round(points)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-slate-900/60 border-t border-slate-700/30 px-4 py-2 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{filteredTeachers.length} Einträge</span>
          </div>
        </aside>

        <div className="flex-1 glass-nocturne border-slate-700/30 overflow-hidden flex flex-col min-w-0 relative">
          <div className="flex-1 overflow-auto relative scroll-smooth no-scrollbar" 
               onClick={() => workloadTimeInfo && setWorkloadTimeInfo(null)}>
            <div className="sticky top-0 z-40 flex bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/60 shadow-xl h-[44px] min-w-max w-full">
              <div className="w-20 shrink-0 border-r border-slate-700/60 flex items-center justify-center bg-slate-900 sticky left-0 z-50">
                <Clock size={16} className="text-slate-500" />
              </div>
              {stations.map(station => (
                <div 
                  key={station.id} 
                  className="min-w-[160px] flex-1 px-4 flex flex-col items-center justify-center border-r border-slate-700/40 text-center truncate"
                >
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.2em]">{station.name}</span>
                  <span className="text-[9px] text-cyan-500 font-bold uppercase tracking-tighter">
                    Anzahl: {station.requiredSupervisors}
                  </span>
                </div>
              ))}
            </div>

            <div className="relative flex min-h-full">
              <div className="absolute inset-0 pointer-events-none z-0">
                {timeSlots.map((time, idx) => (
                  <div 
                    key={`row-bg-${idx}`} 
                    style={{ height: SLOT_HEIGHT }}
                    className={`w-full border-b border-slate-800/20 ${time.endsWith(':00') ? 'bg-cyan-500/[0.04]' : ''}`} 
                  />
                ))}
              </div>

              <div className="w-20 shrink-0 border-r border-slate-700/60 bg-slate-900/40 sticky left-0 z-30 shadow-lg">
                {timeSlots.map((time) => {
                  const blocked = isTimeBlocked(time);
                  const isFullHour = time.endsWith(':00');
                  const count = workloadData[time] || 0;
                  
                  return (
                    <div 
                      key={time} 
                      onClick={(e) => {
                        e.stopPropagation();
                        setWorkloadTimeInfo({ time, count });
                      }}
                      className={`relative flex items-start justify-center pt-2 transition-colors duration-300 border-b border-slate-800/40 cursor-pointer group/time ${
                        blocked ? 'bg-red-500/10 text-red-200/60' : 
                        isFullHour ? 'text-cyan-400 font-bold text-[11px] bg-cyan-500/10' : 'text-slate-300 font-bold text-[10px]'
                      }`}
                      style={{ height: SLOT_HEIGHT }}
                    >
                      <div 
                        className={`absolute left-0 top-[10%] bottom-[10%] w-1 rounded-r-full transition-all duration-500 ${getWorkloadColor(count)}`}
                      />
                      <span className="relative z-10 group-hover/time:scale-110 transition-transform">
                        {time}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex-1 flex bg-slate-900/5 relative min-w-max z-10">
                {stations.map(station => (
                  <div key={station.id} className="min-w-[160px] flex-1 relative border-r border-slate-800/40 flex">
                    {Array.from({ length: station.requiredSupervisors }).map((_, subIdx) => (
                      <div key={subIdx} className="flex-1 relative border-r border-slate-800/20 last:border-r-0 h-full">
                        <div className="relative h-full">
                          {timeSlots.map((time, slotIdx) => (
                            <div 
                              key={`${station.id}-${slotIdx}-${subIdx}`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (hoveredSlot?.slotIdx !== slotIdx || hoveredSlot?.subIdx !== subIdx || hoveredSlot?.stationId !== station.id) {
                                  setHoveredSlot({ stationId: station.id, slotIdx, subIdx });
                                }
                              }}
                              onDragLeave={() => setHoveredSlot(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                const tId = e.dataTransfer.getData('teacherId');
                                const sId = e.dataTransfer.getData('supId');
                                handleDropToGrid(tId, station.id, slotIdx, subIdx, sId);
                              }}
                              style={{ height: SLOT_HEIGHT }}
                              className={`w-full relative border-b border-slate-800/10 transition-colors duration-300 ${isTimeBlocked(time) ? 'bg-red-500/5' : ''}`}
                            />
                          ))}

                          {hoveredSlot?.stationId === station.id && hoveredSlot?.subIdx === subIdx && (
                            <div 
                              className={`absolute left-0 right-0 pointer-events-none ring-2 ring-inset z-20 rounded-lg ${
                                isTimeBlocked(timeSlots[hoveredSlot.slotIdx]) ? 'ring-red-500 bg-red-500/20' : 'ring-cyan-500 bg-cyan-500/10'
                              }`}
                              style={{ 
                                top: hoveredSlot.slotIdx * SLOT_HEIGHT, 
                                height: (SLOT_HEIGHT * 2) - 2 
                              }}
                            />
                          )}

                          {getSupervisionsForDay
                            .filter(s => s.stationId === station.id && s.subSlotIdx === subIdx)
                            .map(sup => {
                              const teacher = state.teachers.find(t => t.id === sup.teacherId);
                              const startIdx = timeSlots.indexOf(sup.startTime);
                              if (startIdx === -1) return null;

                              return (
                                <div 
                                  key={sup.id}
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    e.dataTransfer.setData('teacherId', sup.teacherId);
                                    e.dataTransfer.setData('supId', sup.id);
                                    e.dataTransfer.effectAllowed = 'move';
                                    setTimeout(() => {
                                      setDraggingTeacherId(sup.teacherId);
                                      setDraggingSupId(sup.id);
                                      setIsDraggingFromGrid(true);
                                    }, 0);
                                  }}
                                  onDragEnd={resetDraggingState}
                                  style={{ 
                                    position: 'absolute',
                                    top: (startIdx * SLOT_HEIGHT) + 2,
                                    height: (SLOT_HEIGHT * 2) - 4,
                                    left: 2,
                                    right: 2
                                  }}
                                  className="bg-[#1e293b] border border-cyan-500/40 rounded-lg flex flex-col items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)] z-30 cursor-grab active:cursor-grabbing hover:bg-slate-800 transition-all group overflow-hidden"
                                >
                                  <div className="text-xl font-black text-cyan-400 tracking-tighter group-hover:scale-110 transition-transform pointer-events-none">
                                    {teacher?.shortName || '??'}
                                  </div>
                                </div>
                              );
                            })}
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

      {workloadTimeInfo && (
        <div 
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-6 fade-in duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="glass-modal p-5 flex items-center gap-6 min-w-[320px] max-w-[90vw] transition-all duration-500"
            style={getWorkloadGlowStyle(workloadTimeInfo.count)}
          >
            <div className="flex flex-col items-center justify-center border-r border-slate-700/50 pr-5 shrink-0">
              <Clock size={16} className={workloadTimeInfo.count >= 5 ? 'text-amber-500' : 'text-cyan-500'} />
              <span className="text-sm font-black text-white uppercase tracking-widest mt-1">{workloadTimeInfo.time}</span>
            </div>
            
            <div className="flex-1 flex items-center gap-4 min-w-0">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border border-white/10 ${
                getWorkloadColor(workloadTimeInfo.count)
              } text-white shadow-xl shrink-0 transition-all`}>
                {workloadTimeInfo.count}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-bold text-slate-100 tracking-tight leading-none">
                  {workloadTimeInfo.count === 1 ? 'Aktive Prüfung' : 'Zeitgleiche Prüfungen'}
                </span>
                <p className="text-[10px] text-slate-500 font-medium mt-1 leading-tight">
                  {workloadTimeInfo.count >= 5 
                    ? 'Achtung: Erhöhtes Aufkommen in diesem Zeitraum.' 
                    : 'Reguläre Auslastung in diesem Zeitfenster.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pl-2 border-l border-slate-700/30 shrink-0">
              <button 
                onClick={() => setWorkloadTimeInfo(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all active:scale-90"
                title="Schließen"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Preview Modal */}
      <Modal isOpen={showPrintPreview} onClose={() => setShowPrintPreview(false)} maxWidth="max-w-[1200px]">
        <div className="flex flex-col gap-6 h-full max-h-[85vh]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/30">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Export-Vorschau</h3>
                <p className="text-xs text-slate-400 font-medium tracking-wide">
                  Aufsichtsplan für <span className={`${dayColorClass} font-black`}>{formattedDayInfo.day}</span>, {formattedDayInfo.date}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={initiatePdfExport}
                disabled={isExporting}
                className="btn-primary-aurora px-6 py-2.5 rounded-xl text-sm disabled:opacity-50"
              >
                {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {isExporting ? 'Generiere...' : 'PDF speichern'}
              </button>
              <button onClick={() => setShowPrintPreview(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-slate-900/40 rounded-2xl p-4 md:p-8 border border-slate-700/30 shadow-inner no-scrollbar flex flex-col items-center">
             {/* DIN A4 Querformat Vorschau-Container */}
             <div className="bg-white w-[1123px] min-h-[794px] shadow-2xl p-10 text-black font-sans origin-top transform scale-[0.6] md:scale-[0.75] lg:scale-[0.85] xl:scale-[1] flex flex-col">
                <div className="border-b-2 border-black pb-1 mb-6 flex justify-between items-baseline font-bold">
                   <h1 className="text-2xl text-black !important">Aufsichtsplan für <span className={`${dayColorClass} font-black`}>{formattedDayInfo.day}</span>, {formattedDayInfo.date}</h1>
                   <span className="text-xs font-normal text-gray-500 uppercase tracking-widest">Abiturprüfung {state.days[activeDayIdx]?.date.split('-')[0]}</span>
                </div>
                
                <div className="flex-1">
                  <table className="w-full border-collapse border border-black text-[9px] leading-tight">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-black !important">
                        <th className="border border-black border-r-2 border-black !important p-2 w-20 bg-gray-200/50 text-black !important font-bold">Zeit</th>
                        {stations.map(station => (
                          <th key={station.id} colSpan={station.requiredSupervisors} className="border border-black border-r-2 border-black !important p-2 text-center uppercase tracking-wider bg-gray-200/50 text-black !important">
                            <div className="font-black text-[11px] text-black !important">{station.name}</div>
                            {station.type === 'Vorbereitungsraum' && (
                              <div className="text-[8px] font-normal lowercase italic text-gray-500">(Vorb.-raum)</div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((time, slotIdx) => {
                        return (
                          <tr key={time}>
                            <td className="border border-black border-r-2 border-black !important p-1 pt-0.5 text-center align-top font-black bg-gray-100/50 text-[10px] text-black !important">{time}</td>
                            {stations.map(station => (
                              Array.from({ length: station.requiredSupervisors }).map((_, subIdx) => {
                                // Logik zum Überspringen von Zellen bei Rowspan
                                const prevTime = timeSlots[slotIdx - 1];
                                if (prevTime) {
                                   const prevSup = getSupervisionsForDay.find(s => 
                                      s.stationId === station.id && s.subSlotIdx === subIdx && s.startTime === prevTime
                                   );
                                   if (prevSup) return null; // Zelle überspringen, da sie gemerged ist
                                }

                                const sup = getSupervisionsForDay.find(s => 
                                  s.stationId === station.id && 
                                  s.subSlotIdx === subIdx && 
                                  s.startTime === time
                                );
                                const teacher = state.teachers.find(t => t.id === sup?.teacherId);
                                const isLastSub = subIdx === station.requiredSupervisors - 1;
                                
                                return (
                                  <td 
                                    key={`${station.id}-${subIdx}`} 
                                    rowSpan={sup ? 2 : 1}
                                    className={`border border-black ${isLastSub ? 'border-r-2 border-black !important' : ''} p-1 text-center font-black italic text-gray-800 min-w-[35px] h-7 ${!sup ? 'bg-gray-200' : 'bg-white'}`}
                                  >
                                    {teacher?.shortName || ''}
                                  </td>
                                );
                              })
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 text-[9px] text-gray-400 italic flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                    <span>Ein-Seiten-Kompression (Matrix Mode) • Highlighting inaktivierter Slots</span>
                  </div>
                  <span>{footerStr}</span>
                </div>
             </div>
          </div>
        </div>
      </Modal>

      {/* Download Anleitung Modal */}
      <Modal isOpen={showDownloadAnleitung} onClose={() => setShowDownloadAnleitung(false)} maxWidth="max-w-md">
        <div className="flex flex-col items-center text-center space-y-6 py-4">
          <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <CheckCircle size={40} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white tracking-tight">PDF bereit zum Download</h3>
            <p className="text-sm text-slate-400">Der Aufsichtsplan wurde generiert. Bitte bestätige den Download.</p>
          </div>

          <div className="w-full p-4 bg-slate-900/50 rounded-2xl border border-slate-800 text-left space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-cyan-600/20 rounded flex items-center justify-center text-[10px] font-bold text-cyan-400 mt-0.5 shrink-0">1</div>
              <p className="text-[11px] text-slate-300">Klicke auf den Button unten.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-cyan-600/20 rounded flex items-center justify-center text-[10px] font-bold text-cyan-400 mt-0.5 shrink-0">2</div>
              <p className="text-[11px] text-slate-300">Wähle im System-Dialog <strong>"Laden"</strong> oder <strong>"In Dateien sichern"</strong>.</p>
            </div>
          </div>

          <button 
            onClick={executePdfExport}
            className="btn-primary-aurora w-full h-14 rounded-xl text-sm uppercase tracking-wider"
          >
            <Download size={20} /> Jetzt Download starten
          </button>
          
          <button 
            onClick={() => setShowDownloadAnleitung(false)}
            className="text-slate-500 hover:text-white text-xs font-medium transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </Modal>
    </div>
  );
};
