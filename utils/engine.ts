
import { Exam, Teacher, Supervision, AppState, Subject } from '../types';
import { TIME_CONFIG, timeToMin, examSlotToMin } from './TimeService';

export const EXAM_DURATION_SLOTS = TIME_CONFIG.EXAM_DURATION_SLOTS;
export const SLOT_MINUTES = TIME_CONFIG.SLOT_MINUTES;
export const START_HOUR = TIME_CONFIG.START_HOUR;
export const SUPERVISION_BUFFER_MINUTES = TIME_CONFIG.SUPERVISION_BUFFER_MINUTES;

/**
 * Kern-Berechnung für das Deputat einer Lehrkraft.
 */
export const calculateTeacherPoints = (teacherId: string, exams: Exam[], supervisions: Supervision[]): number => {
  const examPoints = exams.filter(e => 
    (e.teacherId === teacherId || e.chairId === teacherId || e.protocolId === teacherId) && 
    e.status !== 'cancelled'
  ).length;

  const supervisionPoints = supervisions
    .filter(s => s.teacherId === teacherId)
    .reduce((sum, s) => sum + (s.durationMinutes / 60), 0);

  return examPoints + supervisionPoints;
};

/**
 * Berechnet alle gesperrten Zeiträume für einen Lehrer an einem Tag (inkl. Puffer).
 * Dies sind Zeiträume, in denen der Lehrer selbst Teil einer Prüfungskommission ist.
 */
export const getTeacherBlockedPeriods = (teacherId: string, dayIdx: number, exams: Exam[]): { start: number, end: number }[] => {
  return exams
    .filter(e => e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === dayIdx)
    .filter(e => e.teacherId === teacherId || e.chairId === teacherId || e.protocolId === teacherId)
    .map(e => {
      const start = examSlotToMin(e.startTime);
      const end = start + (TIME_CONFIG.EXAM_DURATION_SLOTS * TIME_CONFIG.SLOT_MINUTES);
      // Wir markieren den Bereich inkl. Puffer als blockiert
      return { 
        start: start - TIME_CONFIG.SUPERVISION_BUFFER_MINUTES, 
        end: end + TIME_CONFIG.SUPERVISION_BUFFER_MINUTES 
      };
    });
};

/**
 * Berechnet Zeiträume, in denen Prüfungen in den Fächern des Lehrers stattfinden (ohne Puffer).
 * Dient als informative "Amber"-Kollision.
 */
export const getTeacherSubjectPeriods = (teacherId: string, dayIdx: number, exams: Exam[], teachers: Teacher[], subjects: Subject[]): { start: number, end: number }[] => {
  const teacher = teachers.find(t => t.id === teacherId);
  if (!teacher || !teacher.subjectIds || teacher.subjectIds.length === 0) return [];

  const teacherSubjectNames = teacher.subjectIds
    .map(id => subjects.find(s => s.id === id)?.name)
    .filter(Boolean) as string[];

  return exams
    .filter(e => e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === dayIdx)
    .filter(e => teacherSubjectNames.includes(e.subject))
    .map(e => {
      const start = examSlotToMin(e.startTime);
      const end = start + (TIME_CONFIG.EXAM_DURATION_SLOTS * TIME_CONFIG.SLOT_MINUTES);
      return { start, end };
    });
};

/**
 * Prüft, ob eine Lehrkraft zu einem bestimmten Zeitpunkt bereits beschäftigt ist.
 */
export const checkTeacherAvailability = (
  teacherId: string, 
  dayIdx: number, 
  startTimeMin: number, 
  durationMin: number, 
  exams: Exam[], 
  supervisions: Supervision[],
  ignoreId?: string 
): { isBusy: boolean; reason?: string } => {
  
  const endTimeMin = startTimeMin + durationMin;

  // A. Check Prüfungen (MIT PUFFER-LOGIK FÜR AUFSICHTEN AUS TIMESERVICE)
  const blockedPeriods = getTeacherBlockedPeriods(teacherId, dayIdx, exams);
  for (const period of blockedPeriods) {
    if (startTimeMin < period.end && endTimeMin > period.start) {
      return { isBusy: true, reason: `Prüfungs-Pufferzone` };
    }
  }

  // B. Check andere Aufsichten
  for (const s of supervisions) {
    if (s.id === ignoreId || s.teacherId !== teacherId || s.dayIdx !== dayIdx) continue;
    const sStart = timeToMin(s.startTime);
    const sEnd = sStart + s.durationMinutes;
    if (startTimeMin < sEnd && endTimeMin > sStart) {
      return { isBusy: true, reason: `Andere Aufsicht (${s.startTime})` };
    }
  }

  return { isBusy: false };
};

export const checkExamCollision = (exam: Exam, allExams: Exam[]): { hasConflict: boolean; reason?: string } => {
  if (exam.startTime === 0 || !exam.roomId) return { hasConflict: false };
  
  const baseValue = exam.startTime - 1;
  const dayIndex = Math.floor(baseValue / 1000);
  const slotIndex = baseValue % 1000;
  
  const teachers = new Set([exam.teacherId, exam.chairId, exam.protocolId].filter(Boolean));
  
  // 1. Standard Collisions (Room, Student, Teacher)
  for (const other of allExams) {
    if (other.id === exam.id || other.startTime === 0 || other.status === 'completed') continue;
    const oDay = Math.floor((other.startTime - 1) / 1000);
    if (dayIndex !== oDay) continue;
    
    const oSlot = (other.startTime - 1) % 1000;
    if (slotIndex < oSlot + TIME_CONFIG.EXAM_DURATION_SLOTS && slotIndex + TIME_CONFIG.EXAM_DURATION_SLOTS > oSlot) {
      if (exam.roomId === other.roomId) return { hasConflict: true, reason: 'Raumbelegung kollidiert.' };
      if (exam.studentId === other.studentId) return { hasConflict: true, reason: 'Schüler-Kollision.' };
      
      const otherT = [other.teacherId, other.chairId, other.protocolId].filter(Boolean) as string[];
      for (const t of otherT) {
        if (teachers.has(t)) return { hasConflict: true, reason: 'Lehrer-Kollision.' };
      }
    }
  }

  // 2. Group Integrity Check
  if (exam.groupId) {
    const groupMembers = allExams.filter(e => 
      e.id !== exam.id && 
      e.startTime > 0 &&
      Math.floor((e.startTime - 1) / 1000) === dayIndex &&
      e.teacherId === exam.teacherId &&
      e.subject === exam.subject &&
      e.groupId === exam.groupId &&
      e.status !== 'completed'
    );

    if (groupMembers.length > 0) {
      // Check for same room
      if (groupMembers.some(m => m.roomId !== exam.roomId)) {
        return { hasConflict: true, reason: 'Gruppe muss im selben Raum liegen.' };
      }

      // Check for contiguity (am Stück)
      const allGroupSlots = [...groupMembers, exam]
        .map(e => (e.startTime - 1) % 1000)
        .sort((a, b) => a - b);
      
      for (let i = 0; i < allGroupSlots.length - 1; i++) {
        if (allGroupSlots[i + 1] - allGroupSlots[i] !== TIME_CONFIG.EXAM_DURATION_SLOTS) {
          return { hasConflict: true, reason: 'Gruppe muss zeitlich lückenlos sein.' };
        }
      }
    }
  }

  return { hasConflict: false };
};

export const isEntityInUseInternal = (
  type: string, 
  id: string, 
  exams: Exam[], 
  supervisions: Supervision[] = [], 
  name?: string,
  teachers: Teacher[] = []
): boolean => {
  if (type === 'teacher') return exams.some(e => e.teacherId === id || e.chairId === id || e.protocolId === id) || supervisions.some(s => s.teacherId === id);
  if (type === 'student') return exams.some(e => e.studentId === id);
  if (type === 'room') return exams.some(e => e.roomId === id || e.prepRoomId === id) || supervisions.some(s => s.stationId === id);
  if (type === 'day') return exams.some(e => Math.floor((e.startTime - 1) / 1000) === (parseInt(id.split('-')[1]) || -1));
  if (type === 'subject') {
    // Check in Prüfungen
    if (name && exams.some(e => e.subject === name)) return true;
    // Check in Lehrer-Profilen
    if (teachers.some(t => t.subjectIds?.includes(id))) return true;
  }
  return false;
};
