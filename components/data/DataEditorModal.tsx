
import React from 'react';
import { X, Trash2, Save, AlertTriangle, Check, User, School, DoorOpen, Calendar, Shield, GraduationCap } from 'lucide-react';
import { Modal } from '../Modal';
import { DataTab } from '../../hooks/useData';
import { RoomType } from '../../types';

interface DataEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: DataTab;
  editingItem: any;
  formData: any;
  setFormData: (data: any) => void;
  validationError: string | null;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (val: boolean) => void;
  onSave: () => void;
  onDelete: () => void;
}

export const DataEditorModal: React.FC<DataEditorModalProps> = ({
  isOpen, onClose, activeTab, editingItem, formData, setFormData, 
  validationError, showDeleteConfirm, setShowDeleteConfirm, onSave, onDelete
}) => {
  const updateField = (f: string, v: any) => setFormData({ ...formData, [f]: v });

  const getIcon = () => {
    const icons = { teachers: User, students: School, rooms: DoorOpen, days: Calendar, subjects: GraduationCap };
    const Icon = icons[activeTab];
    return <Icon size={20} className="text-cyan-400" />;
  };

  const entityName = { teachers: 'Lehrkraft', students: 'SchülerIn', rooms: 'Raum', days: 'Prüfungstag', subjects: 'Fach' }[activeTab];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col">
        <div className="flex items-center gap-4 pb-5 mb-6 border-b border-slate-700/30">
          <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">{getIcon()}</div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">{editingItem ? `${entityName} bearbeiten` : `${entityName} hinzufügen`}</h3>
            <p className="text-xs text-slate-400">Stammdatenpflege</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 text-slate-500 hover:text-white rounded-lg transition-colors"><X size={20} /></button>
        </div>

        {!showDeleteConfirm ? (
          <form onSubmit={e => { e.preventDefault(); onSave(); }} className="space-y-6">
            {activeTab === 'teachers' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Nachname</label>
                    <input type="text" value={formData.lastName || ''} onChange={e => updateField('lastName', e.target.value)} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Vorname</label>
                    <input type="text" value={formData.firstName || ''} onChange={e => updateField('firstName', e.target.value)} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5 items-end">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Kürzel</label>
                    <input type="text" value={formData.shortName || ''} onChange={e => updateField('shortName', e.target.value)} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white font-mono focus:ring-1 focus:ring-cyan-500/40" />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group py-2">
                    <input type="checkbox" checked={formData.isPartTime || false} onChange={e => updateField('isPartTime', e.target.checked)} className="sr-only" />
                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center ${formData.isPartTime ? 'bg-cyan-600 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-slate-900/50 border-slate-700 group-hover:border-slate-500'}`}>
                      {formData.isPartTime && <Check size={14} className="text-white" />}
                    </div>
                    <span className="text-xs font-semibold text-slate-300 group-hover:text-white">Teilzeit</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Nachname</label>
                    <input type="text" value={formData.lastName || ''} onChange={e => updateField('lastName', e.target.value)} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Vorname</label>
                    <input type="text" value={formData.firstName || ''} onChange={e => updateField('firstName', e.target.value)} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40" />
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'rooms' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Bezeichnung</label>
                    <input type="text" value={formData.name || ''} onChange={e => updateField('name', e.target.value)} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40 font-mono" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Kapazität</label>
                    <input type="number" min="1" value={formData.requiredSupervisors || 1} onChange={e => updateField('requiredSupervisors', parseInt(e.target.value))} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Raumtyp</label>
                  <select value={formData.type} onChange={e => updateField('type', e.target.value as RoomType)} className="w-full bg-[#0a0f1d] border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40 cursor-pointer">
                    <option value="Prüfungsraum">Prüfungsraum</option>
                    <option value="Vorbereitungsraum">Vorbereitungsraum</option>
                    <option value="Warteraum">Warteraum</option>
                    <option value="Aufsicht-Station">Aufsicht-Station</option>
                  </select>
                </div>
                <label className="flex items-center gap-3 cursor-pointer group py-2">
                  <input type="checkbox" checked={formData.isSupervisionStation || false} onChange={e => updateField('isSupervisionStation', e.target.checked)} className="sr-only" />
                  <div className={`w-6 h-6 rounded-lg border flex items-center justify-center ${formData.isSupervisionStation ? 'bg-amber-600 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-slate-900/50 border-slate-700 group-hover:border-slate-500'}`}>
                    {formData.isSupervisionStation && <Shield size={14} className="text-white" />}
                  </div>
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-white">In Aufsichts-Grid anzeigen</span>
                </label>
              </div>
            )}

            {activeTab === 'days' && (
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Datum</label>
                  <input type="date" value={formData.date || ''} onChange={e => updateField('date', e.target.value)} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Bezeichnung</label>
                  <input type="text" value={formData.label || ''} onChange={e => updateField('label', e.target.value)} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40" />
                </div>
              </div>
            )}

            {activeTab === 'subjects' && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Fachbezeichnung</label>
                <input 
                  type="text" 
                  value={formData.name || ''} 
                  onChange={e => updateField('name', e.target.value)} 
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40 font-bold" 
                  placeholder="z.B. Mathematik"
                />
              </div>
            )}

            <div className="space-y-4 pt-2">
              {validationError && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertTriangle size={14} className="text-red-400 shrink-0" />
                  <span className="text-[11px] font-medium text-red-400">{validationError}</span>
                </div>
              )}
              <div className="flex gap-4">
                {editingItem && (
                  <button type="button" onClick={() => setShowDeleteConfirm(true)} className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-sm transition-all"><Trash2 size={18} /> Löschen</button>
                )}
                <button type="submit" className="flex-[2] h-12 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20 active:scale-95 transition-all"><Save size={18} /> Speichern</button>
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-6 py-4">
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 mx-auto mb-2"><AlertTriangle size={24} /></div>
              <h4 className="text-white font-bold tracking-tight">Eintrag löschen?</h4>
              <p className="text-xs text-slate-400">Dies kann nicht rückgängig gemacht werden.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button type="button" onClick={onDelete} className="w-full h-14 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all">Jetzt löschen</button>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="w-full h-12 text-slate-400 hover:text-white font-medium rounded-xl">Abbrechen</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
