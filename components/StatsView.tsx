import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { Clock, Search, X, Printer, Download, Loader2, CheckCircle, ShieldAlert, AlertCircle, AlertTriangle } from 'lucide-react';
import { checkTeacherAvailability, getTeacherBlockedPeriods, getTeacherSubjectPeriods } from '../utils/engine';
import { Supervision } from '../types';
import { examSlotToMin } from '../utils/TimeService';
import { Modal } from './Modal';
import { isAppleMobile } from '../utils/Platform';
import { PdfExportService } from '../services/PdfExportService';
import { runPreflightCheck } from '../utils/validationEngine';
import { GridTimeColumn } from './common/GridTimeColumn';
import { WorkloadIndicator } from './stats/WorkloadIndicator';

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
  const [isDraggingFromGrid, setIsDraggingFromGrid] = useState(false);
  
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDownloadAnleitung, setShowDownloadAnleitung] = useState(false);

  const [workloadTimeInfo, setWorkloadTimeInfo] = useState<{ time: string, count: number } | null>(null);

  const preflightIssues = useMemo(() => {
    return runPreflightCheck({ exams, supervisions, days, rooms, teachers, subjects } as any, activeDayIdx);
  }, [exams, supervisions, days, rooms, teachers, subjects, activeDayIdx]);

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

  useEffect(() => {
    if (onSetHeaderActions) {
      onSetHeaderActions(
        <button 
          onClick={() => setShowPrintPreview(true)}
          className="btn-secondary-glass h-9 px-4 rounded-xl shadow-lg shadow-cyan-950/20 hover:border-cyan-500/50 text-slate-200"
          title="Aufsichtsplan Export"
        >
          <Printer size={15} className="text-cyan-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">Export PDF</span>
        </button>
      );
      return () => onSetHeaderActions(null);
    }
  }, [onSetHeaderActions]);

  const workloadData = useMemo(() => {
    const counts: Record<string, number> = {};
    const dayExams = exams.filter(e => 
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
  }, [exams, activeDayIdx, timeSlots]);

  const getWorkloadColor = (count: number) => {
    if (count <= 2) return 'bg-slate-700/40';
    if (count <= 4) return 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.4)]';
    return 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]';
  };

  const collisionZones = useMemo(() => {
    if (!draggingTeacherId) return { red: [], amber: [] };
    return {
      red: getTeacherBlockedPeriods(draggingTeacherId, activeDayIdx, exams),
      amber: getTeacherSubjectPeriods(draggingTeacherId, activeDayIdx, exams, teachers, subjects)
    };
  }, [draggingTeacherId, activeDayIdx, exams, teachers, subjects]);

  const getTimeStatus = useCallback((timeStr: string) => {
    if (!draggingTeacherId) return 'none';
    const [h, m] = timeStr.split(':').map(Number);
    const min = h * 60 + m;
    if (collisionZones.red.some(p => min >= p.start && min < p.end)) return 'red';
    if (collisionZones.amber.some(p => min >= p.start && min < p.end)) return 'amber';
    return 'none';
  }, [draggingTeacherId, collisionZones]);

  const stations = useMemo(() => 
    rooms.filter(r => r.isSupervisionStation),
  [rooms]);

  const filteredTeachers = useMemo(() => {
    const sorted = [...teachers].sort((a, b) => {
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
  }, [teachers, getTeacherStats, searchTerm]);

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
      teacherId, activeDayIdx, startMin, 60, exams, supervisions, oldSupId || undefined
    );

    if (check.isBusy) {
      showToast(`Blockiert: ${check.reason}`, 'error');
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
    supervisions.filter(s => s.dayIdx === activeDayIdx),
  [supervisions, activeDayIdx]);

  const executePdfExport = async () => {
    setShowDownloadAnleitung(false);
    setIsExporting(true);
    const dayLabel = days[activeDayIdx]?.label || "Aufsichtsplan";
    const filename = `Aufsichtsplan_${dayLabel.replace(/\s/g, '_')}`;
    try {
      await PdfExportService.generateSupervisionPdf({ exams, supervisions, days, rooms, teachers, subjects } as any, activeDayIdx, filename);
      showToast('Aufsichtsplan erfolgreich generiert.', 'success');
    } catch (err) {
      showToast('PDF-Export fehlgeschlagen.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const formattedDayInfo = useMemo(() => {
    const day = days[activeDayIdx];
    if (!day) return { day: '', date: '' };
    const dayStr = new Date(day.date).toLocaleDateString('de-DE', { weekday: 'long' });
    const dateStr = new Date(day.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return { day: dayStr, date: dateStr };
  }, [days, activeDayIdx]);

  const dayColorClass = useMemo(() => {
    const classes = ['text-cyan-600', 'text-amber-500', 'text-indigo-500'];
    return classes[activeDayIdx] || classes[0];
  }, [activeDayIdx]);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden animate-in fade-in duration-500 select-none">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Aufsichtsplan</h2>
          <p className="text-cyan-500/80 text-[10px] font-bold tracking-wide mt-0.5">Verwaltung der Aufsichten</p>
        </div>
        
        <div className="segmented-control-wrapper w-full max-w-md shrink-0">
          <div 
            className="segmented-control-slider"
            style={{ 
              width: `calc((100% - 6px) / ${days.length})`, 
              transform: `translateX(calc(${activeDayIdx} * 100%))` 
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
                    // Snapshot delay
                    setTimeout(() => {
                      setDraggingTeacherId(t.id);
                      setIsDraggingFromGrid(false);
                    }, 0);
                  }}
                  onDragEnd={resetDraggingState}
                  className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl cursor-grab hover:border-cyan-500/50 transition-all flex items-center justify-between group active:scale-95"
                >
                  <div className="min-w-0 text-left pointer-events-none">
                    <div className="text-sm font-bold text-white truncate group-hover:text-cyan-400">{t.lastName}, {t.shortName}</div>
                    <div className={`text-[10px] font-medium tracking-tight ${t.isPartTime ? 'text-amber-400' : 'text-cyan-400'}`}>
                      {t.isPartTime ? 'Teilzeit' : 'Vollzeit'}
                    </div>
                  </div>
                  <div className="px-2 rounded-lg bg-slate-900/50 text-emerald-400 border border-slate-700/60 font-black text-xs min-w-[2.5rem] h-7 flex items-center justify-center pointer-events-none">
                    {points}
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
                    Anzahl: {station.requiredSupervisors || 1}
                  </span>
                </div>
              ))}
            </div>

            <div className="relative flex min-h-full">
              <GridTimeColumn 
                timeSlots={timeSlots} 
                slotHeight={SLOT_HEIGHT}
                renderSlot={(time) => {
                  const status = getTimeStatus(time);
                  const isFullHour = time.endsWith(':00');
                  const count = workloadData[time] || 0;
                  return (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setWorkloadTimeInfo({ time, count });
                      }}
                      className={`w-full h-full flex items-start justify-center pt-2 transition-colors duration-300 cursor-pointer group/time ${
                        status === 'red' ? 'bg-red-500/20 text-red-200' : 
                        status === 'amber' ? 'bg-amber-500/20 text-amber-200' :
                        isFullHour ? 'text-cyan-400 font-bold text-[11px] bg-cyan-500/10' : 'text-slate-300 font-bold text-[10px]'
                      }`}
                    >
                      <div className={`absolute left-0 top-[10%] bottom-[10%] w-1 rounded-r-full transition-all duration-500 ${getWorkloadColor(count)}`} />
                      <span className="relative z-10 group-hover/time:scale-110 transition-transform">{time}</span>
                    </div>
                  );
                }}
              />

              <div className="flex-1 flex bg-slate-900/5 relative min-w-max z-10">
                {stations.map(station => (
                  <div key={station.id} className="min-w-[160px] flex-1 relative border-r border-slate-800/40 flex">
                    {Array.from({ length: station.requiredSupervisors || 1 }).map((_, subIdx) => (
                      <div key={subIdx} className="flex-1 relative border-r border-slate-800/20 last:border-r-0 h-full">
                        <div className="relative h-full">
                          {timeSlots.map((time, slotIdx) => {
                            const status = getTimeStatus(time);
                            const isEven = slotIdx % 2 === 0;
                            return (
                              <div 
                                key={`${station.id}-${slotIdx}-${subIdx}`}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'copyMove';
                                  if (hoveredSlot?.slotIdx !== slotIdx || hoveredSlot?.subIdx !== subIdx || hoveredSlot?.stationId !== station.id) {
                                    setHoveredSlot({ stationId: station.id, slotIdx, subIdx });
                                  }
                                }}
                                onDragEnter={(e) => {
                                  e.preventDefault();
                                  setHoveredSlot({ stationId: station.id, slotIdx, subIdx });
                                }}
                                onDragLeave={() => setHoveredSlot(null)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const tId = e.dataTransfer.getData('teacherId');
                                  const sId = e.dataTransfer.getData('supId');
                                  handleDropToGrid(tId, station.id, slotIdx, subIdx, sId);
                                }}
                                style={{ height: SLOT_HEIGHT }}
                                className={`w-full relative border-b border-slate-800/20 transition-colors duration-300 z-20 pointer-events-auto flex items-center justify-center ${
                                  status === 'red' ? 'bg-red-500/10' : 
                                  status === 'amber' ? 'bg-amber-500/10' : 
                                  isEven ? 'bg-transparent' : 'bg-slate-800/40'
                                }`}
                              >
                                {status === 'red' && <div className="absolute inset-0 bg-red-500/10 pointer-events-none" />}
                                {status === 'amber' && <div className="absolute inset-0 bg-amber-500/5 pointer-events-none" />}
                              </div>
                            );
                          })}

                          {hoveredSlot?.stationId === station.id && hoveredSlot?.subIdx === subIdx && (
                            <div 
                              className={`absolute left-0.5 right-0.5 pointer-events-none ring-2 ring-inset z-[40] rounded-xl transition-all duration-200 ${
                                getTimeStatus(timeSlots[hoveredSlot.slotIdx]) === 'red' 
                                  ? 'ring-red-500 bg-red-500/30' 
                                  : getTimeStatus(timeSlots[hoveredSlot.slotIdx]) === 'amber'
                                  ? 'ring-amber-500 bg-amber-500/20'
                                  : 'ring-cyan-500 bg-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                              }`}
                              style={{ 
                                top: hoveredSlot.slotIdx * SLOT_HEIGHT + 2, 
                                height: (SLOT_HEIGHT * 2) - 4 
                              }}
                            />
                          )}

                          {getSupervisionsForDay
                            .filter(s => s.stationId === station.id && s.subSlotIdx === subIdx)
                            .map(sup => {
                              const teacher = teachers.find(t => t.id === sup.teacherId);
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
                                    top: (startIdx * SLOT_HEIGHT) + 3,
                                    height: (SLOT_HEIGHT * 2) - 6,
                                    left: 4,
                                    right: 4
                                  }}
                                  className="bg-slate-800/90 backdrop-blur-md border border-cyan-500/40 rounded-xl flex flex-col items-center justify-center shadow-2xl z-[35] cursor-grab active:cursor-grabbing hover:bg-slate-700 hover:border-cyan-400 transition-all group overflow-hidden"
                                >
                                  <div className="text-xl font-black text-white tracking-tighter group-hover:scale-110 transition-transform pointer-events-none drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
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

      <WorkloadIndicator info={workloadTimeInfo} onClose={() => setWorkloadTimeInfo(null)} />

      <Modal isOpen={showPrintPreview} onClose={() => setShowPrintPreview(false)} maxWidth="max-w-[1200px]">
        <div className="flex flex-col gap-6 h-[85vh] overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/30 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Export-Vorschau</h3>
                <p className="text-xs text-slate-400 font-medium tracking-wide">
                  Aufsichtsplan für <span className={`${dayColorClass} font-black`}>{formattedDayInfo.day}</span>, {formattedDayInfo.date}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={executePdfExport} disabled={isExporting} className="btn-primary-aurora px-6 py-2.5 rounded-xl text-sm disabled:opacity-50">
                {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {isExporting ? 'Generiere...' : 'PDF speichern'}
              </button>
              <button onClick={() => setShowPrintPreview(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>
          </div>
          
          <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
            <div className="w-72 flex flex-col gap-4 overflow-y-auto no-scrollbar pr-2 shrink-0">
               <div className="glass-nocturne p-5 border border-slate-700/30 space-y-4">
                  <div className="flex items-center gap-3 border-b border-slate-700/30 pb-3">
                    <ShieldAlert size={18} className="text-cyan-400" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Aufsichts-Scan</h4>
                  </div>
                  <div className="space-y-3">
                    {preflightIssues.filter(i => i.category !== 'commission').length === 0 ? (
                      <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                        <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-slate-300">Keine Lücken in der Aufsichtsplanung gefunden.</p>
                      </div>
                    ) : (
                      preflightIssues.filter(i => i.category !== 'commission').map((issue) => (
                        <div key={issue.id} className={`p-3 rounded-xl border flex flex-col gap-1.5 ${issue.severity === 'error' ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                           <div className="flex items-center gap-2">
                              {issue.severity === 'error' ? <AlertCircle size={14} className="text-red-500" /> : <AlertTriangle size={14} className="text-amber-500" />}
                              <span className={`text-[10px] font-bold uppercase tracking-tight ${issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`}>{issue.message}</span>
                           </div>
                           {issue.details && <p className="text-[10px] text-slate-400 leading-tight pl-5 italic">{issue.details}</p>}
                        </div>
                      ))
                    )}
                  </div>
               </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-950/40 rounded-2xl p-6 border border-slate-700/30 shadow-inner no-scrollbar">
               <p className="text-center text-slate-500 italic text-sm mt-20">Aufsichtsplan-Vorschau wird generiert...</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};