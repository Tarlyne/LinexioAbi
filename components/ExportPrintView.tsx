import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { minToTime, examSlotToMin } from '../utils/TimeService';
import { PRINT_STYLES } from '../utils/printStyles';

interface ExportPrintViewProps {
  activeDayIdx: number;
  isPreview?: boolean;
}

export const ExportPrintView: React.FC<ExportPrintViewProps> = ({
  activeDayIdx,
  isPreview = false,
}) => {
  const { exams } = useApp();
  const { days, rooms, teachers, subjects, students } = useData();
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
    return `Erstellt mit LinexioAbi am ${now.toLocaleDateString('de-DE')} um ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr.`;
  }, []);

  useEffect(() => {
    if (isPreview && containerRef.current) {
      const updateScale = () => {
        const parent = containerRef.current?.parentElement;
        if (parent) {
          const parentWidth = parent.clientWidth - 48;
          const targetWidth = 794;
          setScale(parentWidth < targetWidth ? parentWidth / targetWidth : 1);
        }
      };
      updateScale();
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }
  }, [isPreview]);

  const roomsWithExams = useMemo(() => {
    if (!activeDay) return [];
    const dayExams = exams.filter(
      (e) =>
        e.startTime > 0 &&
        Math.floor((e.startTime - 1) / 1000) === activeDayIdx &&
        e.status !== 'cancelled'
    );
    return rooms
      .filter((r) => r.type === 'Prüfungsraum')
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map((room) => ({
        room,
        exams: dayExams
          .filter((e) => e.roomId === room.id)
          .sort((a, b) => a.startTime - b.startTime),
      }))
      .filter((g) => g.exams.length > 0);
  }, [rooms, exams, activeDayIdx, activeDay]);

  if (!activeDay) return null;

  return (
    <div
      className={isPreview ? 'w-full overflow-hidden flex justify-center' : ''}
      style={isPreview ? { height: `${1123 * scale}px` } : {}}
    >
      <div
        ref={containerRef}
        className={
          isPreview
            ? 'bg-white text-black p-12 shadow-2xl mx-auto rounded-sm origin-top'
            : 'text-black bg-white p-0 m-0 w-full min-h-screen'
        }
        style={
          isPreview ? { width: '794px', minHeight: '1123px', transform: `scale(${scale})` } : {}
        }
      >
        <style>{PRINT_STYLES}</style>

        <div className="header-grid">
          <h1 className="header-left">
            Mündliches Abitur: <span className="header-cyan">Prüfungsplan</span>
          </h1>
          <div className="header-right">
            <span className="header-day">{formattedDate}</span>
          </div>
        </div>

        <table className="export-table">
          <thead>
            <tr>
              <th style={{ width: '10%' }}>Zeit</th>
              <th style={{ width: '9%' }}>Vorb.</th>
              <th style={{ width: '9%' }}>Raum</th>
              <th style={{ width: '28%' }}>Prüfling</th>
              <th style={{ width: '18%' }}>Fach</th>
              <th style={{ width: '8%' }}>Prüfer</th>
              <th style={{ width: '8%' }}>Prot.</th>
              <th style={{ width: '10%' }}>Vorsitz</th>
            </tr>
          </thead>
          <tbody>
            {roomsWithExams.map((group, gIdx) => {
              let zebra = false;
              let lastComm = '';
              return (
                <React.Fragment key={group.room.id}>
                  {group.exams.map((exam, eIdx) => {
                    const comm = `${exam.teacherId}-${exam.chairId}-${exam.protocolId}`;
                    if (eIdx === 0) {
                      lastComm = comm;
                      zebra = false;
                    } else if (comm !== lastComm) {
                      zebra = !zebra;
                      lastComm = comm;
                    }
                    const isComb = subjects.find((s) => s.name === exam.subject)?.isCombined;
                    return (
                      <tr key={exam.id} className={zebra ? 'print-zebra' : ''}>
                        <td>
                          <div className="cell-wrap justify-center font-bold">
                            {minToTime(examSlotToMin(exam.startTime))}
                          </div>
                        </td>
                        <td>
                          <div className="cell-wrap justify-center text-[9pt]">
                            {rooms.find((r) => r.id === exam.prepRoomId)?.name || '-'}
                          </div>
                        </td>
                        <td>
                          <div className="cell-wrap justify-center">{group.room.name}</div>
                        </td>
                        <td>
                          <div className="cell-wrap justify-start font-bold">
                            {students.find((s) => s.id === exam.studentId)?.lastName || '???'}
                          </div>
                        </td>
                        <td>
                          <div className="cell-wrap justify-start text-[8.5pt]">
                            {exam.subject}
                            {isComb ? '*' : ''}
                          </div>
                        </td>
                        <td>
                          <div
                            className="cell-wrap justify-center"
                            style={{ fontSize: isComb ? '6.5pt' : '8pt' }}
                          >
                            {isComb
                              ? `${teachers.find((t) => t.id === exam.teacherId)?.shortName}/${teachers.find((t) => t.id === exam.protocolId)?.shortName}`
                              : teachers.find((t) => t.id === exam.teacherId)?.shortName || '-'}
                          </div>
                        </td>
                        <td>
                          <div
                            className="cell-wrap justify-center"
                            style={{ fontSize: isComb ? '6.5pt' : '8pt' }}
                          >
                            {isComb
                              ? `${teachers.find((t) => t.id === exam.teacherId)?.shortName}/${teachers.find((t) => t.id === exam.protocolId)?.shortName}`
                              : teachers.find((t) => t.id === exam.protocolId)?.shortName || '-'}
                          </div>
                        </td>
                        <td>
                          <div className="cell-wrap justify-center text-[8pt]">
                            {teachers.find((t) => t.id === exam.chairId)?.shortName || '-'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {gIdx < roomsWithExams.length - 1 && (
                    <tr className="room-spacer">
                      <td colSpan={8}></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {!isPreview && (
          <div className="export-footer">
            <div className="text-[7.5pt] text-slate-500 italic opacity-80">{footerStr}</div>
          </div>
        )}
      </div>
    </div>
  );
};
