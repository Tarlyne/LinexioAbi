import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { Exam, Room } from '../types';
import { examSlotToMin } from '../utils/TimeService';

export interface ProtocolBlock {
  lastExamId: string;
  room: Room;
  examsCount: number;
  studentNames: string[];
  pickupTimeMin: number;
  pickupTimeStr: string;
  status: 'WAITING' | 'READY' | 'LATE';
  isCollected: boolean;
}

export const useProtocols = () => {
  const { exams, collectedExamIds, toggleProtocolCollected } = useApp();
  const { days, rooms: allRooms, students } = useData();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = now.toISOString().split('T')[0];
  const currentDayIdx = days.findIndex((d) => d.date === todayStr);

  const protocolBlocks = useMemo((): ProtocolBlock[] => {
    if (currentDayIdx === -1) return [];

    const dayExams = exams.filter(
      (e) =>
        e.startTime > 0 &&
        Math.floor((e.startTime - 1) / 1000) === currentDayIdx &&
        e.status !== 'cancelled'
    );

    const rooms = allRooms.filter((r) => r.type === 'Prüfungsraum');
    const blocks: ProtocolBlock[] = [];

    rooms.forEach((room) => {
      const roomExams = dayExams
        .filter((e) => e.roomId === room.id)
        .sort((a, b) => a.startTime - b.startTime);

      if (roomExams.length === 0) return;

      let currentBlockExams: Exam[] = [];

      for (let i = 0; i < roomExams.length; i++) {
        currentBlockExams.push(roomExams[i]);

        const isLastInRoom = i === roomExams.length - 1;
        const hasGap = !isLastInRoom && roomExams[i + 1].startTime - roomExams[i].startTime > 3;

        if (isLastInRoom || hasGap) {
          const lastExam = roomExams[i];
          const pickupMin = examSlotToMin(lastExam.startTime) + 35;

          const nowMin = now.getHours() * 60 + now.getMinutes();
          let status: ProtocolBlock['status'] = 'WAITING';
          if (nowMin >= pickupMin + 15) status = 'LATE';
          else if (nowMin >= pickupMin) status = 'READY';

          const studentNames = currentBlockExams.map((e) => {
            const s = students.find((student) => student.id === e.studentId);
            return s ? s.lastName : '???';
          });

          blocks.push({
            lastExamId: lastExam.id,
            room,
            examsCount: currentBlockExams.length,
            studentNames,
            pickupTimeMin: pickupMin,
            pickupTimeStr: `${Math.floor(pickupMin / 60)
              .toString()
              .padStart(2, '0')}:${(pickupMin % 60).toString().padStart(2, '0')}`,
            status,
            isCollected: collectedExamIds.includes(lastExam.id),
          });
          currentBlockExams = [];
        }
      }
    });

    return blocks.sort((a, b) => a.pickupTimeMin - b.pickupTimeMin);
  }, [exams, allRooms, collectedExamIds, currentDayIdx, now, students, days]);

  return { protocolBlocks, toggleProtocolCollected, now, hasData: days.length > 0 };
};
