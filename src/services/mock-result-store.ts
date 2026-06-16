// Persists submitted mock tests per user (Supabase `mock_results`) so the
// dashboard can list a user's history. No localStorage fallback — saved history
// is inherently a logged-in, shared-DB feature.

import { supabase } from "@/lib/supabase";
import type { MockAttempt, MockResult, MockResultRecord } from "@/types/mock";

type Row = {
  id: number;
  user_id: string;
  selection: MockResultRecord["selection"];
  marks: number;
  max_marks: number;
  mark_correct: number;
  mark_wrong: number;
  total_questions: number;
  correct: number;
  wrong: number;
  unanswered: number;
  question_ids: unknown;
  answers: unknown;
  started_at: string | null;
  submitted_at: string | null;
  duration_minutes: number | null;
  pause_count: number | null;
  created_at: string;
};

function mapRow(r: Row): MockResultRecord {
  return {
    id: r.id,
    userId: r.user_id,
    selection: r.selection,
    marks: Number(r.marks),
    maxMarks: Number(r.max_marks),
    markCorrect: Number(r.mark_correct ?? 1),
    markWrong: Number(r.mark_wrong ?? 0),
    totalQuestions: r.total_questions,
    correct: r.correct,
    wrong: r.wrong,
    unanswered: r.unanswered,
    questionIds: Array.isArray(r.question_ids)
      ? r.question_ids.map((x) => Number(x))
      : [],
    answers: (r.answers as Record<number, string>) ?? {},
    startedAt: r.started_at,
    submittedAt: r.submitted_at,
    durationMinutes: r.duration_minutes,
    pauseCount: r.pause_count ?? 0,
    createdAt: r.created_at,
  };
}

/** Save a finished attempt + its score for the signed-in user. */
export async function saveMockResult(
  userId: string,
  attempt: MockAttempt,
  result: MockResult
): Promise<void> {
  if (!supabase) return;
  await supabase.from("mock_results").insert({
    user_id: userId,
    selection: attempt.selection,
    marks: result.marks,
    max_marks: result.maxMarks,
    mark_correct: attempt.markCorrect,
    mark_wrong: attempt.markWrong,
    total_questions: result.totalQuestions,
    correct: result.correct,
    wrong: result.wrong,
    unanswered: result.unanswered,
    question_ids: attempt.questionIds,
    answers: attempt.answers,
    started_at: attempt.startedAt,
    submitted_at: attempt.submittedAt ?? new Date().toISOString(),
    duration_minutes: attempt.durationMinutes,
    pause_count: attempt.pauseCount ?? 0,
  });
}

/** A user's saved results, newest first. */
export async function getMockResults(
  userId: string
): Promise<MockResultRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("mock_results")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as Row[]).map(mapRow);
}
