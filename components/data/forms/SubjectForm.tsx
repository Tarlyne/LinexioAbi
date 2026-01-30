import React from 'react';
import { Layers, Check } from 'lucide-react';

interface SubjectFormProps {
  formData: any;
  updateField: (field: string, value: any) => void;
}

export const SubjectForm: React.FC<SubjectFormProps> = ({ formData, updateField }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[1fr_80px] gap-4">
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
            Fachbezeichnung
          </label>
          <input
            autoFocus
            type="text"
            value={formData.name || ''}
            onChange={(e) => updateField('name', e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40 font-bold"
            placeholder="z.B. Mathematik"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
            Kürzel
          </label>
          <input
            type="text"
            value={formData.shortName || ''}
            onChange={(e) => updateField('shortName', e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-cyan-400 font-mono text-left focus:ring-1 focus:ring-cyan-500/40 font-bold"
            placeholder="Ma"
          />
        </div>
      </div>
      <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl space-y-3">
        <div className="flex items-center gap-3">
          <Layers size={18} className="text-cyan-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Erweiterte Logik
          </span>
        </div>
        <label className="flex items-center gap-3 cursor-pointer group py-1">
          <input
            type="checkbox"
            checked={formData.isCombined || false}
            onChange={(e) => updateField('isCombined', e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${formData.isCombined ? 'bg-cyan-600 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-slate-900/50 border-slate-700 group-hover:border-slate-500'}`}
          >
            {formData.isCombined && <Check size={14} className="text-white" />}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">
              Kombi-Prüfung
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              Prüfer & Protokollant wechseln Rollen
            </span>
          </div>
        </label>
      </div>
    </div>
  );
};
