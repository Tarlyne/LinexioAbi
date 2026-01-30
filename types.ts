export type SupervisionStationType =
  | 'Taxi'
  | 'Rechenzentrum'
  | 'Warteraum'
  | 'Vorbereitung'
  | 'Sonstiges';
export type RoomType = 'Prüfungsraum' | 'Vorbereitungsraum' | 'Warteraum' | 'Aufsicht-Station';

export interface ExamDay {
  id: string;
  date: string;
  label: string;
}

export interface Subject {
  id: string;
  name: string;
  shortName: string;
  isCombined?: boolean;
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  shortName: string;
  isPartTime: boolean;
  isLeadership?: boolean; // Neu: Kennzeichnung für Schulleitung
  subjectIds?: string[];
  notes?: string;
  targetHours?: number;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  examIds: string[];
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  capacity: number;
  isSupervisionStation: boolean;
  requiredSupervisors: number;
}

export interface Exam {
  id: string;
  studentId: string;
  teacherId: string;
  chairId?: string;
  protocolId?: string;
  roomId?: string;
  prepRoomId?: string;
  subject: string;
  groupId?: string;
  status: 'backlog' | 'scheduled' | 'running' | 'completed' | 'cancelled';
  startTime: number;
  isPresent?: boolean;
}

export interface Supervision {
  id: string;
  stationId: string;
  teacherId: string;
  dayIdx: number;
  startTime: string;
  durationMinutes: number;
  points: number;
  subSlotIdx: number;
}

export interface HistoryLog {
  id: string;
  timestamp: number;
  label: string;
  details?: string[];
  type: 'create' | 'update' | 'delete' | 'system';
}

export interface AppSettings {
  autoLockMinutes: number;
}

export interface AppState {
  teachers: Teacher[];
  students: Student[];
  rooms: Room[];
  days: ExamDay[];
  subjects: Subject[];
  exams: Exam[];
  supervisions: Supervision[];
  historyLogs: HistoryLog[];
  collectedExamIds: string[];
  isLocked: boolean;
  masterPassword: string | null;
  settings: AppSettings;
  lastUpdate: number;
  lastActionLabel?: string;
}

export interface AuthMeta {
  salt: string;
  verifyIv: string;
  verifyCipher: string;
  version: number;
}

export interface EncryptedUnit {
  ciphertext: string;
  iv: string;
}

export interface LockedState {
  isLocked: true;
  requiresSetup: boolean;
}
