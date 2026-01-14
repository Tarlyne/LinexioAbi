
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';
import { Exam } from '../types';

export type PlanningSortOption = 'name' | 'teacher' | 'subject';

export const usePlanning = () => {
  const { exams, supervisions, addExams, updateExam, deleteExam, checkCollision, checkConsistency } = useApp();
  const { days, rooms, teachers, students, subjects } = useData();
  const { showToast } = useUI();
  
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
    if (activeDay >= days.length) {
      setActiveDay(Math.max(0, days.length - 1));
    }
  }, [days.length, activeDay]);

  const backlogExams = useMemo(() => exams.filter(e => e.startTime === 0), [exams]);
  
  const plannedExamsForDay = useMemo(() => {
    return exams.filter(e => e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === activeDay);
  }, [exams, activeDay]);

  const filteredAndSortedBacklog = useMemo(() => {
    let result = [...backlogExams];

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(e => {
        const student = students.find(s => s.id === e.studentId);
        const teacher = teachers.find(t => t.id === e.teacherId);
        const chair = e.chairId ? teachers.find(t => t.id === e.chairId) : null;
        const protocol = e.protocolId ? teachers.find(t => t.id === e.protocolId) : null;
        
        const searchPool = [
          student?.firstName,
          student?.lastName,
          teacher?.firstName,
          teacher?.lastName,
          teacher?.shortName,
          chair?.firstName,
          chair?.lastName,
          chair?.shortName,
          protocol?.firstName,
          protocol?.lastName,
          protocol?.shortName,
          e.subject,
          e.groupId
        ].filter(Boolean).join(' ').toLowerCase();

        const searchTerms = term.split(/\s+/);
        return searchTerms.every(t => searchPool.includes(t));
      });
    }

    result.sort((a, b) => {
      if (sortOption === 'name') {
        const sA = students.find(s => s.id === a.studentId)?.lastName || '';
        const sB = students.find(s => s.id === b.studentId)?.lastName || '';
        return sA.localeCompare(sB, 'de');
      }
      if (sortOption === 'teacher') {
        const tA = teachers.find(t => t.id === a.teacherId)?.shortName || '';
        const tB = teachers.find(t => t.id === b.teacherId)?.shortName || '';
        return tA.localeCompare(tB);
      }
      return a.subject.localeCompare(b.subject, 'de');
    });

    return result;
  }, [backlogExams, students, teachers, searchTerm, sortOption]);

  const handleDropToSlot = useCallback((examIdFromEv: string, roomId: string, slotIdx: number, timeSlotsLength: number) => {
    setHoveredSlot(null);
    const examId = examIdFromEv || draggingExamId;
    setDraggingExamId(null);

    if (!examId) return;

    const exam = exams.find(e => e.id === examId);
    if (!exam) return;

    if (slotIdx > timeSlotsLength - 3) {
      showToast('Prüfung passt zeitlich nicht mehr ins Grid.', 'error');
      return;
    }

    const newStartTime = (activeDay * 1000) + slotIdx + 1;
    const updatedExam: Exam = { ...exam, roomId, startTime: newStartTime, status: 'scheduled' };
    
    // Check Kollision (Rot)
    const collision = checkCollision(updatedExam);
    if (collision.hasConflict) {
      showToast(collision.reason || 'Kollision festgestellt!', 'warning');
      if (collision.reason?.startsWith('Raumbelegung')) return;
    }

    // Check Konsistenz (Amber)
    const consistency = checkConsistency(updatedExam);
    if (consistency.hasWarning) {
      showToast(consistency.reason || 'Inkonsistenz festgestellt!', 'amber');
    }
    
    updateExam(updatedExam);
  }, [exams, activeDay, checkCollision, checkConsistency, updateExam, showToast, draggingExamId]);

  const handleRemoveFromGrid = useCallback((examIdFromEv: string) => {
    dragCounter.current = 0;
    setIsDraggingOverBacklog(false);
    const examId = examIdFromEv || draggingExamId;
    setDraggingExamId(null);

    if (!examId) return;
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;
    updateExam({ ...exam, startTime: 0, roomId: undefined, status: 'backlog' });
  }, [exams, updateExam, draggingExamId]);

  return {
    exams, supervisions,
    days, rooms, teachers, students, subjects,
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
  };
};
