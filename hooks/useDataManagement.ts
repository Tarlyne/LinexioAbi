import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { useData as useDataContext } from '../context/DataContext';
import { Teacher, Student, Room, ExamDay, Subject, RoomType } from '../types';
import { parseTeachersCSV, parseStudentsCSV } from '../utils/csvParser';

export type DataTab = 'teachers' | 'students' | 'rooms' | 'days' | 'subjects';

/**
 * Zentraler Hook für die Verwaltung der Stammdaten-Ansicht und CRUD-Operationen.
 */
export const useDataManagement = () => {
  const {
    teachers,
    students,
    rooms,
    days,
    subjects,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    upsertTeachers,
    addStudent,
    updateStudent,
    deleteStudent,
    upsertStudents,
    addRoom,
    updateRoom,
    deleteRoom,
    addDay,
    updateDay,
    deleteDay,
    addSubject,
    updateSubject,
    deleteSubject,
    isEntityInUse,
  } = useDataContext();

  const { exams, supervisions, logAction } = useApp();
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
    subjects: 'Fach',
  };

  const sortedData = useMemo(() => {
    const sourceMap: Record<DataTab, any[]> = { teachers, students, rooms, days, subjects };
    const data = [...(sourceMap[activeTab] || [])];

    if (activeTab === 'teachers')
      return (data as Teacher[]).sort((a, b) => a.lastName.localeCompare(b.lastName, 'de'));
    if (activeTab === 'students')
      return (data as Student[]).sort((a, b) => a.lastName.localeCompare(b.lastName, 'de'));

    if (activeTab === 'rooms') {
      const typePriority: Record<RoomType, number> = {
        Prüfungsraum: 1,
        Vorbereitungsraum: 2,
        'Aufsicht-Station': 3,
        Warteraum: 4,
      };

      return (data as Room[]).sort((a, b) => {
        const pA = typePriority[a.type] || 99;
        const pB = typePriority[b.type] || 99;
        if (pA !== pB) return pA - pB;
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      });
    }

    if (activeTab === 'days')
      return (data as ExamDay[]).sort((a, b) => a.date.localeCompare(b.date));
    return (data as Subject[]).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [teachers, students, rooms, days, subjects, activeTab]);

  const stats = useMemo(
    () => ({
      rooms: {
        exams: rooms.filter((r) => r.type === 'Prüfungsraum').length,
        prep: rooms.filter((r) => r.type === 'Vorbereitungsraum').length,
        supervision: rooms.filter((r) => r.type === 'Aufsicht-Station').length,
        waiting: rooms.filter((r) => r.type === 'Warteraum').length,
      },
      subjectsCount: subjects?.length || 0,
    }),
    [rooms, subjects]
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, type: DataTab) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (type === 'teachers') {
          const result = parseTeachersCSV(text, subjects);
          if (result.skippedSubjects.length > 0) {
            // Geändert: Dritter Parameter null macht den Toast persistent bis zum manuellen Schließen (x)
            showToast(
              `Import abgebrochen! Unbekannte Fächer: ${result.skippedSubjects.join(', ')}`,
              'error',
              null
            );
            return;
          }
          upsertTeachers(result.teachers);
          logAction(
            'CSV Import: Lehrer',
            [`${result.teachers.length} Lehrkräfte importiert oder aktualisiert.`],
            'create'
          );
          showToast('Lehrer erfolgreich importiert', 'success');
        } else if (type === 'students') {
          const newStudents = parseStudentsCSV(text);
          upsertStudents(newStudents);
          logAction('CSV Import: Schüler', [`${newStudents.length} Schüler importiert.`], 'create');
          showToast('Schüler erfolgreich importiert', 'success');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [upsertTeachers, upsertStudents, showToast, subjects, logAction]
  );

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
        rooms: {
          name: '',
          type: 'Prüfungsraum',
          requiredSupervisors: 1,
          isSupervisionStation: false,
        },
        days: {
          date: new Date().toISOString().split('T')[0],
          label: `${days.length + 1}. Prüfungstag`,
        },
        subjects: { name: '', shortName: '', isCombined: false },
      };
      setFormData(defaults[activeTab]);
    }
    setShowModal(true);
  };

  const getDiffDetails = (old: any, next: any) => {
    const details: string[] = [];
    const fieldsToTrack: Record<string, string> = {
      lastName: 'Nachname',
      firstName: 'Vorname',
      shortName: 'Kürzel',
      name: 'Bezeichnung',
      type: 'Typ',
      date: 'Datum',
      label: 'Label',
    };

    Object.keys(fieldsToTrack).forEach((key) => {
      if (old[key] !== next[key] && (old[key] || next[key])) {
        details.push(`${fieldsToTrack[key]}: ${old[key] || '--'} -> ${next[key] || '--'}`);
      }
    });
    return details;
  };

  const save = () => {
    const error = validate();
    if (error) {
      setValidationError(error);
      return;
    }

    const label = displayNames[activeTab];
    const identifier = formData.lastName || formData.name || formData.label;

    if (editingItem) {
      const diff = getDiffDetails(editingItem, formData);
      const updateMap: any = {
        teachers: updateTeacher,
        students: updateStudent,
        rooms: updateRoom,
        days: updateDay,
        subjects: updateSubject,
      };
      updateMap[activeTab](formData);
      logAction(`${label} aktualisiert`, [`${identifier}`, ...diff], 'update');
    } else {
      const newId = `${activeTab[0]}-${Date.now()}`;
      const addMap: any = {
        teachers: () => addTeacher({ ...formData, id: newId }),
        students: () => addStudent({ ...formData, id: newId, examIds: [] }),
        rooms: () => addRoom({ ...formData, id: newId, capacity: 1 }),
        days: () => addDay({ ...formData, id: newId }),
        subjects: () => addSubject({ ...formData, id: newId }),
      };
      addMap[activeTab]();
      logAction(`${label} erstellt`, [`Eintrag: ${identifier}`], 'create');
    }

    showToast(`${label} wurde gespeichert`, 'success');
    setShowModal(false);
  };

  const remove = () => {
    const id = editingItem.id;
    const label = displayNames[activeTab];
    const identifier = editingItem.lastName || editingItem.name || editingItem.label;

    if (isEntityInUse(activeTab.slice(0, -1) as any, id, exams, supervisions)) {
      setValidationError('Datensatz wird noch verwendet.');
      setShowDeleteConfirm(false);
      return;
    }

    setExitingId(id);
    setShowModal(false);
    setTimeout(() => {
      const deleteMap: any = {
        teachers: deleteTeacher,
        students: deleteStudent,
        rooms: deleteRoom,
        days: deleteDay,
        subjects: deleteSubject,
      };
      deleteMap[activeTab](id);
      logAction(`${label} gelöscht`, [`Eintrag: ${identifier}`], 'delete');
      showToast(`${label} wurde gelöscht`, 'success');
      setExitingId(null);
    }, 800);
  };

  const validate = () => {
    if (activeTab === 'teachers') {
      if (!formData.lastName?.trim() || !formData.firstName?.trim() || !formData.shortName?.trim())
        return 'Pflichtfelder fehlen.';
      if (
        teachers.some(
          (t) =>
            t.shortName.toLowerCase() === formData.shortName.toLowerCase() &&
            t.id !== editingItem?.id
        )
      )
        return `Kürzel existiert bereits.`;
    } else if (activeTab === 'students') {
      if (!formData.lastName?.trim() || !formData.firstName?.trim()) return 'Name fehlt.';
    } else if (activeTab === 'rooms') {
      if (!formData.name?.trim()) return 'Raumname fehlt.';
    } else if (activeTab === 'days') {
      if (!formData.date || !formData.label?.trim()) return 'Datum/Label fehlt.';
    }
    return null;
  };

  return {
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
  };
};
