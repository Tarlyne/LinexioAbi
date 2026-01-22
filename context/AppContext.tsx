
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, Exam, Supervision, HistoryLog, Teacher, Student, Room, Subject, ExamDay } from '../types';
import * as db from '../store/db';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { useUI } from './UIContext';
import { calculateTeacherPoints, checkExamCollision, checkExamConsistency } from '../utils/engine';

interface AppContextType {
  exams: Exam[]; supervisions: Supervision[]; historyLogs: HistoryLog[]; collectedExamIds: string[]; isLoading: boolean;
  canUndo: boolean;
  lastUpdate: number;
  lastActionLabel?: string;
  undo: () => void;
  loadDecryptedData: (data: AppState) => void;
  logAction: (label: string, details?: string[], type?: HistoryLog['type']) => void;
  addExams: (exams: Exam[]) => void; updateExam: (exam: Exam) => void; deleteExam: (id: string) => void;
  togglePresence: (id: string) => void; completeExam: (id: string) => void; toggleProtocolCollected: (examId: string) => void;
  addSupervision: (s: Supervision) => void; 
  updateSupervision: (s: Supervision | Supervision[]) => void;
  removeSupervision: (id: string) => void;
  getTeacherStats: (id: string) => { points: number };
  exportState: (p: string) => Promise<void>; importState: (f: File, p: string) => Promise<boolean>;
  resetForNewYear: () => void; factoryReset: () => void; getFullState: () => AppState;
  checkCollision: (exam: Exam) => { hasConflict: boolean; reason?: string };
  checkConsistency: (exam: Exam) => { hasWarning: boolean; reason?: string };
  syncDefaultExams: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLocked, settings, masterPassword, persistEncrypted } = useAuth();
  const { teachers, students, rooms, days, subjects, setDataFromLoad, clearStammdaten } = useData();
  const { showToast } = useUI();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [supervisions, setSupervisions] = useState<Supervision[]>([]);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [collectedExamIds, setCollectedExamIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [lastActionLabel, setLastActionLabel] = useState<string | undefined>('System bereit');
  
  // Undo-History
  const [history, setHistory] = useState<{exams: Exam[], supervisions: Supervision[], lastActionLabel?: string}[]>([]);

  const loadDecryptedData = useCallback((saved: AppState) => {
    if (!saved) return;
    setExams(saved.exams || []);
    setSupervisions(saved.supervisions || []);
    setHistoryLogs(saved.historyLogs || []);
    setCollectedExamIds(saved.collectedExamIds || []);
    setLastUpdate(saved.lastUpdate || Date.now());
    setLastActionLabel(saved.lastActionLabel || 'Daten geladen');
    setDataFromLoad(saved);
    setHistory([]); 
  }, [setDataFromLoad]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const notifyChange = useCallback((label: string) => {
    setLastUpdate(Date.now());
    setLastActionLabel(label);
  }, []);

  const logAction = useCallback((label: string, details?: string[], type: HistoryLog['type'] = 'update') => {
    const newLog: HistoryLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      label,
      details,
      type
    };
    setHistoryLogs(prev => [newLog, ...prev].slice(0, 15));
    notifyChange(label);
  }, [notifyChange]);

  const saveSnapshot = useCallback(() => {
    setHistory(prev => {
      const newHistory = [{ exams: [...exams], supervisions: [...supervisions], lastActionLabel }, ...prev];
      return newHistory.slice(0, 5);
    });
  }, [exams, supervisions, lastActionLabel]);

  const syncDefaultExams = useCallback(() => {
    const newDrafts: Exam[] = [];
    students.forEach(student => {
      const hasAnyExam = exams.some(e => e.studentId === student.id);
      if (!hasAnyExam) {
        newDrafts.push({
          id: `e-draft-${student.id}-${Date.now()}`,
          studentId: student.id,
          teacherId: '',
          subject: '',
          status: 'backlog',
          startTime: 0
        });
      }
    });

    if (newDrafts.length > 0) {
      setExams(prev => [...prev, ...newDrafts]);
      logAction('Auto-Sync: Prüfungen', [`${newDrafts.length} Entwürfe für Schüler ohne Zuweisung erstellt.`], 'system');
    }
  }, [students, exams, logAction]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const [lastState, ...remaining] = history;
    setExams(lastState.exams);
    setSupervisions(lastState.supervisions);
    setLastActionLabel('Aktion rückgängig gemacht');
    setLastUpdate(Date.now());
    setHistory(remaining);
    logAction('Rückgängig', ['Letzte Aktion wurde vom Benutzer widerrufen.'], 'system');
    showToast('Aktion rückgängig gemacht', 'info');
  }, [history, showToast, logAction]);

  const getFullState = useCallback((): AppState => ({
    teachers, students, rooms, days, subjects, exams, supervisions, collectedExamIds,
    historyLogs, isLocked, masterPassword, settings, lastUpdate, lastActionLabel
  }), [teachers, students, rooms, days, subjects, exams, supervisions, collectedExamIds, historyLogs, isLocked, masterPassword, settings, lastUpdate, lastActionLabel]);

  const saveTimeoutRef = useRef<any>(null);
  useEffect(() => {
    if (!isLoading && !isLocked) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        persistEncrypted(getFullState());
      }, 1000);
    }
    return () => clearTimeout(saveTimeoutRef.current);
  }, [isLoading, isLocked, getFullState, persistEncrypted]);

  // Mutations
  const addExams = (newList: Exam[]) => {
    saveSnapshot();
    setExams(p => [...p, ...newList]);
    logAction(
      newList.length > 1 ? `${newList.length} Prüfungen hinzugefügt` : 'Prüfung hinzugefügt',
      newList.map(e => {
        const s = students.find(st => st.id === e.studentId);
        return `Neue Prüfung für: ${s?.lastName || 'Unbekannt'} (${e.subject || 'Nackte Prüfung'})`;
      }),
      'create'
    );
  };
  
  const updateExam = (exam: Exam) => {
    saveSnapshot();
    const old = exams.find(e => e.id === exam.id);
    const student = students.find(s => s.id === exam.studentId);
    
    const details: string[] = [];
    if (old) {
      if (old.teacherId !== exam.teacherId) details.push(`Prüfer geändert: ${teachers.find(t=>t.id===old.teacherId)?.shortName || '?'} -> ${teachers.find(t=>t.id===exam.teacherId)?.shortName || '?'}`);
      if (old.subject !== exam.subject) details.push(`Fach geändert: ${old.subject || '--'} -> ${exam.subject || '--'}`);
      if (old.chairId !== exam.chairId) details.push(`Vorsitz geändert: ${teachers.find(t=>t.id===old.chairId)?.shortName || '?'} -> ${teachers.find(t=>t.id===exam.chairId)?.shortName || '?'}`);
      if (old.protocolId !== exam.protocolId) details.push(`Protokollant geändert: ${teachers.find(t=>t.id===old.protocolId)?.shortName || '?'} -> ${teachers.find(t=>t.id===exam.protocolId)?.shortName || '?'}`);
      if (old.startTime !== exam.startTime) details.push(`Zeit/Tag verschoben`);
    }

    setExams(p => p.map(e => e.id === exam.id ? exam : e));
    logAction(`Prüfung aktualisiert (${student?.lastName})`, details, 'update');
  };
  
  const deleteExam = (id: string) => {
    saveSnapshot();
    const target = exams.find(e => e.id === id);
    const student = students.find(s => s.id === target?.studentId);
    setExams(p => p.filter(e => e.id !== id));
    logAction(`Prüfung gelöscht`, [`Prüfling: ${student?.lastName || '?'}, Fach: ${target?.subject || '?'}`], 'delete');
  };

  const togglePresence = (id: string) => {
    const target = exams.find(e => e.id === id);
    const student = students.find(s => s.id === target?.studentId);
    setExams(p => p.map(e => e.id === id ? { ...e, isPresent: !e.isPresent } : e));
    logAction(`Anwesenheit: ${student?.lastName}`, [!target?.isPresent ? 'Als anwesend markiert' : 'Als abwesend markiert']);
  };

  const completeExam = (id: string) => {
    const target = exams.find(e => e.id === id);
    const student = students.find(s => s.id === target?.studentId);
    setExams(p => p.map(e => e.id === id ? { ...e, status: 'completed' } : e));
    logAction(`Abschluss: ${student?.lastName}`, [`Prüfung im Fach ${target?.subject} wurde beendet.`]);
  };

  const toggleProtocolCollected = (id: string) => {
    const target = exams.find(e => e.id === id);
    const isNowCollected = !collectedExamIds.includes(id);
    setCollectedExamIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    logAction(`Protokoll-Abholung`, [`Raum ${rooms.find(r=>r.id===target?.roomId)?.name || '?'}: ${isNowCollected ? 'Abgeholt' : 'Wieder ausstehend'}`]);
  };

  const addSupervision = (s: Supervision) => {
    saveSnapshot();
    const teacher = teachers.find(t => t.id === s.teacherId);
    const station = rooms.find(r => r.id === s.stationId);
    setSupervisions(p => [...p, s]);
    logAction(`Aufsicht zugewiesen`, [`${teacher?.shortName} -> ${station?.name} um ${s.startTime}`], 'create');
  };

  const updateSupervision = (s: Supervision | Supervision[]) => {
    saveSnapshot();
    const updates = Array.isArray(s) ? s : [s];
    setSupervisions(p => p.map(curr => {
      const match = updates.find(u => u.id === curr.id);
      return match ? match : curr;
    }));
    logAction(`Aufsicht aktualisiert`, [`${updates.length} Eintrag/Einträge angepasst.`], 'update');
  };

  const removeSupervision = (id: string) => {
    saveSnapshot();
    const target = supervisions.find(s => s.id === id);
    const teacher = teachers.find(t => t.id === target?.teacherId);
    setSupervisions(p => p.filter(s => s.id !== id));
    logAction(`Aufsicht entfernt`, [`Einteilung für ${teacher?.shortName} gelöscht.`], 'delete');
  };

  const getTeacherStats = useCallback((id: string) => ({
    points: calculateTeacherPoints(id, exams, supervisions)
  }), [exams, supervisions]);

  const checkCollision = useCallback((exam: Exam) => checkExamCollision(exam, exams), [exams]);
  const checkConsistency = useCallback((exam: Exam) => checkExamConsistency(exam, exams), [exams]);

  const exportState = useCallback(async (p: string) => {
    try {
      const blob = await db.encryptForFile(getFullState(), p);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `LinexioAbi_Backup_${new Date().toISOString().slice(0,10)}.lxabi`;
      link.click();
      logAction('Export durchgeführt', ['Backup-Datei wurde erstellt.'], 'system');
      showToast('Exportiert', 'success');
    } catch (e) { showToast('Fehler', 'error'); }
  }, [getFullState, showToast, logAction]);

  const importState = useCallback(async (f: File, p: string) => {
    try {
      const dec = await db.decryptFromFile(await f.arrayBuffer(), p);
      loadDecryptedData(dec);
      logAction('Import durchgeführt', ['Daten aus Backup-Datei wiederhergestellt.'], 'system');
      showToast('Importiert', 'success');
      return true;
    } catch (e) { showToast('Falsches Passwort', 'error'); return false; }
  }, [loadDecryptedData, showToast, logAction]);

  const value = useMemo(() => ({
    exams, supervisions, historyLogs, collectedExamIds, isLoading, lastUpdate, lastActionLabel,
    canUndo: history.length > 0,
    undo,
    loadDecryptedData,
    logAction,
    addExams, updateExam, deleteExam, togglePresence, completeExam, toggleProtocolCollected,
    addSupervision, updateSupervision, removeSupervision, getTeacherStats, exportState, importState, getFullState,
    checkCollision, checkConsistency,
    syncDefaultExams,
    resetForNewYear: () => { 
      clearStammdaten();
      setExams([]); 
      setSupervisions([]); 
      setCollectedExamIds([]); 
      setHistory([]);
      setHistoryLogs([]);
      logAction('System bereinigt', ['Alle Daten für ein neues Schuljahr zurückgesetzt.'], 'system');
      showToast('System bereinigt', 'success'); 
    },
    factoryReset: async () => { await db.clearDatabase(); window.location.reload(); }
  }), [exams, supervisions, historyLogs, collectedExamIds, isLoading, lastUpdate, lastActionLabel, history.length, undo, loadDecryptedData, logAction, showToast, getFullState, getTeacherStats, exportState, importState, clearStammdaten, checkCollision, checkConsistency, syncDefaultExams, updateSupervision]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const c = useContext(AppContext);
  if (!c) throw new Error('useApp missing');
  return c;
};
