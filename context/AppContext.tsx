import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  AppState,
  Exam,
  Supervision,
  HistoryLog,
  Teacher,
  Student,
  Room,
  Subject,
  ExamDay,
} from '../types';
import * as db from '../store/db';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { useUI } from './UIContext';
import { calculateTeacherPoints, checkExamCollision, checkExamConsistency } from '../utils/engine';
import { AppStateSchema } from '../schemas/validation';
import { useAppStore } from '../store/appStore';

interface AppContextType {
  exams: Exam[];
  supervisions: Supervision[];
  historyLogs: HistoryLog[];
  collectedExamIds: string[];
  isLoading: boolean;
  canUndo: boolean;
  lastUpdate: number;
  lastActionLabel?: string;
  undo: () => void;
  loadDecryptedData: (data: AppState) => void;
  logAction: (label: string, details?: string[], type?: HistoryLog['type']) => void;
  addExams: (exams: Exam[]) => void;
  updateExam: (exam: Exam) => void;
  deleteExam: (id: string) => void;
  togglePresence: (id: string) => void;
  completeExam: (id: string) => void;
  toggleProtocolCollected: (examId: string) => void;
  addSupervision: (s: Supervision) => void;
  updateSupervision: (s: Supervision | Supervision[]) => void;
  removeSupervision: (id: string) => void;
  getTeacherStats: (id: string) => { points: number };
  exportState: (p: string) => Promise<void>;
  importState: (f: File, p: string) => Promise<boolean>;
  resetForNewYear: () => void;
  factoryReset: () => void;
  getFullState: () => AppState;
  checkCollision: (exam: Exam) => { hasConflict: boolean; reason?: string };
  checkConsistency: (exam: Exam) => { hasWarning: boolean; reason?: string };
  syncDefaultExams: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLocked, settings, masterPassword, persistEncrypted } = useAuth();
  const { teachers, students, rooms, days, subjects, setDataFromLoad, clearStammdaten } = useData();
  const { showToast } = useUI();

  // Connect to Zustand Store
  const store = useAppStore();

  // Load initial data logic - bridged to store
  const loadDecryptedData = useCallback((saved: AppState) => {
    store.setLoadedData(saved);
    setDataFromLoad(saved);
  }, [store, setDataFromLoad]);

  // Autosave Logic (Listens to store changes via React render cycle for now)
  const saveTimeoutRef = useRef<any>(null);

  // We explicitly select state for the autosave dependency to avoid loops? 
  // Actually, using the full store object in dependency is fine as long as we use the properties.
  // But strictly, we should probably select what we need. 
  // For the Context Provider value, we pass the current store state.

  const getFullState = useCallback((): AppState => ({
    teachers, students, rooms, days, subjects,
    exams: store.exams,
    supervisions: store.supervisions,
    collectedExamIds: store.collectedExamIds,
    historyLogs: store.historyLogs,
    isLocked, masterPassword, settings,
    lastUpdate: store.lastUpdate,
    lastActionLabel: store.lastActionLabel
  }), [teachers, students, rooms, days, subjects, store, isLocked, masterPassword, settings]);

  useEffect(() => {
    if (!store.isLoading && !isLocked) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        persistEncrypted(getFullState());
      }, 1000);
    }
    return () => clearTimeout(saveTimeoutRef.current);
  }, [store.exams, store.supervisions, store.historyLogs, store.collectedExamIds, isLocked, getFullState, persistEncrypted]);

  // Mapping Actions to Context API (The Bridge)
  const addExams = (list: Exam[]) => store.addExams(list, students);
  const updateExam = (e: Exam) => store.updateExam(e, students, teachers);
  const deleteExam = (id: string) => store.deleteExam(id, students);
  const togglePresence = (id: string) => store.togglePresence(id, students);
  const completeExam = (id: string) => store.completeExam(id, students);
  const toggleProtocolCollected = (id: string) => store.toggleProtocolCollected(id, rooms);

  const addSupervision = (s: Supervision) => store.addSupervision(s, teachers, rooms);
  const updateSupervision = (s: Supervision | Supervision[]) => store.updateSupervision(s);
  const removeSupervision = (id: string) => store.removeSupervision(id, teachers);

  const syncDefaultExams = () => store.sysSyncDefaultExams(students);

  const resetForNewYear = () => {
    clearStammdaten();
    store.resetForNewYear();
    showToast('System bereinigt', 'success');
  };

  const factoryReset = async () => {
    await db.clearDatabase();
    window.location.reload();
  };

  const getTeacherStats = useCallback((id: string) => ({
    points: calculateTeacherPoints(id, store.exams, store.supervisions)
  }), [store.exams, store.supervisions]);

  const checkCollision = useCallback((exam: Exam) => checkExamCollision(exam, store.exams), [store.exams]);
  const checkConsistency = useCallback((exam: Exam) => checkExamConsistency(exam, store.exams), [store.exams]);

  const exportState = useCallback(async (p: string) => {
    try {
      const blob = await db.encryptForFile(getFullState(), p);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `LinexioAbi_Backup_${new Date().toISOString().slice(0, 10)}.lxabi`;
      link.click();
      store._log('Export durchgeführt', ['Backup-Datei wurde erstellt.'], 'system');
      showToast('Exportiert', 'success');
    } catch (e) {
      showToast('Fehler', 'error');
    }
  }, [getFullState, showToast, store]);

  const importState = useCallback(async (f: File, p: string) => {
    try {
      const dec = await db.decryptFromFile(await f.arrayBuffer(), p);
      loadDecryptedData(dec);
      store._log('Import durchgeführt', ['Daten aus Backup-Datei wiederhergestellt.'], 'system');
      showToast('Importiert', 'success');
      return true;
    } catch (e) {
      showToast('Falsches Passwort', 'error');
      return false;
    }
  }, [loadDecryptedData, showToast, store]);

  const value = useMemo(() => ({
    exams: store.exams,
    supervisions: store.supervisions,
    historyLogs: store.historyLogs,
    collectedExamIds: store.collectedExamIds,
    isLoading: store.isLoading,
    lastUpdate: store.lastUpdate,
    lastActionLabel: store.lastActionLabel,
    canUndo: store.history.length > 0,
    undo: store.undo,
    loadDecryptedData,
    logAction: store._log,
    addExams, updateExam, deleteExam, togglePresence, completeExam, toggleProtocolCollected,
    addSupervision, updateSupervision, removeSupervision,
    getTeacherStats, exportState, importState, getFullState,
    checkCollision, checkConsistency,
    syncDefaultExams,
    resetForNewYear, factoryReset
  }), [store, teachers, students, rooms, days, subjects, isLocked]);
  // ^ Depending on 'store' object causes re-renders on any store change, mimicking old behavior (Correct for compatibility)

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const c = useContext(AppContext);
  if (!c) throw new Error('useApp missing');
  return c;
};
