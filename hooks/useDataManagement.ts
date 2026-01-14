
import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { useData as useDataContext } from '../context/DataContext';
import { Teacher, Student, Room, ExamDay, Subject, RoomType } from '../types';
import { parseTeachersCSV, parseStudentsCSV } from '../utils/csvParser';

export type DataTab = 'teachers' | 'students' | 'rooms' | 'days' | 'subjects';

/**
 * Zentraler Hook für die Verwaltung der Stammdaten-Ansicht und CRUD-Operationen.
 * Kombiniert Logik aus dem alten useData Hook und dem View-Management.
 */
export const useDataManagement = () => {
  const { 
    teachers, students, rooms, days, subjects,
    addTeacher, updateTeacher, deleteTeacher, upsertTeachers,
    addStudent, updateStudent, deleteStudent, upsertStudents,
    addRoom, updateRoom, deleteRoom,
    addDay, updateDay, deleteDay,
    addSubject, updateSubject, deleteSubject,
    isEntityInUse
  } = useDataContext();

  const { exams, supervisions } = useApp();
  const { showToast } = useUI();

  const [activeTab, setActiveTab] = useState<DataTab>('teachers');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const displayNames: Record<DataTab, string> = {
    teachers: 'Lehrkraft',
    students: 'SchülerIn',
    rooms: 'Raum',
    days: 'Prüfungstag',
    subjects: 'Fach'
  };

  const sortedData = useMemo(() => {
    const sourceMap: Record<DataTab, any[]> = { teachers, students, rooms, days, subjects };
    const data = [...(sourceMap[activeTab] || [])];
    
    if (activeTab === 'teachers') return (data as Teacher[]).sort((a, b) => a.lastName.localeCompare(b.lastName, 'de'));
    if (activeTab === 'students') return (data as Student[]).sort((a, b) => a.lastName.localeCompare(b.lastName, 'de'));
    
    if (activeTab === 'rooms') {
      const typePriority: Record<RoomType, number> = {
        'Prüfungsraum': 1,
        'Vorbereitungsraum': 2,
        'Aufsicht-Station': 3,
        'Warteraum': 4
      };
      
      return (data as Room[]).sort((a, b) => {
        const pA = typePriority[a.type] || 99;
        const pB = typePriority[b.type] || 99;
        if (pA !== pB) return pA - pB;
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      });
    }
    
    if (activeTab === 'days') return (data as ExamDay[]).sort((a, b) => a.date.localeCompare(b.date));
    return (data as Subject[]).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [teachers, students, rooms, days, subjects, activeTab]);

  const stats = useMemo(() => ({
    rooms: {
      exams: rooms.filter(r => r.type === 'Prüfungsraum').length,
      prep: rooms.filter(r => r.type === 'Vorbereitungsraum').length,
      supervision: rooms.filter(r => r.type === 'Aufsicht-Station').length,
      waiting: rooms.filter(r => r.type === 'Warteraum').length
    },
    subjectsCount: subjects?.length || 0
  }), [rooms, subjects]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: DataTab) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (type === 'teachers') {
        const result = parseTeachersCSV(text, subjects);
        
        if (result.skippedSubjects.length > 0) {
          showToast(
            `Import abgebrochen! Die folgenden Fächer sind unbekannt: ${result.skippedSubjects.join(', ')}. Bitte legen Sie diese zuerst im Reiter 'Fächer' an.`, 
            'error', 
            null
          );
          return;
        }

        upsertTeachers(result.teachers);
        showToast('Lehrer erfolgreich importiert', 'success');
      } else if (type === 'students') {
        upsertStudents(parseStudentsCSV(text));
        showToast('Schüler erfolgreich importiert', 'success');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  }, [upsertTeachers, upsertStudents, showToast, subjects]);

  const openEditor = (item: any = null) => {
    setEditingItem(item);
    setShowDeleteConfirm(false);
    setValidationError(null);
    if (item) {
      setFormData({ ...item });
    } else {
      const defaults: any = {
        teachers: { lastName: '', firstName: '', shortName: '', isPartTime: false, subjectIds: [] },
        students: { lastName: '', firstName: '' },
        rooms: { name: '', type: 'Prüfungsraum', requiredSupervisors: 1, isSupervisionStation: false },
        days: { date: new Date().toISOString().split('T')[0], label: `${days.length + 1}. Prüfungstag` },
        subjects: { name: '', shortName: '', isCombined: false }
      };
      setFormData(defaults[activeTab]);
    }
    setShowModal(true);
  };

  const validate = () => {
    if (activeTab === 'teachers') {
      if (!formData.lastName?.trim()) return 'Nachname fehlt.';
      if (!formData.firstName?.trim()) return 'Vorname fehlt.';
      if (!formData.shortName?.trim()) return 'Kürzel fehlt.';
    } else if (activeTab === 'students') {
      if (!formData.lastName?.trim()) return 'Nachname fehlt.';
      if (!formData.firstName?.trim()) return 'Vorname fehlt.';
    } else if (activeTab === 'rooms' && !formData.name?.trim()) return 'Raumnummer fehlt.';
    else if (activeTab === 'days' && (!formData.date || !formData.label?.trim())) return 'Datum oder Bezeichnung fehlt.';
    else if (activeTab === 'subjects') {
      if (!formData.name?.trim()) return 'Fachbezeichnung fehlt.';
      if (!formData.shortName?.trim()) return 'Fachkürzel fehlt.';
    }
    return null;
  };

  const save = () => {
    const error = validate();
    if (error) { setValidationError(error); return; }
    
    const name = displayNames[activeTab];
    if (activeTab === 'teachers') editingItem ? updateTeacher(formData) : addTeacher({ ...formData, id: `t-${Date.now()}` });
    else if (activeTab === 'students') editingItem ? updateStudent(formData) : addStudent({ ...formData, id: `s-${Date.now()}`, examIds: [] });
    else if (activeTab === 'rooms') editingItem ? updateRoom(formData) : addRoom({ ...formData, id: `r-${Date.now()}`, capacity: 1 });
    else if (activeTab === 'days') editingItem ? updateDay(formData) : addDay({ ...formData, id: `d-${Date.now()}` });
    else editingItem ? updateSubject(formData) : addSubject({ ...formData, id: `sub-${Date.now()}` });
    
    showToast(`${name} wurde erfolgreich ${editingItem ? 'aktualisiert' : 'gespeichert'}`, 'success');
    setShowModal(false);
  };

  const remove = () => {
    const id = editingItem.id;
    const name = displayNames[activeTab];
    if (isEntityInUse(activeTab.slice(0, -1) as any, id, exams, supervisions)) {
      setValidationError('Datensatz wird noch verwendet.');
      setShowDeleteConfirm(false);
      return;
    }
    setExitingId(id);
    setShowModal(false);
    setTimeout(() => {
      const deleteMap: any = { teachers: deleteTeacher, students: deleteStudent, rooms: deleteRoom, days: deleteDay, subjects: deleteSubject };
      deleteMap[activeTab](id);
      showToast(`${name} wurde gelöscht`, 'success');
      setExitingId(null);
    }, 800);
  };

  return {
    activeTab, setActiveTab,
    showModal, setShowModal,
    editingItem, openEditor,
    showDeleteConfirm, setShowDeleteConfirm,
    exitingId, formData, setFormData,
    validationError, sortedData, stats, handleFileUpload, save, remove
  };
};
