
import { describe, it, expect } from 'vitest';
import { checkExamCollision } from './engine';
import { Exam } from '../types';

// Helper to create a minimal exam object
const createExam = (
    id: string,
    studentId: string,
    startTime: number,
    isBackupExam: boolean = false,
    roomId: string = 'room-1'
): Exam => ({
    id,
    studentId,
    teacherId: 'teacher-1',
    subject: 'MATH',
    startTime,
    status: 'scheduled',
    roomId,
    isBackupExam,
});

describe('checkExamCollision - Student Collisions', () => {
    const day1Slot1 = 1001; // Day 1, Slot 1
    const student = 'student-1';

    it('should detect collision between two REGULAR exams on the same day', () => {
        // Exam A: Regular, Day 1, Slot 1
        const examA = createExam('exam-A', student, day1Slot1, false);
        // Exam B: Regular, Day 1, Slot 5 (same day, different time)
        const examB = createExam('exam-B', student, day1Slot1 + 4, false);

        // Check collision for Exam A against list containing Exam B
        const result = checkExamCollision(examA, [examB]);

        expect(result.hasConflict).toBe(true);
        expect(result.reason).toBe('Schüler hat mehrere reguläre Prüfungen am selben Tag.');
    });

    it('should NOT detect collision if one exam is a BACKUP exam', () => {
        // Exam A: Regular
        const examA = createExam('exam-A', student, day1Slot1, false);
        // Exam B: Backup
        const examB = createExam('exam-B', student, day1Slot1 + 4, true);

        const result1 = checkExamCollision(examA, [examB]);
        expect(result1.hasConflict).toBe(false);

        const result2 = checkExamCollision(examB, [examA]);
        expect(result2.hasConflict).toBe(false);
    });

    it('should detect collision if a BACKUP exam overlaps in TIME with another exam', () => {
        // Exam A: Regular, Day 1, Slot 1
        const examA = createExam('exam-A', student, day1Slot1, false, 'room-A');
        // Exam B: Backup, Day 1, Slot 1 (zeitgleich!), BUT different room to avoid room collision
        const examB = createExam('exam-B', student, day1Slot1, true, 'room-B');

        const result = checkExamCollision(examA, [examB]);
        expect(result.hasConflict).toBe(true);
        // Beachten Sie: Der Grund könnte variieren, je nachdem welcher Check zuerst greift.
        // Aber bei zeitgleicher Überlappung MUSS es knallen.
        expect(result.reason).toBe('Zeitliche Überschneidung für Schüler.');
    });

    it('should NOT detect collision between two BACKUP exams on same day but DIFFERENT times', () => {
        // Exam A: Backup
        const examA = createExam('exam-A', student, day1Slot1, true);
        // Exam B: Backup
        const examB = createExam('exam-B', student, day1Slot1 + 4, true);

        const result = checkExamCollision(examA, [examB]);
        expect(result.hasConflict).toBe(false);
    });

    it('should NOT detect collision between two BACKUP exams', () => {
        // Exam A: Backup
        const examA = createExam('exam-A', student, day1Slot1, true);
        // Exam B: Backup
        const examB = createExam('exam-B', student, day1Slot1 + 4, true);

        const result = checkExamCollision(examA, [examB]);
        expect(result.hasConflict).toBe(false);
    });

    it('should NOT detect collision for exams on DIFFERENT days', () => {
        // Exam A: Regular, Day 1
        const examA = createExam('exam-A', student, day1Slot1, false);
        // Exam B: Regular, Day 2
        const examB = createExam('exam-B', student, 2001, false);

        const result = checkExamCollision(examA, [examB]);
        expect(result.hasConflict).toBe(false);
    });
});
