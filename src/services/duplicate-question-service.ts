import type { Question } from "@/types/question";

export function normalizeQuestionText(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Whole-bank exact (word-by-word) duplicate check by normalized text only —
 * ignores subject/topic/year. Used when vetting freshly generated questions
 * against everything already in the system. Compares by text since generated
 * items aren't yet saved Questions.
 */
export function findExactTextDuplicates(
  questionText: string,
  existingQuestions: Question[]
) {
  const normalized = normalizeQuestionText(questionText);
  if (!normalized) return [];
  return existingQuestions.filter(
    (q) => normalizeQuestionText(q.question) === normalized
  );
}

function sameQuestion(a: Question, b: Question) {
  return normalizeQuestionText(a.question) === normalizeQuestionText(b.question);
}

export function findExactDuplicateQuestions(
  newQuestion: Question,
  existingQuestions: Question[]
) {
  return existingQuestions.filter((question) => {
    if (question.id === newQuestion.id) return false;

    return (
      sameQuestion(newQuestion, question) &&
      question.subjectId === newQuestion.subjectId &&
      question.topicId === newQuestion.topicId &&
      (question.year || "") === (newQuestion.year || "")
    );
  });
}

export function findClassificationConflicts(
  newQuestion: Question,
  existingQuestions: Question[]
) {
  return existingQuestions.filter((question) => {
    if (question.id === newQuestion.id) return false;

    if (!sameQuestion(newQuestion, question)) return false;

    return (
      question.subjectId !== newQuestion.subjectId ||
      question.topicId !== newQuestion.topicId
    );
  });
}

export function findRepeatedYearQuestions(
  newQuestion: Question,
  existingQuestions: Question[]
) {
  return existingQuestions.filter((question) => {
    if (question.id === newQuestion.id) return false;

    return (
      sameQuestion(newQuestion, question) &&
      question.subjectId === newQuestion.subjectId &&
      question.topicId === newQuestion.topicId &&
      (question.year || "") !== (newQuestion.year || "") &&
      Boolean(question.year) &&
      Boolean(newQuestion.year)
    );
  });
}