import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { PRINT_STYLES } from '../utils/printStyles';

interface SupervisionPrintViewProps {
  activeDayIdx: number;
}

export const SupervisionPrintView: React.FC<SupervisionPrintViewProps> = ({ activeDayIdx }) => {
  const { supervisions } = useApp();
  const { days, rooms, teachers } = useData();

  const activeDay = days[activeDayIdx];

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 7.5; h <= 18.0; h += 0.5) {
      const hh = Math.floor(h);
      const mm = h % 1 === 0 ? '00' : '30';
      slots.push(`${hh.toString().padStart(2, '0')}:${mm}`);
    }
    return slots;
  }, []);

  const stations = useMemo(() => rooms.filter(r => r.isSupervisionStation || r.type === 'Aufsicht-Station'), [rooms]);
  const totalSubSlots = stations.reduce((sum, s) => sum + (s.requiredSupervisors || 1), 0);

  const formattedDate = useMemo(() => {
    if (!activeDay) return '';
    return new Intl.DateTimeFormat('de-DE', { 
      weekday: 'long', 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }).format(new Date(activeDay.date));
  }, [activeDay]);

  const occupiedCells = new Set<string>();

  if (!activeDay) return null;

  return (
    <div className="supervision-print-container p-8">
      <style>{PRINT_STYLES}</style>
      
      <div className="header-grid mb-6">
        <h1 className="header-left">Aufsichtsplan Abitur {new Date(activeDay.date).getFullYear()}</h1>
        <div className="header-right">{formattedDate}</div>
      </div>

      <table className="supervision-table">
        <thead>
          <tr>
            <th className="sup-time-cell">Zeit</th>
            {stations.map(station => (
              <th 
                key={station.id} 
                colSpan={station.requiredSupervisors || 1}
                className="px-1"
              >
                <div className="font-bold">{station.name}</div>
                {station.type === 'Vorbereitungsraum' && (
                  <div className="text-[6pt] font-normal italic">(Vorb.-raum)</div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((time, slotIdx) => (
            <tr key={time}>
              <td className="sup-time-cell">{time}</td>
              {stations.map(station => {
                const subs = [];
                for (let subIdx = 0; subIdx < (station.requiredSupervisors || 1); subIdx++) {
                  const cellKey = `${station.id}-${subIdx}-${slotIdx}`;
                  
                  if (occupiedCells.has(cellKey)) {
                    subs.push(null);
                    continue;
                  }

                  const sup = supervisions.find(s => 
                    s.dayIdx === activeDayIdx && 
                    s.stationId === station.id && 
                    s.subSlotIdx === subIdx && 
                    s.startTime === time
                  );

                  if (sup) {
                    const teacher = teachers.find(t => t.id === sup.teacherId);
                    occupiedCells.add(`${station.id}-${subIdx}-${slotIdx + 1}`);
                    subs.push(
                      <td 
                        key={cellKey} 
                        rowSpan={2} 
                        className="sup-teacher-cell font-bold"
                      >
                        {teacher?.shortName || '?'}
                      </td>
                    );
                  } else {
                    subs.push(
                      <td key={cellKey} className="sup-empty-cell" />
                    );
                  }
                }
                return subs;
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 text-[7pt] text-slate-500 text-right italic">
        Erstellt mit LinexioAbi am {new Date().toLocaleDateString('de-DE')} um {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr.
      </div>
    </div>
  );
};