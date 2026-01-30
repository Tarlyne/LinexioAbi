import { Teacher, Student, Room, Exam, Subject, ExamDay } from '../types';

/**
 * Normalisiert verschiedene Datumsformate (vorrangig TT.MM.JJJJ) zu ISO YYYY-MM-DD
 */
const normalizeCsvDate = (dateStr: string): string => {
  if (!dateStr) return '';

  // Format TT.MM.JJJJ oder T.M.JJJJ
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) year = `20${year}`; // Handle JJ zu JJJJ
    return `${year}-${month}-${day}`;
  }

  // Bereits ISO Format?
  if (dateStr.includes('-')) return dateStr;

  return dateStr;
};

/**
 * Erwartet: Nachname; Vorname; Kürzel; Fach 1; Fach 2; Fach 3; Teilzeit ('Ja' oder leer)
 */
export const parseTeachersCSV = (
  csv: string,
  subjects: Subject[]
): { teachers: Teacher[]; skippedSubjects: string[] } => {
  const lines = csv
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '' && !line.startsWith('Nachname;'));
  const skippedSubjectsSet = new Set<string>();

  const teachers = lines.map((line, index) => {
    const parts = line.split(';').map((s) => s?.trim());
    const [lastName, firstName, shortName, f1, f2, f3, isPartTime] = parts;

    const subjectIds: string[] = [];
    [f1, f2, f3].forEach((fName) => {
      if (fName) {
        const found = subjects.find((s) => s.name.toLowerCase() === fName.toLowerCase());
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
      subjectIds,
    };
  });

  return {
    teachers,
    skippedSubjects: Array.from(skippedSubjectsSet),
  };
};

/**
 * Erwartet: Nachname; Vorname
 */
export const parseStudentsCSV = (csv: string): Student[] => {
  const lines = csv
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '' && !line.startsWith('Nachname;'));
  return lines.map((line, index) => {
    const [lastName, firstName] = line.split(';').map((s) => s?.trim());
    return {
      id: `s-${index}-${Date.now()}`,
      lastName: lastName || '',
      firstName: firstName || '',
      examIds: [],
    };
  });
};

/**
 * Spezial-Parser für den Abitur-Prüfungsplan (9 Spalten)
 */
export interface RawExamCSVRow {
  date: string;
  time: string;
  prepRoom: string;
  examRoom: string;
  studentName: string;
  subject: string;
  examiner: string;
  protocol: string;
  chair: string;
}

export const parseAbiturExamsCSV = (csv: string): RawExamCSVRow[] => {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== '');
  const startIdx = lines[0].toLowerCase().includes('datum') ? 1 : 0;

  return lines.slice(startIdx).map((line) => {
    const p = line.split(';').map((s) => s?.trim());
    return {
      date: normalizeCsvDate(p[0] || ''),
      time: p[1] || '',
      prepRoom: p[2] || '',
      examRoom: p[3] || '',
      studentName: p[4] || '',
      subject: p[5] || '',
      examiner: p[6] || '',
      protocol: p[7] || '',
      chair: p[8] || '',
    };
  });
};

/**
 * Erwartet: Name; Kapazität; Vorbereitung (1 oder 0)
 */
export const parseRoomsCSV = (csv: string): Room[] => {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== '');
  return lines.map((line, index) => {
    const [name, capacity, isPrep] = line.split(';').map((s) => s?.trim());
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
