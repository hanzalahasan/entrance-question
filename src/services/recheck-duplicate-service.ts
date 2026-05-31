import type { Question } from "@/types/question";

function normalizeQuestionText(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function getGroupKey(question: Question) {
  return [
    normalizeQuestionText(question.question),
    question.subjectId,
    question.topicId,
  ].join("__");
}

export function recheckAllDuplicates(questions: Question[]): Question[] {
  const groupedQuestions = new Map<string, Question[]>();

  questions.forEach((question) => {
    const groupKey = getGroupKey(question);

    if (!groupedQuestions.has(groupKey)) {
      groupedQuestions.set(groupKey, []);
    }

    groupedQuestions.get(groupKey)?.push(question);
  });

  return questions.map((question) => {
    const groupKey = getGroupKey(question);
    const matchingQuestions = groupedQuestions.get(groupKey) || [];

    const sameYearDuplicates = matchingQuestions.filter(
      (item) =>
        item.id !== question.id &&
        (item.year || "") === (question.year || "")
    );

    const repeatedYears = Array.from(
      new Set(matchingQuestions.map((item) => item.year).filter(Boolean))
    ) as string[];

    return {
      ...question,
      repeatedYears,
      repeatCount: repeatedYears.length,
      duplicateCheckStatus:
        sameYearDuplicates.length > 0 ? "possible_duplicate" : "unique",
      possibleDuplicateIds: sameYearDuplicates.map((item) => item.id),
      updatedAt: new Date().toISOString(),
    };
  });
}