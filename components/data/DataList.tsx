import React from 'react';
import { Settings } from 'lucide-react';
import { DataTab } from '../../hooks/useDataManagement';
import { RoomType, Teacher } from '../../types';
import { useData } from '../../context/DataContext';

interface Column<T> {
  header: string;
  key: keyof T | 'action' | 'index' | 'subjects';
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, idx: number) => React.ReactNode;
}

interface DataListProps {
  activeTab: DataTab;
  data: any[];
  onEdit: (item: any) => void;
  exitingId: string | null;
}

export const DataList: React.FC<DataListProps> = ({ activeTab, data, onEdit, exitingId }) => {
  const { subjects } = useData();

  const getRoomBadgeClass = (type: RoomType) => {
    switch (type) {
      case 'Prüfungsraum':
        return 'badge-cyan';
      case 'Vorbereitungsraum':
        return 'badge-amber';
      case 'Aufsicht-Station':
        return 'badge-slate text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
      default:
        return 'badge-slate';
    }
  };

  const columns: Column<any>[] = [
    {
      header: '#',
      key: 'index',
      width: 'w-14',
      align: 'center',
      render: (_, idx) => <span className="text-[10px] font-mono text-slate-500">{idx + 1}</span>,
    },
    {
      header:
        activeTab === 'rooms'
          ? 'Raum'
          : activeTab === 'days'
            ? 'Datum'
            : activeTab === 'subjects'
              ? 'Fach'
              : 'Nachname',
      key: 'lastName',
      render: (item) => (
        <span className="font-bold text-slate-200">
          {activeTab === 'days'
            ? new Date(item.date).toLocaleDateString('de-DE', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
              })
            : activeTab === 'subjects'
              ? item.name
              : item.lastName || item.name}
          {activeTab === 'teachers' && item.isPartTime && (
            <span className="text-cyan-500 ml-1" title="Teilzeit">
              °
            </span>
          )}
          {activeTab === 'teachers' && item.isLeadership && (
            <span className="text-amber-500 ml-1" title="Schulleitung">
              *
            </span>
          )}
        </span>
      ),
    },
  ];

  if (activeTab === 'rooms') {
    columns.push({
      header: 'Typ',
      key: 'type' as any,
      render: (item) => (
        <span className={`badge ${getRoomBadgeClass(item.type)}`}>{item.type}</span>
      ),
    });
  } else if (activeTab === 'days') {
    columns.push({
      header: 'Bezeichnung',
      key: 'label' as any,
      render: (item) => item.label,
    });
  } else if (activeTab === 'subjects') {
    columns.push({
      header: 'Kürzel',
      key: 'shortName' as any,
      width: 'w-24',
      render: (item) => (
        <span className="text-cyan-400 font-mono text-[11px] bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/20">
          {item.shortName}
        </span>
      ),
    });
  } else {
    columns.push({
      header: 'Vorname',
      key: 'firstName',
      render: (item) => item.firstName,
    });
  }

  if (activeTab === 'teachers') {
    columns.push({
      header: 'Fächer',
      key: 'subjects',
      render: (item: Teacher) => {
        const shortNames = (item.subjectIds || [])
          .map((id) => subjects.find((s) => s.id === id)?.shortName)
          .filter(Boolean);

        return (
          <span className="text-[10px] font-mono text-slate-400 tracking-tight italic">
            {shortNames.length > 0 ? shortNames.join(' / ') : '--'}
          </span>
        );
      },
    });

    columns.push({
      header: 'Kürzel',
      key: 'shortName' as any,
      width: 'w-24',
      render: (item) => (
        <span className="text-cyan-400 font-mono text-[11px] bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/20">
          {item.shortName}
        </span>
      ),
    });
  }

  columns.push({
    header: 'Aktion',
    key: 'action',
    width: 'w-20',
    align: 'center',
    render: (item) => (
      <button
        onClick={() => onEdit(item)}
        className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
      >
        <Settings size={18} />
      </button>
    ),
  });

  return (
    <div className="flex-1 glass-nocturne border border-slate-700/30 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md z-10 shadow-sm">
            <tr className="border-b border-slate-700/50">
              {columns.map((col) => (
                <th
                  key={col.header}
                  className={`${col.width || ''} px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest ${col.align === 'center' ? 'text-center' : ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {data.map((item, idx) => (
              <tr
                key={item.id}
                className={`hover:bg-cyan-500/5 transition-colors group text-sm ${exitingId === item.id ? 'animate-row-exit' : ''}`}
              >
                {columns.map((col) => (
                  <td
                    key={`${item.id}-${col.header}`}
                    className={`px-4 py-3 truncate ${col.align === 'center' ? 'text-center' : ''}`}
                  >
                    {col.render ? col.render(item, idx) : (item as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-20 text-center text-slate-600 italic text-sm"
                >
                  Keine Einträge vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-900/60 border-t border-slate-700/30 px-4 py-2 flex justify-between items-center shrink-0">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {data.length} Einträge
        </span>
        {activeTab === 'teachers' && (
          <div className="flex gap-4">
            <span className="text-[10px] font-bold text-cyan-500/80 tracking-widest">
              ° Teilzeit
            </span>
            <span className="text-[10px] font-bold text-amber-500/80 tracking-widest">
              * Schulleitung
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
