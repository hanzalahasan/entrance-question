// Aggregates a user's correct/attempted per subject and topic from BOTH saved
// mock results and random-practice attempts, and derives overall accuracy +
// strengths/weaknesses. Pure function — the dashboard feeds it the data.

import type { Question } from "@/types/question";
import type { MockResultRecord } from "@/types/mock";
import type { PracticeAttempt } from "./practice-attempt-store";

export type TopicPerf = {
  subjectId: number;
  subjectName: string;
  topicId: number;
  topicName: string;
  attempted: number;
  correct: number;
  accuracy: number; // 0–100
};

export type SubjectPerf = {
  subjectId: number;
  subjectName: string;
  attempted: number;
  correct: number;
  accuracy: number;
  topics: TopicPerf[];
};

export type Performance = {
  attempted: number;
  correct: number;
  accuracy: number;
  subjects: SubjectPerf[];
  strengths: TopicPerf[];
  weaknesses: TopicPerf[];
};

// A topic needs at least this many attempts before we call it a strength/weakness.
const MIN_ATTEMPTS = 3;

export function computePerformance(
  bank: Question[],
  mockResults: MockResultRecord[],
  practice: PracticeAttempt[]
): Performance {
  const byId = new Map(bank.map((q) => [q.id, q]));
  const subjectName = new Map<number, string>();
  const topicName = new Map<number, string>();
  for (const q of bank) {
    if (q.subjectId)
      subjectName.set(q.subjectId, q.subjectName || `Subject ${q.subjectId}`);
    if (q.topicId) topicName.set(q.topicId, q.topicName || `Topic ${q.topicId}`);
  }

  type Acc = { subjectId: number; topicId: number; attempted: number; correct: number };
  const topicAcc = new Map<string, Acc>();
  const add = (
    subjectId: number | null,
    topicId: number | null,
    correct: boolean
  ) => {
    if (!subjectId || !topicId) return;
    const key = `${subjectId}:${topicId}`;
    const a = topicAcc.get(key) ?? { subjectId, topicId, attempted: 0, correct: 0 };
    a.attempted += 1;
    if (correct) a.correct += 1;
    topicAcc.set(key, a);
  };

  // Random practice — direct.
  for (const p of practice) add(p.subjectId, p.topicId, p.isCorrect);

  // Mock results — recompute per answered question from the bank.
  for (const rec of mockResults) {
    for (const qid of rec.questionIds) {
      const q = byId.get(qid);
      if (!q) continue;
      const ans = rec.answers[qid];
      if (ans == null || ans === "") continue; // unanswered ≠ attempted
      add(q.subjectId, q.topicId, ans === q.answer);
    }
  }

  const pct = (c: number, a: number) => (a ? Math.round((c / a) * 100) : 0);

  const topics: TopicPerf[] = [...topicAcc.values()].map((a) => ({
    subjectId: a.subjectId,
    subjectName: subjectName.get(a.subjectId) || `Subject ${a.subjectId}`,
    topicId: a.topicId,
    topicName: topicName.get(a.topicId) || `Topic ${a.topicId}`,
    attempted: a.attempted,
    correct: a.correct,
    accuracy: pct(a.correct, a.attempted),
  }));

  const subjMap = new Map<number, SubjectPerf>();
  for (const t of topics) {
    const s =
      subjMap.get(t.subjectId) ??
      {
        subjectId: t.subjectId,
        subjectName: t.subjectName,
        attempted: 0,
        correct: 0,
        accuracy: 0,
        topics: [],
      };
    s.attempted += t.attempted;
    s.correct += t.correct;
    s.topics.push(t);
    subjMap.set(t.subjectId, s);
  }
  const subjects = [...subjMap.values()]
    .map((s) => ({
      ...s,
      accuracy: pct(s.correct, s.attempted),
      topics: s.topics.sort((a, b) => a.accuracy - b.accuracy),
    }))
    .sort((a, b) => b.attempted - a.attempted);

  const attempted = topics.reduce((n, t) => n + t.attempted, 0);
  const correct = topics.reduce((n, t) => n + t.correct, 0);

  const judged = topics.filter((t) => t.attempted >= MIN_ATTEMPTS);
  const strengths = [...judged]
    .sort((a, b) => b.accuracy - a.accuracy || b.attempted - a.attempted)
    .slice(0, 5);
  const weaknesses = [...judged]
    .filter((t) => t.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempted - a.attempted)
    .slice(0, 6);

  return {
    attempted,
    correct,
    accuracy: pct(correct, attempted),
    subjects,
    strengths,
    weaknesses,
  };
}
