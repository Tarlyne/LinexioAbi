
import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Exam, Room } from '../types';
import { examSlotToMin } from '../utils/TimeService';

export interface ProtocolBlock {
  lastExamId: string;
  room: Room;
  examsCount: number;
  studentNames: string[];
  pickupTimeMin: number; // Minuten seit Mitternacht
  pickupTimeStr: string;
  status: 'WAITING' | 'READY' | 'LATE';
  isCollected: boolean;
}

export const useProtocols = () => {
  const { state, toggleProtocolCollected } = useApp();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000); // Alle 30 Sek. aktualisieren
    return () => clearInterval(timer);
  }, []);

  const todayStr = now.toISOString().split('T')[0];
  const currentDayIdx = state.days.findIndex(d => d.date === todayStr);

  const protocolBlocks = useMemo((): ProtocolBlock[] => {
    if (currentDayIdx === -1) return [];

    const dayExams = state.exams.filter(e => 
      e.startTime > 0 && 
      Math.floor((e.startTime - 1) / 1000) === currentDayIdx &&
      e.status !== 'cancelled'
    );

    const rooms = state.rooms.filter(r => r.type === 'Prüfungsraum');
    const blocks: ProtocolBlock[] = [];

    rooms.forEach(room => {
      const roomExams = dayExams
        .filter(e => e.roomId === room.id)
        .sort((a, b) => a.startTime - b.startTime);

      if (roomExams.length === 0) return;

      let currentBlockExams: Exam[] = [];

      for (let i = 0; i < roomExams.length; i++) {
        currentBlockExams.push(roomExams[i]);

        const isLastInRoom = i === roomExams.length - 1;
        const hasGap = !isLastInRoom && roomExams[i+1].startTime - roomExams[i].startTime > 3;

        if (isLastInRoom || hasGap) {
          // Block-Ende erreicht
          const lastExam = roomExams[i];
          const pickupMin = examSlotToMin(lastExam.startTime) + 35;
          
          const nowMin = now.getHours() * 60 + now.getMinutes();
          let status: ProtocolBlock['status'] = 'WAITING';
          if (nowMin >= pickupMin + 15) status = 'LATE';
          else if (nowMin >= pickupMin) status = 'READY';

          // Namen der Schüler im aktuellen Block sammeln
          const studentNames = currentBlockExams.map(e => {
            const s = state.students.find(student => student.id === e.studentId);
            return s ? s.lastName : '???';
          });

          blocks.push({
            lastExamId: lastExam.id,
            room,
            examsCount: currentBlockExams.length,
            studentNames,
            pickupTimeMin: pickupMin,
            pickupTimeStr: `${Math.floor(pickupMin / 60).toString().padStart(2, '0')}:${(pickupMin % 60).toString().padStart(2, '0')}`,
            status,
            isCollected: state.collectedExamIds.includes(lastExam.id)
          });
          currentBlockExams = [];
        }
      }
    });

    return blocks.sort((a, b) => a.pickupTimeMin - b.pickupTimeMin);
  }, [state.exams, state.rooms, state.collectedExamIds, currentDayIdx, now, state.students]);

  return { protocolBlocks, toggleProtocolCollected, now, hasData: state.days.length > 0 };
};
