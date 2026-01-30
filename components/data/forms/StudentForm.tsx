import React from 'react';

interface StudentFormProps {
  formData: any;
  updateField: (field: string, value: any) => void;
}

export const StudentForm: React.FC<StudentFormProps> = ({ formData, updateField }) => {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
            Nachname
          </label>
          <input
            autoFocus
            type="text"
            value={formData.lastName || ''}
            onChange={(e) => updateField('lastName', e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
            Vorname
          </label>
          <input
            type="text"
            value={formData.firstName || ''}
            onChange={(e) => updateField('firstName', e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40"
          />
        </div>
      </div>
    </div>
  );
};
