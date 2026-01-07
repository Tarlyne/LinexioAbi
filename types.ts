
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
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  shortName: string;
  isPartTime: boolean;
  notes?: string;
  targetHours?: number; // Soll-Punkte
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
  requiredSupervisors: number; // Wie viele Lehrer werden hier zeitgleich benötigt?
}

export interface Exam {
  id: string;
  studentId: string;
  teacherId: string; // Erstprüfer
  chairId?: string;  // Vorsitz
  protocolId?: string; // Protokoll
  roomId?: string;    // Geplant in Raum
  prepRoomId?: string;
  startTime: number;  // Coordinate: (TagIndex * 1000 + SlotIndex + 1)
  subject: string;
  groupId?: string;   // Kennung für den Prüfungssatz/Block (z.B. "A")
  status: 'backlog' | 'scheduled' | 'running' | 'completed' | 'cancelled';
  isPresent?: boolean;
}

export interface Supervision {
  id: string;
  stationId: string; // Raum ID
  teacherId: string;
  dayIdx: number;
  startTime: string; // Format: "HH:mm"
  durationMinutes: number;
  points: number; 
  subSlotIdx: number; // Neu: Position innerhalb der Station (0 bis requiredSupervisors - 1)
}

export interface AppState {
  teachers: Teacher[];
  students: Student[];
  rooms: Room[];
  days: ExamDay[];
  subjects: Subject[];
  exams: Exam[];
  supervisions: Supervision[];
  isLocked: boolean;
  masterPassword: string | null;
  lastUpdate: number;
}
