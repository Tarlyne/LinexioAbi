
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, Exam, Supervision } from '../types';
import * as db from '../store/db';
import { checkExamCollision, checkExamConsistency, calculateTeacherPoints } from '../utils/engine';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'amber';
interface Toast { message: string; type: ToastType; id: string; }

interface AppContextType {
  exams: Exam[];
  supervisions: Supervision[];
  collectedExamIds: string[];
  isLoading: boolean;
  loadDecryptedData: (data: any) => void;
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
  checkConsistency: (exam: Exam) => { hasWarning: boolean, reason?: string };
  getTeacherStats: (teacherId: string) => { points: number };
  exportState: (password: string) => Promise<void>;
  importState: (file: File, password: string) => Promise<boolean>;
  resetForNewYear: () => void;
  factoryReset: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLocked, settings, masterPassword } = useAuth();
  const { teachers, students, rooms, days, subjects, setDataFromLoad } = useData();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [supervisions, setSupervisions] = useState<Supervision[]>([]);
  const [collectedExamIds, setCollectedExamIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDecryptedData = useCallback((saved: any) => {
    if (saved) {
      setExams(saved.exams || []);
      setSupervisions(saved.supervisions || []);
      setCollectedExamIds(saved.collectedExamIds || []);
      setDataFromLoad(saved);
    }
  }, [setDataFromLoad]);

  useEffect(() => {
    const init = async () => {
      try {
        const saved = await db.loadState();
        if (saved && !saved.isLocked) {
          loadDecryptedData(saved);
        }
      } catch (e) {
        console.debug("Initialization skipped (encrypted)");
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const getFullState = useCallback((): AppState => ({
    teachers, students, rooms, days, subjects,
    exams, supervisions, collectedExamIds,
    isLocked, masterPassword, settings,
    lastUpdate: Date.now()
  }), [teachers, students, rooms, days, subjects, exams, supervisions, collectedExamIds, isLocked, masterPassword, settings]);

  useEffect(() => {
    if (!isLoading && !isLocked) {
      const timeout = setTimeout(() => {
        db.saveState(getFullState());
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, isLocked, getFullState]);

  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number | null = 4000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { message, type, id }]);
    if (duration !== null) setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  const addExams = useCallback((newList: Exam[]) => setExams(prev => [...prev, ...newList]), []);
  const updateExam = useCallback((exam: Exam) => setExams(prev => prev.map(e => e.id === exam.id ? exam : e)), []);
  const deleteExam = useCallback((id: string) => {
    setExams(prev => prev.filter(e => e.id !== id));
    setCollectedExamIds(prev => prev.filter(cid => cid !== id));
  }, []);

  const togglePresence = useCallback((id: string) => setExams(prev => prev.map(e => e.id === id ? { ...e, isPresent: !e.isPresent } : e)), []);
  const completeExam = useCallback((id: string) => setExams(prev => prev.map(e => e.id === id ? { ...e, status: 'completed' } : e)), []);

  const toggleProtocolCollected = useCallback((examId: string) => {
    setCollectedExamIds(prev => prev.includes(examId) ? prev.filter(id => id !== examId) : [...prev, examId]);
  }, []);

  const addSupervision = useCallback((s: Supervision) => setSupervisions(prev => [...prev, s]), []);
  const removeSupervision = useCallback((id: string) => setSupervisions(prev => prev.filter(s => s.id !== id)), []);

  const checkCollision = useCallback((exam: Exam) => checkExamCollision(exam, exams), [exams]);
  const checkConsistency = useCallback((exam: Exam) => checkExamConsistency(exam, exams), [exams]);
  const getTeacherStats = useCallback((tId: string) => ({ points: calculateTeacherPoints(tId, exams, supervisions) }), [exams, supervisions]);

  const exportState = useCallback(async (password: string) => {
    try {
      const blob = await db.encryptForFile(getFullState(), password);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LinexioAbi_Backup_${new Date().toISOString().slice(0,10)}.lxabi`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Daten verschlüsselt exportiert', 'success');
    } catch (err) { showToast('Export fehlgeschlagen', 'error'); }
  }, [getFullState, showToast]);

  const importState = useCallback(async (file: File, password: string) => {
    try {
      const buffer = await file.arrayBuffer();
      const decrypted = await db.decryptFromFile(buffer, password);
      loadDecryptedData(decrypted);
      showToast('Backup erfolgreich eingespielt', 'success');
      return true;
    } catch (err) {
      showToast('Import fehlgeschlagen', 'error');
      return false;
    }
  }, [loadDecryptedData, showToast]);

  const resetForNewYear = useCallback(() => {
    const minimalState = {
      subjects: subjects,
      exams: [],
      supervisions: [],
      collectedExamIds: [],
      teachers: [],
      students: [],
      rooms: [],
      days: []
    };
    loadDecryptedData(minimalState);
    showToast('Datenbank für neues Jahr bereinigt (Fächer & Passwort behalten)', 'success');
  }, [subjects, loadDecryptedData, showToast]);

  const factoryReset = useCallback(async () => {
    await db.clearDatabase();
    window.location.reload();
  }, []);

  const value = useMemo(() => ({
    exams, supervisions, collectedExamIds, isLoading, loadDecryptedData,
    addExams, updateExam, deleteExam, togglePresence, completeExam, toggleProtocolCollected,
    addSupervision, removeSupervision, toasts, showToast, removeToast,
    checkCollision, checkConsistency, getTeacherStats, exportState, importState, resetForNewYear, factoryReset
  }), [exams, supervisions, collectedExamIds, isLoading, loadDecryptedData, addExams, updateExam, deleteExam, togglePresence, completeExam, toggleProtocolCollected, addSupervision, removeSupervision, toasts, showToast, removeToast, checkCollision, checkConsistency, getTeacherStats, exportState, importState, resetForNewYear, factoryReset]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
