
import { Teacher, Student, Room, Exam, Subject } from '../types';

/**
 * Erwartet: Nachname; Vorname; Kürzel; Fach 1; Fach 2; Fach 3; Teilzeit ('Ja' oder leer)
 * Fächer werden über den Namen mit der Stammdatenliste abgeglichen.
 * Gibt ein Objekt zurück, das die Lehrer und eine Liste unbekannter Fächer enthält.
 */
export const parseTeachersCSV = (csv: string, subjects: Subject[]): { teachers: Teacher[], skippedSubjects: string[] } => {
  const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
  const skippedSubjectsSet = new Set<string>();
  
  const teachers = lines.map((line, index) => {
    const parts = line.split(';').map(s => s?.trim());
    // Struktur: Nachname(0), Vorname(1), Kürzel(2), Fach1(3), Fach2(4), Fach3(5), Teilzeit(6)
    const [lastName, firstName, shortName, f1, f2, f3, isPartTime] = parts;
    
    const subjectIds: string[] = [];
    [f1, f2, f3].forEach(fName => {
      if (fName) {
        const found = subjects.find(s => s.name.toLowerCase() === fName.toLowerCase());
        if (found) {
          subjectIds.push(found.id);
        } else {
          skippedSubjectsSet.add(fName);
        }
      }
    });

    return {
      id: `t-${index}-${Date.now()}`,
      lastName: lastName || '',
      firstName: firstName || '',
      shortName: shortName || '',
      isPartTime: isPartTime?.toLowerCase() === 'ja',
      subjectIds
    };
  });

  return {
    teachers,
    skippedSubjects: Array.from(skippedSubjectsSet)
  };
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
