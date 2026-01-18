export type SupervisionStationType = 'Taxi' | 'Rechenzentrum' | 'Warteraum' | 'Vorbereitung' | 'Sonstiges';
export type RoomType = 'Prüfungsraum' | 'Vorbereitungsraum' | 'Warteraum' | 'Aufsicht-Station';

export interface ExamDay {
  id: string;
  date: string; // Format: YYYY-MM-DD
  label: string; // z.B. "1. Prüfungstag"
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

export interface AppSettings {
  autoLockMinutes: number; // 0 = Deaktiviert
}

export interface AppState {
  teachers: Teacher[];
  students: Student[];
  rooms: Room[];
  days: ExamDay[];
  subjects: Subject[];
  exams: Exam[];
  supervisions: Supervision[];
  collectedExamIds: string[]; 
  isLocked: boolean;
  masterPassword: string | null;
  settings: AppSettings;
  lastUpdate: number;
}

/**
 * Metadata stored in lx_meta to track encryption status
 */
export interface DbMeta {
  version: number;
  isEncrypted: boolean;
  lastUpdate: number;
  salt?: string; // Base64
}

/**
 * Type for an encrypted unit in IndexedDB
 */
export interface EncryptedUnit {
  ciphertext: string; // Base64
  iv: string; // Base64
}

/**
 * Type for data stored in IndexedDB (Legacy compatibility)
 */
export interface SerializedState {
  ciphertext?: string;
  iv?: string;
  salt?: string;
  isEncrypted: boolean;
  lastUpdate: number;
  masterPassword?: string | null;
  settings?: AppSettings;
}

/**
 * Return type when database is locked and requires password
 */
export interface LockedState {
  isLocked: true;
  masterPassword: 'SET';
}