// Records and reads a signed-in user's random-practice answers (one row per
// question first-answered), for the dashboard's strengths/weaknesses analysis.
// Uses the authed Supabase client (needs auth.uid()). See
// supabase/practice-attempts-setup.sql.

import { supabase } from "@/lib/supabase";
import type { Question } from "@/types/question";

export type PracticeAttempt = {
  questionId: number;
  subjectId: number | null;
  topicId: number | null;
  isCorrect: boolean;
  createdAt: string;
};

export async function recordPracticeAttempt(
  userId: string,
  question: Question,
  isCorrect: boolean
): Promise<void> {
  if (!supabase) return;
  await supabase.from("practice_attempts").insert({
    user_id: userId,
    question_id: question.id,
    subject_id: question.subjectId || null,
    topic_id: question.topicId || null,
    is_correct: isCorrect,
  });
}

export async function getPracticeAttempts(
  userId: string
): Promise<PracticeAttempt[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("practice_attempts")
    .select("question_id, subject_id, topic_id, is_correct, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    questionId: Number(r.question_id),
    subjectId: r.subject_id == null ? null : Number(r.subject_id),
    topicId: r.topic_id == null ? null : Number(r.topic_id),
    isCorrect: Boolean(r.is_correct),
    createdAt: String(r.created_at ?? ""),
  }));
}
