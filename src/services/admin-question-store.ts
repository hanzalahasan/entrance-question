import type { Question } from "@/types/question";
import { questionRepo } from "@/lib/repository";

export const getStoredQuestions = () => questionRepo.getAll();
export const getStoredQuestionById = (id: number) => questionRepo.getById(id);
export const saveQuestion = (q: Question) => questionRepo.insert(q);
export const updateQuestion = (q: Question) => questionRepo.update(q);
export const publishQuestion = (id: number) => questionRepo.patchStatus(id, "published");
export const unpublishQuestion = (id: number) => questionRepo.patchStatus(id, "unpublished");
export const bulkUpdateQuestionStatus = (ids: number[], status: Question["status"]) =>
  questionRepo.bulkPatchStatus(ids, status);
export const saveQuestions = (questions: Question[]) => questionRepo.replaceAll(questions);
