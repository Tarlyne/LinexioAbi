import { checkExamConsistency } from './utils/engine';

const exams = [
  {
    id: "M1",
    groupId: "A",
    subject: "Mathe",
    teacherId: "Böhm",
    startTime: 1001,
    roomId: "R1"
  },
  {
    id: "M2",
    groupId: "A",
    subject: "Mathe",
    teacherId: "Böhm",
    startTime: 1004,
    roomId: "R1"
  },
  {
    id: "D1",
    groupId: "A",
    subject: "Deutsch",
    teacherId: "Schmidt",
    startTime: 1001,   // SAME TIME AS M1
    roomId: "R2"
  },
  {
    id: "D2",
    groupId: "A",
    subject: "Deutsch",
    teacherId: "Schmidt",
    startTime: 1004,   // SAME TIME AS M2
    roomId: "R2"
  }
];

const results = exams.map(e => ({
  id: e.id,
  consistency: checkExamConsistency(e as any, exams as any)
}));

console.log(JSON.stringify(results, null, 2));

