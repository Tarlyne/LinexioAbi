import { create } from 'zustand';
import {
    AppState, Exam, Supervision, HistoryLog,
    Teacher, Student, Room, Subject, ExamDay
} from '../types';
import { calculateTeacherPoints, checkExamCollision, checkExamConsistency } from '../utils/engine';
import { AppStateSchema } from '../schemas/validation';

export interface AppStore {
    // State
    exams: Exam[];
    supervisions: Supervision[];
    historyLogs: HistoryLog[];
    collectedExamIds: string[];
    isLoading: boolean;
    lastUpdate: number;
    lastActionLabel?: string;
    history: { exams: Exam[]; supervisions: Supervision[]; lastActionLabel?: string }[];

    // Actions
    setLoadedData: (data: AppState) => void;
    resetForNewYear: () => void;

    // Mutations
    addExams: (exams: Exam[], studentsLookup: Student[]) => void;
    updateExam: (exam: Exam, studentsLookup: Student[], teachersLookup: Teacher[]) => void;
    deleteExam: (id: string, studentsLookup: Student[]) => void;
    togglePresence: (id: string, studentsLookup: Student[]) => void;
    completeExam: (id: string, studentsLookup: Student[]) => void;
    toggleProtocolCollected: (id: string, roomsLookup: Room[]) => void;

    addSupervision: (s: Supervision, teachersLookup: Teacher[], roomsLookup: Room[]) => void;
    updateSupervision: (s: Supervision | Supervision[]) => void;
    removeSupervision: (id: string, teachersLookup: Teacher[]) => void;

    sysSyncDefaultExams: (students: Student[]) => void;
    undo: () => void;

    // Internal Helpers
    _log: (label: string, details?: string[], type?: HistoryLog['type']) => void;
    _snapshot: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
    exams: [],
    supervisions: [],
    historyLogs: [],
    collectedExamIds: [],
    isLoading: false,
    lastUpdate: Date.now(),
    lastActionLabel: 'Einen Moment...',
    history: [],

    _log: (label, details, type = 'update') => {
        const newLog: HistoryLog = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: Date.now(),
            label,
            details,
            type
        };
        set(state => ({
            historyLogs: [newLog, ...state.historyLogs].slice(0, 50),
            lastUpdate: Date.now(),
            lastActionLabel: label
        }));
    },

    _snapshot: () => {
        set(state => ({
            history: [{
                exams: [...state.exams],
                supervisions: [...state.supervisions],
                lastActionLabel: state.lastActionLabel
            }, ...state.history].slice(0, 10)
        }));
    },

    setLoadedData: (data) => {
        // Validate first!
        const valid = AppStateSchema.safeParse(data);
        if (!valid.success) {
            console.error("Zustand Load Validation Failed", valid.error);
        }

        set({
            exams: data.exams || [],
            supervisions: data.supervisions || [],
            historyLogs: data.historyLogs || [],
            collectedExamIds: data.collectedExamIds || [],
            lastUpdate: data.lastUpdate || Date.now(),
            lastActionLabel: data.lastActionLabel || 'Daten geladen',
            isLoading: false,
            history: []
        });
    },

    resetForNewYear: () => {
        const { _log } = get();
        set({
            exams: [],
            supervisions: [],
            collectedExamIds: [],
            history: [],
            historyLogs: []
        });
        _log('System bereinigt', ['Alle Daten für ein neues Schuljahr zurückgesetzt.'], 'system');
    },

    undo: () => {
        const { history, _log } = get();
        if (history.length === 0) return;
        const [last, ...rest] = history;
        set({
            exams: last.exams,
            supervisions: last.supervisions,
            lastActionLabel: 'Aktion rückgängig gemacht',
            lastUpdate: Date.now(),
            history: rest
        });
        _log('Rückgängig', ['Letzte Aktion wurde widerrufen.'], 'system');
    },

    addExams: (newList, students) => {
        const { _snapshot, _log } = get();
        _snapshot();
        set(state => ({ exams: [...state.exams, ...newList] }));

        _log(
            newList.length > 1 ? `${newList.length} Prüfungen hinzugefügt` : 'Prüfung hinzugefügt',
            newList.map(e => {
                const s = students.find(st => st.id === e.studentId);
                return `Neue Prüfung für: ${s?.lastName || 'Unbekannt'} (${e.subject || 'Nackte Prüfung'})`;
            }),
            'create'
        );
    },

    updateExam: (exam, students, teachers) => {
        const { _snapshot, _log, exams } = get();
        _snapshot();

        const old = exams.find(e => e.id === exam.id);
        const details: string[] = [];

        if (old) {
            if (old.teacherId !== exam.teacherId) details.push(`Prüfer: ${teachers.find(t => t.id === old.teacherId)?.shortName || '?'} -> ${teachers.find(t => t.id === exam.teacherId)?.shortName || '?'}`);
            if (old.subject !== exam.subject) details.push(`Fach: ${old.subject} -> ${exam.subject}`);
            if (old.startTime !== exam.startTime) details.push(`Zeit verschoben`);
        }

        set(state => ({
            exams: state.exams.map(e => e.id === exam.id ? exam : e)
        }));

        const s = students.find(st => st.id === exam.studentId);
        _log(`Prüfung aktualisiert (${s?.lastName})`, details, 'update');
    },

    deleteExam: (id, students) => {
        const { _snapshot, _log, exams } = get();
        _snapshot();
        const target = exams.find(e => e.id === id);
        const s = students.find(st => st.id === target?.studentId);

        set(state => ({ exams: state.exams.filter(e => e.id !== id) }));
        _log(`Prüfung gelöscht`, [`Prüfling: ${s?.lastName}, Fach: ${target?.subject}`], 'delete');
    },

    togglePresence: (id, students) => {
        const { exams, _log } = get();
        const target = exams.find(e => e.id === id);
        if (!target) return;

        const newVal = !target.isPresent;
        set(state => ({
            exams: state.exams.map(e => e.id === id ? { ...e, isPresent: newVal } : e)
        }));

        const s = students.find(st => st.id === target.studentId);
        _log(`Anwesenheit: ${s?.lastName}`, [!target.isPresent ? 'Anwesend' : 'Abwesend']);
    },

    completeExam: (id, students) => {
        const { exams, _log } = get();
        const target = exams.find(e => e.id === id);
        if (!target) return;

        set(state => ({
            exams: state.exams.map(e => e.id === id ? { ...e, status: 'completed' } : e)
        }));

        const s = students.find(st => st.id === target.studentId);
        _log(`Abschluss: ${s?.lastName}`, [`Prüfung beendet.`]);
    },

    toggleProtocolCollected: (id, rooms) => {
        const { exams, collectedExamIds, _log } = get();
        const target = exams.find(e => e.id === id);
        const isNowCollected = !collectedExamIds.includes(id);

        set(state => ({
            collectedExamIds: isNowCollected
                ? [...state.collectedExamIds, id]
                : state.collectedExamIds.filter(x => x !== id)
        }));

        const r = rooms.find(rm => rm.id === target?.roomId);
        _log(`Protokoll-Abholung`, [`Raum ${r?.name}: ${isNowCollected ? 'Abgeholt' : 'Offen'}`]);
    },

    addSupervision: (s, teachers, rooms) => {
        const { _snapshot, _log } = get();
        _snapshot();
        set(state => ({ supervisions: [...state.supervisions, s] }));

        const t = teachers.find(x => x.id === s.teacherId);
        const r = rooms.find(x => x.id === s.stationId);
        _log(`Aufsicht zugewiesen`, [`${t?.shortName} -> ${r?.name}`], 'create');
    },

    updateSupervision: (s) => {
        const { _snapshot, _log } = get();
        _snapshot();
        const updates = Array.isArray(s) ? s : [s];

        set(state => ({
            supervisions: state.supervisions.map(curr => {
                const match = updates.find(u => u.id === curr.id);
                return match ? match : curr;
            })
        }));
        _log(`Aufsicht aktualisiert`, [`${updates.length} Einträge angepasst.`], 'update');
    },

    removeSupervision: (id, teachers) => {
        const { _snapshot, _log, supervisions } = get();
        _snapshot();
        const target = supervisions.find(s => s.id === id);
        const t = teachers.find(x => x.id === target?.teacherId);

        set(state => ({ supervisions: state.supervisions.filter(s => s.id !== id) }));
        _log(`Aufsicht entfernt`, [`${t?.shortName} entfernt.`], 'delete');
    },

    sysSyncDefaultExams: (students) => {
        const { exams, _log } = get();
        const newDrafts: Exam[] = [];

        students.forEach(student => {
            const hasAny = exams.some(e => e.studentId === student.id);
            if (!hasAny) {
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
            set(state => ({ exams: [...state.exams, ...newDrafts] }));
            _log('Auto-Sync', [`${newDrafts.length} Entwürfe erstellt.`], 'system');
        }
    }

}));
