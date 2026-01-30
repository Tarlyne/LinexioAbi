import React from 'react';
import {
  X,
  Trash2,
  Save,
  AlertTriangle,
  GraduationCap,
  Users,
  DoorOpen,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { Modal } from '../Modal';
import { DataTab } from '../../hooks/useDataManagement';
import { useData } from '../../context/DataContext';
import { TeacherForm } from './forms/TeacherForm';
import { StudentForm } from './forms/StudentForm';
import { RoomForm } from './forms/RoomForm';
import { DayForm } from './forms/DayForm';
import { SubjectForm } from './forms/SubjectForm';

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
  isOpen,
  onClose,
  activeTab,
  editingItem,
  formData,
  setFormData,
  validationError,
  showDeleteConfirm,
  setShowDeleteConfirm,
  onSave,
  onDelete,
}) => {
  const { subjects } = useData();
  const updateField = (f: string, v: any) => setFormData({ ...formData, [f]: v });

  const getIcon = () => {
    const icons = {
      teachers: GraduationCap,
      students: Users,
      rooms: DoorOpen,
      days: Calendar,
      subjects: BookOpen,
    };
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

  const entityName = {
    teachers: 'Lehrkraft',
    students: 'SchülerIn',
    rooms: 'Raum',
    days: 'Prüfungstag',
    subjects: 'Fach',
  }[activeTab];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col">
        <div className="flex items-center gap-4 pb-5 mb-6 border-b border-slate-700/30">
          <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">
            {getIcon()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {editingItem ? `${entityName} bearbeiten` : `${entityName} hinzufügen`}
            </h3>
            <p className="text-xs text-cyan-500/80 font-medium">Stammdatenpflege</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-2 text-slate-500 hover:text-white rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {!showDeleteConfirm ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
            className="space-y-6"
          >
            {activeTab === 'teachers' && (
              <TeacherForm formData={formData} updateField={updateField} subjects={subjects} />
            )}
            {activeTab === 'students' && (
              <StudentForm formData={formData} updateField={updateField} />
            )}
            {activeTab === 'rooms' && <RoomForm formData={formData} updateField={updateField} />}
            {activeTab === 'days' && <DayForm formData={formData} updateField={updateField} />}
            {activeTab === 'subjects' && (
              <SubjectForm formData={formData} updateField={updateField} />
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
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex-1 h-12 rounded-xl text-sm border border-red-500/30 text-red-400 flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={18} /> Löschen
                  </button>
                )}
                <button
                  type="submit"
                  className="btn-aurora-base btn-primary-aurora flex-[2] h-12 rounded-xl text-sm"
                >
                  <Save size={18} /> Speichern
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-6 py-4">
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 mx-auto mb-2">
                <AlertTriangle size={24} />
              </div>
              <h4 className="text-white font-bold tracking-tight">
                "{getItemIdentifier()}" löschen?
              </h4>
              <p className="text-xs text-slate-400">Dies kann nicht rückgängig gemacht werden.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={onDelete}
                className="btn-danger-aurora w-full h-14 rounded-xl text-sm uppercase tracking-wider"
              >
                Jetzt löschen
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
