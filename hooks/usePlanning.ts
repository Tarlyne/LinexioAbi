import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';
import { Exam } from '../types';
import { checkExamCollision as engineCheckCollision } from '../utils/engine';

export type PlanningSortOption = 'name' | 'teacher' | 'subject';

export const usePlanning = () => {
  const {
    exams,
    supervisions,
    addExams,
    updateExam,
    deleteExam,
    checkCollision,
    checkConsistency,
  } = useApp();
  const { days, rooms, teachers, students, subjects } = useData();
  const { showToast } = useUI();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<PlanningSortOption>('name');
  const [activeDay, setActiveDay] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingExam, setEditingExam] = useState<Partial<Exam> | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<{ roomId: string; slotIdx: number } | null>(null);
  const [isDraggingOverBacklog, setIsDraggingOverBacklog] = useState(false);

  const dragCounter = useRef(0);

  useEffect(() => {
    if (activeDay >= days.length) {
      setActiveDay(Math.max(0, days.length - 1));
    }
  }, [days.length, activeDay]);

  // Veredelte Logik: Nur Prüfungen mit Fach UND Lehrer kommen in den Backlog (Sidebar)
  const backlogExams = useMemo(
    () => exams.filter((e) => e.startTime === 0 && e.subject && e.teacherId),
    [exams]
  );

  const plannedExamsForDay = useMemo(() => {
    return exams.filter(
      (e) => e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === activeDay
    );
  }, [exams, activeDay]);

  const filteredAndSortedBacklog = useMemo(() => {
    let result = [...backlogExams];

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((e) => {
        const student = students.find((s) => s.id === e.studentId);
        const teacher = teachers.find((t) => t.id === e.teacherId);
        const searchPool = [
          student?.firstName,
          student?.lastName,
          teacher?.lastName,
          teacher?.shortName,
          e.subject,
          e.groupId,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const searchTerms = term.split(/\s+/);
        return searchTerms.every((t) => searchPool.includes(t));
      });
    }

    result.sort((a, b) => {
      if (sortOption === 'name') {
        const sA = students.find((s) => s.id === a.studentId)?.lastName || '';
        const sB = students.find((s) => s.id === b.studentId)?.lastName || '';
        return sA.localeCompare(sB, 'de');
      }
      if (sortOption === 'teacher') {
        const tA = teachers.find((t) => t.id === a.teacherId)?.shortName || '';
        const tB = teachers.find((t) => t.id === b.teacherId)?.shortName || '';
        return tA.localeCompare(tB);
      }
      return (a.subject || '').localeCompare(b.subject || '', 'de');
    });

    return result;
  }, [backlogExams, students, teachers, searchTerm, sortOption]);

  const handleDropToSlot = useCallback(
    (examId: string, roomId: string, slotIdx: number, timeSlotsLength: number) => {
      setHoveredSlot(null);
      if (!examId) return;

      const draggedExam = exams.find((e) => e.id === examId);
      if (!draggedExam) return;

      // Ziel-Prüfung am Drop-Ort finden
      const targetExam = exams.find((e) => {
        if (e.id === examId || e.startTime === 0 || e.roomId !== roomId) return false;
        const eDay = Math.floor((e.startTime - 1) / 1000);
        if (eDay !== activeDay) return false;
        const eSlot = (e.startTime - 1) % 1000;
        return slotIdx >= eSlot && slotIdx < eSlot + 3;
      });

      const isGroupMove = !!draggedExam.groupId;
      const isSiblingSwap =
        targetExam &&
        isGroupMove &&
        targetExam.groupId === draggedExam.groupId &&
        targetExam.subject === draggedExam.subject &&
        targetExam.teacherId === draggedExam.teacherId;

      // MAGNETISCHE GRUPPEN-LOGIK (Erweitert für Grid-zu-Grid)
      // Wenn es eine Gruppe ist UND kein Sibling-Tausch gewollt ist
      if (isGroupMove && !isSiblingSwap) {
        // Alle Mitglieder der Gruppe finden, die sich am selben Tag im selben Raum befinden (oder im Backlog sind)
        const groupSiblings = exams.filter(
          (e) =>
            e.id !== examId &&
            e.groupId === draggedExam.groupId &&
            e.subject === draggedExam.subject &&
            e.teacherId === draggedExam.teacherId &&
            (e.startTime === 0 ||
              (Math.floor((e.startTime - 1) / 1000) === activeDay &&
                e.roomId === draggedExam.roomId))
        );

        if (groupSiblings.length > 0) {
          const fullGroup = [draggedExam, ...groupSiblings].sort(
            (a, b) => a.startTime - b.startTime
          );

          // Offset berechnen: Wo landet das erste Element der Gruppe relativ zum Drop?
          // Wenn aus Backlog: draggedExam ist Anker. Wenn aus Grid: Anker ist das erste Element der Gruppe.
          const firstMember = fullGroup[0];
          const dragStartSlot = (draggedExam.startTime - 1) % 1000;
          const relativeOffset =
            draggedExam.startTime === 0 ? 0 : dragStartSlot - ((firstMember.startTime - 1) % 1000);

          const groupStartSlot = slotIdx - relativeOffset;
          const totalSlotsNeeded = fullGroup.length * 3;

          // 1. Validierung: Passt der Block in das Zeitraster?
          if (groupStartSlot < 0 || groupStartSlot + totalSlotsNeeded > timeSlotsLength) {
            showToast('Der Block passt in dieser Position nicht ins Zeitraster.', 'error');
            return;
          }

          // 2. Validierung: Ist der Zielbereich frei von ANDEREN Prüfungen?
          const otherExams = exams.filter((e) => !fullGroup.some((g) => g.id === e.id));
          const isRangeFree = !otherExams.some((e) => {
            if (e.startTime === 0 || e.roomId !== roomId) return false;
            const eDay = Math.floor((e.startTime - 1) / 1000);
            if (eDay !== activeDay) return false;
            const eSlot = (e.startTime - 1) % 1000;
            return eSlot < groupStartSlot + totalSlotsNeeded && eSlot + 3 > groupStartSlot;
          });

          if (!isRangeFree) {
            showToast('Bereich durch andere Prüfungen blockiert.', 'warning');
            return;
          }

          // 3. Kollisions-Check & Update-Vorbereitung
          let allValid = true;
          const updates: Exam[] = [];

          for (let i = 0; i < fullGroup.length; i++) {
            const start = activeDay * 1000 + groupStartSlot + i * 3 + 1;
            const upd: Exam = { ...fullGroup[i], startTime: start, roomId, status: 'scheduled' };
            const col = engineCheckCollision(upd, otherExams);
            if (col.hasConflict) {
              const s = students.find((st) => st.id === fullGroup[i].studentId);
              showToast(
                `Block-Verschiebung abgebrochen: ${s?.lastName} kollidiert (${col.reason})`,
                'warning'
              );
              allValid = false;
              break;
            }
            updates.push(upd);
          }

          if (allValid) {
            updates.forEach((u) => updateExam(u));
            showToast(`Prüfungsblock "${draggedExam.groupId}" verschoben`, 'success');
            return;
          } else return;
        }
      }

      // FALLBACK ZU STANDARD-LOGIK (Einzel-Drop, Tausch oder Ersetzen)
      if (slotIdx > timeSlotsLength - 3) {
        showToast('Prüfung passt zeitlich nicht mehr ins Grid.', 'error');
        return;
      }

      const newStartTime = activeDay * 1000 + slotIdx + 1;

      if (targetExam) {
        if (draggedExam.startTime > 0) {
          // FALL 1: TAUSCH (Grid <-> Grid) - Entweder Sibling-Swap oder Einzel-Tausch
          const oldStartTime = draggedExam.startTime;
          const oldRoomId = draggedExam.roomId;
          const updatedDragged: Exam = {
            ...draggedExam,
            startTime: newStartTime,
            roomId,
            status: 'scheduled',
          };
          const updatedTarget: Exam = { ...targetExam, startTime: oldStartTime, roomId: oldRoomId };
          const otherExams = exams.filter((e) => e.id !== draggedExam.id && e.id !== targetExam.id);
          const colDragged = engineCheckCollision(updatedDragged, otherExams);
          const colTarget = engineCheckCollision(updatedTarget, otherExams);
          if (colDragged.hasConflict || colTarget.hasConflict) {
            showToast(
              `Tausch blockiert: ${colDragged.reason || colTarget.reason || 'Kollision'}`,
              'warning'
            );
            return;
          }
          updateExam(updatedDragged);
          updateExam(updatedTarget);
          showToast(
            isSiblingSwap
              ? 'Reihenfolge innerhalb der Gruppe geändert'
              : 'Prüfungen erfolgreich getauscht',
            'success'
          );
        } else {
          // FALL 2: ERSETZEN (Backlog -> Grid)
          const updatedDragged: Exam = {
            ...draggedExam,
            startTime: newStartTime,
            roomId,
            status: 'scheduled',
          };
          const updatedTarget: Exam = {
            ...targetExam,
            startTime: 0,
            roomId: undefined,
            status: 'backlog',
          };
          const otherExams = exams.filter((e) => e.id !== targetExam.id && e.id !== draggedExam.id);
          const colDragged = engineCheckCollision(updatedDragged, otherExams);
          if (colDragged.hasConflict) {
            showToast(`Ersetzung blockiert: ${colDragged.reason}`, 'warning');
            return;
          }
          updateExam(updatedDragged);
          updateExam(updatedTarget);
          const tStudent = students.find((s) => s.id === targetExam.studentId);
          showToast(
            `Prüfung von ${tStudent?.lastName || 'Schüler'} verdrängt & in Backlog verschoben`,
            'info'
          );
        }
      } else {
        // FALL 3: STANDARD VERSCHIEBEN (Leerer Slot)
        const updatedExam: Exam = {
          ...draggedExam,
          roomId,
          startTime: newStartTime,
          status: 'scheduled',
        };
        const collision = checkCollision(updatedExam);
        if (collision.hasConflict) {
          showToast(collision.reason || 'Kollision festgestellt!', 'warning');
          if (collision.reason?.startsWith('Raumbelegung')) return;
        }
        const consistency = checkConsistency(updatedExam);
        if (consistency.hasWarning)
          showToast(consistency.reason || 'Inkonsistenz festgestellt!', 'amber');
        updateExam(updatedExam);
      }
    },
    [exams, activeDay, checkCollision, checkConsistency, updateExam, showToast, students]
  );

  const handleRemoveFromGrid = useCallback(
    (examId: string) => {
      dragCounter.current = 0;
      setIsDraggingOverBacklog(false);
      if (!examId) return;
      const exam = exams.find((e) => e.id === examId);
      if (!exam) return;
      updateExam({ ...exam, startTime: 0, roomId: undefined, status: 'backlog' });
    },
    [exams, updateExam]
  );

  return {
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
  };
};
