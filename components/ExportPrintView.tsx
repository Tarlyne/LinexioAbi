import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { minToTime, examSlotToMin } from '../utils/TimeService';

interface ExportPrintViewProps {
  activeDayIdx: number;
  isPreview?: boolean;
}

export const ExportPrintView: React.FC<ExportPrintViewProps> = ({ activeDayIdx, isPreview = false }) => {
  const { state } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const activeDay = state.days[activeDayIdx];
  
  const examYear = useMemo(() => {
    if (state.days.length === 0) return new Date().getFullYear();
    return new Date(state.days[0].date).getFullYear();
  }, [state.days]);

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

  // iPad-Optimierung: Skalierung der Vorschau berechnen
  useEffect(() => {
    if (isPreview && containerRef.current) {
      const updateScale = () => {
        const parent = containerRef.current?.parentElement;
        if (parent) {
          const parentWidth = parent.clientWidth - 48; // Padding abziehen
          const targetWidth = 794; // A4 Breite in PX
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
    
    const sortedRooms = [...state.rooms]
      .filter(r => r.type === 'Prüfungsraum')
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    const dayExams = state.exams.filter(e => 
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
  }, [state.rooms, state.exams, activeDayIdx, activeDay]);

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
        <style>{`
          .export-table { 
            font-family: "Times New Roman", Times, Baskerville, Georgia, serif;
            font-variant-numeric: lining-nums tabular-nums;
            border-collapse: separate; 
            border-spacing: 0;
            width: 100%; 
            border: none !important;
          }
          .export-table th, .export-table td { 
            padding: 0; 
            color: black !important;
            border: 0.4pt solid #000;
          }
          .export-table th { 
            height: 22pt;
            background-color: #f3f4f6 !important; 
            font-weight: bold; 
            font-size: 8pt; 
            font-family: 'Inter', sans-serif;
            text-align: center;
          }
          .export-table td { 
            height: 16pt; /* Kompakter: Von 18pt auf 16pt */
            font-size: 9.5pt; 
            overflow: hidden;
          }
          
          /* CRITICAL: Flex-Wrapper für garantierte vertikale Zentrierung im PDF-Export */
          .cell-wrap {
            display: flex;
            align-items: center;
            height: 16pt;
            width: 100%;
            padding: 0 6px;
            box-sizing: border-box;
          }
          .justify-center { justify-content: center; }
          .justify-start { justify-content: flex-start; }

          .print-zebra { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
          
          .header-grid { 
            display: flex !important; 
            flex-direction: row !important;
            justify-content: space-between !important; 
            align-items: baseline !important; 
            margin-bottom: 24px; 
            border-bottom: 1.8pt solid #000; 
            padding-bottom: 4px; 
            width: 100%;
            font-family: 'Inter', sans-serif;
          }
          .header-left { font-weight: 700; font-size: 14pt; margin: 0; }
          .header-right { font-size: 10pt; font-weight: 400; color: #333; }

          .room-spacer td { 
            border: 0px solid transparent !important;
            height: 14pt;
            padding: 0 !important;
            background: transparent !important;
          }
        `}</style>

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
                    const student = state.students.find(s => s.id === exam.studentId);
                    const teacher = state.teachers.find(t => t.id === exam.teacherId);
                    const chair = state.teachers.find(t => t.id === exam.chairId);
                    const protocol = state.teachers.find(t => t.id === exam.protocolId);
                    const prepRoom = state.rooms.find(r => r.id === exam.prepRoomId);
                    
                    const commissionKey = `${exam.teacherId}-${exam.chairId}-${exam.protocolId}`;
                    if (examIdx === 0) {
                      lastCommissionKey = commissionKey;
                      currentZebra = false;
                    } else if (commissionKey !== lastCommissionKey) {
                      currentZebra = !currentZebra;
                      lastCommissionKey = commissionKey;
                    }

                    const startTimeStr = minToTime(examSlotToMin(exam.startTime));

                    return (
                      <tr key={exam.id} className={currentZebra ? 'print-zebra' : ''}>
                        <td><div className="cell-wrap justify-center" style={{ fontWeight: 'bold' }}>{startTimeStr}</div></td>
                        <td><div className="cell-wrap justify-center" style={{ fontSize: '8pt' }}>{prepRoom?.name || '-'}</div></td>
                        <td><div className="cell-wrap justify-center">{group.room.name}</div></td>
                        <td><div className="cell-wrap justify-start" style={{ fontWeight: 'bold' }}>{student?.lastName || '???'}</div></td>
                        <td><div className="cell-wrap justify-start" style={{ fontSize: '8.5pt' }}>{exam.subject} {exam.groupId ? `(${exam.groupId})` : ''}</div></td>
                        <td><div className="cell-wrap justify-center" style={{ fontSize: '8pt' }}>{teacher?.shortName || '-'}</div></td>
                        <td><div className="cell-wrap justify-center" style={{ fontSize: '8pt' }}>{protocol?.shortName || '-'}</div></td>
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
