
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, Teacher, Student, Room, Exam, Supervision, ExamDay, Subject } from '../types';
import * as db from '../store/db';
import { checkExamCollision, isEntityInUseInternal, calculateTeacherPoints } from '../utils/engine';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
interface Toast { message: string; type: ToastType; id: string; }

interface AppContextType {
  state: AppState;
  isLoading: boolean;
  unlock: (password: string) => boolean;
  setMasterPassword: (password: string) => void;
  lock: () => void;
  addTeacher: (t: Teacher) => void;
  updateTeacher: (t: Teacher) => void;
  deleteTeacher: (id: string) => void;
  upsertTeachers: (teachers: Teacher[]) => void;
  addStudent: (s: Student) => void;
  updateStudent: (s: Student) => void;
  deleteStudent: (id: string) => void;
  upsertStudents: (students: Student[]) => void;
  addRoom: (r: Room) => void;
  updateRoom: (r: Room) => void;
  deleteRoom: (id: string) => void;
  upsertRooms: (rooms: Room[]) => void;
  addDay: (d: ExamDay) => void;
  updateDay: (d: ExamDay) => void;
  deleteDay: (id: string) => void;
  addSubject: (s: Subject) => void;
  updateSubject: (s: Subject) => void;
  deleteSubject: (id: string) => void;
  addExams: (exams: Exam[]) => void;
  updateExam: (exam: Exam) => void;
  deleteExam: (id: string) => void;
  togglePresence: (id: string) => void;
  completeExam: (id: string) => void;
  addSupervision: (s: Supervision) => void;
  removeSupervision: (id: string) => void;
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  checkCollision: (exam: Exam) => { hasConflict: boolean, reason?: string };
  isEntityInUse: (type: 'teacher' | 'student' | 'room' | 'day' | 'subject', id: string) => boolean;
  getTeacherStats: (teacherId: string) => { points: number };
}

const dummySubjects: Subject[] = [
  { id: 'sub1', name: 'Deutsch' },
  { id: 'sub2', name: 'Mathematik' },
  { id: 'sub3', name: 'Englisch' },
  { id: 'sub4', name: 'Biologie' },
  { id: 'sub5', name: 'Physik' },
  { id: 'sub6', name: 'Chemie' },
  { id: 'sub7', name: 'Geschichte' },
  { id: 'sub10', name: 'Kunst' },
  { id: 'sub11', name: 'Musik' },
  { id: 'sub12', name: 'Sport' },
  { id: 'sub13', name: 'Informatik' },
  { id: 'sub14', name: 'Religion' },
  { id: 'sub15', name: 'Philosophie' },
  { id: 'sub16', name: 'Sozialkunde' },
  { id: 'sub17', name: 'Latein' },
  { id: 'sub18', name: 'Französisch' },
];

const dummyTeachers: Teacher[] = [
  { id: 't1', firstName: 'Max', lastName: 'Mustermann', shortName: 'MUS', isPartTime: false },
  { id: 't2', firstName: 'Erika', lastName: 'Schmidt', shortName: 'SMI', isPartTime: true },
  { id: 't3', firstName: 'Karl', lastName: 'Müller', shortName: 'MUE', isPartTime: false },
  { id: 't4', firstName: 'Sabine', lastName: 'Fischer', shortName: 'FIS', isPartTime: false },
  { id: 't5', firstName: 'Hans', lastName: 'Weber', shortName: 'WEB', isPartTime: true },
  { id: 't6', firstName: 'Julia', lastName: 'Meyer', shortName: 'MEY', isPartTime: false },
  { id: 't7', firstName: 'Peter', lastName: 'Wagner', shortName: 'WAG', isPartTime: false },
  { id: 't8', firstName: 'Monika', lastName: 'Becker', shortName: 'BEC', isPartTime: true },
  { id: 't9', firstName: 'Thomas', lastName: 'Schulz', shortName: 'SLZ', isPartTime: false },
  { id: 't10', firstName: 'Petra', lastName: 'Hoffmann', shortName: 'HOF', isPartTime: false },
];

const dummyStudents: Student[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `s${i+1}`,
  firstName: `Schüler${i+1}`,
  lastName: `Abiturient${i+1}`,
  examIds: []
}));

const dummyRooms: Room[] = [
  { id: 'r303', name: 'R303', type: 'Prüfungsraum', capacity: 1, isSupervisionStation: false, requiredSupervisors: 1 },
  { id: 'r304', name: 'R304', type: 'Prüfungsraum', capacity: 1, isSupervisionStation: false, requiredSupervisors: 1 },
  { id: 'r305', name: 'R305', type: 'Prüfungsraum', capacity: 1, isSupervisionStation: false, requiredSupervisors: 1 },
  { id: 'r306', name: 'R306', type: 'Prüfungsraum', capacity: 1, isSupervisionStation: false, requiredSupervisors: 1 },
  { id: 'r307', name: 'R307', type: 'Prüfungsraum', capacity: 1, isSupervisionStation: false, requiredSupervisors: 1 },
  { id: 'r301', name: 'R301 (Warteraum)', type: 'Warteraum', capacity: 30, isSupervisionStation: true, requiredSupervisors: 2 },
  { id: 'r318', name: 'R318 (Vorb.)', type: 'Vorbereitungsraum', capacity: 1, isSupervisionStation: true, requiredSupervisors: 1 },
  { id: 'r320', name: 'R320 (Vorb.)', type: 'Vorbereitungsraum', capacity: 1, isSupervisionStation: true, requiredSupervisors: 1 },
  { id: 'taxi', name: 'Taxi', type: 'Aufsicht-Station', capacity: 5, isSupervisionStation: true, requiredSupervisors: 5 },
  { id: 'rz', name: 'Rechenzentrum', type: 'Aufsicht-Station', capacity: 2, isSupervisionStation: true, requiredSupervisors: 2 },
];

const dummyDays: ExamDay[] = [
  { id: 'd1', date: '2026-01-06', label: '1. Prüfungstag' },
  { id: 'd2', date: '2026-01-07', label: '2. Prüfungstag' },
  { id: 'd3', date: '2026-01-08', label: '3. Prüfungstag' },
];

const initialState: AppState = {
  teachers: dummyTeachers, 
  students: dummyStudents, 
  rooms: dummyRooms, 
  days: dummyDays, 
  subjects: dummySubjects,
  exams: [], 
  supervisions: [],
  isLocked: false, masterPassword: null, lastUpdate: Date.now(),
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const init = async () => {
      const saved = await db.loadState();
      if (saved && saved.teachers && saved.teachers.length > 0) {
        // Migration: Wenn Subjects noch nicht existieren, Dummys laden
        const finalState = { ...saved, isLocked: false };
        if (!finalState.subjects || finalState.subjects.length === 0) {
          finalState.subjects = dummySubjects;
        }
        setState(finalState);
      } else {
        setState(initialState);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => { if (!isLoading) db.saveState(state); }, [state, isLoading]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { message, type, id }]);
    setTimeout(() => removeToast(id), 4000);
  }, []);

  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  const unlock = useCallback((password: string) => {
    if (!state.masterPassword || password === state.masterPassword) {
      setState(prev => ({ ...prev, isLocked: false }));
      return true;
    }
    return false;
  }, [state.masterPassword]);

  const lock = useCallback(() => setState(prev => ({ ...prev, isLocked: true })), []);
  const setMasterPassword = useCallback((password: string) => setState(prev => ({ ...prev, masterPassword: password })), []);
  const isEntityInUse = useCallback((type: 'teacher' | 'student' | 'room' | 'day' | 'subject', id: string) => {
    const entity = (state as any)[type + 's']?.find((e: any) => e.id === id);
    const entityName = entity?.name || entity?.shortName;
    return isEntityInUseInternal(type, id, state.exams, state.supervisions, entityName);
  }, [state.exams, state.supervisions, state.teachers, state.students, state.rooms, state.subjects, state.days]);

  const addTeacher = useCallback((t: Teacher) => setState(prev => ({ ...prev, teachers: [...prev.teachers, t] })), []);
  const updateTeacher = useCallback((t: Teacher) => setState(prev => ({ ...prev, teachers: prev.teachers.map(curr => curr.id === t.id ? t : curr) })), []);
  const deleteTeacher = useCallback((id: string) => !isEntityInUse('teacher', id) && setState(prev => ({ ...prev, teachers: prev.teachers.filter(t => t.id !== id) })), [isEntityInUse]);
  const upsertTeachers = useCallback((newTeachers: Teacher[]) => setState(prev => {
    const map = new Map<string, Teacher>(prev.teachers.map(t => [t.shortName, t]));
    newTeachers.forEach(t => map.set(t.shortName, { ...t, id: map.get(t.shortName)?.id || t.id }));
    return { ...prev, teachers: Array.from(map.values()) };
  }), []);

  const addStudent = useCallback((s: Student) => setState(prev => ({ ...prev, students: [...prev.students, s] })), []);
  const updateStudent = useCallback((s: Student) => setState(prev => ({ ...prev, students: prev.students.map(curr => curr.id === s.id ? s : curr) })), []);
  const deleteStudent = useCallback((id: string) => !isEntityInUse('student', id) && setState(prev => ({ ...prev, students: prev.students.filter(s => s.id !== id) })), [isEntityInUse]);
  const upsertStudents = useCallback((newStudents: Student[]) => setState(prev => {
    const map = new Map<string, Student>(prev.students.map(s => [`${s.lastName}-${s.firstName}`, s]));
    newStudents.forEach(s => {
      const key = `${s.lastName}-${s.firstName}`;
      map.set(key, { ...s, id: map.get(key)?.id || s.id });
    });
    return { ...prev, students: Array.from(map.values()) };
  }), []);

  const addRoom = useCallback((r: Room) => setState(prev => ({ ...prev, rooms: [...prev.rooms, r] })), []);
  const updateRoom = useCallback((r: Room) => setState(prev => ({ ...prev, rooms: prev.rooms.map(curr => curr.id === r.id ? r : curr) })), []);
  const deleteRoom = useCallback((id: string) => !isEntityInUse('room', id) && setState(prev => ({ ...prev, rooms: prev.rooms.filter(r => r.id !== id) })), [isEntityInUse]);
  const upsertRooms = useCallback((newRooms: Room[]) => setState(prev => {
    const map = new Map<string, Room>(prev.rooms.map(r => [r.name, r]));
    newRooms.forEach(r => map.set(r.name, { ...r, id: map.get(r.name)?.id || r.id }));
    return { ...prev, rooms: Array.from(map.values()) };
  }), []);

  const addDay = useCallback((d: ExamDay) => setState(prev => ({ ...prev, days: [...prev.days, d].sort((a, b) => a.date.localeCompare(b.date)) })), []);
  const updateDay = useCallback((d: ExamDay) => setState(prev => ({ ...prev, days: prev.days.map(curr => curr.id === d.id ? d : curr).sort((a, b) => a.date.localeCompare(b.date)) })), []);
  const deleteDay = useCallback((id: string) => !isEntityInUse('day', id) && setState(prev => ({ ...prev, days: prev.days.filter(d => d.id !== id) })), [isEntityInUse]);

  const addSubject = useCallback((s: Subject) => setState(prev => ({ ...prev, subjects: [...prev.subjects, s].sort((a,b) => a.name.localeCompare(b.name, 'de')) })), []);
  const updateSubject = useCallback((s: Subject) => setState(prev => ({ ...prev, subjects: prev.subjects.map(curr => curr.id === s.id ? s : curr).sort((a,b) => a.name.localeCompare(b.name, 'de')) })), []);
  const deleteSubject = useCallback((id: string) => !isEntityInUse('subject', id) && setState(prev => ({ ...prev, subjects: prev.subjects.filter(s => s.id !== id) })), [isEntityInUse]);

  const addExams = useCallback((exams: Exam[]) => setState(prev => ({ ...prev, exams: [...prev.exams, ...exams] })), []);
  const updateExam = useCallback((exam: Exam) => setState(prev => ({ ...prev, exams: prev.exams.map(e => e.id === exam.id ? exam : e) })), []);
  const deleteExam = useCallback((id: string) => setState(prev => ({ ...prev, exams: prev.exams.filter(e => e.id !== id) })), []);

  const togglePresence = useCallback((id: string) => setState(prev => ({ ...prev, exams: prev.exams.map(e => e.id === id ? { ...e, isPresent: !e.isPresent } : e) })), []);
  const completeExam = useCallback((id: string) => {
    setState(prev => ({ ...prev, exams: prev.exams.map(e => e.id === id ? { ...e, status: 'completed' } : e) }));
    showToast('Prüfung abgeschlossen', 'success');
  }, [showToast]);

  const addSupervision = useCallback((s: Supervision) => setState(prev => ({ ...prev, supervisions: [...prev.supervisions, s] })), []);
  const removeSupervision = useCallback((id: string) => setState(prev => ({ ...prev, supervisions: prev.supervisions.filter(s => s.id !== id) })), []);

  const checkCollision = useCallback((exam: Exam) => checkExamCollision(exam, state.exams), [state.exams]);
  const getTeacherStats = useCallback((teacherId: string) => ({ points: calculateTeacherPoints(teacherId, state.exams, state.supervisions) }), [state.exams, state.supervisions]);

  return (
    <AppContext.Provider value={{ 
      state, isLoading, unlock, setMasterPassword, lock,
      addTeacher, updateTeacher, deleteTeacher, upsertTeachers, 
      addStudent, updateStudent, deleteStudent, upsertStudents, 
      addRoom, updateRoom, deleteRoom, upsertRooms,
      addDay, updateDay, deleteDay,
      addSubject, updateSubject, deleteSubject,
      addExams, updateExam, deleteExam, togglePresence, completeExam,
      addSupervision, removeSupervision,
      toasts, showToast, removeToast,
      checkCollision, isEntityInUse, getTeacherStats
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
