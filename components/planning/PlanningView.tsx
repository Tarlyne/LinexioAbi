import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { MapPin, Printer, Upload, Layers, ChevronDown, UserCheck, RotateCcw } from 'lucide-react';
import { Exam } from '../../types';
import { usePlanning } from '../../hooks/usePlanning';
import { useApp } from '../../context/AppContext';
import { useHeader } from '../../context/HeaderContext';
import { useDnD } from '../../context/DnDContext';
import { BacklogSidebar } from './BacklogSidebar';
import { ExamCard } from './ExamCard';
import { parseAbiturExamsCSV, RawExamCSVRow } from '../../utils/csvParser';
import { ExamImportWizard } from './ExamImportWizard';
import { ImportInstructionsModal } from './ImportInstructionsModal';
import { GridTimeColumn } from '../common/GridTimeColumn';
import { PlanningGridHeader } from './PlanningGridHeader';
import { ExamEditorModal } from './ExamEditorModal';
import { PrepBalancerModal } from './PrepBalancerModal';
import { ExamManagerModal } from './ExamManagerModal';
import { PlanningExportModal } from './PlanningExportModal';

export const PlanningView: React.FC = () => {
  const {
    exams,
    supervisions,
    days,
    rooms,
    teachers,
    students,
    subjects,
    searchTerm,
    setSearchTerm,
    sortOption,
    setSortOption,
    activeDay,
    setActiveDay,
    showModal,
    setShowModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    editingExam,
    setEditingExam,
    hoveredSlot,
    setHoveredSlot,
    isDraggingOverBacklog,
    setIsDraggingOverBacklog,
    dragCounter,
    plannedExamsForDay,
    filteredAndSortedBacklog,
    handleDropToSlot,
    handleRemoveFromGrid,
    addExams,
    updateExam,
    deleteExam,
    checkCollision,
    checkConsistency,
    showToast,
  } = usePlanning();

  const { undo, canUndo, historyLogs, collectedExamIds } = useApp();
  const { dropTarget, activeDrag } = useDnD();

  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showPrepBalancer, setShowPrepBalancer] = useState(false);
  const [showExamManager, setShowExamManager] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  // Linear-Workflow State: Soll der Manager nach dem Editieren wieder öffnen?
  const [returnToManager, setReturnToManager] = useState(false);

  const [showInstructions, setShowInstructions] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [importRawData, setImportRawData] = useState<RawExamCSVRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const SLOT_HEIGHT = 38;
  const startHour = 8;
  const endHour = 18;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && canUndo) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, canUndo]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += 10) {
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  useEffect(() => {
    if (dropTarget && dropTarget.info.type === 'slot') {
      setHoveredSlot({ roomId: dropTarget.info.roomId, slotIdx: dropTarget.info.slotIdx });
    } else {
      setHoveredSlot(null);
    }
  }, [dropTarget]);

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

  const openEditModal = useCallback(
    (exam: Exam, fromManager = false) => {
      setEditingExam({ ...exam });
      setReturnToManager(fromManager);
      setShowDeleteConfirm(false);
      if (fromManager) setShowExamManager(false);
      setShowModal(true);
    },
    [setEditingExam, setShowDeleteConfirm, setShowModal]
  );

  const handleSaveExam = (e: React.FormEvent, applyToGroup: boolean = false) => {
    e.preventDefault();
    if (!editingExam?.studentId || !editingExam?.teacherId || !editingExam?.subject) {
      showToast('Bitte Basis-Felder ausfüllen.', 'warning');
      return;
    }

    const commissionIds = [
      editingExam.teacherId,
      editingExam.chairId,
      editingExam.protocolId,
    ].filter((id) => !!id);
    if (new Set(commissionIds).size !== commissionIds.length) {
      showToast('Eine Lehrkraft kann nicht mehrere Rollen einnehmen.', 'error');
      return;
    }

    let savedExam: Exam;
    if (editingExam.id) {
      const collision = checkCollision(editingExam as Exam);
      if (collision.hasConflict) showToast(collision.reason || 'Kollision!', 'warning');
      const consistency = checkConsistency(editingExam as Exam);
      if (consistency.hasWarning) showToast(consistency.reason || 'Inkonsistenz!', 'amber');
      savedExam = editingExam as Exam;
      updateExam(savedExam);
    } else {
      savedExam = {
        id: `e-${Date.now()}`,
        studentId: editingExam.studentId!,
        teacherId: editingExam.teacherId!,
        chairId: editingExam.chairId,
        protocolId: editingExam.protocolId,
        prepRoomId: editingExam.prepRoomId,
        subject: editingExam.subject!,
        groupId: editingExam.groupId,
        startTime: 0,
        status: 'backlog',
      };
      addExams([savedExam]);
    }

    if (applyToGroup && savedExam.groupId) {
      const siblings = exams.filter(
        (ex) =>
          ex.id !== savedExam.id &&
          ex.groupId === savedExam.groupId &&
          ex.subject === savedExam.subject &&
          ex.teacherId === savedExam.teacherId
      );
      if (siblings.length > 0) {
        siblings.forEach((s) =>
          updateExam({
            ...s,
            chairId: savedExam.chairId,
            protocolId: savedExam.protocolId,
            prepRoomId: savedExam.prepRoomId,
          })
        );
        showToast(`Gruppe aktualisiert.`, 'success');
      }
    }

    setShowModal(false);
    if (returnToManager) {
      setShowExamManager(true);
      setReturnToManager(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    if (returnToManager) {
      setShowExamManager(true);
      setReturnToManager(false);
    }
  };

  const handleApplyPrepMapping = (mapping: Record<string, string>) => {
    let updateCount = 0;
    plannedExamsForDay.forEach((exam) => {
      const targetRoomId = mapping[exam.subject];
      if (targetRoomId && exam.prepRoomId !== targetRoomId) {
        updateExam({ ...exam, prepRoomId: targetRoomId });
        updateCount++;
      }
    });
    showToast(`${updateCount} Vorbereitungsräume zugewiesen.`, 'success');
  };

  const handleDropToSlotRef = useRef(handleDropToSlot);
  const handleRemoveFromGridRef = useRef(handleRemoveFromGrid);
  useEffect(() => {
    handleDropToSlotRef.current = handleDropToSlot;
  }, [handleDropToSlot]);
  useEffect(() => {
    handleRemoveFromGridRef.current = handleRemoveFromGrid;
  }, [handleRemoveFromGrid]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node))
        setIsActionsOpen(false);
    };
    if (isActionsOpen) window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [isActionsOpen]);

  const headerActionsContent = useMemo(() => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => undo()}
        disabled={!canUndo}
        className={`btn-secondary-glass w-9 h-9 p-0 rounded-xl shadow-lg border-cyan-500/30 transition-all ${canUndo ? 'text-cyan-400' : 'text-slate-600 opacity-30 cursor-not-allowed'}`}
        title="Rückgängig (Cmd+Z)"
      >
        <RotateCcw size={15} />
      </button>
      <div className="relative" ref={actionsRef}>
        <button
          onClick={() => setIsActionsOpen(!isActionsOpen)}
          className={`btn-aurora-base h-9 px-4 rounded-xl text-[11px] uppercase tracking-wider transition-all border shadow-lg ${isActionsOpen ? 'bg-cyan-500 text-white border-cyan-400' : 'border-cyan-500/50 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10'}`}
        >
          <span>Aktionen</span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${isActionsOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isActionsOpen && (
          <div className="absolute right-0 mt-2 w-64 glass-modal border border-slate-700/50 p-1.5 shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              onClick={() => {
                setShowExamManager(true);
                setIsActionsOpen(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all text-left"
            >
              <UserCheck size={18} className="shrink-0 text-cyan-400" />
              <div className="flex flex-col">
                <span className="text-xs font-bold leading-none">Prüfungs-Manager</span>
                <span className="text-[9px] text-slate-500 font-medium mt-1">
                  Matrix & Personenzentriert
                </span>
              </div>
            </button>
            <button
              onClick={() => {
                setShowPrepBalancer(true);
                setIsActionsOpen(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-300 hover:bg-amber-500/10 hover:text-amber-400 transition-all text-left"
            >
              <Layers size={18} className="shrink-0 text-amber-500" />
              <div className="flex flex-col">
                <span className="text-xs font-bold leading-none">Vorb.-räume planen</span>
                <span className="text-[9px] text-slate-500 font-medium mt-1">
                  Bulk-Zuweisung Räume
                </span>
              </div>
            </button>
            <div className="h-px bg-slate-800/50 my-1 mx-2" />
            <button
              onClick={() => {
                setShowInstructions(true);
                setIsActionsOpen(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all text-left"
            >
              <Upload size={18} className="shrink-0 text-indigo-400" />
              <div className="flex flex-col">
                <span className="text-xs font-bold leading-none">Import CSV</span>
                <span className="text-[9px] text-slate-500 font-medium mt-1">
                  Abitur-Gesamtplan laden
                </span>
              </div>
            </button>
            <button
              onClick={() => {
                setShowPrintPreview(true);
                setIsActionsOpen(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all text-left"
            >
              <Printer size={18} className="shrink-0 text-cyan-400" />
              <div className="flex flex-col">
                <span className="text-xs font-bold leading-none">Export PDF</span>
                <span className="text-[9px] text-slate-500 font-medium mt-1">
                  Druckfertige Pläne
                </span>
              </div>
            </button>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".csv"
          onChange={handleCsvFileSelect}
        />
      </div>
    </div>
  ), [undo, canUndo, isActionsOpen, setIsActionsOpen, setShowExamManager, setShowPrepBalancer]);

  useHeader(headerActionsContent);

  const planningRoomsList = useMemo(() => rooms.filter((r) => r.type === 'Prüfungsraum'), [rooms]);

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden select-none print:hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Prüfungsplan</h2>
          <p className="text-cyan-500/80 text-[10px] font-bold tracking-wide mt-0.5">
            Verwaltung der Prüfungen
          </p>
        </div>
        <div className="segmented-control-wrapper w-full max-w-md shrink-0">
          <div
            className="segmented-control-slider"
            style={{
              width: `calc((100% - 6px) / ${days.length})`,
              transform: `translateX(calc(${activeDay} * 100%))`,
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
        <BacklogSidebar
          exams={filteredAndSortedBacklog}
          students={students}
          teachers={teachers}
          rooms={rooms}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortOption={sortOption}
          onSortChange={setSortOption}
          onEditExam={openEditModal}
          onRemoveFromGrid={handleRemoveFromGrid}
          isDraggingOver={isDraggingOverBacklog}
          setIsDraggingOver={setIsDraggingOverBacklog}
          onDragCounterChange={(val) => {
            dragCounter.current += val;
            if (dragCounter.current === 0) setIsDraggingOverBacklog(false);
          }}
          checkConsistency={checkConsistency}
        />
        <div className="flex-1 glass-nocturne overflow-hidden flex flex-col min-w-0 !border-l-0 !border-t-0">
          {planningRoomsList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3 italic text-sm">
              <MapPin size={40} className="opacity-10 mb-2" />
              Keine Prüfungsräume.
            </div>
          ) : (
            <div
              className="flex-1 overflow-auto relative scroll-smooth no-scrollbar"
              ref={gridContainerRef}
            >
              <PlanningGridHeader rooms={planningRoomsList} />
              <div className="relative flex min-h-full">
                <GridTimeColumn
                  timeSlots={timeSlots}
                  slotHeight={SLOT_HEIGHT}
                  renderSlot={(time, idx) => (
                    <span
                      className={
                        idx % 6 === 0
                          ? 'text-cyan-400 font-bold text-[11px]'
                          : 'text-slate-200 font-bold text-[10px]'
                      }
                    >
                      {time}
                    </span>
                  )}
                />
                <div className="flex-1 flex bg-slate-900/5 relative min-w-max">
                  {planningRoomsList.map((room) => (
                    <div
                      key={room.id}
                      className="min-w-[180px] flex-1 relative border-r border-slate-800/40"
                    >
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
                            data-drop-zone="true"
                            data-drop-info={JSON.stringify({
                              type: 'slot',
                              roomId: room.id,
                              slotIdx,
                              onDrop: true,
                            })}
                            ref={(el) => {
                              if (el && !el.dataset.listenerAdded) {
                                el.addEventListener('linexio-drop', ((e: CustomEvent) => {
                                  const { dragId, dropInfo } = e.detail;
                                  handleDropToSlotRef.current(
                                    dragId,
                                    dropInfo.roomId,
                                    dropInfo.slotIdx,
                                    timeSlots.length
                                  );
                                }) as EventListener);
                                el.dataset.listenerAdded = 'true';
                              }
                            }}
                            style={{ height: SLOT_HEIGHT }}
                            className="w-full relative z-10"
                          />
                        ))}
                        {hoveredSlot?.roomId === room.id && (
                          <div
                            className="absolute left-1 right-1 pointer-events-none ring-2 ring-inset ring-cyan-500 bg-cyan-500/10 z-[25] rounded-lg transition-[height] duration-200"
                            style={{
                              top: hoveredSlot.slotIdx * SLOT_HEIGHT,
                              height:
                                SLOT_HEIGHT * 3 * (activeDrag?.extraData?.groupCount || 1) - 2,
                            }}
                          />
                        )}
                        {plannedExamsForDay
                          .filter((e) => e.roomId === room.id)
                          .map((examAtSlot) => (
                            <ExamCard
                              key={examAtSlot.id}
                              exam={examAtSlot}
                              student={students.find((s) => s.id === examAtSlot.studentId)}
                              teacher={teachers.find((t) => t.id === examAtSlot.teacherId)}
                              chair={teachers.find((t) => t.id === examAtSlot.chairId)}
                              protocol={teachers.find((t) => t.id === examAtSlot.protocolId)}
                              prepRoom={rooms.find((r) => r.id === examAtSlot.prepRoomId)}
                              hasConflict={checkCollision(examAtSlot).hasConflict}
                              onEdit={openEditModal}
                              onRemove={handleRemoveFromGrid}
                              slotHeight={SLOT_HEIGHT}
                              searchTerm={searchTerm}
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

      <ExamEditorModal
        isOpen={showModal}
        onClose={handleModalClose}
        editingExam={editingExam}
        setEditingExam={setEditingExam}
        students={students}
        teachers={teachers}
        rooms={rooms}
        subjects={subjects}
        onSave={handleSaveExam}
        onDelete={(id) => {
          deleteExam(id);
          setShowModal(false);
          if (returnToManager) setShowExamManager(true);
        }}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
      />
      <PrepBalancerModal
        isOpen={showPrepBalancer}
        onClose={() => setShowPrepBalancer(false)}
        dayExams={plannedExamsForDay}
        prepRooms={rooms.filter((r) => r.type === 'Vorbereitungsraum')}
        onApply={handleApplyPrepMapping}
      />
      <ExamManagerModal
        isOpen={showExamManager}
        onClose={() => setShowExamManager(false)}
        onEditExam={(exam) => openEditModal(exam, true)}
      />

      <PlanningExportModal
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        activeDayIdx={activeDay}
        appState={{
          teachers,
          students,
          rooms,
          days,
          subjects,
          exams,
          supervisions,
          historyLogs,
          collectedExamIds,
          isLocked: false,
          masterPassword: null,
          settings: { autoLockMinutes: 10 },
          lastUpdate: Date.now(),
        }}
      />
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
