import React from 'react';
import { PlusCircle, Users, DoorOpen, Calendar, GraduationCap, BookOpen } from 'lucide-react';
import { useDataManagement } from '../hooks/useDataManagement';
import { DataList } from './data/DataList';
import { DataSidebar } from './data/DataSidebar';
import { DataEditorModal } from './data/DataEditorModal';

export const DataView: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    showModal,
    setShowModal,
    editingItem,
    openEditor,
    showDeleteConfirm,
    setShowDeleteConfirm,
    exitingId,
    formData,
    setFormData,
    validationError,
    sortedData,
    stats,
    handleFileUpload,
    save,
    remove,
  } = useDataManagement();

  const tabs = [
    { id: 'teachers', label: 'Lehrkräfte', icon: GraduationCap },
    { id: 'students', label: 'Schüler', icon: Users },
    { id: 'rooms', label: 'Räume', icon: DoorOpen },
    { id: 'days', label: 'Tage', icon: Calendar },
    { id: 'subjects', label: 'Fächer', icon: BookOpen },
  ];

  return (
    <div className="h-full w-full overflow-hidden animate-in fade-in duration-500 relative">
      {/* 
          Responsive Max-Width Container: 
          Begrenzt die Breite auf PC-Bildschirmen (> 1440px), bleibt aber linksbündig (Konsistenz zur Sidebar).
          Auf dem iPad bleibt es bei der gewohnten Edge-to-Edge Ansicht.
      */}
      <div className="max-w-[1440px] w-full h-full flex flex-col">
        {/* Header Section simplified to gain vertical space */}
        <div className="shrink-0 mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">Datenbank</h2>
          <p className="text-cyan-500/80 text-[10px] font-bold tracking-wide mt-0.5">
            Zentrale Stammdatenpflege
          </p>
        </div>

        {/* 
            Control Row: Navigation + Primary Action 
            Anpassung für Tablet-Portrait: flex-col für schmale Ansichten (<1024px), 
            flex-row für PC und Querformat.
        */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6 shrink-0">
          <div className="segmented-control-wrapper w-full lg:max-w-2xl h-10 overflow-hidden shrink-0">
            <div
              className="segmented-control-slider"
              style={{
                width: `calc((100% - 6px) / ${tabs.length})`,
                transform: `translateX(calc(${tabs.findIndex((t) => t.id === activeTab)} * 100%))`,
              }}
            />
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`segmented-control-item h-full ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <tab.icon size={13} className="mr-2" /> {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => openEditor()}
            className="btn-aurora-base btn-primary-aurora px-6 h-10 rounded-xl text-xs w-full lg:w-auto lg:min-w-[140px]"
          >
            <PlusCircle size={16} /> Hinzufügen
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden w-full">
          <DataList
            activeTab={activeTab}
            data={sortedData}
            onEdit={openEditor}
            exitingId={exitingId}
          />
          <DataSidebar activeTab={activeTab} onFileUpload={handleFileUpload} stats={stats} />
        </div>
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
