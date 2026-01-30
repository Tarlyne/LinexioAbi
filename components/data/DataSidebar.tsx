import React from 'react';
import { Upload, Info, DoorOpen, Calendar, BookOpen } from 'lucide-react';
// Fix: Corrected the import path for DataTab from useDataManagement
import { DataTab } from '../../hooks/useDataManagement';

interface DataSidebarProps {
  activeTab: DataTab;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: DataTab) => void;
  stats: {
    rooms: { exams: number; prep: number; supervision: number; waiting: number };
    subjectsCount: number;
  };
}

export const DataSidebar: React.FC<DataSidebarProps> = ({ activeTab, onFileUpload, stats }) => {
  return (
    <aside className="w-full lg:w-80 space-y-4 shrink-0 overflow-y-auto no-scrollbar pb-6">
      {(activeTab === 'teachers' || activeTab === 'students') && (
        <div className="glass-nocturne p-5 border border-slate-700/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-400 shrink-0">
              <Upload size={18} />
            </div>
            <h3 className="font-bold text-white text-sm">CSV Smart-Import</h3>
          </div>
          <label className="block group cursor-pointer rounded-2xl">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => onFileUpload(e, activeTab)}
            />
            <div className="w-full py-8 bg-slate-800/20 border border-slate-700/50 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:border-cyan-500/40 hover:bg-slate-800/40">
              <span className="text-slate-300 text-sm font-medium">Datei hochladen</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                CSV (UTF-8)
              </span>
            </div>
          </label>
          <div className="mt-5 p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-cyan-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Erwartetes Format
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono leading-relaxed">
              {activeTab === 'teachers'
                ? 'Nachname; Vorname; Kürzel; Fach 1; Fach 2; Fach 3; Teilzeit (ja/leer)'
                : 'Nachname; Vorname'}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'rooms' && (
        <div className="glass-nocturne p-5 border border-slate-700/30">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-400 shrink-0">
              <DoorOpen size={18} />
            </div>
            <h3 className="font-bold text-white text-sm">Raum-Bilanz</h3>
          </div>
          <div className="space-y-3">
            {[
              {
                label: 'Prüfungsräume',
                val: stats.rooms.exams,
                color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5',
              },
              {
                label: 'Vorbereitungsräume',
                val: stats.rooms.prep,
                color: 'text-amber-500 border-amber-500/20 bg-amber-500/5',
              },
              {
                label: 'Aufsicht-Stationen',
                val: stats.rooms.supervision,
                color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/10',
              },
              {
                label: 'Warteräume',
                val: stats.rooms.waiting,
                color: 'text-slate-300 border-slate-700/30 bg-slate-500/5',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-800/50"
              >
                <span className="text-xs font-medium text-slate-400">{stat.label}</span>
                <span
                  className={`text-sm font-bold px-2 py-0.5 rounded border min-w-[2rem] text-center ${stat.color}`}
                >
                  {stat.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'days' && (
        <div className="glass-nocturne p-5 border border-slate-700/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-400 shrink-0">
              <Calendar size={18} />
            </div>
            <h3 className="font-bold text-white text-sm">Zeitliche Basis</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Das Grid passt sich automatisch an die hier definierten Tage an.
          </p>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="glass-nocturne p-5 border border-slate-700/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-400 shrink-0">
              <BookOpen size={18} />
            </div>
            <h3 className="font-bold text-white text-sm">Fach-Katalog</h3>
          </div>
          <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/50 flex justify-between items-center">
            <span className="text-xs font-medium text-slate-400">Aktive Fächer</span>
            <span className="text-sm font-bold text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20 bg-cyan-500/5">
              {stats.subjectsCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-4 leading-relaxed italic">
            Zentral definierte Fächer verhindern Schreibfehler in der Planung.
          </p>
        </div>
      )}
    </aside>
  );
};
