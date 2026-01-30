import React from 'react';
import { Calendar } from 'lucide-react';

interface DayFormProps {
  formData: any;
  updateField: (field: string, value: any) => void;
}

export const DayForm: React.FC<DayFormProps> = ({ formData, updateField }) => {
  return (
    <div className="grid grid-cols-2 gap-5">
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
          Datum
        </label>
        <div className="relative group">
          <Calendar
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none z-10"
          />
          <input
            autoFocus
            type="date"
            value={formData.date || ''}
            onChange={(e) => updateField('date', e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-11 pr-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40 relative z-0 custom-date-input"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
          Bezeichnung
        </label>
        <input
          type="text"
          value={formData.label || ''}
          onChange={(e) => updateField('label', e.target.value)}
          className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40"
          placeholder="z.B. 1. Prüfungstag"
        />
      </div>
    </div>
  );
};
