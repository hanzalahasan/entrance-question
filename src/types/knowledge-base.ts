// Types for the Knowledge Base (Training Module / RAG). Mirrors the Supabase
// schema in supabase/knowledge-base-setup.sql. See blueprint/TRAINING-MODULE-PLAN.md.

export type KbSourceType = "pdf" | "image" | "url" | "text";

export type KbSourceStatus = "processing" | "ready" | "failed";

/** Higher tier wins on conflict: 3 Official/curriculum > 2 textbook > 1 web/notes. */
export type KbTrustTier = 1 | 2 | 3;

export const TRUST_TIER_LABELS: Record<KbTrustTier, string> = {
  3: "Official / curriculum",
  2: "Standard textbook",
  1: "Web / notes",
};

/** One uploaded source (a book, paste, URL, or image). */
export type KbSource = {
  id: number;
  title: string;
  type: KbSourceType;
  subjectId: number | null;
  subjectName: string | null;
  chapter: string | null;
  citationLabel: string | null;
  trustTier: KbTrustTier;
  sourceUrl: string | null;
  status: KbSourceStatus;
  error: string | null;
  chunkCount: number;
  enabled: boolean;
  createdAt: string;
};

/** One embedded passage retrieved at generation time. */
export type KbChunk = {
  id: number;
  sourceId: number;
  content: string;
  chapter: string | null;
  page: number | null;
  createdAt: string;
};

/** A retrieval hit (output of match_kb_chunks), used to ground + cite output. */
export type KbRetrievedChunk = {
  id: number;
  sourceId: number;
  content: string;
  chapter: string | null;
  page: number | null;
  similarity: number;
  trustTier: KbTrustTier;
  citationLabel: string | null;
  title: string;
};

// ── Phase 2: book-grounded question generation ──────────────────────────────

/** What the generate-questions form sends. `difficulty: "mixed"` = a spread. */
export type KbGenerateRequest = {
  subjectId: number;
  subjectName: string;
  topicId: number;
  topicName: string;
  chapter?: string | null;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  count: number;
};

/** One AI-generated MCQ (raw output, before it becomes a draft Question). */
export type GeneratedQuestion = {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: "A" | "B" | "C" | "D";
  explanation: string;
  longExplanation: string;
  concepts: string[];
  difficulty: "easy" | "medium" | "hard";
  /** AI flagged that retrieved sources disagree — must be reviewed, never auto-published. */
  sourcesDisagree: boolean;
  /** Citation label(s) the question is grounded in, e.g. "Physics NCERT, Ch 4". */
  citation: string | null;
};

export type KbGenerateResponse = {
  questions: GeneratedQuestion[];
  /** Whether any Knowledge Base passages backed the generation. */
  grounded: boolean;
  /** The sources that were retrieved (for display). */
  citations: {
    sourceId: number;
    title: string;
    citationLabel: string | null;
    chapter: string | null;
    trustTier: KbTrustTier;
  }[];
};

/** Payload the admin UI sends to /api/admin/kb-ingest. */
export type KbIngestRequest = {
  type: KbSourceType;
  title: string;
  subjectId?: number | null;
  subjectName?: string | null;
  chapter?: string | null;
  citationLabel?: string | null;
  trustTier?: KbTrustTier;
  // One of these, depending on `type`:
  text?: string; // type='text'
  url?: string; // type='url'
  base64?: string; // type='pdf' | 'image'
  mimeType?: string; // type='pdf' | 'image'
  fileName?: string; // type='pdf' | 'image'
};
