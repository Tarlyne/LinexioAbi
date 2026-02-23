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

  const todayStr = useMemo(() => now.toISOString().split('T')[0], [now]);
  const currentDayIdx = useMemo(() => days.findIndex((d) => d.date === todayStr), [days, todayStr]);

  useEffect(() => {
    const updateTime = () => {
      const currentTime = new Date();
      setNow(currentTime);

      // Check if we need high-precision (1s) updates
      // High-res is needed if any exam is within 2 minutes of a transition
      // or if any countdown is currently showing seconds (< 2 mins)
      let needsHighRes = false;

      if (currentDayIdx !== -1) {
        for (const exam of exams) {
          if (exam.startTime <= 0 || Math.floor((exam.startTime - 1) / 1000) !== currentDayIdx || exam.status === 'completed') continue;

          const times = getExamTimes(exam.startTime, currentTime, exam.hasNachteilsausgleich);
          const diffToStart = (times.examStart.getTime() - currentTime.getTime()) / 1000;

          // If we are within 3 minutes of the exam start, we might be in a critical phase (Taxi, Prep)
          // or showing a second-based countdown.
          if (diffToStart > -1800 && diffToStart < 180) {
            needsHighRes = true;
            break;
          }
        }
      }

      const nextInterval = needsHighRes ? 1000 : 10000;
      timerRef.current = setTimeout(updateTime, nextInterval);
    };

    const timerRef = { current: setTimeout(updateTime, 1000) };
    return () => clearTimeout(timerRef.current);
  }, [exams, currentDayIdx]);

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
        const times = getExamTimes(exam.startTime, now, exam.hasNachteilsausgleich);
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
