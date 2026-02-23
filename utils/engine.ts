import { Exam, Teacher, Supervision, AppState, Subject } from '../types';
import { TIME_CONFIG, timeToMin, examSlotToMin, getPrepDuration } from './TimeService';

export const EXAM_DURATION_SLOTS = TIME_CONFIG.EXAM_DURATION_SLOTS;
export const SLOT_MINUTES = TIME_CONFIG.SLOT_MINUTES;
export const START_HOUR = TIME_CONFIG.START_HOUR;
export const SUPERVISION_BUFFER_MINUTES = TIME_CONFIG.SUPERVISION_BUFFER_MINUTES;

/**
 * Kern-Berechnung für das Deputat einer Lehrkraft.
 * Geändert: Alle zugewiesenen Prüfungen (Grid + Backlog) fließen in die Wertung ein,
 * um eine frühzeitige Deputat-Kontrolle zu ermöglichen.
 */
export const calculateTeacherPoints = (
  teacherId: string,
  exams: Exam[],
  supervisions: Supervision[]
): number => {
  const examPoints = exams.filter(
    (e) =>
      (e.teacherId === teacherId || e.chairId === teacherId || e.protocolId === teacherId) &&
      e.status !== 'cancelled'
  ).length;

  const supervisionPoints = supervisions
    .filter((s) => s.teacherId === teacherId)
    .reduce((sum, s) => sum + s.durationMinutes / 60, 0);

  return examPoints + supervisionPoints;
};

/**
 * Berechnet die Lastverteilung der Vorbereitungsräume für eine Simulation.
 */
export const calculatePrepLoadSimulation = (
  dayExams: Exam[],
  mapping: Record<string, string>
): Record<string, { peak: number; time: string }> => {
  const roomLoad: Record<string, Record<number, number>> = {};
  const results: Record<string, { peak: number; time: string }> = {};

  dayExams.forEach((exam) => {
    const roomId = mapping[exam.subject];
    if (!roomId) return;

    if (!roomLoad[roomId]) roomLoad[roomId] = {};

    const examStartMin = examSlotToMin(exam.startTime);
    const prepDuration = getPrepDuration(exam.hasNachteilsausgleich);
    const prepStartMin = examStartMin - prepDuration;

    for (let t = prepStartMin; t < examStartMin; t += 10) {
      roomLoad[roomId][t] = (roomLoad[roomId][t] || 0) + 1;
    }
  });

  Object.keys(roomLoad).forEach((rid) => {
    let max = 0;
    let maxTime = '';
    Object.entries(roomLoad[rid]).forEach(([tStr, count]) => {
      if (count > max) {
        max = count;
        const t = parseInt(tStr);
        maxTime = `${Math.floor(t / 60)
          .toString()
          .padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`;
      }
    });
    results[rid] = { peak: max, time: maxTime };
  });

  return results;
};

/**
 * Berechnet alle gesperrten Zeiträume für einen Lehrer an einem Tag (inkl. 60 Min Puffer).
 */
export const getTeacherBlockedPeriods = (
  teacherId: string,
  dayIdx: number,
  exams: Exam[]
): { start: number; end: number }[] => {
  return exams
    .filter((e) => e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === dayIdx)
    .filter(
      (e) => e.teacherId === teacherId || e.chairId === teacherId || e.protocolId === teacherId
    )
    .map((e) => {
      const examStartMin = examSlotToMin(e.startTime);
      const examEndMin = examStartMin + 30; // 30 Min Dauer

      return {
        start: examStartMin - 60,
        end: examEndMin + 60,
      };
    });
};

/**
 * Berechnet Zeiträume, in denen Prüfungen in den Fächern des Lehrers stattfinden (ohne Puffer).
 */
export const getTeacherSubjectPeriods = (
  teacherId: string,
  dayIdx: number,
  exams: Exam[],
  teachers: Teacher[],
  subjects: Subject[]
): { start: number; end: number }[] => {
  const teacher = teachers.find((t) => t.id === teacherId);
  if (!teacher || !teacher.subjectIds || teacher.subjectIds.length === 0) return [];

  const teacherSubjectNames = teacher.subjectIds
    .map((id) => subjects.find((s) => s.id === id)?.name)
    .filter(Boolean) as string[];

  return exams
    .filter((e) => e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === dayIdx)
    .filter((e) => teacherSubjectNames.some((tsn) => tsn.toLowerCase() === e.subject.toLowerCase()))
    .map((e) => {
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

  const blockedPeriods = getTeacherBlockedPeriods(teacherId, dayIdx, exams);
  for (const period of blockedPeriods) {
    if (startTimeMin < period.end && endTimeMin > period.start) {
      return { isBusy: true, reason: `Überschneidung mit Prüfung (Pufferzeit)` };
    }
  }

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

export const checkExamCollision = (
  exam: Exam,
  allExams: Exam[]
): { hasConflict: boolean; reason?: string } => {
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

    // 1. Check: Schüler-Kollision am SELBEN TAG (unabhängig von Uhrzeit)
    // Regel: Ein Schüler darf maximal EINE reguläre Prüfung pro Tag haben.
    if (exam.studentId === other.studentId) {
      const isRegular1 = !exam.isBackupExam;
      const isRegular2 = !other.isBackupExam;

      if (isRegular1 && isRegular2) {
        return {
          hasConflict: true,
          reason: 'Schüler hat mehrere reguläre Prüfungen am selben Tag.',
        };
      }
    }

    // 2. Check: Zeitliche Überschneidung (Raum, Lehrer, Schüler allgemein)
    if (
      slotIndex < oSlot + TIME_CONFIG.EXAM_DURATION_SLOTS &&
      slotIndex + TIME_CONFIG.EXAM_DURATION_SLOTS > oSlot
    ) {
      if (exam.roomId === other.roomId)
        return { hasConflict: true, reason: 'Raumbelegung kollidiert.' };

      // Schüler kann nicht gleichzeitig an zwei Orten sein (auch bei Sicherungsprüfung!)
      if (exam.studentId === other.studentId) {
        return { hasConflict: true, reason: 'Zeitliche Überschneidung für Schüler.' };
      }

      const otherT = [other.teacherId, other.chairId, other.protocolId].filter(Boolean) as string[];
      for (const t of otherT) {
        if (teachers.has(t)) return { hasConflict: true, reason: 'Lehrer-Kollision.' };
      }
    }
  }

  return { hasConflict: false };
};

/**
 * Kombinierte Konsistenzprüfung (Amber):
 * 1. Fach-Vorbereitungsraum-Konsistenz
 * 2. Gruppen-Block-Integrität
 */
export const checkExamConsistency = (
  exam: Exam,
  allExams: Exam[]
): { hasWarning: boolean; reason?: string } => {
  if (exam.startTime === 0) return { hasWarning: false };
  const dayIndex = Math.floor((exam.startTime - 1) / 1000);

  if (exam.prepRoomId) {
    const otherWithConflict = allExams.find(
      (other) =>
        other.id !== exam.id &&
        other.startTime > 0 &&
        Math.floor((other.startTime - 1) / 1000) === dayIndex &&
        other.subject === exam.subject &&
        other.prepRoomId &&
        other.prepRoomId !== exam.prepRoomId
    );

    if (otherWithConflict) {
      return {
        hasWarning: true,
        reason: `Fachkonsistenz: Es gibt bereits Prüfungen im Fach ${exam.subject}, die einem anderen Vorbereitungsraum zugeordnet sind.`,
      };
    }
  }

  if (exam.groupId) {
    const groupExams = allExams.filter(
      (e) =>
        e.groupId === exam.groupId &&
        e.startTime > 0 &&
        Math.floor((e.startTime - 1) / 1000) === dayIndex
    );

    const otherGroupExams = groupExams.filter((e) => e.id !== exam.id);
    const fullGroupList = [...otherGroupExams, exam];

    if (fullGroupList.length > 1) {
      const firstRoomId = fullGroupList[0].roomId;
      const allSameRoom = fullGroupList.every((e) => e.roomId === firstRoomId);

      if (!allSameRoom) {
        return {
          hasWarning: true,
          reason: 'Prüfungsblock findet in unterschiedlichen Räumen statt.',
        };
      }

      fullGroupList.sort((a, b) => a.startTime - b.startTime);

      for (let i = 0; i < fullGroupList.length - 1; i++) {
        const currentEnd = fullGroupList[i].startTime + 3; // 3 Slots Dauer
        const nextStart = fullGroupList[i + 1].startTime;

        if (nextStart !== currentEnd) {
          return {
            hasWarning: true,
            reason: 'Prüfungsblock ist nicht zusammenhängend.',
          };
        }
      }
    }
  }

  return { hasWarning: false };
};

export const isEntityInUseInternal = (
  type: string,
  id: string,
  exams: Exam[],
  supervisions: Supervision[] = [],
  name?: string,
  teachers: Teacher[] = []
): boolean => {
  if (type === 'teacher')
    return (
      exams.some((e) => e.teacherId === id || e.chairId === id || e.protocolId === id) ||
      supervisions.some((s) => s.teacherId === id)
    );
  if (type === 'student') return exams.some((e) => e.studentId === id);
  if (type === 'room')
    return (
      exams.some((e) => e.roomId === id || e.prepRoomId === id) ||
      supervisions.some((s) => s.stationId === id)
    );
  return false;
};
