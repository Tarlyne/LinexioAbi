
import React from 'react';
import { X, Trash2, Save, AlertTriangle, Check, Users, DoorOpen, Calendar, Shield, GraduationCap, ChevronDown, Layers, BookOpen } from 'lucide-react';
import { Modal } from '../Modal';
import { DataTab } from '../../hooks/useData';
import { RoomType } from '../../types';
import { useApp } from '../../context/AppContext';

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
  const { state } = useApp();
  const updateField = (f: string, v: any) => setFormData({ ...formData, [f]: v });

  const getIcon = () => {
    const icons = { teachers: GraduationCap, students: Users, rooms: DoorOpen, days: Calendar, subjects: BookOpen };
    const Icon = icons[activeTab];
    return <Icon size={20} className="text-cyan-400" />;
  };

  const getItemIdentifier = () => {
    if (!editingItem) return 'Eintrag';
    switch (activeTab) {
      case 'teachers':
      case 'students':
        return `${editingItem.lastName}, ${editingItem.firstName}`;
      case 'rooms':
        return editingItem.name;
      case 'days':
        return editingItem.label;
      case 'subjects':
        return editingItem.name;
      default:
        return 'Eintrag';
    }
  };

  const entityName = { teachers: 'Lehrkraft', students: 'SchülerIn', rooms: 'Raum', days: 'Prüfungstag', subjects: 'Fach' }[activeTab];

  // Fach-Update-Helfer für Lehrer
  const updateTeacherSubject = (idx: number, subId: string) => {
    const current = [...(formData.subjectIds || [])];
    if (!subId) {
      current.splice(idx, 1);
    } else {
      current[idx] = subId;
    }
    // Eindeutige IDs sicherstellen und leere Slots entfernen
    const unique = Array.from(new Set(current.filter(id => !!id)));
    updateField('subjectIds', unique);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col">
        <div className="flex items-center gap-4 pb-5 mb-6 border-b border-slate-700/30">
          <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">{getIcon()}</div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">{editingItem ? `${entityName} bearbeiten` : `${entityName} hinzufügen`}</h3>
            <p className="text-xs text-cyan-500/80 font-medium">Stammdatenpflege</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 text-slate-500 hover:text-white rounded-lg transition-colors"><X size={20} /></button>
        </div>

        {!showDeleteConfirm ? (
          <form onSubmit={e => { e.preventDefault(); onSave(); }} className="space-y-6">
            {activeTab === 'teachers' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Nachname</label>
                    <input 
                      autoFocus
                      type="text" 
                      value={formData.lastName || ''} 
                      onChange={e => updateField('lastName', e.target.value)} 
                      className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40" 
                    />
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

                {/* Fach-Zuordnung */}
                <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4 shadow-inner">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen size={14} className="text-cyan-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lehrfächer (max. 3)</span>
                  </div>
                  
                  {[0, 1, 2].map(idx => (
                    <div key={idx} className="relative group">
                      <select 
                        value={formData.subjectIds?.[idx] || ''} 
                        onChange={e => updateTeacherSubject(idx, e.target.value)} 
                        className="w-full appearance-none bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-xs text-slate-200 focus:ring-1 focus:ring-cyan-500/40 cursor-pointer"
                      >
                        <option value="">-- Fach {idx + 1} wählen --</option>
                        {state.subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.shortName})</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600" size={14} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Nachname</label>
                    <input 
                      autoFocus
                      type="text" 
                      value={formData.lastName || ''} 
                      onChange={e => updateField('lastName', e.target.value)} 
                      className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40" 
                    />
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
                    <input 
                      autoFocus
                      type="text" 
                      value={formData.name || ''} 
                      onChange={e => updateField('name', e.target.value)} 
                      className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40 font-mono" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Kapazität</label>
                    <input type="number" min="1" value={formData.requiredSupervisors || 1} onChange={e => updateField('requiredSupervisors', parseInt(e.target.value))} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Raumtyp</label>
                  <div className="relative group">
                    <select 
                      value={formData.type} 
                      onChange={e => updateField('type', e.target.value as RoomType)} 
                      className="w-full appearance-none bg-[#0a0f1d] border border-slate-700/50 rounded-xl pl-4 pr-10 py-3 text-white focus:ring-1 focus:ring-cyan-500/40 cursor-pointer"
                    >
                      <option value="Prüfungsraum">Prüfungsraum</option>
                      <option value="Vorbereitungsraum">Vorbereitungsraum</option>
                      <option value="Warteraum">Warteraum</option>
                      <option value="Aufsicht-Station">Aufsicht-Station</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" size={18} />
                  </div>
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
                  <input type="text" value={formData.label || ''} onChange={e => updateField('label', e.target.value)} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40" />
                </div>
              </div>
            )}

            {activeTab === 'subjects' && (
              <div className="space-y-6">
                <div className="grid grid-cols-[1fr_80px] gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Fachbezeichnung</label>
                    <input 
                      autoFocus
                      type="text" 
                      value={formData.name || ''} 
                      onChange={e => updateField('name', e.target.value)} 
                      className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40 font-bold" 
                      placeholder="z.B. Mathematik"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Kürzel</label>
                    <input 
                      type="text" 
                      value={formData.shortName || ''} 
                      onChange={e => updateField('shortName', e.target.value)} 
                      className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-cyan-400 font-mono text-left focus:ring-1 focus:ring-cyan-500/40 font-bold" 
                      placeholder="Ma"
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                     <Layers size={18} className="text-cyan-400" />
                     <span className="text-xs font-bold text-white uppercase tracking-wider">Erweiterte Logik</span>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group py-1">
                    <input type="checkbox" checked={formData.isCombined || false} onChange={e => updateField('isCombined', e.target.checked)} className="sr-only" />
                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${formData.isCombined ? 'bg-cyan-600 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-slate-900/50 border-slate-700 group-hover:border-slate-500'}`}>
                      {formData.isCombined && <Check size={14} className="text-white" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">Kombi-Prüfung</span>
                      <span className="text-[10px] text-slate-500 font-medium">Prüfer & Protokollant wechseln Rollen</span>
                    </div>
                  </label>
                </div>
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
                  <button type="button" onClick={() => setShowDeleteConfirm(true)} className="btn-secondary-glass flex-1 h-12 rounded-xl text-sm border-red-500/20 text-red-400">
                    <Trash2 size={18} /> Löschen
                  </button>
                )}
                <button type="submit" className="btn-primary-aurora flex-[2] h-12 rounded-xl text-sm">
                  <Save size={18} /> Speichern
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-6 py-4">
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 mx-auto mb-2"><AlertTriangle size={24} /></div>
              <h4 className="text-white font-bold tracking-tight">"{getItemIdentifier()}" löschen?</h4>
              <p className="text-xs text-slate-400">Dies kann nicht rückgängig gemacht werden.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button type="button" onClick={onDelete} className="w-full h-14 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all">Jetzt löschen</button>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="btn-secondary-glass w-full h-12 rounded-xl">Abbrechen</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
