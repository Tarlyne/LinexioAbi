/**
 * Central TimeService for LinexioAbi
 * Consolidates all time-related calculations and constants.
 * Architecture: Service Layer (Category B Refactoring)
 */

export type LivePhase =
  | 'WAITING'
  | 'CHECK_IN_WARNING'
  | 'TAXI_TO_PREP'
  | 'IN_PREP'
  | 'TAXI_TO_EXAM'
  | 'IN_EXAM';

export const TIME_CONFIG = {
  SLOT_MINUTES: 10,
  EXAM_DURATION_SLOTS: 3,
  START_HOUR: 8,
  SUPERVISION_BUFFER_MINUTES: 60,
  CHECK_IN_THRESHOLD_MINUTES: 60,
  DEADLINE_CHECK_IN: 40,
  TAXI_1_PREP: 22,
  START_PREP: 20,
  TAXI_2_EXAM: 2,
  NTA_EXTRA_PREP_MINUTES: 5,
};

/**
 * Returns the prep duration in minutes for an exam.
 * Normal: 20 min, Nachteilsausgleich: 25 min.
 */
export const getPrepDuration = (hasNachteilsausgleich?: boolean): number =>
  TIME_CONFIG.START_PREP + (hasNachteilsausgleich ? TIME_CONFIG.NTA_EXTRA_PREP_MINUTES : 0);

export interface ExamTimes {
  examStart: Date;
  prepStart: Date;
  taxi1Start: Date;
  taxi2Start: Date;
  checkInDeadline: Date;
}

/**
 * Converts "HH:mm" string to minutes since midnight.
 */
export const timeToMin = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Converts minutes since midnight to "HH:mm" string.
 */
export const minToTime = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/**
 * Converts an Exam startTime coordinate to minutes since midnight.
 */
export const examSlotToMin = (startTimeCoordinate: number): number => {
  const slotIdx = (startTimeCoordinate - 1) % 1000;
  return TIME_CONFIG.START_HOUR * 60 + slotIdx * TIME_CONFIG.SLOT_MINUTES;
};

/**
 * Calculates all relevant trigger times for a specific exam.
 */
export const getExamTimes = (startTimeCoordinate: number, referenceDate: Date, hasNachteilsausgleich?: boolean): ExamTimes => {
  const totalMin = examSlotToMin(startTimeCoordinate);
  const examStart = new Date(referenceDate);
  examStart.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0);

  const prepDuration = getPrepDuration(hasNachteilsausgleich);
  const taxi1Duration = prepDuration + 2; // 2 min taxi before prep

  return {
    examStart,
    prepStart: new Date(examStart.getTime() - prepDuration * 60000),
    taxi1Start: new Date(examStart.getTime() - taxi1Duration * 60000),
    taxi2Start: new Date(examStart.getTime() - TIME_CONFIG.TAXI_2_EXAM * 60000),
    checkInDeadline: new Date(examStart.getTime() - TIME_CONFIG.DEADLINE_CHECK_IN * 60000),
  };
};

/**
 * Determines the current phase of an exam based on the current time.
 */
export const getLivePhase = (
  now: Date,
  times: ExamTimes,
  isPresent: boolean
): { phase: LivePhase; label: string; isBlinking: boolean } => {
  if (now >= times.examStart) {
    return { phase: 'IN_EXAM', label: 'IN PRÜFUNG', isBlinking: false };
  }
  if (now >= times.taxi2Start) {
    return { phase: 'TAXI_TO_EXAM', label: 'ZUR PRÜFUNG', isBlinking: true };
  }
  if (now >= times.prepStart) {
    return { phase: 'IN_PREP', label: 'IN VORBEREITUNG', isBlinking: false };
  }
  if (now >= times.taxi1Start) {
    return { phase: 'TAXI_TO_PREP', label: 'ZUR VORBEREITUNG', isBlinking: true };
  }
  if (!isPresent && now >= times.checkInDeadline) {
    return { phase: 'CHECK_IN_WARNING', label: 'FEHLT', isBlinking: false };
  }
  return { phase: 'WAITING', label: isPresent ? 'WARTET' : '', isBlinking: false };
};

/**
 * Formats countdown string for live display.
 */
export const formatCountdown = (now: Date, target: Date | null, examStart: Date): string => {
  if (!target) return '';

  const diffToStart = (examStart.getTime() - now.getTime()) / 1000;
  if (diffToStart > TIME_CONFIG.CHECK_IN_THRESHOLD_MINUTES * 60 || diffToStart < -1800) return '';

  const s = Math.floor((target.getTime() - now.getTime()) / 1000);
  if (s <= 0) return '';

  if (s > 60) {
    return `${Math.ceil(s / 60)} Min.`;
  }
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
};
