
import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Exam, Room, Student } from '../types';
import { getExamTimes, getLivePhase, formatCountdown } from '../utils/timeEngine';

export type LivePhase = 'WAITING' | 'CHECK_IN_WARNING' | 'TAXI_TO_PREP' | 'IN_PREP' | 'TAXI_TO_EXAM' | 'IN_EXAM';

export interface LiveExamStatus {
  phase: LivePhase;
  label: string;
  isBlinking: boolean;
  countdown: string;
}

export interface LiveExamData {
  exam: Exam;
  student?: Student;
  room?: Room;
  prepRoom?: Room;
  status: LiveExamStatus;
  isUrgent: boolean;
  examTimeStr: string;
  prepTimeStr: string;
  canComplete: boolean;
}

export const useLive = () => {
  const { state, togglePresence, completeExam } = useApp();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = useMemo(() => now.toISOString().split('T')[0], [now]);
  const currentDayIdx = useMemo(() => state.days.findIndex(d => d.date === todayStr), [state.days, todayStr]);

  const liveExams = useMemo((): LiveExamData[] => {
    if (currentDayIdx === -1) return [];
    
    return state.exams
      .filter(e => e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === currentDayIdx && e.status !== 'completed')
      .map(exam => {
        const times = getExamTimes(exam.startTime, now);
        const { phase, label, isBlinking } = getLivePhase(now, times, !!exam.isPresent);
        
        // Logik-Korrektur: Worauf zählen wir gerade hin?
        let targetTime: Date | null = null;
        if (phase === 'WAITING' || phase === 'TAXI_TO_PREP') {
          // Vor der Vorbereitung zählen wir zum Vorbereitungsstart
          targetTime = times.prepStart;
        } else if (phase === 'IN_PREP' || phase === 'TAXI_TO_EXAM') {
          // In der Vorbereitung zählen wir zum Prüfungsstart
          targetTime = times.examStart;
        } 
        // Bei IN_EXAM oder CHECK_IN_WARNING gibt es kein Zeit-Ziel mehr für den Countdown

        const countdown = formatCountdown(now, targetTime, times.examStart);

        return {
          exam,
          student: state.students.find(s => s.id === exam.studentId),
          room: state.rooms.find(r => r.id === exam.roomId),
          prepRoom: state.rooms.find(r => r.id === exam.prepRoomId),
          status: { phase, label, isBlinking, countdown },
          isUrgent: phase === 'CHECK_IN_WARNING',
          examTimeStr: times.examStart.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
          prepTimeStr: times.prepStart.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
          canComplete: now >= times.examStart
        };
      })
      .sort((a, b) => a.exam.startTime - b.exam.startTime);
  }, [state.exams, state.students, state.rooms, currentDayIdx, now]);

  const stats = useMemo(() => {
    const total = state.exams.filter(e => e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === currentDayIdx).length;
    const completed = state.exams.filter(e => e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === currentDayIdx && e.status === 'completed').length;
    return { total, completed, percent: total > 0 ? (completed / total) * 100 : 0 };
  }, [state.exams, currentDayIdx]);

  return { liveExams, stats, togglePresence, completeExam, now, hasData: state.days.length > 0 };
};
