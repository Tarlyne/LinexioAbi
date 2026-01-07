
import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { minToTime, examSlotToMin } from '../utils/TimeService';

interface ExportPrintViewProps {
  activeDayIdx: number;
  isPreview?: boolean;
}

export const ExportPrintView: React.FC<ExportPrintViewProps> = ({ activeDayIdx, isPreview = false }) => {
  const { state } = useApp();

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
    return `Erstellt am ${d}.${m}.${y} um ${hh}:${mm} Uhr.`;
  }, []);

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

  const containerClass = isPreview 
    ? "bg-white text-black p-12 shadow-2xl mx-auto w-full max-w-[210mm] min-h-[297mm] overflow-hidden rounded-sm preview-mode" 
    : "text-black bg-white p-0 m-0 w-full min-h-screen";

  return (
    <div className={containerClass}>
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
          padding: 6px 8px; 
          color: black !important;
          border: 0.8pt solid #000;
        }
        /* Fix für doppelte Linien bei border-collapse: separate */
        .export-table th, .export-table td {
          border-right-width: 0.4pt;
          border-bottom-width: 0.4pt;
          border-left-width: 0.4pt;
          border-top-width: 0.4pt;
        }
        .export-table th { 
          background-color: #f3f4f6 !important; 
          font-weight: bold; 
          text-transform: none !important; 
          font-size: 8.5pt; 
          font-family: 'Inter', sans-serif;
          text-align: center;
        }
        .export-table td { 
          font-size: 10pt; 
          vertical-align: middle; 
          font-style: normal !important;
        }
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
        .header-left { font-weight: 700; font-size: 15pt; margin: 0; }
        .header-right { font-size: 11pt; font-weight: 400; color: #333; }

        .room-spacer td { 
          border: 0px solid transparent !important;
          height: 18pt;
          padding: 0 !important;
          background: transparent !important;
        }

        .text-left { text-align: left !important; }
        .text-center { text-align: center !important; }

        @media print {
          @page { size: A4 portrait; margin: 15mm; }
        }
      `}</style>

      <div className="header-grid">
        <h1 className="header-left">Mündliche Abiturprüfung {examYear}</h1>
        <div className="header-right">{formattedDate}</div>
      </div>

      <table className="export-table">
        <thead>
          <tr>
            <th style={{ width: '11%' }}>Zeit</th>
            <th style={{ width: '9%' }}>Vorb.</th>
            <th style={{ width: '9%' }}>Raum</th>
            <th style={{ width: '27%' }} className="text-left">Prüfling</th>
            <th style={{ width: '18%' }} className="text-left">Fach</th>
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
                      <td className="text-center" style={{ fontWeight: 'bold' }}>{startTimeStr}</td>
                      <td className="text-center" style={{ fontSize: '8.5pt' }}>{prepRoom?.name || '-'}</td>
                      <td className="text-center" style={{ fontWeight: 'normal' }}>{group.room.name}</td>
                      <td className="text-left" style={{ fontWeight: 'bold' }}>{student?.lastName || '???'}</td>
                      <td className="text-left" style={{ fontSize: '9pt' }}>{exam.subject} {exam.groupId ? `(${exam.groupId})` : ''}</td>
                      <td className="text-center" style={{ fontSize: '8.5pt' }}>{teacher?.shortName || '-'}</td>
                      <td className="text-center" style={{ fontSize: '8.5pt' }}>{protocol?.shortName || '-'}</td>
                      <td className="text-center" style={{ fontSize: '8.5pt' }}>{chair?.shortName || '-'}</td>
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
      
      <div className="mt-6 text-[8pt] text-slate-500 text-right font-sans">
        {footerStr}
      </div>
    </div>
  );
};
