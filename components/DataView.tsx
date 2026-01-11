
import React from 'react';
import { PlusCircle, Users, DoorOpen, Calendar, GraduationCap, BookOpen } from 'lucide-react';
import { useData } from '../hooks/useData';
import { DataList } from './data/DataList';
import { DataSidebar } from './data/DataSidebar';
import { DataEditorModal } from './data/DataEditorModal';

export const DataView: React.FC = () => {
  const {
    activeTab, setActiveTab,
    showModal, setShowModal,
    editingItem, openEditor,
    showDeleteConfirm, setShowDeleteConfirm,
    exitingId, formData, setFormData,
    validationError, sortedData, stats,
    handleFileUpload, save, remove
  } = useData();

  const tabs = [
    { id: 'teachers', label: 'Lehrkräfte', icon: GraduationCap },
    { id: 'students', label: 'Schüler', icon: Users },
    { id: 'rooms', label: 'Räume', icon: DoorOpen },
    { id: 'days', label: 'Tage', icon: Calendar },
    { id: 'subjects', label: 'Fächer', icon: BookOpen },
  ];

  const entityName = { 
    teachers: 'Lehrkraft', 
    students: 'SchülerIn', 
    rooms: 'Raum', 
    days: 'Tag', 
    subjects: 'Fach' 
  }[activeTab];

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500 w-full relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Datenbank</h2>
          <p className="text-cyan-500/80 text-xs font-medium">Zentrale Verwaltung der Stammdaten</p>
        </div>
        <button onClick={() => openEditor()} className="btn-primary-aurora px-6 py-2.5 rounded-xl text-xs">
          <PlusCircle size={16} /> {entityName} ergänzen
        </button>
      </div>

      <div className="segmented-control-wrapper w-full max-w-2xl shrink-0 mb-6 overflow-hidden">
        <div 
          className="segmented-control-slider"
          style={{ 
            width: `calc((100% - 6px) / ${tabs.length})`, 
            transform: `translateX(calc(${tabs.findIndex(t => t.id === activeTab)} * 100%))` 
          }}
        />
        {tabs.map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`segmented-control-item ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <tab.icon size={13} className="mr-2" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden w-full">
        <DataList 
          activeTab={activeTab} 
          data={sortedData} 
          onEdit={openEditor} 
          exitingId={exitingId} 
        />
        <DataSidebar 
          activeTab={activeTab} 
          onFileUpload={handleFileUpload} 
          stats={stats} 
        />
      </div>

      <DataEditorModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        activeTab={activeTab}
        editingItem={editingItem}
        formData={formData}
        setFormData={setFormData}
        validationError={validationError}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        onSave={save}
        onDelete={remove}
      />
    </div>
  );
};
