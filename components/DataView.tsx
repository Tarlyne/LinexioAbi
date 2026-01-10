
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
        <button onClick={() => openEditor()} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-900/20 active:scale-95">
          <PlusCircle size={16} /> {entityName} ergänzen
        </button>
      </div>

      <div className="relative flex p-1 bg-slate-900/60 border border-slate-700/30 rounded-xl w-full max-w-2xl shrink-0 mb-6 overflow-x-auto no-scrollbar">
        <div 
          className="absolute top-1 bottom-1 left-1 bg-cyan-600 rounded-lg shadow-lg shadow-cyan-900/20 transition-all duration-300 ease-in-out"
          style={{ 
            width: `calc((100% - 8px) / ${tabs.length})`, 
            transform: `translateX(calc(${tabs.findIndex(t => t.id === activeTab)} * 100%))` 
          }}
        />
        {tabs.map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-semibold transition-colors duration-300 rounded-lg outline-none whitespace-nowrap px-3 ${activeTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <tab.icon size={13} /> {tab.label}
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
