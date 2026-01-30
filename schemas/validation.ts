import { z } from 'zod';

export const TeacherSchema = z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    shortName: z.string(),
    isPartTime: z.boolean(),
    isLeadership: z.boolean().optional(),
    subjectIds: z.array(z.string()).optional(),
    notes: z.string().optional(),
    targetHours: z.number().optional(),
});

export const StudentSchema = z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    examIds: z.array(z.string()),
});

export const RoomSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['Prüfungsraum', 'Vorbereitungsraum', 'Warteraum', 'Aufsicht-Station']),
    capacity: z.number(),
    isSupervisionStation: z.boolean(),
    requiredSupervisors: z.number(),
});

export const ExamDaySchema = z.object({
    id: z.string(),
    date: z.string(),
    label: z.string(),
});

export const SubjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    shortName: z.string(),
    isCombined: z.boolean().optional(),
});

export const ExamSchema = z.object({
    id: z.string(),
    studentId: z.string(),
    teacherId: z.string(),
    chairId: z.string().optional(),
    protocolId: z.string().optional(),
    roomId: z.string().optional(),
    prepRoomId: z.string().optional(),
    subject: z.string(),
    groupId: z.string().optional(),
    status: z.enum(['backlog', 'scheduled', 'running', 'completed', 'cancelled']),
    startTime: z.number(),
    isPresent: z.boolean().optional(),
});

export const SupervisionSchema = z.object({
    id: z.string(),
    stationId: z.string(),
    teacherId: z.string(),
    dayIdx: z.number(),
    startTime: z.string(),
    durationMinutes: z.number(),
    points: z.number(),
    subSlotIdx: z.number(),
});

export const HistoryLogSchema = z.object({
    id: z.string(),
    timestamp: z.number(),
    label: z.string(),
    details: z.array(z.string()).optional(),
    type: z.enum(['create', 'update', 'delete', 'system']),
});

export const AppSettingsSchema = z.object({
    autoLockMinutes: z.number(),
});

// Full AppState Schema (Partial, as we load partials)
export const AppStateSchema = z.object({
    teachers: z.array(TeacherSchema).optional(),
    students: z.array(StudentSchema).optional(),
    rooms: z.array(RoomSchema).optional(),
    days: z.array(ExamDaySchema).optional(),
    subjects: z.array(SubjectSchema).optional(),
    exams: z.array(ExamSchema).optional(),
    supervisions: z.array(SupervisionSchema).optional(),
    historyLogs: z.array(HistoryLogSchema).optional(),
    collectedExamIds: z.array(z.string()).optional(),
    isLocked: z.boolean().optional(),
    masterPassword: z.string().nullable().optional(),
    settings: AppSettingsSchema.optional(),
    lastUpdate: z.number().optional(),
    lastActionLabel: z.string().optional(),
});
