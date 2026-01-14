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
 * Berechnet alle gesperrten Zeiträume für einen Lehrer an einem Tag (inkl. 60 Min Puffer).
 * Rückgabe in absoluten Minuten seit Mitternacht.
 */
export const getTeacherBlockedPeriods = (teacherId: string, dayIdx: number, exams: Exam[]): { start: number, end: number }[] => {
  return exams
    .filter(e => e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === dayIdx)
    .filter(e => e.teacherId === teacherId || e.chairId === teacherId || e.protocolId === teacherId)
    .map(e => {
      const examStartMin = examSlotToMin(e.startTime);
      const examEndMin = examStartMin + 30; // 30 Min Dauer
      
      // Regel: Exakt 60 Min davor und 60 Min danach
      return { 
        start: examStartMin - 60, 
        end: examEndMin + 60 
      };
    });
};

/**
 * Berechnet Zeiträume, in denen Prüfungen in den Fächern des Lehrers stattfinden (ohne Puffer).
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
      const end = start + 30;
      return { start, end };
    });
};

/**
 * Prüft Verfügbarkeit unter Berücksichtigung der 60-Minuten-Pufferregel.
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

  // A. Check Prüfungen (Sperrzone inkl. Puffer)
  const blockedPeriods = getTeacherBlockedPeriods(teacherId, dayIdx, exams);
  for (const period of blockedPeriods) {
    // Überlappungsprüfung: Start A < Ende B && Ende A > Start B
    if (startTimeMin < period.end && endTimeMin > period.start) {
      return { isBusy: true, reason: `Überschneidung mit Prüfung` };
    }
  }

  // B. Check andere Aufsichten (Kein Puffer zwischen Aufsichten nötig)
  for (const s of supervisions) {
    if (s.id === ignoreId || s.teacherId !== teacherId || s.dayIdx !== dayIdx) continue;
    const sStart = timeToMin(s.startTime);
    const sEnd = sStart + s.durationMinutes;
    if (startTimeMin < sEnd && endTimeMin > sStart) {
      return { isBusy: true, reason: `Kollision mit anderer Aufsicht (${s.startTime})` };
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
  return false;
};