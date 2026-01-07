
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Exam } from '../types';

export type PlanningSortOption = 'name' | 'teacher' | 'subject';

export const usePlanning = () => {
  const { state, addExams, updateExam, deleteExam, checkCollision, showToast } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<PlanningSortOption>('name');
  const [activeDay, setActiveDay] = useState(0); 
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingExam, setEditingExam] = useState<Partial<Exam> | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<{roomId: string, slotIdx: number} | null>(null);
  const [isDraggingOverBacklog, setIsDraggingOverBacklog] = useState(false);
  const [draggingExamId, setDraggingExamId] = useState<string | null>(null);
  
  const dragCounter = useRef(0);

  useEffect(() => {
    if (activeDay >= state.days.length) {
      setActiveDay(Math.max(0, state.days.length - 1));
    }
  }, [state.days.length, activeDay]);

  const rooms = useMemo(() => state.rooms.filter(r => r.type === 'Prüfungsraum'), [state.rooms]);
  const backlogExams = useMemo(() => state.exams.filter(e => e.startTime === 0), [state.exams]);
  
  const plannedExamsForDay = useMemo(() => {
    return state.exams.filter(e => e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === activeDay);
  }, [state.exams, activeDay]);

  const filteredAndSortedBacklog = useMemo(() => {
    let result = [...backlogExams];

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(e => {
        const student = state.students.find(s => s.id === e.studentId);
        const teacher = state.teachers.find(t => t.id === e.teacherId);
        const chair = e.chairId ? state.teachers.find(t => t.id === e.chairId) : null;
        const protocol = e.protocolId ? state.teachers.find(t => t.id === e.protocolId) : null;
        
        // Wir bauen einen umfassenden durchsuchbaren Text-Block für diesen Eintrag
        const searchPool = [
          student?.firstName,
          student?.lastName,
          // Prüfer
          teacher?.firstName,
          teacher?.lastName,
          teacher?.shortName,
          // Vorsitz
          chair?.firstName,
          chair?.lastName,
          chair?.shortName,
          // Protokoll
          protocol?.firstName,
          protocol?.lastName,
          protocol?.shortName,
          // Fach & Gruppe
          e.subject,
          e.groupId
        ].filter(Boolean).join(' ').toLowerCase();

        // Prüfen, ob alle Wörter des Suchbegriffs im Pool vorkommen (AND-Logik)
        const searchTerms = term.split(/\s+/);
        return searchTerms.every(t => searchPool.includes(t));
      });
    }

    result.sort((a, b) => {
      if (sortOption === 'name') {
        const sA = state.students.find(s => s.id === a.studentId)?.lastName || '';
        const sB = state.students.find(s => s.id === b.studentId)?.lastName || '';
        return sA.localeCompare(sB, 'de');
      }
      if (sortOption === 'teacher') {
        const tA = state.teachers.find(t => t.id === a.teacherId)?.shortName || '';
        const tB = state.teachers.find(t => t.id === b.teacherId)?.shortName || '';
        return tA.localeCompare(tB);
      }
      return a.subject.localeCompare(b.subject, 'de');
    });

    return result;
  }, [backlogExams, state.students, state.teachers, searchTerm, sortOption]);

  const handleDropToSlot = useCallback((examIdFromEv: string, roomId: string, slotIdx: number, timeSlotsLength: number) => {
    setHoveredSlot(null);
    const examId = examIdFromEv || draggingExamId;
    setDraggingExamId(null);

    if (!examId) return;

    const exam = state.exams.find(e => e.id === examId);
    if (!exam) return;

    if (slotIdx > timeSlotsLength - 3) {
      showToast('Prüfung passt zeitlich nicht mehr ins Grid.', 'error');
      return;
    }

    const newStartTime = (activeDay * 1000) + slotIdx + 1;
    const updatedExam: Exam = { ...exam, roomId, startTime: newStartTime, status: 'scheduled' };
    
    const collision = checkCollision(updatedExam);
    if (collision.hasConflict) {
      showToast(collision.reason || 'Kollision!', 'warning');
      if (collision.reason?.startsWith('Raumbelegung')) return;
    }
    
    updateExam(updatedExam);
  }, [state.exams, activeDay, checkCollision, updateExam, showToast, draggingExamId]);

  const handleRemoveFromGrid = useCallback((examIdFromEv: string) => {
    dragCounter.current = 0;
    setIsDraggingOverBacklog(false);
    const examId = examIdFromEv || draggingExamId;
    setDraggingExamId(null);

    if (!examId) return;
    const exam = state.exams.find(e => e.id === examId);
    if (!exam) return;
    updateExam({ ...exam, startTime: 0, roomId: undefined, status: 'backlog' });
  }, [state.exams, updateExam, draggingExamId]);

  return {
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
  };
};
