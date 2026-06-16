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
