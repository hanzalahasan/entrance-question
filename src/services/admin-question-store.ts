import type { Question } from "@/types/question";
import { sampleQuestions } from "@/lib/sample-questions";

const STORE_KEY = "admin_questions";

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

export async function getStoredQuestions(): Promise<Question[]> {
  return localGetAll();
}

export async function getStoredQuestionById(id: number): Promise<Question | null> {
  return localGetAll().find((q) => q.id === id) ?? null;
}

export async function saveQuestion(question: Question): Promise<Question> {
  localSaveAll([question, ...localGetAll()]);
  return question;
}

export async function updateQuestion(updated: Question): Promise<void> {
  localSaveAll(localGetAll().map((q) => (q.id === updated.id ? updated : q)));
}

export async function publishQuestion(id: number): Promise<void> {
  localSaveAll(
    localGetAll().map((q) =>
      q.id === id
        ? { ...q, status: "published" as const, updatedAt: new Date().toISOString() }
        : q
    )
  );
}

export async function unpublishQuestion(id: number): Promise<void> {
  localSaveAll(
    localGetAll().map((q) =>
      q.id === id
        ? { ...q, status: "unpublished" as const, updatedAt: new Date().toISOString() }
        : q
    )
  );
}

export async function bulkUpdateQuestionStatus(
  ids: number[],
  status: Question["status"]
): Promise<void> {
  localSaveAll(
    localGetAll().map((q) =>
      ids.includes(q.id) ? { ...q, status, updatedAt: new Date().toISOString() } : q
    )
  );
}

export async function saveQuestions(questions: Question[]): Promise<void> {
  localSaveAll(questions);
}
