import React from 'react';

interface DayFormProps {
  formData: any;
  updateField: (field: string, value: any) => void;
}

export const DayForm: React.FC<DayFormProps> = ({ formData, updateField }) => {
  return (
    <div className="grid grid-cols-2 gap-5">
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Datum</label>
        <input 
          autoFocus 
          type="date" 
          value={formData.date || ''} 
          onChange={e => updateField('date', e.target.value)} 
          className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40" 
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Bezeichnung</label>
        <input 
          type="text" 
          value={formData.label || ''} 
          onChange={e => updateField('label', e.target.value)} 
          className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40" 
        />
      </div>
    </div>
  );
};