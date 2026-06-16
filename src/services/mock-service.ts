import type { Question } from "@/types/question";
import type {
  MockAttempt,
  MockConfig,
  MockResult,
  MockSelection,
  MockSubjectScore,
  MockTopicScore,
} from "@/types/mock";

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Take up to `n` from `pool` that aren't already chosen; record the picks.
function takeFrom(
  pool: Question[],
  n: number,
  chosen: Set<number>
): Question[] {
  const out: Question[] = [];
  for (const q of pool) {
    if (out.length >= n) break;
    if (chosen.has(q.id)) continue;
    chosen.add(q.id);
    out.push(q);
  }
  return out;
}

/**
 * Assemble the questions for a mock.
 *
 * - past_year: the actual paper — every published question of that year,
 *   grouped by subject (no quota enforcement).
 * - difficulty: build to the admin distribution from mock-eligible published
 *   questions at the chosen difficulty, honoring per-topic quotas where set,
 *   and topping up short subjects from the same subject at large (any
 *   difficulty/source) so the paper still reaches its target size.
 *
 * Returned questions are grouped by subject (so the exam can show sections).
 */
export function buildMockQuestions(
  all: Question[],
  selection: MockSelection,
  config: MockConfig
): Question[] {
  const published = all.filter((q) => q.status === "published");

  if (selection.mode === "past_year") {
    const ofYear = published.filter(
      (q) =>
        q.year === selection.year ||
        (q.repeatedYears || []).includes(selection.year)
    );
    return groupBySubject(ofYear, config);
  }

  // difficulty mode
  const difficulty = selection.difficulty;
  const eligible = published.filter((q) => q.isMockEligible);
  const atDifficulty = eligible.filter((q) => q.difficulty === difficulty);
  const chosen = new Set<number>();
  const result: Question[] = [];

  for (const quota of config.subjects) {
    if (quota.count <= 0) continue;
    const subjectPrimary = shuffle(
      atDifficulty.filter((q) => q.subjectId === quota.subjectId)
    );
    const picked: Question[] = [];

    // 1) Per-topic quotas first (from the difficulty pool).
    for (const t of quota.topics) {
      if (t.count <= 0) continue;
      const topicPool = subjectPrimary.filter((q) => q.topicId === t.topicId);
      picked.push(...takeFrom(topicPool, t.count, chosen));
    }

    // 2) Remaining subject slots from the rest of the difficulty pool.
    const remaining = quota.count - picked.length;
    if (remaining > 0) {
      picked.push(...takeFrom(subjectPrimary, remaining, chosen));
    }

    // NOTE: difficulty papers are kept PURE — we deliberately do NOT top up with
    // other difficulties. A "medium" practice paper contains only medium
    // questions (it may be shorter than the quota if the bank is thin) so the
    // "Practice · medium" label is always truthful.

    result.push(...picked);
  }

  return result;
}

// Resolve a Mock Set's frozen question ids into published Question objects, in
// the set's order but grouped by subject (first-seen order) so the exam's
// section tabs stay clean. Missing/unpublished ids are silently dropped.
export function resolveSetQuestions(
  all: Question[],
  questionIds: number[]
): Question[] {
  const byId = new Map(
    all.filter((q) => q.status === "published").map((q) => [q.id, q])
  );
  const resolved = questionIds
    .map((id) => byId.get(id))
    .filter((q): q is Question => Boolean(q));

  const order: number[] = [];
  const groups = new Map<number, Question[]>();
  for (const q of resolved) {
    if (!groups.has(q.subjectId)) {
      groups.set(q.subjectId, []);
      order.push(q.subjectId);
    }
    groups.get(q.subjectId)!.push(q);
  }
  return order.flatMap((sid) => groups.get(sid)!);
}

// Order a flat list of questions grouped by the config's subject order, with any
// leftover subjects appended in id order.
function groupBySubject(questions: Question[], config: MockConfig): Question[] {
  const order = new Map(config.subjects.map((s, i) => [s.subjectId, i]));
  return [...questions].sort((a, b) => {
    const oa = order.get(a.subjectId) ?? 999;
    const ob = order.get(b.subjectId) ?? 999;
    if (oa !== ob) return oa - ob;
    return a.id - b.id;
  });
}

// Build the subject sections (in display order) for an assembled question list.
export function mockSections(
  questions: Question[]
): { subjectId: number; subjectName: string; startIndex: number; count: number }[] {
  const sections: {
    subjectId: number;
    subjectName: string;
    startIndex: number;
    count: number;
  }[] = [];
  questions.forEach((q, i) => {
    const last = sections[sections.length - 1];
    if (last && last.subjectId === q.subjectId) {
      last.count += 1;
    } else {
      sections.push({
        subjectId: q.subjectId,
        subjectName: q.subjectName || `Subject ${q.subjectId}`,
        startIndex: i,
        count: 1,
      });
    }
  });
  return sections;
}

// Score a finished/in-progress attempt against the questions it was built from.
export function scoreMock(
  attempt: MockAttempt,
  questions: Question[]
): MockResult {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const subjectMap = new Map<number, MockSubjectScore>();
  // Per-subject topic accumulators, keyed `${subjectId}:${topicId}`.
  const topicMap = new Map<string, MockTopicScore>();

  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  for (const id of attempt.questionIds) {
    const q = byId.get(id);
    if (!q) continue;
    const subj =
      subjectMap.get(q.subjectId) ??
      {
        subjectId: q.subjectId,
        subjectName: q.subjectName || `Subject ${q.subjectId}`,
        total: 0,
        correct: 0,
        wrong: 0,
        unanswered: 0,
        marks: 0,
        topics: [],
      };
    subj.total += 1;

    const topicKey = `${q.subjectId}:${q.topicId}`;
    const topic =
      topicMap.get(topicKey) ??
      {
        topicId: q.topicId,
        topicName: q.topicName || `Topic ${q.topicId}`,
        total: 0,
        correct: 0,
        wrong: 0,
        unanswered: 0,
        marks: 0,
      };
    topic.total += 1;

    const answer = attempt.answers[id];
    if (answer == null || answer === "") {
      unanswered += 1;
      subj.unanswered += 1;
      topic.unanswered += 1;
    } else if (answer === q.answer) {
      correct += 1;
      subj.correct += 1;
      subj.marks += attempt.markCorrect;
      topic.correct += 1;
      topic.marks += attempt.markCorrect;
    } else {
      wrong += 1;
      subj.wrong += 1;
      subj.marks += attempt.markWrong;
      topic.wrong += 1;
      topic.marks += attempt.markWrong;
    }
    subjectMap.set(q.subjectId, subj);
    topicMap.set(topicKey, topic);
  }

  // Attach each subject's topics (in first-seen order).
  for (const [key, topic] of topicMap) {
    const subjectId = Number(key.split(":")[0]);
    subjectMap.get(subjectId)?.topics.push(topic);
  }

  const marks = correct * attempt.markCorrect + wrong * attempt.markWrong;

  return {
    totalQuestions: attempt.questionIds.length,
    attempted: correct + wrong,
    correct,
    wrong,
    unanswered,
    marks,
    maxMarks: attempt.questionIds.length * attempt.markCorrect,
    subjects: [...subjectMap.values()],
  };
}
