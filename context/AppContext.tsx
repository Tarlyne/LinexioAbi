
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AppState, Exam, Supervision } from '../types';
import * as db from '../store/db';
import { checkExamCollision, checkExamConsistency, calculateTeacherPoints } from '../utils/engine';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { useUI } from './UIContext';

interface AppContextType {
  exams: Exam[];
  supervisions: Supervision[];
  collectedExamIds: string[];
  isLoading: boolean;
  loadDecryptedData: (data: AppState) => void;
  addExams: (exams: Exam[]) => void;
  updateExam: (exam: Exam) => void;
  deleteExam: (id: string) => void;
  togglePresence: (id: string) => void;
  completeExam: (id: string) => void;
  toggleProtocolCollected: (examId: string) => void;
  addSupervision: (s: Supervision) => void;
  removeSupervision: (id: string) => void;
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
  const { showToast } = useUI();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [supervisions, setSupervisions] = useState<Supervision[]>([]);
  const [collectedExamIds, setCollectedExamIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDecryptedData = useCallback((saved: AppState) => {
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
        // FIXED: Using property check 'teachers' in saved to correctly identify AppState in union and avoid unsafe cast
        if (saved && 'teachers' in saved) {
          loadDecryptedData(saved);
        }
      } catch (e) {
        console.debug("Initialization skipped (encrypted)");
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [loadDecryptedData]);

  /**
   * CENTRAL VALIDATION GUARD (Kategorie A)
   * Prüft den State auf strukturelle Integrität, bevor er persistent gespeichert wird.
   */
  const validateStateInvariants = useCallback((state: AppState): boolean => {
    try {
      // 1. Verwaiste IDs in Prüfungen prüfen
      for (const exam of state.exams) {
        const studentExists = state.students.some(s => s.id === exam.studentId);
        const teacherExists = state.teachers.some(t => t.id === exam.teacherId);
        if (!studentExists || !teacherExists) {
          console.error("Invariant Violation: Exam with missing student/teacher", exam);
          return false;
        }
        if (exam.roomId && !state.rooms.some(r => r.id === exam.roomId)) return false;
      }

      // 2. Verwaiste IDs in Aufsichten prüfen
      for (const sup of state.supervisions) {
        if (!state.teachers.some(t => t.id === sup.teacherId) || !state.rooms.some(r => r.id === sup.stationId)) {
          console.error("Invariant Violation: Supervision with missing teacher/station", sup);
          return false;
        }
      }

      // 3. Typ-Sanity-Check
      if (!Array.isArray(state.teachers) || !Array.isArray(state.students)) return false;
      
      return true;
    } catch (err) {
      console.error("Validation Guard Crashed:", err);
      return false;
    }
  }, []);

  const getFullState = useCallback((): AppState => ({
    teachers, students, rooms, days, subjects,
    exams, supervisions, collectedExamIds,
    isLocked, masterPassword, settings,
    lastUpdate: Date.now()
  }), [teachers, students, rooms, days, subjects, exams, supervisions, collectedExamIds, isLocked, masterPassword, settings]);

  useEffect(() => {
    if (!isLoading && !isLocked) {
      const state = getFullState();
      if (validateStateInvariants(state)) {
        const timeout = setTimeout(() => {
          db.saveState(state);
        }, 500);
        return () => clearTimeout(timeout);
      } else {
        console.warn("Save suppressed due to state inconsistency.");
      }
    }
  }, [isLoading, isLocked, getFullState, validateStateInvariants]);

  const addExams = useCallback((newList: Exam[]) => {
    const isValid = newList.every(e => 
      students.some(s => s.id === e.studentId) && 
      teachers.some(t => t.id === e.teacherId)
    );
    
    if (!isValid) {
      showToast("Import abgebrochen: Unbekannte IDs im Datensatz.", "error");
      return;
    }
    setExams(prev => [...prev, ...newList]);
  }, [students, teachers, showToast]);

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
    const minimalState: AppState = {
      subjects: subjects,
      exams: [],
      supervisions: [],
      collectedExamIds: [],
      teachers: [],
      students: [],
      rooms: [],
      days: [],
      isLocked: false,
      masterPassword: masterPassword,
      settings: settings,
      lastUpdate: Date.now()
    };
    loadDecryptedData(minimalState);
    showToast('Datenbank für neues Jahr bereinigt (Fächer & Passwort behalten)', 'success');
  }, [subjects, loadDecryptedData, showToast, masterPassword, settings]);

  const factoryReset = useCallback(async () => {
    await db.clearDatabase();
    window.location.reload();
  }, []);

  const value = useMemo(() => ({
    exams, supervisions, collectedExamIds, isLoading, loadDecryptedData,
    addExams, updateExam, deleteExam, togglePresence, completeExam, toggleProtocolCollected,
    addSupervision, removeSupervision,
    checkCollision, checkConsistency, getTeacherStats, exportState, importState, resetForNewYear, factoryReset
  }), [exams, supervisions, collectedExamIds, isLoading, loadDecryptedData, addExams, updateExam, deleteExam, togglePresence, completeExam, toggleProtocolCollected, addSupervision, removeSupervision, checkCollision, checkConsistency, getTeacherStats, exportState, importState, resetForNewYear, factoryReset]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
