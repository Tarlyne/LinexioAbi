import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { Exam, Room, Student } from '../types';
import { getExamTimes, getLivePhase, formatCountdown, LivePhase } from '../utils/TimeService';

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
  const { exams, togglePresence, completeExam } = useApp();
  const { days, students, rooms } = useData();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = useMemo(() => now.toISOString().split('T')[0], [now]);
  const currentDayIdx = useMemo(() => days.findIndex((d) => d.date === todayStr), [days, todayStr]);

  const liveExams = useMemo((): LiveExamData[] => {
    if (currentDayIdx === -1) return [];

    return exams
      .filter(
        (e) =>
          e.startTime > 0 &&
          Math.floor((e.startTime - 1) / 1000) === currentDayIdx &&
          e.status !== 'completed'
      )
      .map((exam) => {
        const times = getExamTimes(exam.startTime, now);
        const { phase, label, isBlinking } = getLivePhase(now, times, !!exam.isPresent);

        let targetTime: Date | null = null;
        if (phase === 'WAITING' || phase === 'TAXI_TO_PREP') {
          targetTime = times.prepStart;
        } else if (phase === 'IN_PREP' || phase === 'TAXI_TO_EXAM') {
          targetTime = times.examStart;
        }

        const countdown = formatCountdown(now, targetTime, times.examStart);

        return {
          exam,
          student: students.find((s) => s.id === exam.studentId),
          room: rooms.find((r) => r.id === exam.roomId),
          prepRoom: rooms.find((r) => r.id === exam.prepRoomId),
          status: { phase, label, isBlinking, countdown },
          isUrgent: phase === 'CHECK_IN_WARNING',
          examTimeStr: times.examStart.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          prepTimeStr: times.prepStart.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          canComplete: now >= times.examStart,
        };
      })
      .sort((a, b) => a.exam.startTime - b.exam.startTime);
  }, [exams, students, rooms, currentDayIdx, now, days]);

  const stats = useMemo(() => {
    const total = exams.filter(
      (e) => e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === currentDayIdx
    ).length;
    const completed = exams.filter(
      (e) =>
        e.startTime > 0 &&
        Math.floor((e.startTime - 1) / 1000) === currentDayIdx &&
        e.status === 'completed'
    ).length;
    return { total, completed, percent: total > 0 ? (completed / total) * 100 : 0 };
  }, [exams, currentDayIdx]);

  return { liveExams, stats, togglePresence, completeExam, now, hasData: days.length > 0 };
};
