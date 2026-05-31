import type { Question } from "@/types/question";
import {
  fetchAllQuestions,
  fetchQuestionById,
  insertQuestion,
  replaceQuestion,
  replaceAllQuestions,
  patchQuestion,
  bulkPatchStatus,
} from "@/actions/question-actions";

export async function getStoredQuestions(): Promise<Question[]> {
  return fetchAllQuestions();
}

export async function getStoredQuestionById(id: number): Promise<Question | null> {
  return fetchQuestionById(id);
}

export async function saveQuestion(question: Question): Promise<Question> {
  return insertQuestion(question);
}

export async function updateQuestion(updatedQuestion: Question): Promise<void> {
  return replaceQuestion(updatedQuestion);
}

export async function unpublishQuestion(id: number): Promise<void> {
  return patchQuestion(id, {
    status: "unpublished",
    updated_at: new Date().toISOString(),
  });
}

export async function publishQuestion(id: number): Promise<void> {
  return patchQuestion(id, {
    status: "published",
    updated_at: new Date().toISOString(),
  });
}

export async function bulkUpdateQuestionStatus(
  ids: number[],
  status: Question["status"]
): Promise<void> {
  return bulkPatchStatus(ids, status);
}

export async function saveQuestions(questions: Question[]): Promise<void> {
  return replaceAllQuestions(questions);
}
