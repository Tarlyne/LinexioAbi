import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { minToTime, examSlotToMin } from '../utils/TimeService';
import { PRINT_STYLES } from '../utils/printStyles';

interface ExportPrintViewProps {
  activeDayIdx: number;
  isPreview?: boolean;
}

/**
 * Standard Print Layout for Exam Plans.
 * Category C Refactoring: Uses external PRINT_STYLES.
 */
export const ExportPrintView: React.FC<ExportPrintViewProps> = ({ activeDayIdx, isPreview = false }) => {
  const { exams } = useApp();
  const { days, rooms, teachers, subjects, students } = useData();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const activeDay = days[activeDayIdx];
  
  const examYear = useMemo(() => {
    if (days.length === 0) return new Date().getFullYear();
    return new Date(days[0].date).getFullYear();
  }, [days]);

  const formattedDate = useMemo(() => {
    if (!activeDay) return '';
    return new Intl.DateTimeFormat('de-DE', { 
      weekday: 'long', 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }).format(new Date(activeDay.date));
  }, [activeDay]);

  const footerStr = useMemo(() => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `Erstellt mit LinexioAbi am ${d}.${m}.${y} um ${hh}:${mm} Uhr.`;
  }, []);

  useEffect(() => {
    if (isPreview && containerRef.current) {
      const updateScale = () => {
        const parent = containerRef.current?.parentElement;
        if (parent) {
          const parentWidth = parent.clientWidth - 48; 
          const targetWidth = 794; 
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
    }
  }, [isPreview]);

  const roomsWithExams = useMemo(() => {
    if (!activeDay) return [];
    
    const sortedRooms = [...rooms]
      .filter(r => r.type === 'Prüfungsraum')
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    const dayExams = exams.filter(e => 
      e.startTime > 0 && 
      Math.floor((e.startTime - 1) / 1000) === activeDayIdx &&
      e.status !== 'cancelled'
    );

    return sortedRooms.map(room => {
      const roomExams = dayExams
        .filter(e => e.roomId === room.id)
        .sort((a, b) => a.startTime - b.startTime);
      
      return { room, exams: roomExams };
    }).filter(group => group.exams.length > 0);
  }, [rooms, exams, activeDayIdx, activeDay]);

  if (!activeDay) return null;

  const elementId = isPreview ? 'pdf-export-preview' : `pdf-export-print-${activeDayIdx}`;
  const containerClass = isPreview 
    ? "bg-white text-black p-12 shadow-2xl mx-auto overflow-hidden rounded-sm origin-top" 
    : "text-black bg-white p-0 m-0 w-full min-h-screen";

  return (
    <div 
      className={isPreview ? "w-full overflow-hidden flex justify-center" : ""}
      style={isPreview ? { height: `${1123 * scale}px` } : {}}
    >
      <div 
        id={elementId} 
        ref={containerRef}
        className={containerClass} 
        style={isPreview ? { 
          width: '794px', 
          minHeight: '1123px',
          display: 'block',
          backgroundColor: '#ffffff',
          transform: `scale(${scale})`,
        } : {}}
      >
        <style>{PRINT_STYLES}</style>

        <div className="header-grid">
          <h1 className="header-left">Mündliche Abiturprüfung {examYear}</h1>
          <div className="header-right">{formattedDate}</div>
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
            {roomsWithExams.map((group, groupIdx) => {
              let currentZebra = false;
              let lastCommissionKey = "";

              return (
                <React.Fragment key={group.room.id}>
                  {group.exams.map((exam, examIdx) => {
                    const student = (students || []).find(s => s.id === exam.studentId);
                    const teacher = (teachers || []).find(t => t.id === exam.teacherId);
                    const chair = (teachers || []).find(t => t.id === exam.chairId);
                    const protocol = (teachers || []).find(t => t.id === exam.protocolId);
                    const prepRoom = (rooms || []).find(r => r.id === exam.prepRoomId);
                    
                    const subjectData = (subjects || []).find(s => s.name === exam.subject);
                    const isCombined = subjectData?.isCombined;

                    const commissionKey = `${exam.teacherId}-${exam.chairId}-${exam.protocolId}`;
                    if (examIdx === 0) {
                      lastCommissionKey = commissionKey;
                      currentZebra = false;
                    } else if (commissionKey !== lastCommissionKey) {
                      currentZebra = !currentZebra;
                      lastCommissionKey = commissionKey;
                    }

                    const startTimeStr = minToTime(examSlotToMin(exam.startTime));

                    let examinerDisplay = teacher?.shortName || '-';
                    let protocolDisplay = protocol?.shortName || '-';
                    
                    if (isCombined && teacher && protocol) {
                      examinerDisplay = `${teacher.shortName} / ${protocol.shortName}`;
                      protocolDisplay = `${teacher.shortName} / ${protocol.shortName}`;
                    }

                    return (
                      <tr key={exam.id} className={currentZebra ? 'print-zebra' : ''}>
                        <td><div className="cell-wrap justify-center" style={{ fontWeight: 'bold' }}>{startTimeStr}</div></td>
                        <td><div className="cell-wrap justify-center" style={{ fontSize: '8pt' }}>{prepRoom?.name || '-'}</div></td>
                        <td><div className="cell-wrap justify-center">{group.room.name}</div></td>
                        <td><div className="cell-wrap justify-start" style={{ fontWeight: 'bold' }}>{student?.lastName || '???'}</div></td>
                        {/* Changed: Removed groupId from the subject cell display */}
                        <td><div className="cell-wrap justify-start" style={{ fontSize: '8.5pt' }}>{exam.subject}{isCombined ? '*' : ''}</div></td>
                        <td><div className="cell-wrap justify-center" style={{ fontSize: isCombined ? '6.5pt' : '8pt' }}>{examinerDisplay}</div></td>
                        <td><div className="cell-wrap justify-center" style={{ fontSize: isCombined ? '6.5pt' : '8pt' }}>{protocolDisplay}</div></td>
                        <td><div className="cell-wrap justify-center" style={{ fontSize: '8pt' }}>{chair?.shortName || '-'}</div></td>
                      </tr>
                    );
                  })}
                  
                  {groupIdx < roomsWithExams.length - 1 && (
                    <tr className="room-spacer">
                      <td colSpan={8}></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        
        <div className="mt-6 text-[7.5pt] text-slate-500 text-right font-sans italic opacity-80">
          {footerStr}
        </div>
      </div>
    </div>
  );
};