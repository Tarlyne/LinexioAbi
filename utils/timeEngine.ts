import { LivePhase } from '../hooks/useLive';
import { TIME_CONFIG, examSlotToMin } from './TimeService';

export const ABI_CONFIG = {
  ...TIME_CONFIG,
  CHECK_IN_THRESHOLD_MINUTES: 60,
  DEADLINE_CHECK_IN: 40,
  TAXI_1_PREP: 22,
  START_PREP: 20,
  TAXI_2_EXAM: 2,
};

export interface ExamTimes {
  examStart: Date;
  prepStart: Date;
  taxi1Start: Date;
  taxi2Start: Date;
  checkInDeadline: Date;
}

export const getExamTimes = (startTimeCoordinate: number, referenceDate: Date): ExamTimes => {
  const totalMin = examSlotToMin(startTimeCoordinate);
  const examStart = new Date(referenceDate);
  examStart.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0);

  return {
    examStart,
    prepStart: new Date(examStart.getTime() - ABI_CONFIG.START_PREP * 60000),
    taxi1Start: new Date(examStart.getTime() - ABI_CONFIG.TAXI_1_PREP * 60000),
    taxi2Start: new Date(examStart.getTime() - ABI_CONFIG.TAXI_2_EXAM * 60000),
    checkInDeadline: new Date(examStart.getTime() - ABI_CONFIG.DEADLINE_CHECK_IN * 60000),
  };
};

export const getLivePhase = (now: Date, times: ExamTimes, isPresent: boolean): { phase: LivePhase; label: string; isBlinking: boolean } => {
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

export const formatCountdown = (now: Date, target: Date | null, examStart: Date): string => {
  if (!target) return '';
  
  const diffToStart = (examStart.getTime() - now.getTime()) / 1000;
  if (diffToStart > ABI_CONFIG.CHECK_IN_THRESHOLD_MINUTES * 60 || diffToStart < -1800) return '';

  const s = Math.floor((target.getTime() - now.getTime()) / 1000);
  if (s <= 0) return '';

  if (s > 120) {
    return `${Math.ceil(s / 60)} Min.`;
  }
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};