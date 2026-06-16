/**
 * Repository layer — the single place that decides where data is stored.
 *
 *   • Supabase (PostgreSQL)  → used automatically when NEXT_PUBLIC_SUPABASE_URL
 *                              and NEXT_PUBLIC_SUPABASE_ANON_KEY are set. This is
 *                              a SHARED database, so questions an admin adds/imports
 *                              are visible to every student on every device.
 *   • localStorage           → fallback when Supabase isn't configured, so the app
 *                              still runs locally with seed data (per-browser only).
 */

import type { Question } from "@/types/question";
import type { SubjectMaster, TopicMaster } from "@/types/master";
import { sampleQuestions } from "@/lib/sample-questions";
import { subjectsMaster, topicsMaster } from "@/lib/master-data";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// ── Interfaces ───────────────────────────────────────────────────────

export interface QuestionRepo {
  getAll(): Promise<Question[]>;
  getById(id: number): Promise<Question | null>;
  insert(q: Question): Promise<Question>;
  update(q: Question): Promise<void>;
  patchStatus(id: number, status: Question["status"]): Promise<void>;
  bulkPatchStatus(ids: number[], status: Question["status"]): Promise<void>;
  bulkPatchDifficulty(
    ids: number[],
    difficulty: Question["difficulty"]
  ): Promise<void>;
  remove(id: number): Promise<void>;
  bulkRemove(ids: number[]): Promise<void>;
  replaceAll(questions: Question[]): Promise<void>;
}

export interface MasterRepo {
  getSubjects(): Promise<SubjectMaster[]>;
  getTopics(): Promise<TopicMaster[]>;
  insertSubject(s: Omit<SubjectMaster, "id">): Promise<SubjectMaster>;
  insertTopic(t: Omit<TopicMaster, "id">): Promise<TopicMaster>;
  patchSubjectStatus(id: number, status: SubjectMaster["status"]): Promise<void>;
  patchTopicStatus(id: number, status: TopicMaster["status"]): Promise<void>;
}

// ── localStorage helpers ─────────────────────────────────────────────

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

const QUESTIONS_KEY = "admin_questions";
const SUBJECTS_KEY = "master_subjects";
const TOPICS_KEY = "master_topics";

// ── localStorage implementation ──────────────────────────────────────

const localQuestionRepo: QuestionRepo = {
  async getAll() {
    return read<Question[]>(QUESTIONS_KEY, sampleQuestions);
  },
  async getById(id) {
    const all = read<Question[]>(QUESTIONS_KEY, sampleQuestions);
    return all.find((q) => q.id === id) ?? null;
  },
  async insert(q) {
    const all = read<Question[]>(QUESTIONS_KEY, sampleQuestions);
    write(QUESTIONS_KEY, [q, ...all]);
    return q;
  },
  async update(q) {
    const all = read<Question[]>(QUESTIONS_KEY, sampleQuestions);
    write(QUESTIONS_KEY, all.map((item) => (item.id === q.id ? q : item)));
  },
  async patchStatus(id, status) {
    const all = read<Question[]>(QUESTIONS_KEY, sampleQuestions);
    write(
      QUESTIONS_KEY,
      all.map((q) =>
        q.id === id ? { ...q, status, updatedAt: new Date().toISOString() } : q
      )
    );
  },
  async bulkPatchStatus(ids, status) {
    const all = read<Question[]>(QUESTIONS_KEY, sampleQuestions);
    write(
      QUESTIONS_KEY,
      all.map((q) =>
        ids.includes(q.id) ? { ...q, status, updatedAt: new Date().toISOString() } : q
      )
    );
  },
  async bulkPatchDifficulty(ids, difficulty) {
    const all = read<Question[]>(QUESTIONS_KEY, sampleQuestions);
    write(
      QUESTIONS_KEY,
      all.map((q) =>
        ids.includes(q.id)
          ? { ...q, difficulty, updatedAt: new Date().toISOString() }
          : q
      )
    );
  },
  async remove(id) {
    const all = read<Question[]>(QUESTIONS_KEY, sampleQuestions);
    write(QUESTIONS_KEY, all.filter((q) => q.id !== id));
  },
  async bulkRemove(ids) {
    const all = read<Question[]>(QUESTIONS_KEY, sampleQuestions);
    write(QUESTIONS_KEY, all.filter((q) => !ids.includes(q.id)));
  },
  async replaceAll(questions) {
    write(QUESTIONS_KEY, questions);
  },
};

const localMasterRepo: MasterRepo = {
  async getSubjects() {
    return read<SubjectMaster[]>(SUBJECTS_KEY, subjectsMaster);
  },
  async getTopics() {
    return read<TopicMaster[]>(TOPICS_KEY, topicsMaster);
  },
  async insertSubject(s) {
    const all = read<SubjectMaster[]>(SUBJECTS_KEY, subjectsMaster);
    const created: SubjectMaster = { id: Date.now(), ...s };
    write(SUBJECTS_KEY, [...all, created]);
    return created;
  },
  async insertTopic(t) {
    const all = read<TopicMaster[]>(TOPICS_KEY, topicsMaster);
    const created: TopicMaster = { id: Date.now(), ...t };
    write(TOPICS_KEY, [...all, created]);
    return created;
  },
  async patchSubjectStatus(id, status) {
    const all = read<SubjectMaster[]>(SUBJECTS_KEY, subjectsMaster);
    write(SUBJECTS_KEY, all.map((s) => (s.id === id ? { ...s, status } : s)));
  },
  async patchTopicStatus(id, status) {
    const all = read<TopicMaster[]>(TOPICS_KEY, topicsMaster);
    write(TOPICS_KEY, all.map((t) => (t.id === id ? { ...t, status } : t)));
  },
};

// ── Supabase row mappers (snake_case ⇄ camelCase) ────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

function rowToQuestion(r: any): Question {
  return {
    id: Number(r.id),
    uuid: r.uuid,
    question: r.question,
    options: r.options ?? [],
    answer: r.answer ?? "",
    explanation: r.explanation ?? "",
    explanationLong: r.explanation_long ?? "",
    concepts: r.concepts ?? [],
    relatedQuestionIds: (r.related_question_ids ?? []).map(Number),
    subjectId: r.subject_id,
    topicId: r.topic_id,
    subjectName: r.subject_name ?? undefined,
    topicName: r.topic_name ?? undefined,
    year: r.year ?? undefined,
    repeatedYears: r.repeated_years ?? [],
    repeatCount: r.repeat_count ?? 1,
    source: r.source,
    importSource: r.import_source,
    difficulty: r.difficulty,
    status: r.status,
    media: r.media ?? {},
    aiTags: r.ai_tags ?? [],
    aiReviewStatus: r.ai_review_status,
    duplicateCheckStatus: r.duplicate_check_status,
    possibleDuplicateIds: (r.possible_duplicate_ids ?? []).map(Number),
    isMockEligible: r.is_mock_eligible,
    createdBy: r.created_by ?? undefined,
    reviewedBy: r.reviewed_by ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function questionToRow(q: Question): Record<string, any> {
  return {
    id: q.id,
    uuid: q.uuid,
    question: q.question,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    explanation_long: q.explanationLong ?? "",
    concepts: q.concepts ?? [],
    related_question_ids: q.relatedQuestionIds ?? [],
    subject_id: q.subjectId,
    topic_id: q.topicId,
    subject_name: q.subjectName ?? null,
    topic_name: q.topicName ?? null,
    year: q.year ?? null,
    repeated_years: q.repeatedYears ?? [],
    repeat_count: q.repeatCount ?? 1,
    source: q.source,
    import_source: q.importSource,
    difficulty: q.difficulty,
    status: q.status,
    media: q.media ?? {},
    ai_tags: q.aiTags ?? [],
    ai_review_status: q.aiReviewStatus,
    duplicate_check_status: q.duplicateCheckStatus,
    possible_duplicate_ids: q.possibleDuplicateIds ?? [],
    is_mock_eligible: q.isMockEligible,
    created_by: q.createdBy ?? null,
    reviewed_by: q.reviewedBy ?? null,
    updated_at: new Date().toISOString(),
  };
}

function rowToSubject(r: any): SubjectMaster {
  return {
    id: Number(r.id),
    name: r.name,
    slug: r.slug,
    status: r.status,
    displayOrder: r.display_order ?? 0,
  };
}

function rowToTopic(r: any): TopicMaster {
  return {
    id: Number(r.id),
    subjectId: r.subject_id,
    name: r.name,
    slug: r.slug,
    status: r.status,
    displayOrder: r.display_order ?? 0,
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// `supabase` is non-null here because these repos are only selected when
// isSupabaseConfigured is true.
function sb() {
  if (!supabase) throw new Error("Supabase client is not configured.");
  return supabase;
}

// ── Supabase implementation ──────────────────────────────────────────

const supabaseQuestionRepo: QuestionRepo = {
  async getAll() {
    const { data, error } = await sb()
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToQuestion);
  },
  async getById(id) {
    const { data, error } = await sb()
      .from("questions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToQuestion(data) : null;
  },
  async insert(q) {
    const { data, error } = await sb()
      .from("questions")
      .upsert(questionToRow(q), { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return rowToQuestion(data);
  },
  async update(q) {
    const { error } = await sb()
      .from("questions")
      .update(questionToRow(q))
      .eq("id", q.id);
    if (error) throw error;
  },
  async patchStatus(id, status) {
    const { error } = await sb().from("questions").update({ status }).eq("id", id);
    if (error) throw error;
  },
  async bulkPatchStatus(ids, status) {
    const { error } = await sb().from("questions").update({ status }).in("id", ids);
    if (error) throw error;
  },
  async bulkPatchDifficulty(ids, difficulty) {
    const { error } = await sb()
      .from("questions")
      .update({ difficulty })
      .in("id", ids);
    if (error) throw error;
  },
  async remove(id) {
    const { error } = await sb().from("questions").delete().eq("id", id);
    if (error) throw error;
  },
  async bulkRemove(ids) {
    const { error } = await sb().from("questions").delete().in("id", ids);
    if (error) throw error;
  },
  async replaceAll(questions) {
    if (questions.length === 0) return;
    // Upsert the whole set by id (non-destructive: never deletes other rows).
    const { error } = await sb()
      .from("questions")
      .upsert(questions.map(questionToRow), { onConflict: "id" });
    if (error) throw error;
  },
};

const supabaseMasterRepo: MasterRepo = {
  async getSubjects() {
    const { data, error } = await sb()
      .from("subjects")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(rowToSubject);
  },
  async getTopics() {
    const { data, error } = await sb()
      .from("topics")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(rowToTopic);
  },
  async insertSubject(s) {
    const { data, error } = await sb()
      .from("subjects")
      .insert({
        name: s.name,
        slug: s.slug,
        status: s.status,
        display_order: s.displayOrder,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToSubject(data);
  },
  async insertTopic(t) {
    const { data, error } = await sb()
      .from("topics")
      .insert({
        subject_id: t.subjectId,
        name: t.name,
        slug: t.slug,
        status: t.status,
        display_order: t.displayOrder,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToTopic(data);
  },
  async patchSubjectStatus(id, status) {
    const { error } = await sb().from("subjects").update({ status }).eq("id", id);
    if (error) throw error;
  },
  async patchTopicStatus(id, status) {
    const { error } = await sb().from("topics").update({ status }).eq("id", id);
    if (error) throw error;
  },
};

// ── Active repositories ──────────────────────────────────────────────
// Supabase when configured (shared DB), else localStorage (per-browser).

export const questionRepo: QuestionRepo = isSupabaseConfigured
  ? supabaseQuestionRepo
  : localQuestionRepo;

export const masterRepo: MasterRepo = isSupabaseConfigured
  ? supabaseMasterRepo
  : localMasterRepo;
