
import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Teacher, Student, Room, ExamDay, Subject, RoomType } from '../types';
import { parseTeachersCSV, parseStudentsCSV } from '../utils/csvParser';

export type DataTab = 'teachers' | 'students' | 'rooms' | 'days' | 'subjects';

export const useData = () => {
  const { 
    state, upsertTeachers, upsertStudents, 
    addTeacher, updateTeacher, deleteTeacher,
    addStudent, updateStudent, deleteStudent,
    addRoom, updateRoom, deleteRoom,
    addDay, updateDay, deleteDay,
    addSubject, updateSubject, deleteSubject,
    isEntityInUse, showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<DataTab>('teachers');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const sortedData = useMemo(() => {
    const data = [...(state[activeTab] || [])];
    if (activeTab === 'teachers') return (data as Teacher[]).sort((a, b) => a.lastName.localeCompare(b.lastName, 'de'));
    if (activeTab === 'students') return (data as Student[]).sort((a, b) => a.lastName.localeCompare(b.lastName, 'de'));
    if (activeTab === 'rooms') return (data as Room[]).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (activeTab === 'days') return (data as ExamDay[]).sort((a, b) => a.date.localeCompare(b.date));
    return (data as Subject[]).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [state, activeTab]);

  const stats = useMemo(() => ({
    rooms: {
      exams: state.rooms.filter(r => r.type === 'Prüfungsraum').length,
      prep: state.rooms.filter(r => r.type === 'Vorbereitungsraum').length,
      waiting: state.rooms.filter(r => r.type === 'Warteraum').length
    },
    subjectsCount: state.subjects?.length || 0
  }), [state.rooms, state.subjects]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: DataTab) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (type === 'teachers') upsertTeachers(parseTeachersCSV(text));
      else if (type === 'students') upsertStudents(parseStudentsCSV(text));
      showToast('Daten erfolgreich importiert', 'success');
    };
    reader.readAsText(file);
    e.target.value = ''; 
  }, [upsertTeachers, upsertStudents, showToast]);

  const openEditor = (item: any = null) => {
    setEditingItem(item);
    setShowDeleteConfirm(false);
    setValidationError(null);
    if (item) {
      setFormData({ ...item });
    } else {
      const defaults: any = {
        teachers: { lastName: '', firstName: '', shortName: '', isPartTime: false },
        students: { lastName: '', firstName: '' },
        rooms: { name: '', type: 'Prüfungsraum' },
        days: { date: new Date().toISOString().split('T')[0], label: `${state.days.length + 1}. Prüfungstag` },
        subjects: { name: '' }
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
    else if (activeTab === 'subjects' && !formData.name?.trim()) return 'Fachbezeichnung fehlt.';
    return null;
  };

  const save = () => {
    const error = validate();
    if (error) { setValidationError(error); return; }
    
    if (activeTab === 'teachers') editingItem ? updateTeacher(formData) : addTeacher({ ...formData, id: `t-${Date.now()}` });
    else if (activeTab === 'students') editingItem ? updateStudent(formData) : addStudent({ ...formData, id: `s-${Date.now()}`, examIds: [] });
    else if (activeTab === 'rooms') editingItem ? updateRoom(formData) : addRoom({ ...formData, id: `r-${Date.now()}`, capacity: 1 });
    else if (activeTab === 'days') editingItem ? updateDay(formData) : addDay({ ...formData, id: `d-${Date.now()}` });
    else editingItem ? updateSubject(formData) : addSubject({ ...formData, id: `sub-${Date.now()}` });
    
    setShowModal(false);
  };

  const remove = () => {
    const id = editingItem.id;
    if (isEntityInUse(activeTab.slice(0, -1) as any, id)) {
      setValidationError('Datensatz wird noch in Prüfungen verwendet.');
      setShowDeleteConfirm(false);
      return;
    }
    setExitingId(id);
    setShowModal(false);
    setTimeout(() => {
      const deleteMap: any = { teachers: deleteTeacher, students: deleteStudent, rooms: deleteRoom, days: deleteDay, subjects: deleteSubject };
      deleteMap[activeTab](id);
      setExitingId(null);
    }, 800);
  };

  return {
    activeTab, setActiveTab,
    showModal, setShowModal,
    editingItem, openEditor,
    showDeleteConfirm, setShowDeleteConfirm,
    exitingId, formData, setFormData,
    validationError, setValidationError,
    sortedData, stats, handleFileUpload, save, remove
  };
};
