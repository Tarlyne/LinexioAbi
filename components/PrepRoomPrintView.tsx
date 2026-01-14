
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { minToTime, examSlotToMin } from '../utils/TimeService';
import { PRINT_STYLES } from '../utils/printStyles';

interface PrepRoomPrintViewProps {
  activeDayIdx: number;
}

/**
 * Vorschau-Layout für die Vorbereitungsraum-Pläne.
 * Optimiert für Tablet-Vorschau mit echtem Seiten-Gefühl.
 */
export const PrepRoomPrintView: React.FC<PrepRoomPrintViewProps> = ({ activeDayIdx }) => {
  const { exams } = useApp();
  const { days, rooms, teachers, students } = useData();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const activeDay = days[activeDayIdx];

  // Scaling Logic (identisch zu ExportPrintView für Konsistenz)
  useEffect(() => {
    const updateScale = () => {
      const parent = containerRef.current?.parentElement;
      if (parent) {
        const parentWidth = parent.clientWidth - 48; 
        const targetWidth = 794; // A4 Breite in Pixeln bei 96 DPI
        if (parentWidth < targetWidth) {
          setScale(parentWidth / targetWidth);
        } else {
          setScale(1);
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const dayExams = useMemo(() => {
    return exams.filter(e => 
      e.startTime > 0 && 
      Math.floor((e.startTime - 1) / 1000) === activeDayIdx &&
      e.status !== 'cancelled' &&
      e.prepRoomId
    );
  }, [exams, activeDayIdx]);

  const examsByPrepRoom = useMemo(() => {
    const grouped: Record<string, typeof dayExams> = {};
    dayExams.forEach(e => {
      if (!grouped[e.prepRoomId!]) grouped[e.prepRoomId!] = [];
      grouped[e.prepRoomId!].push(e);
    });
    return grouped;
  }, [dayExams]);

  const prepRoomIds = useMemo(() => {
    return Object.keys(examsByPrepRoom).sort((a, b) => {
      const nameA = rooms.find(r => r.id === a)?.name || '';
      const nameB = rooms.find(r => r.id === b)?.name || '';
      return nameA.localeCompare(nameB, undefined, { numeric: true });
    });
  }, [examsByPrepRoom, rooms]);

  const footerStr = useMemo(() => {
    const now = new Date();
    return `Erstellt mit LinexioAbi am ${now.toLocaleDateString('de-DE')} um ${now.toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})} Uhr.`;
  }, []);

  if (!activeDay) return null;

  const formattedDate = new Intl.DateTimeFormat('de-DE', { 
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' 
  }).format(new Date(activeDay.date));

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-12 pb-20 w-full overflow-visible">
      <style>{PRINT_STYLES}</style>
      
      {prepRoomIds.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-400 italic">
          Keine Vorbereitungsräume für diesen Tag geplant.
        </div>
      ) : (
        prepRoomIds.map((rid) => {
          const room = rooms.find(r => r.id === rid);
          const roomExams = examsByPrepRoom[rid].sort((a, b) => a.startTime - b.startTime);

          return (
            <div 
              key={rid} 
              className="bg-white text-black p-12 shadow-2xl overflow-hidden rounded-sm origin-top relative"
              style={{ 
                width: '794px', 
                minHeight: '1123px',
                transform: `scale(${scale})`,
                marginBottom: `calc(1123px * (1 - ${scale}) * -1 + 24px)`
              }}
            >
              <div className="flex justify-between items-baseline border-b-2 border-black pb-2 mb-6">
                <h2 className="text-xl font-bold !text-black">Vorbereitungsraum: {room?.name}</h2>
                <div className="text-sm font-medium !text-black">{formattedDate}</div>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black p-2 text-sm text-left w-24 !text-black">Uhrzeit</th>
                    <th className="border border-black p-2 text-sm text-left !text-black">SchülerIn</th>
                    <th className="border border-black p-2 text-sm text-left w-40 !text-black">Prüfer</th>
                    <th className="border border-black p-2 text-sm text-left w-48 !text-black">Fach</th>
                  </tr>
                </thead>
                <tbody>
                  {roomExams.map(e => {
                    const student = students.find(s => s.id === e.studentId);
                    const teacher = teachers.find(t => t.id === e.teacherId);
                    const prepMin = examSlotToMin(e.startTime) - 20;

                    return (
                      <tr key={e.id}>
                        <td className="border border-black p-2 font-bold !text-black">{minToTime(prepMin)}</td>
                        <td className="border border-black p-2 font-medium !text-black">{student?.lastName}, {student?.firstName}</td>
                        <td className="border border-black p-2 font-medium !text-black">{teacher?.lastName}</td>
                        <td className="border border-black p-2 font-medium !text-black">{e.subject}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="absolute bottom-12 left-12 right-12 text-[7pt] text-slate-500 text-right italic opacity-80 !text-slate-500">
                {footerStr}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
