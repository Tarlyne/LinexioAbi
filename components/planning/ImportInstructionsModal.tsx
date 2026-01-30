import React from 'react';
import { Modal } from '../Modal';
import {
  FileSpreadsheet,
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  User,
  GraduationCap,
  Shield,
  FileText,
  Info,
} from 'lucide-react';

interface ImportInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: () => void;
}

export const ImportInstructionsModal: React.FC<ImportInstructionsModalProps> = ({
  isOpen,
  onClose,
  onSelectFile,
}) => {
  const columns = [
    { label: 'Datum', icon: Calendar, example: '2025-05-15' },
    { label: 'Uhrzeit', icon: Clock, example: '08:00' },
    { label: 'Vorbereitung', icon: MapPin, example: 'R201' },
    { label: 'Raum', icon: MapPin, example: 'A10' },
    { label: 'Prüfling', icon: User, example: 'Mustermann, Max' },
    { label: 'Fach', icon: FileText, example: 'Deutsch' },
    { label: 'Prüfer', icon: GraduationCap, example: 'Buc' },
    { label: 'Protokoll', icon: GraduationCap, example: 'Eic' },
    { label: 'Vorsitz', icon: GraduationCap, example: 'Dis' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-700/30">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 text-indigo-400">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">CSV-Format vorbereiten</h3>
            <p className="text-xs text-slate-400">Erwartete Struktur der Import-Datei</p>
          </div>
        </div>

        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 flex gap-4">
          <Info size={18} className="text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            Bitte stelle sicher, dass deine Excel-Datei als{' '}
            <strong>CSV (Trennzeichen-getrennt)</strong> mit Semikolon (;) gespeichert ist. Die
            Reihenfolge der 9 Spalten muss exakt wie folgt sein:
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {columns.map((col, idx) => (
            <div
              key={idx}
              className="relative p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col items-center text-center gap-1.5 pt-6 group"
            >
              {/* Nummerierungs-Badge */}
              <div className="absolute top-1.5 left-2 w-4 h-4 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <span className="text-[9px] font-black text-indigo-400/80">{idx + 1}</span>
              </div>

              <col.icon
                size={14}
                className="text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity"
              />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                {col.label}
              </span>
              <span className="text-[9px] font-mono text-slate-600 truncate w-full">
                {col.example}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={() => {
              onClose();
              onSelectFile();
            }}
            className="btn-primary-aurora w-full h-14 rounded-xl text-sm uppercase tracking-wider !shadow-[0_8px_20px_-4px_rgba(79,70,229,0.5)] border-indigo-500/30"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' }}
          >
            Datei jetzt auswählen <ArrowRight size={18} />
          </button>
          <button onClick={onClose} className="btn-secondary-glass w-full h-11 rounded-xl text-xs">
            Abbrechen
          </button>
        </div>
      </div>
    </Modal>
  );
};
