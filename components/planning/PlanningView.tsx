import React, { useMemo, useRef, useState, useEffect } from 'react';
import { 
  PlusCircle, MapPin, Printer, FileText, Download, Loader2, CheckCircle, Upload, ShieldAlert, Info, AlertTriangle, X, AlertCircle, FileCheck, Layers, ChevronDown, Search, UserCheck
} from 'lucide-react';
import { Exam } from '../../types';
import { Modal } from '../Modal';
import { usePlanning } from '../../hooks/usePlanning';
import { useHeader } from '../../context/HeaderContext';
import { BacklogSidebar } from './BacklogSidebar';
import { ExamCard } from './ExamCard';
import { ExportPrintView } from '../ExportPrintView';
import { PrepRoomPrintView } from '../PrepRoomPrintView';
import { isAppleMobile } from '../../utils/Platform';
import { PdfExportService } from '../../services/PdfExportService';
import { parseAbiturExamsCSV, RawExamCSVRow } from '../../utils/csvParser';
import { ExamImportWizard } from './ExamImportWizard';
import { ImportInstructionsModal } from './ImportInstructionsModal';
import { runPreflightCheck } from '../../utils/validationEngine';
import { GridTimeColumn } from '../common/GridTimeColumn';
import { PlanningGridHeader } from './PlanningGridHeader';
import { ExamEditorModal } from './ExamEditorModal';
import { PrepBalancerModal } from './PrepBalancerModal';
import { StudentIntegrityModal } from './StudentIntegrityModal';

type ExportType = 'exam' | 'prep';

export const PlanningView: React.FC = () => {
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
    addExams, updateExam, deleteExam, checkCollision, checkConsistency, showToast
  } = usePlanning();
  
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showPrepBalancer, setShowPrepBalancer] = useState(false);
  const [showIntegrityCheck, setShowIntegrityCheck] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDownloadAnleitung, setShowDownloadAnleitung] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('exam');
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  
  const actionsRef = useRef<HTMLDivElement>(null);

  const preflightIssues = useMemo(() => {
    return runPreflightCheck({ exams, supervisions: [], days, rooms, teachers, students, subjects } as any, activeDay);
  }, [exams, activeDay, days, rooms, teachers, students, subjects]);

  // Added missing helper functions to fix errors
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

  const formattedDayInfo = useMemo(() => {
    const day = days[activeDay];
    if (!day) return '';
    const dateStr = new Date(day.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${day.label} (${dateStr})`;
  }, [days, activeDay]);

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
    setIsActionsOpen(false);
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
      if (collision.hasConflict) showToast(collision.reason || 'Kollision festgestellt!', 'warning');
      const consistency = checkConsistency(editingExam as Exam);
      if (consistency.hasWarning) showToast(consistency.reason || 'Inkonsistenz festgestellt!', 'amber');
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

  const executePdfExport = async () => {
    setShowDownloadAnleitung(false);
    setIsExporting(true);
    const dayLabel = days[activeDay]?.label || "Prüfungsplan";
    const prefix = exportType === 'exam' ? 'Pruefungsplan' : 'Vorbereitungsplan';
    const filename = `${prefix}_${dayLabel.replace(/\s/g, '_')}`;
    try {
      if (exportType === 'exam') await PdfExportService.generateAndDownload({ exams, days, rooms, teachers, students, subjects } as any, activeDay, filename);
      else await PdfExportService.generatePrepRoomPdf({ exams, days, rooms, teachers, students, subjects } as any, activeDay, filename);
      showToast('PDF erfolgreich generiert.', 'success');
    } catch (err) {
      showToast('PDF-Export fehlgeschlagen.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleApplyPrepMapping = (mapping: Record<string, string>) => {
    let updateCount = 0;
    plannedExamsForDay.forEach(exam => {
      const targetRoomId = mapping[exam.subject];
      if (targetRoomId && exam.prepRoomId !== targetRoomId) {
        updateExam({ ...exam, prepRoomId: targetRoomId });
        updateCount++;
      }
    });
    showToast(`${updateCount} Vorbereitungsräume zugewiesen.`, 'success');
  };

  // Close actions dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setIsActionsOpen(false);
    };
    if (isActionsOpen) window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [isActionsOpen]);

  useHeader(
    <div className="relative" ref={actionsRef}>
      <button 
        onClick={() => setIsActionsOpen(!isActionsOpen)}
        className={`btn-aurora-base h-9 px-4 rounded-xl text-[11px] uppercase tracking-wider transition-all border shadow-lg ${
          isActionsOpen ? 'bg-cyan-500 text-white border-cyan-400' : 'btn-secondary-glass border-slate-700/50'
        }`}
      >
        <span>Aktionen</span>
        <ChevronDown size={14} className={`transition-transform duration-300 ${isActionsOpen ? 'rotate-180' : ''}`} />
      </button>

      {isActionsOpen && (
        <div className="absolute right-0 mt-2 w-64 glass-modal border border-slate-700/50 p-1.5 shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          <button onClick={() => { setShowIntegrityCheck(true); setIsActionsOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all text-left">
            <UserCheck size={18} className="shrink-0 text-cyan-400" />
            <div className="flex flex-col"><span className="text-xs font-bold leading-none">Schüler-Check</span><span className="text-[9px] text-slate-500 font-medium mt-1">Vollständigkeit & Suche</span></div>
          </button>
          
          <button onClick={() => { setShowPrepBalancer(true); setIsActionsOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-300 hover:bg-amber-500/10 hover:text-amber-400 transition-all text-left">
            <Layers size={18} className="shrink-0 text-amber-500" />
            <div className="flex flex-col"><span className="text-xs font-bold leading-none">Vorbereitung planen</span><span className="text-[9px] text-slate-500 font-medium mt-1">Bulk-Zuweisung Räume</span></div>
          </button>
          
          <div className="h-px bg-slate-800/50 my-1 mx-2" />
          
          <button onClick={() => { setShowInstructions(true); setIsActionsOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all text-left">
            <Upload size={18} className="shrink-0 text-indigo-400" />
            <div className="flex flex-col"><span className="text-xs font-bold leading-none">Import CSV</span><span className="text-[9px] text-slate-500 font-medium mt-1">Abitur-Gesamtplan laden</span></div>
          </button>
          
          <button onClick={() => { setExportType('exam'); setShowPrintPreview(true); setIsActionsOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all text-left">
            <Printer size={18} className="shrink-0 text-cyan-400" />
            <div className="flex flex-col"><span className="text-xs font-bold leading-none">Export PDF</span><span className="text-[9px] text-slate-500 font-medium mt-1">Druckfertige Pläne</span></div>
          </button>
        </div>
      )}
      <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleCsvFileSelect} />
    </div>
  );

  const planningRoomsList = useMemo(() => rooms.filter(r => r.type === 'Prüfungsraum'), [rooms]);
  const prepRoomsList = useMemo(() => rooms.filter(r => r.type === 'Vorbereitungsraum'), [rooms]);

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden select-none print:hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div><h2 className="text-2xl font-bold text-white tracking-tight">Prüfungsplan</h2><p className="text-cyan-500/80 text-[10px] font-bold tracking-wide mt-0.5">Verwaltung der Prüfungen</p></div>
        <div className="segmented-control-wrapper w-full max-w-md shrink-0"><div className="segmented-control-slider" style={{ width: `calc((100% - 6px) / ${days.length})`, transform: `translateX(calc(${activeDay} * 100%))` }}/>{days.map((day, idx) => (
          <button key={day.id} onClick={() => setActiveDay(idx)} className={`segmented-control-item h-10 ${activeDay === idx ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}><div className="flex flex-col items-center"><span className="text-[10px]">{day.label}</span><span className="text-[8px] opacity-60 normal-case font-medium">{new Date(day.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span></div></button>
        ))}</div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        <BacklogSidebar exams={filteredAndSortedBacklog} students={students} teachers={teachers} rooms={rooms} searchTerm={searchTerm} onSearchChange={setSearchTerm} sortOption={sortOption} onSortChange={setSortOption} onAddExam={openAddModal} onEditExam={openEditModal} onRemoveFromGrid={handleRemoveFromGrid} isDraggingOver={isDraggingOverBacklog} setIsDraggingOver={setIsDraggingOverBacklog} draggingExamId={draggingExamId} onDragStart={setDraggingExamId} onDragEnd={() => setDraggingExamId(null)} onDragCounterChange={(val) => { dragCounter.current += val; if (dragCounter.current === 0) setIsDraggingOverBacklog(false); }} checkConsistency={checkConsistency} />
        <div className="flex-1 glass-nocturne border-slate-700/30 overflow-hidden flex flex-col min-w-0">{planningRoomsList.length === 0 ? (<div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3 italic text-sm"><MapPin size={40} className="opacity-10 mb-2" />Keine Prüfungsräume in der Datenbank hinterlegt.</div>) : (
          <div className="flex-1 overflow-auto relative scroll-smooth no-scrollbar" ref={gridContainerRef}><PlanningGridHeader rooms={planningRoomsList} /><div className="relative flex min-h-full"><GridTimeColumn timeSlots={timeSlots} slotHeight={SLOT_HEIGHT} renderSlot={(time, idx) => (<span className={idx % 6 === 0 ? 'text-cyan-400 font-bold text-[11px]' : 'text-slate-200 font-bold text-[10px]'}>{time}</span>)} /><div className="flex-1 flex bg-slate-900/5 relative min-w-max">{planningRoomsList.map(room => (<div key={room.id} className="min-w-[180px] flex-1 relative border-r border-slate-800/40"><div className="absolute inset-0 pointer-events-none z-0">{timeSlots.map((_, idx) => (<div key={idx} style={{ height: SLOT_HEIGHT }} className={`opacity-50 border-b ${idx % 6 === 0 ? 'bg-cyan-500/5 border-slate-700' : 'border-slate-800'}`} />))}</div><div className="relative h-full z-10">{timeSlots.map((_, slotIdx) => (<div key={`${room.id}-${slotIdx}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; if (hoveredSlot?.slotIdx !== slotIdx || hoveredSlot?.roomId !== room.id) setHoveredSlot({roomId: room.id, slotIdx}); }} onDragLeave={() => setHoveredSlot(null)} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const examId = e.dataTransfer.getData('examId') || draggingExamId; handleDropToSlot(examId, room.id, slotIdx, timeSlots.length); }} style={{ height: SLOT_HEIGHT }} className="w-full relative z-10" />))}{hoveredSlot?.roomId === room.id && (<div className="absolute left-1 right-1 pointer-events-none ring-2 ring-inset ring-cyan-500 bg-cyan-500/10 z-[25] rounded-lg transition-none" style={{ top: hoveredSlot.slotIdx * SLOT_HEIGHT, height: (SLOT_HEIGHT * 3) - 2 }} />)}{plannedExamsForDay.filter(e => e.roomId === room.id).map(examAtSlot => (<ExamCard key={examAtSlot.id} exam={examAtSlot} student={students.find(s => s.id === examAtSlot.studentId)} teacher={teachers.find(t => t.id === examAtSlot.teacherId)} chair={teachers.find(t => t.id === examAtSlot.chairId)} protocol={teachers.find(t => t.id === examAtSlot.protocolId)} prepRoom={rooms.find(r => r.id === examAtSlot.prepRoomId)} hasConflict={checkCollision(examAtSlot).hasConflict} onEdit={openEditModal} onRemove={handleRemoveFromGrid} slotHeight={SLOT_HEIGHT} isAnyDragging={!!draggingExamId} onDragStart={setDraggingExamId} onDragEnd={() => setDraggingExamId(null)} />))}</div></div>))}</div></div></div>)}</div>
      </div>

      <ExamEditorModal isOpen={showModal} onClose={() => setShowModal(false)} editingExam={editingExam} setEditingExam={setEditingExam} students={students} teachers={teachers} rooms={rooms} subjects={subjects} onSave={handleSaveExam} onDelete={(id) => { deleteExam(id); setShowModal(false); }} showDeleteConfirm={showDeleteConfirm} setShowDeleteConfirm={setShowDeleteConfirm} />

      <PrepBalancerModal isOpen={showPrepBalancer} onClose={() => setShowPrepBalancer(false)} dayExams={plannedExamsForDay} prepRooms={prepRoomsList} onApply={handleApplyPrepMapping} />

      <StudentIntegrityModal isOpen={showIntegrityCheck} onClose={() => setShowIntegrityCheck(false)} />

      <Modal isOpen={showPrintPreview} onClose={() => setShowPrintPreview(false)} maxWidth="max-w-[1200px]">
        <div className="flex flex-col gap-6 h-[85vh] overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/30 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                {exportType === 'exam' ? <FileText size={20} /> : <FileCheck size={20} />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Export-Vorschau</h3>
                <p className="text-xs text-cyan-500/80 font-medium">{exportType === 'exam' ? 'Prüfungsplan' : 'Vorbereitungsplan'} für {formattedDayInfo}</p>
              </div>
            </div>

            <div className="segmented-control-wrapper w-64 h-9">
              <div className="segmented-control-slider" style={{ width: 'calc((100% - 6px) / 2)', transform: `translateX(calc(${exportType === 'exam' ? 0 : 1} * 100%))` }} />
              <button onClick={() => setExportType('exam')} className={`segmented-control-item ${exportType === 'exam' ? 'text-white' : 'text-slate-500'}`}>Prüfungen</button>
              <button onClick={() => setExportType('prep')} className={`segmented-control-item ${exportType === 'prep' ? 'text-white' : 'text-slate-500'}`}>Vorbereitung</button>
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
                      <div key={issue.id} className={`p-3 rounded-xl border flex flex-col gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300 ${issue.severity === 'error' ? 'bg-red-500/5 border-red-500/20' : issue.severity === 'warning' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-cyan-500/5 border-cyan-500/20'}`}>
                        <div className="flex items-center gap-2">
                          {issue.severity === 'error' ? <AlertCircle size={14} className="text-red-500" /> : issue.severity === 'warning' ? <AlertTriangle size={14} className="text-amber-500" /> : <Info size={14} className="text-cyan-400" />}
                          <span className={`text-[10px] font-bold uppercase tracking-tight ${issue.severity === 'error' ? 'text-red-400' : issue.severity === 'warning' ? 'text-amber-400' : 'text-cyan-300'}`}>{issue.message}</span>
                        </div>
                        {issue.details && (<p className="text-[10px] text-slate-400 leading-tight pl-5 italic">{issue.details}</p>)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-950/40 rounded-2xl p-6 border border-slate-700/30 shadow-inner no-scrollbar text-black">
              <div className="mx-auto origin-top transition-transform duration-300">
                {exportType === 'exam' ? <ExportPrintView activeDayIdx={activeDay} isPreview={true} /> : <PrepRoomPrintView activeDayIdx={activeDay} />}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showDownloadAnleitung} onClose={() => setShowDownloadAnleitung(false)} maxWidth="max-w-md">
        <div className="flex flex-col items-center text-center space-y-6 py-4"><div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.2)]"><CheckCircle size={40} /></div><div className="space-y-2"><h3 className="text-xl font-bold text-white tracking-tight">PDF bereit zum Download</h3><p className="text-sm text-slate-400">Die Generation ist abgeschlossen. Bitte bestätige den Download für dein iPad.</p></div><div className="w-full p-4 bg-slate-900/50 rounded-2xl border border-slate-800 text-left space-y-2"><div className="flex items-start gap-3"><div className="w-5 h-5 bg-cyan-600/20 rounded flex items-center justify-center text-[10px] font-bold text-cyan-400 mt-0.5 shrink-0">1</div><p className="text-[11px] text-slate-300">Klicke auf den Button unten.</p></div><div className="flex items-start gap-3"><div className="w-5 h-5 bg-cyan-600/20 rounded flex items-center justify-center text-[10px] font-bold text-cyan-400 mt-0.5 shrink-0">2</div><p className="text-[11px] text-slate-300">Wähle im System-Dialog <strong>"Laden"</strong> oder <strong>"In Dateien sichern"</strong>.</p></div></div><button onClick={executePdfExport} className="btn-primary-aurora w-full h-14 rounded-xl text-sm uppercase tracking-wider"><Download size={20} /> Jetzt Download starten</button><button onClick={() => setShowDownloadAnleitung(false)} className="text-slate-500 hover:text-white text-xs font-medium transition-colors">Abbrechen</button></div>
      </Modal>

      <ImportInstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} onSelectFile={() => fileInputRef.current?.click()} />
      <ExamImportWizard isOpen={showImportWizard} onClose={() => { setShowImportWizard(false); setImportRawData([]); }} rawData={importRawData} />
    </div>
  );
};