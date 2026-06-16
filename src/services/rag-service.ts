// ============================================================================
// rag-service — SERVER-ONLY Retrieval-Augmented Generation helpers.
// ----------------------------------------------------------------------------
// Imported only by API routes (it uses the OpenAI key and Node Buffer). Do NOT
// import this from client components. Covers the ingestion pipeline (extract →
// chunk → embed → store) and retrieval (embed query → match_kb_chunks).
// See blueprint/TRAINING-MODULE-PLAN.md §7.
// ============================================================================

import OpenAI from "openai";
import { supabase } from "@/lib/supabase";
import type { KbRetrievedChunk } from "@/types/knowledge-base";

export const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dims, cheap
const VISION_MODEL = "gpt-4o"; // OCR for images (handles messy/handwritten scans)

// ── Chunking ────────────────────────────────────────────────────────────────
// Target ~800 tokens/chunk. We approximate with characters (~4 chars/token →
// ~3200 chars) and keep a small overlap so a concept split across a boundary is
// still retrievable from both chunks. Splits on paragraph/sentence breaks where
// possible to avoid cutting mid-sentence.
const CHUNK_CHARS = 3200;
const CHUNK_OVERLAP = 400;

export function chunkText(raw: string): string[] {
  const text = raw.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return [];
  if (text.length <= CHUNK_CHARS) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + CHUNK_CHARS, text.length);

    if (end < text.length) {
      // Prefer to break at a paragraph, then a sentence, then a space, but only
      // if that break is reasonably close to the target (within the last 30%).
      const window = text.slice(start, end);
      const minBreak = Math.floor(CHUNK_CHARS * 0.7);
      const breakAt = Math.max(
        window.lastIndexOf("\n\n"),
        window.lastIndexOf(". "),
        window.lastIndexOf("\n")
      );
      if (breakAt >= minBreak) end = start + breakAt + 1;
    }

    const piece = text.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= text.length) break;
    start = end - CHUNK_OVERLAP; // overlap with the previous chunk
  }

  return chunks;
}

// ── Embedding ───────────────────────────────────────────────────────────────
// Batched to keep request counts low. OpenAI accepts an array of inputs.
export async function embedTexts(
  client: OpenAI,
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const out: number[][] = [];
  const BATCH = 96;
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const res = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    for (const item of res.data) out.push(item.embedding as number[]);
  }
  return out;
}

export async function embedQuery(
  client: OpenAI,
  text: string
): Promise<number[]> {
  const [vec] = await embedTexts(client, [text.slice(0, 8000)]);
  return vec ?? [];
}

// ── Text extraction (per input type) ─────────────────────────────────────────

export async function extractPdfText(base64: string): Promise<string> {
  // Dynamic import to avoid Vercel build issues with pdf-parse (same as
  // /admin/import's extract-questions route).
  const { PDFParse } = await import("pdf-parse");
  const buffer = Buffer.from(base64, "base64");
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  return (parsed.text ?? "").trim();
}

export async function ocrImage(
  client: OpenAI,
  base64: string,
  mimeType: string
): Promise<string> {
  const res = await client.chat.completions.create({
    model: VISION_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
          },
          {
            type: "text",
            text:
              "Transcribe ALL readable text in this image exactly, preserving " +
              "paragraph breaks. Output only the transcribed text — no commentary, " +
              "no markdown. If there is no readable text, output an empty string.",
          },
        ],
      },
    ],
    max_tokens: 4096,
  });
  return (res.choices[0]?.message?.content ?? "").trim();
}

export async function extractUrlText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; KnowledgeBaseBot/1.0)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
  const html = await res.text();
  return stripHtml(html);
}

/** Minimal HTML → text: drop script/style/nav, strip tags, collapse whitespace. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Retrieval ─────────────────────────────────────────────────────────────--
// Embed a query (a topic/concept or a question) and pull the most similar
// enabled chunks via the match_kb_chunks RPC. Returns [] when the KB isn't set
// up or nothing matches, so callers degrade gracefully (ungrounded fallback).
export async function retrieveChunks(
  client: OpenAI,
  query: string,
  opts: { matchCount?: number; subjectId?: number | null } = {}
): Promise<KbRetrievedChunk[]> {
  if (!supabase || !query.trim()) return [];
  let embedding: number[];
  try {
    embedding = await embedQuery(client, query);
  } catch {
    return [];
  }
  if (embedding.length === 0) return [];

  const { data, error } = await supabase.rpc("match_kb_chunks", {
    query_embedding: embedding,
    match_count: opts.matchCount ?? 6,
    filter_subject_id: opts.subjectId ?? null,
  });
  if (error || !Array.isArray(data)) return [];

  return data.map((r: Record<string, unknown>) => ({
    id: Number(r.id),
    sourceId: Number(r.source_id),
    content: String(r.content ?? ""),
    chapter: (r.chapter as string) ?? null,
    page: r.page == null ? null : Number(r.page),
    similarity: Number(r.similarity ?? 0),
    trustTier: (Number(r.trust_tier) || 2) as KbRetrievedChunk["trustTier"],
    citationLabel: (r.citation_label as string) ?? null,
    title: String(r.title ?? ""),
  }));
}

/** Build a compact, citation-labelled context block for an LLM prompt. */
export function buildContextBlock(chunks: KbRetrievedChunk[]): string {
  return chunks
    .map((c, i) => {
      const cite = c.citationLabel || c.title || `Source ${c.sourceId}`;
      const loc = [c.chapter && `Ch ${c.chapter}`, c.page && `p.${c.page}`]
        .filter(Boolean)
        .join(", ");
      const header = `[${i + 1}] ${cite}${loc ? ` (${loc})` : ""} — trust tier ${c.trustTier}`;
      return `${header}\n${c.content}`;
    })
    .join("\n\n---\n\n");
}
