import type { DifficultyLevel } from "./question";

// How the student picks the paper: a real past-year paper, or a freshly
// assembled paper at a chosen difficulty.
export type MockMode = "past_year" | "difficulty";

export type MockSelection =
  | { mode: "past_year"; year: string }
  // `difficulty` is used internally by the admin "auto-fill" when assembling a
  // candidate set; students no longer start a raw difficulty paper directly.
  | { mode: "difficulty"; difficulty: DifficultyLevel }
  // What a student actually starts: a specific named Mock Set (same questions
  // for everyone who takes it).
  | { mode: "set"; setId: number; setName: string; difficulty: DifficultyLevel };

// A named, frozen difficulty paper defined by an admin. Like a past-year paper,
// but identified by a set name and reusable. Lives in Supabase (`mock_sets`) so
// every user gets the same questions. See supabase/mock-sets-setup.sql.
export type MockSet = {
  id: number;
  name: string;
  difficulty: DifficultyLevel;
  questionIds: number[]; // ordered, frozen
  status: "draft" | "published";
  createdAt: string;
};

// Admin-defined distribution. Each subject has a total count and an optional
// per-topic breakdown (topic counts should sum to <= the subject count; any
// remainder is filled from the subject at large).
export type MockTopicQuota = { topicId: number; count: number };
export type MockSubjectQuota = {
  subjectId: number;
  count: number;
  topics: MockTopicQuota[];
};

export type MockConfig = {
  durationMinutes: number;
  markCorrect: number;
  markWrong: number; // negative, e.g. -0.25
  subjects: MockSubjectQuota[];
};

// A running (or finished) attempt — persisted so it can be paused + resumed.
export type MockAttempt = {
  id: string;
  selection: MockSelection;
  questionIds: number[];
  answers: Record<number, string>; // questionId -> chosen option key
  remainingSeconds: number;
  status: "in_progress" | "submitted";
  startedAt: string;
  // Set when the test is submitted (drives the result's start/end timing).
  submittedAt?: string;
  // How many times the student paused — distinguishes "one go" from "paused N×".
  pauseCount?: number;
  durationMinutes: number;
  markCorrect: number;
  markWrong: number;
};

// Per-topic breakdown inside a subject (used by the detailed report).
export type MockTopicScore = {
  topicId: number;
  topicName: string;
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  marks: number;
};

export type MockSubjectScore = {
  subjectId: number;
  subjectName: string;
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  marks: number;
  topics: MockTopicScore[];
};

export type MockResult = {
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  unanswered: number;
  marks: number; // net marks after negative marking
  maxMarks: number;
  subjects: MockSubjectScore[];
};

// A submitted mock test saved to a user's history (mirrors `mock_results`).
export type MockResultRecord = {
  id: number;
  userId: string;
  selection: MockSelection;
  marks: number;
  maxMarks: number;
  markCorrect: number;
  markWrong: number;
  totalQuestions: number;
  correct: number;
  wrong: number;
  unanswered: number;
  questionIds: number[];
  answers: Record<number, string>;
  startedAt: string | null;
  submittedAt: string | null;
  durationMinutes: number | null;
  pauseCount: number;
  createdAt: string;
};

export const DIFFICULTY_LEVELS: DifficultyLevel[] = ["easy", "medium", "hard"];
