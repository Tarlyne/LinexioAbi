import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Clock } from 'lucide-react';
import { checkTeacherAvailability, getTeacherBlockedPeriods } from '../utils/engine';
import { Supervision } from '../types';

export const StatsView: React.FC = () => {
  const { state, addSupervision, removeSupervision, getTeacherStats, showToast } = useApp();
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [hoveredSlot, setHoveredSlot] = useState<{ stationId: string; slotIdx: number; subIdx: number } | null>(null);
  const [draggingTeacherId, setDraggingTeacherId] = useState<string | null>(null);
  const [draggingSupId, setDraggingSupId] = useState<string | null>(null);
  const [isDraggingFromGrid, setIsDraggingFromGrid] = useState(false);

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

  const sortedTeachers = useMemo(() => {
    return [...state.teachers].sort((a, b) => {
      const pA = getTeacherStats(a.id).points;
      const pB = getTeacherStats(b.id).points;
      return pA - pB;
    });
  }, [state.teachers, getTeacherStats]);

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

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden animate-in fade-in duration-500 select-none">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Aufsichtsplan</h2>
          <p className="text-cyan-500/80 text-xs font-medium">Verwaltung der Aufsichten</p>
        </div>
        
        <div className="relative flex p-1 bg-slate-900/60 border border-slate-700/30 rounded-xl w-full max-w-md shrink-0">
          <div 
            className="absolute top-1 bottom-1 left-1 bg-cyan-600 rounded-lg shadow-lg shadow-cyan-900/20 transition-all duration-300 ease-in-out"
            style={{ 
              width: `calc((100% - 8px) / ${state.days.length})`, 
              transform: `translateX(calc(${activeDayIdx} * 100%))` 
            }}
          />
          {state.days.map((day, idx) => (
            <button
              key={day.id}
              onClick={() => setActiveDayIdx(idx)}
              className={`relative z-10 flex-1 flex flex-col items-center justify-center py-2 transition-colors duration-300 rounded-lg outline-none ${
                activeDayIdx === idx ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wider">{day.label}</span>
              <span className={`text-[9px] font-medium opacity-80 ${activeDayIdx === idx ? 'text-white' : 'text-slate-600'}`}>
                {new Date(day.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
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
          <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
            {sortedTeachers.map(t => {
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
                  <div className="px-2 py-1 rounded-lg bg-slate-900/50 text-emerald-400 border border-slate-700/60 font-black text-xs min-w-[2.5rem] text-center">
                    {Math.round(points)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-slate-900/60 border-t border-slate-700/30 px-4 py-2 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{sortedTeachers.length} Einträge</span>
          </div>
        </aside>

        <div className="flex-1 glass-nocturne border-slate-700/30 overflow-hidden flex flex-col min-w-0 relative">
          <div className="flex-1 overflow-auto relative scroll-smooth no-scrollbar">
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
              {/* Central Background Layer for Full-Row Highlighting */}
              <div className="absolute inset-0 pointer-events-none z-0">
                {timeSlots.map((time, idx) => (
                  <div 
                    key={`row-bg-${idx}`} 
                    style={{ height: SLOT_HEIGHT }}
                    className={`w-full border-b border-slate-800/20 ${time.endsWith(':00') ? 'bg-cyan-500/[0.04]' : ''}`} 
                  />
                ))}
              </div>

              {/* Time Column */}
              <div className="w-20 shrink-0 border-r border-slate-700/60 bg-slate-900/40 sticky left-0 z-30 shadow-lg">
                {timeSlots.map((time) => {
                  const blocked = isTimeBlocked(time);
                  const isFullHour = time.endsWith(':00');
                  return (
                    <div 
                      key={time} 
                      className={`flex items-center justify-center transition-colors duration-300 border-b border-slate-800/40 ${
                        blocked ? 'bg-red-500/20 text-red-200 font-bold' : 
                        isFullHour ? 'text-cyan-400 font-bold text-[11px] bg-cyan-500/10' : 'text-slate-200 font-bold text-[10px]'
                      }`}
                      style={{ height: SLOT_HEIGHT }}
                    >
                      {time}
                    </div>
                  );
                })}
              </div>

              {/* Grid Body */}
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
    </div>
  );
};