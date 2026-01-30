import { AppState, Exam, Teacher } from '../types';
import { calculateTeacherPoints, checkExamCollision } from './engine';

export type PreflightSeverity = 'error' | 'warning' | 'info';

export interface PreflightIssue {
  id: string;
  severity: PreflightSeverity;
  category: 'commission' | 'room' | 'collision' | 'workload' | 'student';
  message: string;
  details?: string;
}

/**
 * Führt einen umfassenden Scan des Plans für einen bestimmten Tag durch.
 */
export const runPreflightCheck = (state: AppState, dayIdx: number): PreflightIssue[] => {
  const issues: PreflightIssue[] = [];
  const dayExams = state.exams.filter(
    (e) =>
      e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === dayIdx && e.status !== 'cancelled'
  );

  if (dayExams.length === 0) {
    issues.push({
      id: 'no-exams',
      severity: 'info',
      category: 'student',
      message: 'Keine Prüfungen für diesen Tag geplant.',
    });
    return issues;
  }

  // 1. Check Kommission & Räume
  let missingCommissionCount = 0;
  let missingPrepRoomCount = 0;
  let collisionCount = 0;

  dayExams.forEach((exam) => {
    // Kommission
    if (!exam.chairId || !exam.protocolId) missingCommissionCount++;

    // Räume
    if (!exam.prepRoomId) missingPrepRoomCount++;

    // Kollisionen (Hard-Check)
    const collision = checkExamCollision(exam, state.exams);
    if (collision.hasConflict) collisionCount++;
  });

  if (missingCommissionCount > 0) {
    issues.push({
      id: 'missing-commission',
      severity: 'warning',
      category: 'commission',
      message: `Lückenhafte Kommission`,
      details: `${missingCommissionCount} Prüfung(en) ohne vollständigen Vorsitz/Protokoll.`,
    });
  }

  if (missingPrepRoomCount > 0) {
    issues.push({
      id: 'missing-preproom',
      severity: 'info',
      category: 'room',
      message: `Vorbereitungsräume fehlen`,
      details: `${missingPrepRoomCount} Prüfung(en) ohne zugewiesenen Vorbereitungsraum.`,
    });
  }

  if (collisionCount > 0) {
    issues.push({
      id: 'collisions-active',
      severity: 'error',
      category: 'collision',
      message: `Termin-Kollisionen erkannt`,
      details: `${collisionCount} Prüfung(en) weisen zeitliche oder räumliche Konflikte auf.`,
    });
  }

  // 2. Deputat-Check (Arbeitslast-Ungleichgewicht)
  const teacherStats = state.teachers
    .map((t) => ({
      id: t.id,
      shortName: t.shortName,
      points: calculateTeacherPoints(t.id, state.exams, state.supervisions),
    }))
    .filter((s) => s.points > 0);

  if (teacherStats.length > 1) {
    const maxPoints = Math.max(...teacherStats.map((s) => s.points));
    const minPoints = Math.min(...teacherStats.map((s) => s.points));
    const avgPoints = teacherStats.reduce((sum, s) => sum + s.points, 0) / teacherStats.length;

    const overworked = teacherStats.filter((s) => s.points > avgPoints * 1.8);
    if (overworked.length > 0) {
      issues.push({
        id: 'workload-imbalance',
        severity: 'warning',
        category: 'workload',
        message: 'Starke Belastung einzelner Lehrkräfte',
        details: `${overworked.map((o) => o.shortName).join(', ')} liegen deutlich über dem Durchschnitt.`,
      });
    }
  }

  // 3. Schüler-Checks
  const studentExamCounts: Record<string, number> = {};
  dayExams.forEach((e) => {
    studentExamCounts[e.studentId] = (studentExamCounts[e.studentId] || 0) + 1;
  });

  const doubleStudents = Object.entries(studentExamCounts).filter(([_, count]) => count > 1);
  if (doubleStudents.length > 0) {
    issues.push({
      id: 'student-double-exam',
      severity: 'info',
      category: 'student',
      message: 'Mehrfachprüfungen am selben Tag',
      details: `${doubleStudents.length} Schüler haben heute mehr als eine Prüfung.`,
    });
  }

  return issues;
};
