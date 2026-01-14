import React from 'react';
import { X, Trash2, Save, PlusCircle, Settings, ChevronDown, Layers, AlertCircle } from 'lucide-react';
import { Modal } from '../Modal';
import { Exam, Student, Teacher, Room, Subject } from '../../types';

interface ExamEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingExam: Partial<Exam> | null;
  setEditingExam: (exam: any) => void;
  students: Student[];
  teachers: Teacher[];
  rooms: Room[];
  subjects: Subject[];
  onSave: (e: React.FormEvent) => void;
  onDelete: (id: string) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (val: boolean) => void;
}

export const ExamEditorModal: React.FC<ExamEditorModalProps> = ({
  isOpen, onClose, editingExam, setEditingExam,
  students, teachers, rooms, subjects,
  onSave, onDelete, showDeleteConfirm, setShowDeleteConfirm
}) => {
  const prepRoomsList = rooms.filter(r => r.type === 'Vorbereitungsraum');

  const getDeletingItemName = () => {
    if (!editingExam?.studentId) return 'Prüfung';
    const student = students.find(s => s.id === editingExam.studentId);
    return student ? `${student.lastName}, ${student.firstName}` : 'Prüfung';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/30">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 text-cyan-400">
              {editingExam?.id ? <Settings size={20} /> : <PlusCircle size={20} />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {editingExam?.id ? 'Prüfung bearbeiten' : 'Prüfung erstellen'}
              </h3>
              <p className="text-xs text-cyan-500/80 font-medium">Details zur Prüfung</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {!showDeleteConfirm ? (
          <form onSubmit={onSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">SchülerIn</label>
                <div className="relative group">
                  <select 
                    className="w-full appearance-none bg-[#0a0f1d] border border-slate-700/50 rounded-xl pl-4 pr-10 py-3 text-white focus:ring-1 focus:ring-cyan-500/40 cursor-pointer"
                    onChange={e => setEditingExam((prev: any) => ({...prev, studentId: e.target.value}))}
                    value={editingExam?.studentId || ''}
                  >
                    <option value="">Auswählen...</option>
                    {students.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(s => (
                      <option key={s.id} value={s.id}>{s.lastName}, {s.firstName}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">Prüfungsfach</label>
                <div className="relative group">
                  <select 
                    className="w-full appearance-none bg-[#0a0f1d] border border-slate-700/50 rounded-xl pl-4 pr-10 py-3 text-white focus:ring-1 focus:ring-cyan-500/40 cursor-pointer font-bold"
                    onChange={e => setEditingExam((prev: any) => ({...prev, subject: e.target.value}))}
                    value={editingExam?.subject || ''}
                  >
                    <option value="">Fach wählen...</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">Gruppe</label>
                <div className="relative">
                  <input 
                    type="text" 
                    maxLength={10}
                    value={editingExam?.groupId || ''} 
                    onChange={e => setEditingExam((prev: any) => ({...prev, groupId: e.target.value.toUpperCase()}))}
                    className="w-full bg-[#0a0f1d] border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40 font-mono"
                    placeholder="z.B. A"
                  />
                  <Layers size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-800 pb-2">Kommission</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-3 items-center gap-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Prüfer</label>
                  <div className="col-span-2 relative group">
                    <select 
                      className="w-full appearance-none bg-[#0a0f1d] border border-slate-700/50 rounded-xl pl-4 pr-10 py-2.5 text-white focus:ring-1 focus:ring-cyan-500/40 cursor-pointer text-sm"
                      onChange={e => setEditingExam((prev: any) => ({...prev, teacherId: e.target.value}))}
                      value={editingExam?.teacherId || ''}
                    >
                      <option value="">Nicht zugewiesen</option>
                      {teachers.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(t => (
                        <option key={t.id} value={t.id}>{t.lastName}, {t.firstName} ({t.shortName})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" size={14} />
                  </div>
                </div>

                <div className="grid grid-cols-3 items-center gap-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Vorsitz</label>
                  <div className="col-span-2 relative group">
                    <select 
                      className="w-full appearance-none bg-[#0a0f1d] border border-slate-700/50 rounded-xl pl-4 pr-10 py-2.5 text-white focus:ring-1 focus:ring-cyan-500/40 cursor-pointer text-sm"
                      onChange={e => setEditingExam((prev: any) => ({...prev, chairId: e.target.value}))}
                      value={editingExam?.chairId || ''}
                    >
                      <option value="">Nicht zugewiesen</option>
                      {teachers.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(t => (
                        <option key={t.id} value={t.id}>{t.lastName}, {t.firstName} ({t.shortName})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" size={14} />
                  </div>
                </div>

                <div className="grid grid-cols-3 items-center gap-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Protokoll</label>
                  <div className="col-span-2 relative group">
                    <select 
                      className="w-full appearance-none bg-[#0a0f1d] border border-slate-700/50 rounded-xl pl-4 pr-10 py-2.5 text-white focus:ring-1 focus:ring-cyan-500/40 cursor-pointer text-sm"
                      onChange={e => setEditingExam((prev: any) => ({...prev, protocolId: e.target.value}))}
                      value={editingExam?.protocolId || ''}
                    >
                      <option value="">Nicht zugewiesen</option>
                      {teachers.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(t => (
                        <option key={t.id} value={t.id}>{t.lastName}, {t.firstName} ({t.shortName})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" size={14} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-800 pb-2">Vorbereitungsraum</h4>
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Raum:</label>
                <div className="col-span-2 relative group">
                  <select 
                    className="w-full appearance-none bg-[#0a0f1d] border border-slate-700/50 rounded-xl pl-4 pr-10 py-2.5 text-white focus:ring-1 focus:ring-cyan-500/40 cursor-pointer text-sm"
                    onChange={e => setEditingExam((prev: any) => ({...prev, prepRoomId: e.target.value}))}
                    value={editingExam?.prepRoomId || ''}
                  >
                    <option value="">Kein Vorbereitungsraum</option>
                    {prepRoomsList.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" size={14} />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              {editingExam?.id && (
                <button 
                  type="button" 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-sm"
                >
                  <Trash2 size={18} /> Löschen
                </button>
              )}
              <button 
                type="submit" 
                className="btn-primary-aurora flex-[2] h-12 rounded-xl text-sm"
              >
                <Save size={18} /> {editingExam?.id ? 'Änderungen speichern' : 'Prüfung anlegen'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 animate-in zoom-in-95 duration-200 py-4">
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 mx-auto mb-2">
                <AlertCircle size={24} />
              </div>
              <h4 className="text-white font-bold tracking-tight">"{getDeletingItemName()}" löschen?</h4>
              <p className="text-xs text-slate-400">Diese Aktion kann nicht rückgängig gemacht werden.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                type="button" 
                onClick={() => onDelete(editingExam!.id!)}
                className="btn-danger-aurora w-full h-14 rounded-xl text-sm uppercase tracking-wider transition-all"
              >
                Unwiderruflich löschen
              </button>
              <button 
                type="button" 
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary-glass w-full h-12 rounded-xl"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};