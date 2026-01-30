import React from 'react';
import { ChevronDown, Shield } from 'lucide-react';

interface RoomFormProps {
  formData: any;
  updateField: (field: string, value: any) => void;
}

export const RoomForm: React.FC<RoomFormProps> = ({ formData, updateField }) => {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
            Bezeichnung
          </label>
          <input
            autoFocus
            type="text"
            value={formData.name || ''}
            onChange={(e) => updateField('name', e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
            Aufsichten benötigt
          </label>
          <input
            type="number"
            min="1"
            value={formData.requiredSupervisors || 1}
            onChange={(e) => updateField('requiredSupervisors', parseInt(e.target.value))}
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
          Raumtyp
        </label>
        <div className="relative group">
          <select
            value={formData.type}
            onChange={(e) => updateField('type', e.target.value)}
            className="w-full appearance-none bg-[#0a0f1d] border border-slate-700/50 rounded-xl pl-4 pr-10 py-3 text-white focus:ring-1 focus:ring-cyan-500/40 cursor-pointer"
          >
            <option value="Prüfungsraum">Prüfungsraum</option>
            <option value="Vorbereitungsraum">Vorbereitungsraum</option>
            <option value="Warteraum">Warteraum</option>
            <option value="Aufsicht-Station">Aufsicht-Station</option>
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500"
            size={18}
          />
        </div>
      </div>
      <label className="flex items-center gap-3 cursor-pointer group py-2">
        <input
          type="checkbox"
          checked={formData.isSupervisionStation || false}
          onChange={(e) => updateField('isSupervisionStation', e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-6 h-6 rounded-lg border flex items-center justify-center ${formData.isSupervisionStation ? 'bg-amber-600 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-slate-900/50 border-slate-700 group-hover:border-slate-500'}`}
        >
          {formData.isSupervisionStation && <Shield size={14} className="text-white" />}
        </div>
        <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
          In Aufsichts-Grid anzeigen
        </span>
      </label>
    </div>
  );
};
