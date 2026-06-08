export type DifficultyLevel = "easy" | "medium" | "hard";

export type QuestionSource = "past_year" | "practice";

export type QuestionStatus = "published" | "draft" | "unpublished";

export type OptionContentType = "text" | "image" | "text_image";

export type QuestionOptionType = {
  key: string;
  value?: string;
  imageUrl?: string;
  type: OptionContentType;
};

export type QuestionMedia = {
  questionImageUrl?: string;
  explanationImageUrl?: string;
};

export type DuplicateCheckStatus =
  | "not_checked"
  | "unique"
  | "possible_duplicate"
  | "duplicate";

export type AiReviewStatus =
  | "not_checked"
  | "suggested"
  | "reviewed"
  | "approved";

export type ImportSourceType =
  | "manual"
  | "excel"
  | "pdf"
  | "ai_generated";

export type Question = {
  id: number;
  uuid: string;

  question: string;
  options: QuestionOptionType[];
  answer: string;

  // Short explanation (always shown) + optional deep "Explain more" content.
  // explanationLong is admin-written now; Phase 2 fills it from books + AI.
  explanation: string;
  explanationLong?: string;

  // Concept tags used to surface related questions (and later embeddings).
  concepts?: string[];
  // Pre-computed related question ids (Phase 2). When empty, related questions
  // are computed live by shared concept/topic — see related-question-service.
  relatedQuestionIds?: number[];

  subjectId: number;
  topicId: number;

  subjectName?: string;
  topicName?: string;

  year?: string;
  repeatedYears: string[];
  repeatCount: number;

  source: QuestionSource;
  importSource: ImportSourceType;

  difficulty: DifficultyLevel;
  status: QuestionStatus;

  media?: QuestionMedia;

  aiTags: string[];
  aiReviewStatus: AiReviewStatus;

  duplicateCheckStatus: DuplicateCheckStatus;
  possibleDuplicateIds: number[];

  isMockEligible: boolean;

  createdBy?: string;
  reviewedBy?: string;

  createdAt: string;
  updatedAt: string;
};