
import { Teacher, Student, Room, Exam } from '../types';

/**
 * Erwartet: Nachname; Vorname; Kürzel; Teilzeit ('Ja' oder leer)
 */
export const parseTeachersCSV = (csv: string): Teacher[] => {
  const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
  return lines.map((line, index) => {
    const [lastName, firstName, shortName, isPartTime] = line.split(';').map(s => s?.trim());
    return {
      id: `t-${index}-${Date.now()}`,
      lastName: lastName || '',
      firstName: firstName || '',
      shortName: shortName || '',
      isPartTime: isPartTime?.toLowerCase() === 'ja',
    };
  });
};

/**
 * Erwartet: Nachname; Vorname
 */
export const parseStudentsCSV = (csv: string): Student[] => {
  const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
  return lines.map((line, index) => {
    const [lastName, firstName] = line.split(';').map(s => s?.trim());
    return {
      id: `s-${index}-${Date.now()}`,
      lastName: lastName || '',
      firstName: firstName || '',
      examIds: [],
    };
  });
};

/**
 * Erwartet: SchülerNachname; SchülerVorname; LehrerKürzel; Fach
 */
export const parseExamsCSV = (csv: string, students: Student[], teachers: Teacher[]): Exam[] => {
  const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
  return lines.map((line, index) => {
    const [sNach, sVor, tKurz, subject] = line.split(';').map(s => s?.trim());
    
    const student = students.find(s => s.lastName.toLowerCase() === sNach?.toLowerCase() && s.firstName.toLowerCase() === sVor?.toLowerCase());
    const teacher = teachers.find(t => t.shortName.toLowerCase() === tKurz?.toLowerCase());

    return {
      id: `e-${index}-${Date.now()}`,
      studentId: student?.id || 'unknown',
      teacherId: teacher?.id || 'unknown',
      subject: subject || 'Unbekannt',
      startTime: 0, // Backlog
      status: 'backlog',
    } as Exam;
  });
};

/**
 * Erwartet: Name; Kapazität; Vorbereitung (1 oder 0)
 */
export const parseRoomsCSV = (csv: string): Room[] => {
  const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
  return lines.map((line, index) => {
    const [name, capacity, isPrep] = line.split(';').map(s => s?.trim());
    // FIX: Ergänzung fehlender Properties 'isSupervisionStation' und 'requiredSupervisors', um das Room-Interface zu erfüllen.
    return {
      id: `r-${index}-${Date.now()}`,
      name: name || '',
      capacity: parseInt(capacity) || 1,
      type: isPrep === '1' ? 'Vorbereitungsraum' : 'Prüfungsraum',
      isSupervisionStation: false,
      requiredSupervisors: 1,
    };
  });
};
