// ============================================================================
// knowledge-base-service — client-callable CRUD over kb_sources / kb_chunks.
// ----------------------------------------------------------------------------
// Uses the shared anon Supabase client (src/lib/supabase.ts). Ingestion itself
// (extract → chunk → embed → store) happens server-side in /api/admin/kb-ingest
// because it needs the OpenAI key; this service handles listing and management.
// ============================================================================

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { KbSource, KbChunk, KbTrustTier } from "@/types/knowledge-base";

/** The KB requires Supabase (vectors can't live in localStorage). */
export const isKnowledgeBaseAvailable = isSupabaseConfigured;

type SourceRow = {
  id: number;
  title: string;
  type: KbSource["type"];
  subject_id: number | null;
  subject_name: string | null;
  chapter: string | null;
  citation_label: string | null;
  trust_tier: number;
  source_url: string | null;
  status: KbSource["status"];
  error: string | null;
  chunk_count: number;
  enabled: boolean;
  created_at: string;
};

function mapSource(r: SourceRow): KbSource {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    subjectId: r.subject_id,
    subjectName: r.subject_name,
    chapter: r.chapter,
    citationLabel: r.citation_label,
    trustTier: (r.trust_tier || 2) as KbTrustTier,
    sourceUrl: r.source_url,
    status: r.status,
    error: r.error,
    chunkCount: r.chunk_count,
    enabled: r.enabled,
    createdAt: r.created_at,
  };
}

/** All sources, newest first. Returns [] when Supabase isn't configured. */
export async function getKbSources(): Promise<KbSource[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("kb_sources")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as SourceRow[]).map(mapSource);
}

/** The passages extracted from a source (no embeddings — those are large). */
export async function getKbChunks(sourceId: number): Promise<KbChunk[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("kb_chunks")
    .select("id, source_id, content, chapter, page, created_at")
    .eq("source_id", sourceId)
    .order("id", { ascending: true });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id),
    sourceId: Number(r.source_id),
    content: String(r.content ?? ""),
    chapter: (r.chapter as string) ?? null,
    page: r.page == null ? null : Number(r.page),
    createdAt: String(r.created_at ?? ""),
  }));
}

/** Enable/disable a source for retrieval (disabled sources are skipped). */
export async function setKbSourceEnabled(
  id: number,
  enabled: boolean
): Promise<void> {
  if (!supabase) return;
  await supabase.from("kb_sources").update({ enabled }).eq("id", id);
}

/** Delete a source. Its chunks cascade; the stored file is removed too. */
export async function deleteKbSource(source: KbSource): Promise<void> {
  if (!supabase) return;
  // Remove the original file from Storage if we kept one (pdf/image).
  if (source.sourceUrl && (source.type === "pdf" || source.type === "image")) {
    await supabase.storage.from("knowledge-base").remove([source.sourceUrl]);
  }
  await supabase.from("kb_sources").delete().eq("id", source.id);
}
