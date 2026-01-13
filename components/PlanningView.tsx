import React, { useMemo, useRef, useState, useEffect } from 'react';
import { 
  PlusCircle, AlertCircle, MapPin, Clock, Trash2, 
  X, Save, ChevronDown, Settings, Layers, Printer, FileText, Download, Loader2, CheckCircle, Upload, ShieldAlert, Info, AlertTriangle
} from 'lucide-react';
import { Exam } from '../types';
import { Modal } from './Modal';
import { usePlanning } from '../hooks/usePlanning';
import { BacklogSidebar } from './planning/BacklogSidebar';
import { ExamCard } from './planning/ExamCard';
import { ExportPrintView } from './ExportPrintView';
import { isAppleMobile } from '../utils/Platform';
import { PdfExportService } from '../services/PdfExportService';
import { parseAbiturExamsCSV, RawExamCSVRow } from '../utils/csvParser';
import { ExamImportWizard } from './planning/ExamImportWizard';
import { ImportInstructionsModal } from './planning/ImportInstructionsModal';
import { runPreflightCheck } from '../utils/validationEngine';
import { GridTimeColumn } from './common/GridTimeColumn';
import { PlanningGridHeader } from './planning/PlanningGridHeader';

interface PlanningViewProps {
  onSetHeaderActions?: (actions: React.ReactNode) => void;
}

export const PlanningView: React.FC<PlanningViewProps> = ({ onSetHeaderActions }) => {
  const {
    exams, days, rooms, teachers, students, subjects,
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
    plannedExamsForDay,
    filteredAndSortedBacklog,
    handleDropToSlot,
    handleRemoveFromGrid,
    addExams, updateExam, deleteExam, checkCollision, showToast
  } = usePlanning();
  
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDownloadAnleitung, setShowDownloadAnleitung] = useState(false);
  
  const preflightIssues = useMemo(() => {
    return runPreflightCheck({ exams, supervisions: [], days, rooms, teachers, students, subjects } as any, activeDay);
  }, [exams, activeDay, days, rooms, teachers, students, subjects]);

  const [showInstructions, setShowInstructions] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [importRawData, setImportRawData] = useState<RawExamCSVRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const prepRoomsList = useMemo(() => 
    rooms.filter(r => r.type === 'Vorbereitungsraum'), 
  [rooms]);

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const rows = parseAbiturExamsCSV(text);
        if (rows.length === 0) {
          showToast('Die Datei scheint leer zu sein.', 'warning');
          return;
        }
        setImportRawData(rows);
        setShowImportWizard(true);
      } catch (err) {
        showToast('Fehler beim Lesen der CSV-Datei.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

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
    
    const dayLabel = days[activeDay]?.label || "Prüfungsplan";
    const filename = `Pruefungsplan_${dayLabel.replace(/\s/g, '_')}`;

    try {
      await PdfExportService.generateAndDownload({ exams, days, rooms, teachers, students, subjects } as any, activeDay, filename);
      showToast('PDF erfolgreich generiert.', 'success');
    } catch (err) {
      console.error(err);
      showToast('PDF-Export fehlgeschlagen.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const formattedDayInfo = useMemo(() => {
    const day = days[activeDay];
    if (!day) return '';
    const dateStr = new Date(day.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${day.label} (${dateStr})`;
  }, [days, activeDay]);

  useEffect(() => {
    if (onSetHeaderActions) {
      onSetHeaderActions(
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowInstructions(true)}
            className="btn-secondary-glass h-9 px-4 rounded-xl border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
            title="Prüfungen importieren (CSV)"
          >
            <Upload size={15} className="text-indigo-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">Import CSV</span>
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".csv" 
            onChange={handleCsvFileSelect} 
          />

          <button 
            onClick={() => setShowPrintPreview(true)}
            className="btn-secondary-glass h-9 px-4 rounded-xl shadow-lg shadow-cyan-950/20 hover:border-cyan-500/50 text-slate-200"
            title="Prüfungsplan Export"
          >
            <Printer size={15} className="text-cyan-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">Export PDF</span>
          </button>
        </div>
      );
      
      return () => onSetHeaderActions(null);
    }
  }, [onSetHeaderActions, setShowPrintPreview, showToast, exams, days, rooms, teachers, students, subjects]);

  const getDeletingItemName = () => {
    if (!editingExam?.studentId) return 'Prüfung';
    const student = students.find(s => s.id === editingExam.studentId);
    return student ? `${student.lastName}, ${student.firstName}` : 'Prüfung';
  };

  const planningRoomsList = useMemo(() => rooms.filter(r => r.type === 'Prüfungsraum'), [rooms]);

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden select-none print:hidden">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Prüfungsplan</h2>
          <p className="text-cyan-500/80 text-[10px] font-bold tracking-wide mt-0.5">Verwaltung der Prüfungen</p>
        </div>
        
        <div className="segmented-control-wrapper w-full max-w-md shrink-0">
          <div 
            className="segmented-control-slider"
            style={{ 
              width: `calc((100% - 6px) / ${days.length})`, 
              transform: `translateX(calc(${activeDay} * 100%))` 
            }}
          />
          {days.map((day, idx) => (
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
          students={students}
          teachers={teachers}
          rooms={rooms}
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
          {planningRoomsList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3 italic text-sm">
              <MapPin size={40} className="opacity-10 mb-2" />
              Keine Prüfungsräume in der Datenbank hinterlegt.
            </div>
          ) : (
            <div className="flex-1 overflow-auto relative scroll-smooth no-scrollbar" ref={gridContainerRef}>
              <PlanningGridHeader rooms={planningRoomsList} />

              <div className="relative flex min-h-full">
                <GridTimeColumn 
                  timeSlots={timeSlots} 
                  slotHeight={SLOT_HEIGHT}
                  renderSlot={(time, idx) => (
                    <span className={idx % 6 === 0 ? 'text-cyan-400 font-bold text-[11px]' : 'text-slate-200 font-bold text-[10px]'}>
                      {time}
                    </span>
                  )}
                />

                <div className="flex-1 flex bg-slate-900/5 relative min-w-max">
                  {planningRoomsList.map(room => (
                    <div key={room.id} className="min-w-[180px] flex-1 relative border-r border-slate-800/40">
                      <div className="absolute inset-0 pointer-events-none z-0">
                        {timeSlots.map((_, idx) => (
                          <div 
                            key={idx} 
                            style={{ height: SLOT_HEIGHT }}
                            className={`opacity-50 border-b ${idx % 6 === 0 ? 'bg-cyan-500/5 border-slate-700' : 'border-slate-800'}`} 
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
                              student={students.find(s => s.id === examAtSlot.studentId)}
                              teacher={teachers.find(t => t.id === examAtSlot.teacherId)}
                              chair={teachers.find(t => t.id === examAtSlot.chairId)}
                              protocol={teachers.find(t => t.id === examAtSlot.protocolId)}
                              prepRoom={rooms.find(r => r.id === examAtSlot.prepRoomId)}
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
                      {students.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(s => (
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
                      {subjects.map(s => (
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
                        {teachers.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(t => (
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
                        {teachers.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(t => (
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
                        {teachers.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(t => (
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
                      {prepRoomsList.map(r => (
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
                    onClick={() => { setShowDeleteConfirm(true); }}
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
                  className="btn-danger-aurora w-full h-14 rounded-xl text-sm uppercase tracking-wider transition-all"
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

      <Modal isOpen={showPrintPreview} onClose={() => setShowPrintPreview(false)} maxWidth="max-w-[1200px]">
        {/* Changed: Set fixed height to h-[85vh] and overflow-hidden to main wrapper to prevent double scroll */}
        <div className="flex flex-col gap-6 h-[85vh] overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/30 shrink-0">
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

          <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
            {/* Linke Seite: Preflight-Check Panel */}
            <div className="w-72 flex flex-col gap-4 overflow-y-auto no-scrollbar pr-2 shrink-0">
              <div className="glass-nocturne p-5 border border-slate-700/30 space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-700/30 pb-3">
                  <ShieldAlert size={18} className="text-cyan-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Planungs-Check</h4>
                </div>
                
                <div className="space-y-3">
                  {preflightIssues.length === 0 ? (
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                      <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-300">Keine Probleme gefunden. Der Plan ist bereit für den Export.</p>
                    </div>
                  ) : (
                    preflightIssues.map((issue) => (
                      <div 
                        key={issue.id}
                        className={`p-3 rounded-xl border flex flex-col gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300 ${
                          issue.severity === 'error' ? 'bg-red-500/5 border-red-500/20' :
                          issue.severity === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
                          'bg-cyan-500/5 border-cyan-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {issue.severity === 'error' ? <AlertCircle size={14} className="text-red-500" /> :
                           issue.severity === 'warning' ? <AlertTriangle size={14} className="text-amber-500" /> :
                           <Info size={14} className="text-cyan-400" />}
                          <span className={`text-[10px] font-bold uppercase tracking-tight ${
                            issue.severity === 'error' ? 'text-red-400' :
                            issue.severity === 'warning' ? 'text-amber-400' :
                            'text-cyan-300'
                          }`}>
                            {issue.message}
                          </span>
                        </div>
                        {issue.details && (
                          <p className="text-[10px] text-slate-400 leading-tight pl-5 italic">
                            {issue.details}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 text-[10px] text-slate-500 leading-relaxed italic">
                Hinweis: Der Export wird trotz Warnungen zugelassen, um Zwischenstände speichern zu können.
              </div>
            </div>

            {/* Rechte Seite: Preview Scroll-Area */}
            <div className="flex-1 overflow-auto bg-slate-950/40 rounded-2xl p-6 border border-slate-700/30 shadow-inner no-scrollbar text-black">
              <div className="mx-auto origin-top transition-transform duration-300">
                 <ExportPrintView activeDayIdx={activeDay} isPreview={true} />
              </div>
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

      <ImportInstructionsModal 
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        onSelectFile={() => fileInputRef.current?.click()}
      />

      <ExamImportWizard 
        isOpen={showImportWizard} 
        onClose={() => {
          setShowImportWizard(false);
          setImportRawData([]);
        }}
        rawData={importRawData}
      />
    </div>
  );
};
