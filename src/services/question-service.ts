import type { Question } from "@/types/question";
import type { QuestionFilters } from "@/types/filter";

export const SEEN_QUESTIONS_KEY = "seen_random_question_ids";

export function filterQuestions(
  questions: Question[],
  filters: QuestionFilters
) {
  return questions.filter((question) => {
    const subjectMatch =
      filters.subjects.length === 0 ||
      (question.subjectName != null && filters.subjects.includes(question.subjectName));

    const yearMatch =
      filters.years.length === 0 ||
      (question.year != null && filters.years.includes(question.year));

    const topicMatch =
      filters.topics.length === 0 ||
      (question.topicName != null && filters.topics.includes(question.topicName));

    return subjectMatch && yearMatch && topicMatch;
  });
}

export function getSeenQuestionIds() {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(SEEN_QUESTIONS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveSeenQuestionId(questionId: number) {
  const seenIds = getSeenQuestionIds();

  if (!seenIds.includes(questionId)) {
    localStorage.setItem(
      SEEN_QUESTIONS_KEY,
      JSON.stringify([...seenIds, questionId])
    );
  }
}

export function getRandomQuestionId(
  questions: Question[],
  excludeId?: number
) {
  const seenIds = getSeenQuestionIds();

  let availableQuestions = questions.filter(
    (question) => !seenIds.includes(question.id) && question.id !== excludeId
  );

  if (availableQuestions.length === 0) {
    localStorage.removeItem(SEEN_QUESTIONS_KEY);

    availableQuestions = questions.filter(
      (question) => question.id !== excludeId
    );
  }

  if (availableQuestions.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * availableQuestions.length);
  return availableQuestions[randomIndex].id;
}