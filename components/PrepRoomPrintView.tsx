import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { minToTime, examSlotToMin } from '../utils/TimeService';
import { PRINT_STYLES } from '../utils/printStyles';

interface PrepRoomPrintViewProps {
  activeDayIdx: number;
  isPreview?: boolean;
}

export const PrepRoomPrintView: React.FC<PrepRoomPrintViewProps> = ({
  activeDayIdx,
  isPreview = false,
}) => {
  const { exams } = useApp();
  const { days, rooms, teachers, students } = useData();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const activeDay = days[activeDayIdx];

  const formattedDate = useMemo(() => {
    if (!activeDay) return '';
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(activeDay.date));
  }, [activeDay]);

  const footerStr = useMemo(() => {
    const now = new Date();
    return `Erstellt mit LinexioAbi am ${now.toLocaleDateString('de-DE')}, ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
  }, []);

  useEffect(() => {
    const updateScale = () => {
      const parent = containerRef.current?.parentElement;
      if (parent) {
        const parentWidth = parent.clientWidth - 48;
        setScale(parentWidth < 794 ? parentWidth / 794 : 1);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const examsByPrepRoom = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    exams
      .filter(
        (e) =>
          e.startTime > 0 &&
          Math.floor((e.startTime - 1) / 1000) === activeDayIdx &&
          e.status !== 'cancelled' &&
          e.prepRoomId
      )
      .forEach((e) => {
        if (!grouped[e.prepRoomId!]) grouped[e.prepRoomId!] = [];
        grouped[e.prepRoomId!].push(e);
      });
    return grouped;
  }, [exams, activeDayIdx]);

  const prepRoomIds = useMemo(
    () =>
      Object.keys(examsByPrepRoom).sort((a, b) =>
        (rooms.find((r) => r.id === a)?.name || '').localeCompare(
          rooms.find((r) => r.id === b)?.name || '',
          undefined,
          { numeric: true }
        )
      ),
    [examsByPrepRoom, rooms]
  );

  if (!activeDay) return null;

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center gap-12 pb-20 w-full overflow-visible"
    >
      <style>{PRINT_STYLES}</style>
      {prepRoomIds.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-400 italic">
          Keine Vorbereitungsräume geplant.
        </div>
      ) : (
        prepRoomIds.map((rid) => (
          <div
            key={rid}
            className="bg-white text-black p-12 shadow-2xl overflow-hidden rounded-sm origin-top relative"
            style={{
              width: '794px',
              minHeight: '1123px',
              transform: `scale(${scale})`,
              marginBottom: `calc(1123px * (1 - ${scale}) * -1 + 24px)`,
            }}
          >
            <div className="header-grid">
              <h1 className="header-left">
                Mündliches Abitur:{' '}
                <span className="header-cyan">
                  Vorbereitungsraum {rooms.find((r) => r.id === rid)?.name}
                </span>
              </h1>
              <div className="header-right">
                <span className="header-day">{formattedDate}</span>
              </div>
            </div>
            <table className="export-table prep-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Zeit</th>
                  <th style={{ width: '35%' }}>Prüfling</th>
                  <th style={{ width: '25%' }}>Prüfer</th>
                  <th style={{ width: '25%' }}>Fach</th>
                </tr>
              </thead>
              <tbody>
                {examsByPrepRoom[rid]
                  .sort((a, b) => a.startTime - b.startTime)
                  .map((e) => (
                    <tr key={e.id}>
                      <td>
                        <div className="cell-wrap justify-center font-bold">
                          {minToTime(examSlotToMin(e.startTime) - 20)}
                        </div>
                      </td>
                      <td>
                        <div className="cell-wrap justify-start font-bold">
                          {students.find((s) => s.id === e.studentId)?.lastName},{' '}
                          {students.find((s) => s.id === e.studentId)?.firstName}
                        </div>
                      </td>
                      <td>
                        <div className="cell-wrap justify-start">
                          {teachers.find((t) => t.id === e.teacherId)?.lastName}
                        </div>
                      </td>
                      <td>
                        <div className="cell-wrap justify-start">{e.subject}</div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <div className="export-footer">
              <div className="text-[7.5pt] text-slate-500 italic opacity-80">{footerStr}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
