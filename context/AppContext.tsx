
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Teacher, Student, Room, Exam, Supervision, ExamDay, Subject } from '../types';
import * as db from '../store/db';
import { checkExamCollision, isEntityInUseInternal, calculateTeacherPoints } from '../utils/engine';

// --- LIVE CONFIG ---
const IS_DEV_MODE = false; 
// ------------------

export type ToastType = 'success' | 'error' | 'warning' | 'info';
interface Toast { message: string; type: ToastType; id: string; }

interface AppContextType {
  state: AppState;
  isLoading: boolean;
  unlock: (password: string) => Promise<boolean>;
  setMasterPassword: (password: string) => Promise<void>;
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
  toggleProtocolCollected: (examId: string) => void;
  addSupervision: (s: Supervision) => void;
  removeSupervision: (id: string) => void;
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number | null) => void;
  removeToast: (id: string) => void;
  checkCollision: (exam: Exam) => { hasConflict: boolean, reason?: string };
  isEntityInUse: (type: 'teacher' | 'student' | 'room' | 'day' | 'subject', id: string) => boolean;
  getTeacherStats: (teacherId: string) => { points: number };
  exportState: (password: string) => Promise<void>;
  importState: (file: File, password: string) => Promise<boolean>;
  resetForNewYear: () => void;
  factoryReset: () => void;
}

const dummySubjects: Subject[] = [];
const dummyTeachers: Teacher[] = [];
const dummyStudents: Student[] = [];
const dummyRooms: Room[] = [];
const dummyDays: ExamDay[] = [];

const initialState: AppState = {
  // Fix: Corrected dummy variable assignment to match Teacher[] type
  teachers: dummyTeachers, 
  students: dummyStudents, 
  rooms: dummyRooms, 
  days: dummyDays, 
  subjects: dummySubjects,
  exams: [], 
  supervisions: [], 
  collectedExamIds: [],
  isLocked: true, // FIX: Startet immer gesperrt für maximale Sicherheit
  masterPassword: null, 
  lastUpdate: Date.now(),
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sessionPassword = useRef<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const saved = await db.loadState();
        if (saved) {
          const shouldLock = !IS_DEV_MODE && (saved.isLocked || saved.masterPassword === 'SET');
          
          if (shouldLock) {
            setState(prev => ({ ...prev, isLocked: true, masterPassword: 'SET' }));
          } else {
            setState({ ...saved, isLocked: false, collectedExamIds: saved.collectedExamIds || [] });
          }
        } else {
          // Erster Start überhaupt
          setState(initialState);
        }
      } catch (err) {
        setState(initialState);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => { 
    if (!isLoading && !state.isLocked) {
      db.saveState(state, sessionPassword.current || undefined);
    } 
  }, [state, isLoading]);

  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number | null = 4000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { message, type, id }]);
    if (duration !== null) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);
  
  const unlock = useCallback(async (password: string) => {
    try {
      const decrypted = await db.loadState(password);
      if (decrypted) {
        sessionPassword.current = password;
        setState({ ...decrypted, isLocked: false, collectedExamIds: decrypted.collectedExamIds || [] });
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  }, []);

  const lock = useCallback(() => {
    sessionPassword.current = null;
    setState(prev => ({ ...prev, isLocked: true }));
  }, []);

  const setMasterPassword = useCallback(async (password: string) => {
    sessionPassword.current = password;
    setState(prev => ({ ...prev, masterPassword: 'SET', isLocked: false }));
    await db.saveState({ ...state, masterPassword: 'SET', isLocked: false }, password);
    showToast('Master-Passwort erfolgreich gesetzt', 'success');
  }, [state, showToast]);
  
  const isEntityInUse = useCallback((type: 'teacher' | 'student' | 'room' | 'day' | 'subject', id: string) => {
    const entity = (state as any)[type + 's']?.find((e: any) => e.id === id);
    const entityName = entity?.name || entity?.shortName;
    return isEntityInUseInternal(type, id, state.exams, state.supervisions, entityName, state.teachers);
  }, [state.exams, state.supervisions, state.teachers]);

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
  const deleteExam = useCallback((id: string) => setState(prev => ({ ...prev, exams: prev.exams.filter(e => e.id !== id), collectedExamIds: prev.collectedExamIds.filter(cid => cid !== id) })), []);

  const togglePresence = useCallback((id: string) => setState(prev => ({ ...prev, exams: prev.exams.map(e => e.id === id ? { ...e, isPresent: !e.isPresent } : e) })), []);
  const completeExam = useCallback((id: string) => setState(prev => ({ ...prev, exams: prev.exams.map(e => e.id === id ? { ...e, status: 'completed' } : e) })), []);

  const toggleProtocolCollected = useCallback((examId: string) => setState(prev => {
    const isCollected = prev.collectedExamIds.includes(examId);
    return {
      ...prev,
      collectedExamIds: isCollected 
        ? prev.collectedExamIds.filter(id => id !== examId) 
        : [...prev.collectedExamIds, examId]
    };
  }), []);

  const addSupervision = useCallback((s: Supervision) => setState(prev => ({ ...prev, supervisions: [...prev.supervisions, s] })), []);
  const removeSupervision = useCallback((id: string) => setState(prev => ({ ...prev, supervisions: prev.supervisions.filter(s => s.id !== id) })), []);

  const checkCollision = useCallback((exam: Exam) => checkExamCollision(exam, state.exams), [state.exams]);
  const getTeacherStats = useCallback((teacherId: string) => ({ points: calculateTeacherPoints(teacherId, state.exams, state.supervisions) }), [state.exams, state.supervisions]);

  const exportState = useCallback(async (password: string) => {
    try {
      const blob = await db.encryptForFile(state, password);
      const dataUri = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 10);
      const exportFileDefaultName = `LinexioAbi_Backup_${timestamp}.lxabi`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      URL.revokeObjectURL(dataUri);
      showToast('Daten verschlüsselt exportiert (.lxabi)', 'success');
    } catch (err) {
      showToast('Export fehlgeschlagen', 'error');
    }
  }, [state, showToast]);

  const importState = useCallback(async (file: File, password: string) => {
    try {
      const buffer = await file.arrayBuffer();
      const decrypted = await db.decryptFromFile(buffer, password);
      
      setState({ 
        ...decrypted, 
        isLocked: false, 
        lastUpdate: Date.now(), 
        collectedExamIds: decrypted.collectedExamIds || [] 
      });
      showToast('Backup erfolgreich eingespielt', 'success');
      return true;
    } catch (err) {
      if (err instanceof Error && err.message === 'WRONG_PASSWORD') {
        showToast('Backup-Passwort ist falsch', 'error');
      } else {
        showToast('Import fehlgeschlagen: Ungültige Datei', 'error');
      }
      return false;
    }
  }, [showToast]);

  const resetForNewYear = useCallback(() => {
    setState(prev => ({
      ...prev,
      teachers: [],
      students: [],
      rooms: [],
      days: [],
      exams: [],
      supervisions: [],
      collectedExamIds: [],
      lastUpdate: Date.now()
    }));
    showToast('Planung für neues Jahr vorbereitet', 'success');
  }, [showToast]);

  const factoryReset = useCallback(async () => {
    sessionPassword.current = null;
    await db.clearDatabase();
    setState({ ...initialState, lastUpdate: Date.now() });
    showToast('System vollständig zurückgesetzt', 'info');
  }, [showToast]);

  return (
    <AppContext.Provider value={{ 
      state, isLoading, unlock, setMasterPassword, lock,
      addTeacher, updateTeacher, deleteTeacher, upsertTeachers, 
      addStudent, updateStudent, deleteStudent, upsertStudents, 
      addRoom, updateRoom, deleteRoom, upsertRooms,
      addDay, updateDay, deleteDay,
      addSubject, updateSubject, deleteSubject,
      addExams, updateExam, deleteExam, togglePresence, completeExam,
      toggleProtocolCollected,
      addSupervision, removeSupervision,
      toasts, showToast, removeToast,
      checkCollision, isEntityInUse, getTeacherStats,
      exportState, importState, resetForNewYear, factoryReset
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
