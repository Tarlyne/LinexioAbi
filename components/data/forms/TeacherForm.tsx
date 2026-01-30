import React from 'react';
import { GraduationCap, Check, BookOpen, ChevronDown, ShieldCheck } from 'lucide-react';
import { Subject } from '../../../types';

interface TeacherFormProps {
  formData: any;
  updateField: (field: string, value: any) => void;
  subjects: Subject[];
}

export const TeacherForm: React.FC<TeacherFormProps> = ({ formData, updateField, subjects }) => {
  const updateTeacherSubject = (idx: number, subId: string) => {
    const current = [...(formData.subjectIds || [])];
    if (!subId) {
      current.splice(idx, 1);
    } else {
      current[idx] = subId;
    }
    const unique = Array.from(new Set(current.filter((id) => !!id)));
    updateField('subjectIds', unique);
  };

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-2 gap-5 items-start">
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
            Kürzel
          </label>
          <input
            type="text"
            value={formData.shortName || ''}
            onChange={(e) => updateField('shortName', e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white font-mono focus:ring-1 focus:ring-cyan-500/40"
          />
        </div>
        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={formData.isPartTime || false}
              onChange={(e) => updateField('isPartTime', e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${formData.isPartTime ? 'bg-cyan-600 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-slate-900/50 border-slate-700 group-hover:border-slate-500'}`}
            >
              {formData.isPartTime && <Check size={14} className="text-white" />}
            </div>
            <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
              Teilzeit
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={formData.isLeadership || false}
              onChange={(e) => updateField('isLeadership', e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${formData.isLeadership ? 'bg-amber-600 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-slate-900/50 border-slate-700 group-hover:border-slate-500'}`}
            >
              {formData.isLeadership && <ShieldCheck size={14} className="text-white" />}
            </div>
            <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
              Schulleitung
            </span>
          </label>
        </div>
      </div>

      <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4 shadow-inner">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={14} className="text-cyan-500" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Lehrfächer (max. 3)
          </span>
        </div>
        {[0, 1, 2].map((idx) => (
          <div key={idx} className="relative group">
            <select
              value={formData.subjectIds?.[idx] || ''}
              onChange={(e) => updateTeacherSubject(idx, e.target.value)}
              className="w-full appearance-none bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-xs text-slate-200 focus:ring-1 focus:ring-cyan-500/40 cursor-pointer"
            >
              <option value="">-- Fach {idx + 1} wählen --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.shortName})
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600"
              size={14}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
