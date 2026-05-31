import type { Question } from "@/types/question";

function normalizeQuestionText(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
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