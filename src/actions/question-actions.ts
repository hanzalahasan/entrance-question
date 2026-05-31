"use server";

import type { Question } from "@/types/question";
import { sampleQuestions } from "@/lib/sample-questions";

const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co";

function mapRowToQuestion(row: Record<string, unknown>): Question {
  return {
    id: row.id as number,
    uuid: row.uuid as string,
    question: row.question as string,
    options: row.options as Question["options"],
    answer: row.answer as string,
    explanation: row.explanation as string,
    subjectId: row.subject_id as number,
    topicId: row.topic_id as number,
    subjectName: row.subject_name as string | undefined,
    topicName: row.topic_name as string | undefined,
    year: row.year as string | undefined,
    repeatedYears: (row.repeated_years as string[]) ?? [],
    repeatCount: row.repeat_count as number,
    source: row.source as Question["source"],
    importSource: row.import_source as Question["importSource"],
    difficulty: row.difficulty as Question["difficulty"],
    status: row.status as Question["status"],
    media: row.media as Question["media"],
    aiTags: (row.ai_tags as string[]) ?? [],
    aiReviewStatus: row.ai_review_status as Question["aiReviewStatus"],
    duplicateCheckStatus: row.duplicate_check_status as Question["duplicateCheckStatus"],
    possibleDuplicateIds: (row.possible_duplicate_ids as number[]) ?? [],
    isMockEligible: row.is_mock_eligible as boolean,
    createdBy: row.created_by as string | undefined,
    reviewedBy: row.reviewed_by as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapQuestionToRow(q: Question) {
  return {
    id: q.id,
    uuid: q.uuid,
    question: q.question,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    subject_id: q.subjectId,
    topic_id: q.topicId,
    subject_name: q.subjectName,
    topic_name: q.topicName,
    year: q.year ?? null,
    repeated_years: q.repeatedYears,
    repeat_count: q.repeatCount,
    source: q.source,
    import_source: q.importSource,
    difficulty: q.difficulty,
    status: q.status,
    media: q.media ?? null,
    ai_tags: q.aiTags,
    ai_review_status: q.aiReviewStatus,
    duplicate_check_status: q.duplicateCheckStatus,
    possible_duplicate_ids: q.possibleDuplicateIds,
    is_mock_eligible: q.isMockEligible,
    created_by: q.createdBy ?? null,
    reviewed_by: q.reviewedBy ?? null,
    created_at: q.createdAt,
    updated_at: q.updatedAt,
  };
}

export async function fetchAllQuestions(): Promise<Question[]> {
  if (!isSupabaseConfigured) return sampleQuestions;

  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRowToQuestion);
}

export async function fetchQuestionById(id: number): Promise<Question | null> {
  if (!isSupabaseConfigured) {
    return sampleQuestions.find((q) => q.id === id) ?? null;
  }

  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return mapRowToQuestion(data);
}

export async function insertQuestion(question: Question): Promise<Question> {
  if (!isSupabaseConfigured) return question;

  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const row = mapQuestionToRow(question);

  const { data, error } = await supabase
    .from("questions")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRowToQuestion(data);
}

export async function patchQuestion(
  id: number,
  fields: Partial<Record<string, unknown>>
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("questions")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function replaceQuestion(question: Question): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const row = mapQuestionToRow(question);

  const { error } = await supabase.from("questions").upsert(row).eq("id", question.id);
  if (error) throw new Error(error.message);
}

export async function bulkPatchStatus(
  ids: number[],
  status: Question["status"]
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("questions")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids);

  if (error) throw new Error(error.message);
}

export async function replaceAllQuestions(questions: Question[]): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const rows = questions.map(mapQuestionToRow);
  const { error } = await supabase.from("questions").upsert(rows);
  if (error) throw new Error(error.message);
}
