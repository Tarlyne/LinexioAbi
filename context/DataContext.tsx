import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Teacher, Student, Room, ExamDay, Subject, AppState } from '../types';
import { isEntityInUseInternal } from '../utils/engine';

interface DataContextType {
  teachers: Teacher[];
  students: Student[];
  rooms: Room[];
  days: ExamDay[];
  subjects: Subject[];
  addTeacher: (t: Teacher) => void;
  updateTeacher: (t: Teacher) => void;
  deleteTeacher: (id: string) => void;
  upsertTeachers: (teachers: Teacher[]) => void;
  addStudent: (s: Student) => void;
  updateStudent: (s: Student) => void;
  deleteStudent: (id: string) => void;
  upsertStudents: (students: Student[]) => void;
  addRoom: (r: Room) => void;
  updateRoom: (r: Room) => void;
  deleteRoom: (id: string) => void;
  upsertRooms: (rooms: Room[]) => void;
  addDay: (d: ExamDay) => void;
  updateDay: (d: ExamDay) => void;
  deleteDay: (id: string) => void;
  addSubject: (s: Subject) => void;
  updateSubject: (s: Subject) => void;
  deleteSubject: (id: string) => void;
  isEntityInUse: (type: any, id: string, exams: any[], supervisions: any[]) => boolean;
  setDataFromLoad: (data: AppState) => void;
  clearStammdaten: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [days, setDays] = useState<ExamDay[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const setDataFromLoad = useCallback((data: AppState) => {
    setTeachers(data.teachers || []);
    setStudents(data.students || []);
    setRooms(data.rooms || []);
    setDays(data.days || []);
    setSubjects(data.subjects || []);
  }, []);

  const clearStammdaten = useCallback(() => {
    setTeachers([]);
    setStudents([]);
    setRooms([]);
    setDays([]);
  }, []);

  const addTeacher = useCallback((t: Teacher) => setTeachers((prev) => [...prev, t]), []);
  const updateTeacher = useCallback(
    (t: Teacher) => setTeachers((prev) => prev.map((curr) => (curr.id === t.id ? t : curr))),
    []
  );
  const deleteTeacher = useCallback(
    (id: string) => setTeachers((prev) => prev.filter((t) => t.id !== id)),
    []
  );

  const upsertTeachers = useCallback(
    (newList: Teacher[]) =>
      setTeachers((prev) => {
        const map = new Map<string, Teacher>(prev.map((t) => [t.shortName, t]));
        newList.forEach((t) => {
          const existing = map.get(t.shortName);
          map.set(t.shortName, { ...t, id: existing?.id || t.id });
        });
        return Array.from(map.values());
      }),
    []
  );

  const addStudent = useCallback((s: Student) => setStudents((prev) => [...prev, s]), []);
  const updateStudent = useCallback(
    (s: Student) => setStudents((prev) => prev.map((curr) => (curr.id === s.id ? s : curr))),
    []
  );
  const deleteStudent = useCallback(
    (id: string) => setStudents((prev) => prev.filter((s) => s.id !== id)),
    []
  );

  const upsertStudents = useCallback(
    (newList: Student[]) =>
      setStudents((prev) => {
        const map = new Map<string, Student>(prev.map((s) => [`${s.lastName}-${s.firstName}`, s]));
        newList.forEach((s) => {
          const key = `${s.lastName}-${s.firstName}`;
          const existing = map.get(key);
          map.set(key, { ...s, id: existing?.id || s.id });
        });
        return Array.from(map.values());
      }),
    []
  );

  const addRoom = useCallback((r: Room) => setRooms((prev) => [...prev, r]), []);
  const updateRoom = useCallback(
    (r: Room) => setRooms((prev) => prev.map((curr) => (curr.id === r.id ? r : curr))),
    []
  );
  const deleteRoom = useCallback(
    (id: string) => setRooms((prev) => prev.filter((r) => r.id !== id)),
    []
  );

  const upsertRooms = useCallback(
    (newList: Room[]) =>
      setRooms((prev) => {
        const map = new Map<string, Room>(prev.map((r) => [r.name, r]));
        newList.forEach((r) => {
          const existing = map.get(r.name);
          map.set(r.name, { ...r, id: existing?.id || r.id });
        });
        return Array.from(map.values());
      }),
    []
  );

  const addDay = useCallback(
    (d: ExamDay) => setDays((prev) => [...prev, d].sort((a, b) => a.date.localeCompare(b.date))),
    []
  );
  const updateDay = useCallback(
    (d: ExamDay) =>
      setDays((prev) =>
        prev
          .map((curr) => (curr.id === d.id ? d : curr))
          .sort((a, b) => a.date.localeCompare(b.date))
      ),
    []
  );
  const deleteDay = useCallback(
    (id: string) => setDays((prev) => prev.filter((d) => d.id !== id)),
    []
  );

  const addSubject = useCallback(
    (s: Subject) =>
      setSubjects((prev) => [...prev, s].sort((a, b) => a.name.localeCompare(b.name, 'de'))),
    []
  );
  const updateSubject = useCallback(
    (s: Subject) =>
      setSubjects((prev) =>
        prev
          .map((curr) => (curr.id === s.id ? s : curr))
          .sort((a, b) => a.name.localeCompare(b.name, 'de'))
      ),
    []
  );
  const deleteSubject = useCallback(
    (id: string) => setSubjects((prev) => prev.filter((s) => s.id !== id)),
    []
  );

  const isEntityInUse = useCallback(
    (type: any, id: string, exams: any[], supervisions: any[]) => {
      const entity = (
        type === 'teacher'
          ? teachers
          : type === 'student'
            ? students
            : type === 'room'
              ? rooms
              : type === 'day'
                ? days
                : subjects
      ).find((e: any) => e.id === id);
      const entityName = (entity as any)?.name || (entity as any)?.shortName;
      return isEntityInUseInternal(type, id, exams, supervisions, entityName, teachers);
    },
    [teachers, students, rooms, days, subjects]
  );

  const value = useMemo(
    () => ({
      teachers,
      students,
      rooms,
      days,
      subjects,
      addTeacher,
      updateTeacher,
      deleteTeacher,
      upsertTeachers,
      addStudent,
      updateStudent,
      deleteStudent,
      upsertStudents,
      addRoom,
      updateRoom,
      deleteRoom,
      upsertRooms,
      addDay,
      updateDay,
      deleteDay,
      addSubject,
      updateSubject,
      deleteSubject,
      isEntityInUse,
      setDataFromLoad,
      clearStammdaten,
    }),
    [
      teachers,
      students,
      rooms,
      days,
      subjects,
      addTeacher,
      updateTeacher,
      deleteTeacher,
      upsertTeachers,
      addStudent,
      updateStudent,
      deleteStudent,
      upsertStudents,
      addRoom,
      updateRoom,
      deleteRoom,
      upsertRooms,
      addDay,
      updateDay,
      deleteDay,
      addSubject,
      updateSubject,
      deleteSubject,
      isEntityInUse,
      setDataFromLoad,
      clearStammdaten,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
