/**
 * Central TimeService for LinexioAbi
 * Consolidates all time-related calculations and constants.
 * Architecture: Service Layer (Category B Refactoring)
 */

export const TIME_CONFIG = {
  SLOT_MINUTES: 10,
  EXAM_DURATION_SLOTS: 3,
  START_HOUR: 8,
  SUPERVISION_BUFFER_MINUTES: 60,
};

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
 * startTimeCoordinate = (DayIdx * 1000 + SlotIdx + 1)
 */
export const examSlotToMin = (startTimeCoordinate: number): number => {
  const slotIdx = (startTimeCoordinate - 1) % 1000;
  return TIME_CONFIG.START_HOUR * 60 + slotIdx * TIME_CONFIG.SLOT_MINUTES;
};

/**
 * Formats a Date object to "HH:mm".
 */
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Calculates time difference in minutes between two dates.
 */
export const getDiffMinutes = (start: Date, end: Date): number => {
  return (end.getTime() - start.getTime()) / 60000;
};