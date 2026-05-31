import type { Question } from "@/types/question";
import { sampleQuestions } from "@/lib/sample-questions";

const STORE_KEY = "admin_questions";

const HAS_SUPABASE =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project");

// ── localStorage helpers ─────────────────────────────────────────────

function localGetAll(): Question[] {
  if (typeof window === "undefined") return sampleQuestions;
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) {
    localStorage.setItem(STORE_KEY, JSON.stringify(sampleQuestions));
    return sampleQuestions;
  }
  return JSON.parse(raw) as Question[];
}

function localSaveAll(questions: Question[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORE_KEY, JSON.stringify(questions));
  }
}

// ── Public API ───────────────────────────────────────────────────────

export async function getStoredQuestions(): Promise<Question[]> {
  if (!HAS_SUPABASE) return localGetAll();
  const { fetchAllQuestions } = await import("@/actions/question-actions");
  return fetchAllQuestions();
}

export async function getStoredQuestionById(id: number): Promise<Question | null> {
  if (!HAS_SUPABASE) return localGetAll().find((q) => q.id === id) ?? null;
  const { fetchQuestionById } = await import("@/actions/question-actions");
  return fetchQuestionById(id);
}

export async function saveQuestion(question: Question): Promise<Question> {
  if (!HAS_SUPABASE) {
    localSaveAll([question, ...localGetAll()]);
    return question;
  }
  const { insertQuestion } = await import("@/actions/question-actions");
  return insertQuestion(question);
}

export async function updateQuestion(updated: Question): Promise<void> {
  if (!HAS_SUPABASE) {
    localSaveAll(localGetAll().map((q) => (q.id === updated.id ? updated : q)));
    return;
  }
  const { replaceQuestion } = await import("@/actions/question-actions");
  return replaceQuestion(updated);
}

export async function publishQuestion(id: number): Promise<void> {
  if (!HAS_SUPABASE) {
    localSaveAll(
      localGetAll().map((q) =>
        q.id === id
          ? { ...q, status: "published" as const, updatedAt: new Date().toISOString() }
          : q
      )
    );
    return;
  }
  const { patchQuestion } = await import("@/actions/question-actions");
  return patchQuestion(id, { status: "published", updated_at: new Date().toISOString() });
}

export async function unpublishQuestion(id: number): Promise<void> {
  if (!HAS_SUPABASE) {
    localSaveAll(
      localGetAll().map((q) =>
        q.id === id
          ? { ...q, status: "unpublished" as const, updatedAt: new Date().toISOString() }
          : q
      )
    );
    return;
  }
  const { patchQuestion } = await import("@/actions/question-actions");
  return patchQuestion(id, { status: "unpublished", updated_at: new Date().toISOString() });
}

export async function bulkUpdateQuestionStatus(
  ids: number[],
  status: Question["status"]
): Promise<void> {
  if (!HAS_SUPABASE) {
    localSaveAll(
      localGetAll().map((q) =>
        ids.includes(q.id) ? { ...q, status, updatedAt: new Date().toISOString() } : q
      )
    );
    return;
  }
  const { bulkPatchStatus } = await import("@/actions/question-actions");
  return bulkPatchStatus(ids, status);
}

export async function saveQuestions(questions: Question[]): Promise<void> {
  if (!HAS_SUPABASE) {
    localSaveAll(questions);
    return;
  }
  const { replaceAllQuestions } = await import("@/actions/question-actions");
  return replaceAllQuestions(questions);
}
