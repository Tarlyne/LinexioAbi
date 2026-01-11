
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { 
  PlusCircle, AlertCircle, MapPin, Clock, Trash2, 
  X, Save, ChevronDown, Settings, Layers, Printer, FileText, Download, Loader2, CheckCircle
} from 'lucide-react';
import { Exam } from '../types';
import { Modal } from './Modal';
import { usePlanning } from '../hooks/usePlanning';
import { BacklogSidebar } from './planning/BacklogSidebar';
import { ExamCard } from './planning/ExamCard';
import { ExportPrintView } from './ExportPrintView';
import { isAppleMobile } from '../utils/Platform';
import { PdfExportService } from '../services/PdfExportService';

interface PlanningViewProps {
  onSetHeaderActions?: (actions: React.ReactNode) => void;
}

export const PlanningView: React.FC<PlanningViewProps> = ({ onSetHeaderActions }) => {
  const {
    state,
    searchTerm, setSearchTerm,
    sortOption, setSortOption,
    activeDay, setActiveDay,
    showModal, setShowModal,
    showDeleteConfirm, setShowDeleteConfirm,
    editingExam, setEditingExam,
    hoveredSlot, setHoveredSlot,
    isDraggingOverBacklog, setIsDraggingOverBacklog,
    draggingExamId, setDraggingExamId,
    dragCounter,
    rooms,
    plannedExamsForDay,
    filteredAndSortedBacklog,
    handleDropToSlot,
    handleRemoveFromGrid,
    addExams, updateExam, deleteExam, checkCollision, showToast
  } = usePlanning();
  
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDownloadAnleitung, setShowDownloadAnleitung] = useState(false);
  
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const SLOT_HEIGHT = 38; 
  const startHour = 8;
  const endHour = 18;
  
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += 10) {
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  const prepRooms = useMemo(() => 
    state.rooms.filter(r => r.type === 'Vorbereitungsraum'), 
  [state.rooms]);

  const openAddModal = () => {
    setEditingExam({ subject: 'Deutsch', groupId: '' });
    setShowDeleteConfirm(false);
    setShowModal(true);
  };

  const openEditModal = (exam: Exam) => {
    setEditingExam({ ...exam });
    setShowDeleteConfirm(false);
    setShowModal(true);
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam?.studentId || !editingExam?.teacherId || !editingExam?.subject) {
      showToast('Bitte Basis-Felder ausfüllen.', 'warning');
      return;
    }

    const commissionIds = [editingExam.teacherId, editingExam.chairId, editingExam.protocolId].filter(id => !!id);
    const uniqueIds = new Set(commissionIds);
    if (uniqueIds.size !== commissionIds.length) {
      showToast('Eine Lehrkraft kann nicht mehrere Rollen in einer Prüfung einnehmen.', 'error');
      return;
    }

    if (editingExam.id) {
      const collision = checkCollision(editingExam as Exam);
      if (collision.hasConflict) {
        showToast(collision.reason || 'Kollision festgestellt!', 'warning');
      }
      updateExam(editingExam as Exam);
    } else {
      const exam: Exam = {
        id: `e-${Date.now()}`,
        studentId: editingExam.studentId!,
        teacherId: editingExam.teacherId!,
        chairId: editingExam.chairId,
        protocolId: editingExam.protocolId,
        prepRoomId: editingExam.prepRoomId,
        subject: editingExam.subject!,
        groupId: editingExam.groupId,
        startTime: 0,
        status: 'backlog'
      };
      addExams([exam]);
    }
    setShowModal(false);
  };

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
    
    const dayLabel = state.days[activeDay]?.label || "Prüfungsplan";
    const filename = `Pruefungsplan_${dayLabel.replace(/\s/g, '_')}`;

    try {
      await PdfExportService.generateAndDownload(state, activeDay, filename);
      showToast('PDF erfolgreich generiert.', 'success');
    } catch (err) {
      console.error(err);
      showToast('PDF-Export fehlgeschlagen.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const formattedDayInfo = useMemo(() => {
    const day = state.days[activeDay];
    if (!day) return '';
    const dateStr = new Date(day.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${day.label} (${dateStr})`;
  }, [state.days, activeDay]);

  // Effekt zum Registrieren des Header-Buttons mit Cleanup
  useEffect(() => {
    if (onSetHeaderActions) {
      onSetHeaderActions(
        <button 
          onClick={() => setShowPrintPreview(true)}
          className="btn-secondary-glass h-9 px-4 rounded-xl shadow-lg shadow-cyan-950/20"
          title="Prüfungsplan Export"
        >
          <Printer size={15} />
          <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">Export PDF</span>
        </button>
      );
      
      // Cleanup: Actions beim Verlassen des Tabs entfernen
      return () => onSetHeaderActions(null);
    }
  }, [onSetHeaderActions, setShowPrintPreview]);

  const getDeletingItemName = () => {
    if (!editingExam?.studentId) return 'Prüfung';
    const student = state.students.find(s => s.id === editingExam.studentId);
    return student ? `${student.lastName}, ${student.firstName}` : 'Prüfung';
  };

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden select-none print:hidden">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Prüfungsplan</h2>
          <p className="text-cyan-500/80 text-xs font-medium">Verwaltung der Prüfungen</p>
        </div>
        
        <div className="segmented-control-wrapper w-full max-w-md shrink-0">
          <div 
            className="segmented-control-slider"
            style={{ 
              width: `calc((100% - 6px) / ${state.days.length})`, 
              transform: `translateX(calc(${activeDay} * 100%))` 
            }}
          />
          {state.days.map((day, idx) => (
            <button
              key={day.id}
              onClick={() => setActiveDay(idx)}
              className={`segmented-control-item h-10 ${activeDay === idx ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
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

      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        <BacklogSidebar 
          exams={filteredAndSortedBacklog}
          students={state.students}
          teachers={state.teachers}
          rooms={state.rooms}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortOption={sortOption}
          onSortChange={setSortOption}
          onAddExam={openAddModal}
          onEditExam={openEditModal}
          onRemoveFromGrid={handleRemoveFromGrid}
          isDraggingOver={isDraggingOverBacklog}
          setIsDraggingOver={setIsDraggingOverBacklog}
          draggingExamId={draggingExamId}
          onDragStart={setDraggingExamId}
          onDragEnd={() => setDraggingExamId(null)}
          onDragCounterChange={(val) => {
            dragCounter.current += val;
            if (dragCounter.current === 0) setIsDraggingOverBacklog(false);
          }}
        />

        <div className="flex-1 glass-nocturne border-slate-700/30 overflow-hidden flex flex-col min-w-0">
          {rooms.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3 italic text-sm">
              <MapPin size={40} className="opacity-10 mb-2" />
              Keine Räume in der Datenbank hinterlegt.
            </div>
          ) : (
            <div className="flex-1 overflow-auto relative scroll-smooth no-scrollbar" ref={gridContainerRef}>
              <div className="sticky top-0 z-40 flex bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/60 shadow-xl h-[44px] min-w-max w-full">
                <div className="w-20 shrink-0 border-r border-slate-700/60 flex items-center justify-center bg-slate-900 sticky left-0 z-50">
                  <Clock size={16} className="text-slate-500" />
                </div>
                {rooms.map(room => (
                  <div key={room.id} className="min-w-[180px] flex-1 px-4 py-3 border-r border-slate-700/40 text-center truncate">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.2em]">{room.name}</span>
                  </div>
                ))}
              </div>

              <div className="relative flex min-h-full">
                <div className="w-20 shrink-0 border-r border-slate-700/60 bg-slate-900/40 sticky left-0 z-30 shadow-lg">
                  {timeSlots.map((time, idx) => (
                    <div 
                      key={time} 
                      className={idx % 6 === 0 
                        ? 'grid-row-hour text-cyan-400 font-bold text-[11px]' 
                        : 'grid-row text-slate-200 font-bold text-[10px]'}
                    >
                      {time}
                    </div>
                  ))}
                </div>

                <div className="flex-1 flex bg-slate-900/5 relative min-w-max">
                  {rooms.map(room => (
                    <div key={room.id} className="min-w-[180px] flex-1 relative border-r border-slate-800/40">
                      <div className="absolute inset-0 pointer-events-none z-0">
                        {timeSlots.map((_, idx) => (
                          <div 
                            key={idx} 
                            className={`opacity-50 ${idx % 6 === 0 ? 'grid-row-hour border-slate-700' : 'grid-row border-slate-800'}`} 
                          />
                        ))}
                      </div>

                      <div className="relative h-full z-10">
                        {timeSlots.map((_, slotIdx) => (
                          <div 
                            key={`${room.id}-${slotIdx}`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = 'move';
                              if (hoveredSlot?.slotIdx !== slotIdx || hoveredSlot?.roomId !== room.id) {
                                setHoveredSlot({roomId: room.id, slotIdx});
                              }
                            }}
                            onDragLeave={() => setHoveredSlot(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const examId = e.dataTransfer.getData('examId') || draggingExamId;
                              handleDropToSlot(examId, room.id, slotIdx, timeSlots.length);
                            }}
                            style={{ height: SLOT_HEIGHT }}
                            className="w-full relative z-10"
                          />
                        ))}

                        {hoveredSlot?.roomId === room.id && (
                          <div 
                            className="absolute left-1 right-1 pointer-events-none ring-2 ring-inset ring-cyan-500 bg-cyan-500/10 z-[25] rounded-lg transition-none"
                            style={{ 
                              top: hoveredSlot.slotIdx * SLOT_HEIGHT, 
                              height: (SLOT_HEIGHT * 3) - 2 
                            }}
                          />
                        )}

                        {plannedExamsForDay
                          .filter(e => e.roomId === room.id)
                          .map(examAtSlot => (
                            <ExamCard 
                              key={examAtSlot.id}
                              exam={examAtSlot}
                              student={state.students.find(s => s.id === examAtSlot.studentId)}
                              teacher={state.teachers.find(t => t.id === examAtSlot.teacherId)}
                              chair={state.teachers.find(t => t.id === examAtSlot.chairId)}
                              protocol={state.teachers.find(t => t.id === examAtSlot.protocolId)}
                              prepRoom={state.rooms.find(r => r.id === examAtSlot.prepRoomId)}
                              hasConflict={checkCollision(examAtSlot).hasConflict}
                              onEdit={openEditModal}
                              onRemove={handleRemoveFromGrid}
                              slotHeight={SLOT_HEIGHT}
                              isAnyDragging={!!draggingExamId}
                              onDragStart={setDraggingExamId}
                              onDragEnd={() => setDraggingExamId(null)}
                            />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} maxWidth="max-w-lg">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/30">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                {editingExam?.id ? <Settings size={20} /> : <PlusCircle size={20} />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {editingExam?.id ? 'Prüfung bearbeiten' : 'Prüfung erstellen'}
                </h3>
                <p className="text-xs text-cyan-500/80 font-medium">Details zur Prüfung</p>
              </div>
            </div>
            <button onClick={() => setShowModal(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {!showDeleteConfirm ? (
            <form onSubmit={handleSaveExam} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">SchülerIn</label>
                  <div className="relative group">
                    <select 
                      className="w-full appearance-none bg-[#0a0f1d] border border-slate-700/50 rounded-xl pl-4 pr-10 py-3 text-white focus:ring-1 focus:ring-cyan-500/40 cursor-pointer"
                      onChange={e => setEditingExam(prev => ({...prev, studentId: e.target.value}))}
                      value={editingExam?.studentId || ''}
                    >
                      <option value="">Auswählen...</option>
                      {state.students.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(s => (
                        <option key={s.id} value={s.id}>{s.lastName}, {s.firstName}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" size={16} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">Prüfungsfach</label>
                  <div className="relative group">
                    <select 
                      className="w-full appearance-none bg-[#0a0f1d] border border-slate-700/50 rounded-xl pl-4 pr-10 py-3 text-white focus:ring-1 focus:ring-cyan-500/40 cursor-pointer font-bold"
                      onChange={e => setEditingExam(prev => ({...prev, subject: e.target.value}))}
                      value={editingExam?.subject || ''}
                    >
                      <option value="">Fach wählen...</option>
                      {state.subjects.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" size={16} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">Gruppe</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      maxLength={10}
                      value={editingExam?.groupId || ''} 
                      onChange={e => setEditingExam(prev => ({...prev, groupId: e.target.value.toUpperCase()}))}
                      className="w-full bg-[#0a0f1d] border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40 font-mono"
                      placeholder="z.B. A"
                    />
                    <Layers size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-800 pb-2">Kommission</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Prüfer</label>
                    <div className="col-span-2 relative group">
                      <select 
                        className="w-full appearance-none bg-[#0a0f1d] border border-slate-700/50 rounded-xl pl-4 pr-10 py-2.5 text-white focus:ring-1 focus:ring-cyan-500/40 cursor-pointer text-sm"
                        onChange={e => setEditingExam(prev => ({...prev, teacherId: e.target.value}))}
                        value={editingExam?.teacherId || ''}
                      >
                        <option value="">Nicht zugewiesen</option>
                        {state.teachers.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(t => (
                          <option key={t.id} value={t.id}>{t.lastName}, {t.firstName} ({t.shortName})</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" size={14} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Vorsitz</label>
                    <div className="col-span-2 relative group">
                      <select 
                        className="w-full appearance-none bg-[#0a0f1d] border border-slate-700/50 rounded-xl pl-4 pr-10 py-2.5 text-white focus:ring-1 focus:ring-cyan-500/40 cursor-pointer text-sm"
                        onChange={e => setEditingExam(prev => ({...prev, chairId: e.target.value}))}
                        value={editingExam?.chairId || ''}
                      >
                        <option value="">Nicht zugewiesen</option>
                        {state.teachers.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(t => (
                          <option key={t.id} value={t.id}>{t.lastName}, {t.firstName} ({t.shortName})</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" size={14} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Protokoll</label>
                    <div className="col-span-2 relative group">
                      <select 
                        className="w-full appearance-none bg-[#0a0f1d] border border-slate-700/50 rounded-xl pl-4 pr-10 py-2.5 text-white focus:ring-1 focus:ring-cyan-500/40 cursor-pointer text-sm"
                        onChange={e => setEditingExam(prev => ({...prev, protocolId: e.target.value}))}
                        value={editingExam?.protocolId || ''}
                      >
                        <option value="">Nicht zugewiesen</option>
                        {state.teachers.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(t => (
                          <option key={t.id} value={t.id}>{t.lastName}, {t.firstName} ({t.shortName})</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" size={14} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-800 pb-2">Vorbereitungsraum</h4>
                <div className="grid grid-cols-3 items-center gap-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Raum:</label>
                  <div className="col-span-2 relative group">
                    <select 
                      className="w-full appearance-none bg-[#0a0f1d] border border-slate-700/50 rounded-xl pl-4 pr-10 py-2.5 text-white focus:ring-1 focus:ring-cyan-500/40 cursor-pointer text-sm"
                      onChange={e => setEditingExam(prev => ({...prev, prepRoomId: e.target.value}))}
                      value={editingExam?.prepRoomId || ''}
                    >
                      <option value="">Kein Vorbereitungsraum</option>
                      {prepRooms.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" size={14} />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                {editingExam?.id && (
                  <button 
                    type="button" 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-sm"
                  >
                    <Trash2 size={18} /> Löschen
                  </button>
                )}
                <button 
                  type="submit" 
                  className="btn-primary-aurora flex-[2] h-12 rounded-xl text-sm"
                >
                  <Save size={18} /> {editingExam?.id ? 'Änderungen speichern' : 'Prüfung anlegen'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6 animate-in zoom-in-95 duration-200 py-4">
              <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 mx-auto mb-2">
                  <AlertCircle size={24} />
                </div>
                <h4 className="text-white font-bold tracking-tight">"{getDeletingItemName()}" löschen?</h4>
                <p className="text-xs text-slate-400">Diese Aktion kann nicht rückgängig gemacht werden.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  type="button" 
                  onClick={() => { deleteExam(editingExam!.id!); setShowModal(false); }}
                  className="w-full h-14 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all"
                >
                  Unwiderruflich löschen
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary-glass w-full h-12 rounded-xl"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={showPrintPreview} onClose={() => setShowPrintPreview(false)} maxWidth="max-w-4xl">
        <div className="flex flex-col gap-6 h-full max-h-[85vh]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/30">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Export-Vorschau</h3>
                <p className="text-xs text-cyan-500/80 font-medium">Prüfungsplan für {formattedDayInfo}</p>
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

          <div className="flex-1 overflow-auto bg-slate-900/40 rounded-2xl p-6 border border-slate-700/30 shadow-inner no-scrollbar text-black">
            <div className="mx-auto">
               <ExportPrintView activeDayIdx={activeDay} isPreview={true} />
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 py-2 shrink-0">
            <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              <div className="w-2 h-2 rounded-full bg-cyan-500"></div> Native Vector Rendering
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              <div className="w-2 h-2 rounded-full bg-cyan-500"></div> Precise Centering active
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              <div className="w-2 h-2 rounded-full bg-cyan-500"></div> Format: A4 Portrait
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showDownloadAnleitung} onClose={() => setShowDownloadAnleitung(false)} maxWidth="max-w-md">
        <div className="flex flex-col items-center text-center space-y-6 py-4">
          <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <CheckCircle size={40} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white tracking-tight">PDF bereit zum Download</h3>
            <p className="text-sm text-slate-400">Die Generation ist abgeschlossen. Bitte bestätige den Download für dein iPad.</p>
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
