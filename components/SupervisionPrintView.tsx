import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { PRINT_STYLES } from '../utils/printStyles';

interface SupervisionPrintViewProps {
  activeDayIdx: number;
  isPreview?: boolean;
}

export const SupervisionPrintView: React.FC<SupervisionPrintViewProps> = ({
  activeDayIdx,
  isPreview = false,
}) => {
  const { supervisions } = useApp();
  const { days, rooms, teachers } = useData();

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

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 7.5; h <= 18.0; h += 0.5) {
      slots.push(`${Math.floor(h).toString().padStart(2, '0')}:${h % 1 === 0 ? '00' : '30'}`);
    }
    return slots;
  }, []);

  const stations = useMemo(
    () => rooms.filter((r) => r.isSupervisionStation || r.type === 'Aufsicht-Station'),
    [rooms]
  );
  const occupiedCells = new Set<string>();

  if (!activeDay) return null;

  return (
    <div className="supervision-print-container p-8 relative min-h-[500px]">
      <style>{PRINT_STYLES}</style>

      <div className="header-grid mb-6">
        <h1 className="header-left">
          Mündliches Abitur: <span className="header-cyan">Aufsichtsplan</span>
        </h1>
        <div className="header-right">
          <span className="header-day">{formattedDate}</span>
        </div>
      </div>

      <table className="supervision-table">
        <thead>
          <tr>
            <th className="sup-time-cell !border-b-[1.5pt] !border-black">Zeit</th>
            {stations.map((station) => (
              <th
                key={station.id}
                colSpan={station.requiredSupervisors || 1}
                className="px-1 !border-b-[1.5pt] !border-black"
              >
                <div className="font-bold">{station.name}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((time, sIdx) => (
            <tr key={time}>
              <td className="sup-time-cell border-[0.4pt] border-black !font-normal text-[7.5pt]">
                {time}
              </td>
              {stations.map((station) => {
                const subs = [];
                for (let i = 0; i < (station.requiredSupervisors || 1); i++) {
                  const key = `${station.id}-${i}-${sIdx}`;
                  if (occupiedCells.has(key)) {
                    subs.push(null);
                    continue;
                  }
                  const sup = supervisions.find(
                    (s) =>
                      s.dayIdx === activeDayIdx &&
                      s.stationId === station.id &&
                      s.subSlotIdx === i &&
                      s.startTime === time
                  );
                  if (sup) {
                    occupiedCells.add(`${station.id}-${i}-${sIdx + 1}`);
                    subs.push(
                      <td
                        key={key}
                        rowSpan={2}
                        className="sup-teacher-cell font-bold border-[0.4pt] border-black"
                      >
                        {teachers.find((t) => t.id === sup.teacherId)?.shortName || '?'}
                      </td>
                    );
                  } else {
                    subs.push(
                      <td key={key} className="sup-empty-cell border-[0.4pt] border-black" />
                    );
                  }
                }
                return subs;
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {!isPreview && (
        <div className="export-footer mt-4">
          <div className="text-[7.5pt] text-slate-500 italic opacity-80">{footerStr}</div>
        </div>
      )}
    </div>
  );
};
