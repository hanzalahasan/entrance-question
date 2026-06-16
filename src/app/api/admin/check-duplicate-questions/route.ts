import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import OpenAI from "openai";

import { embedTexts } from "@/services/rag-service";

// Semantic ("rephrased, same meaning") duplicate detection. The app's existing
// exact check only catches word-for-word matches; this embeds the candidate
// questions and the existing bank, then flags pairs that mean the same thing
// even when worded differently. Used to vet AI-generated questions before they
// become drafts. See blueprint/TRAINING-MODULE-PLAN.md §12 (related-questions
// embeddings infra — reused here).
export const maxDuration = 60;

// Tuned for question-vs-question similarity with text-embedding-3-small.
const SIMILAR = 0.84; // likely a rephrase of the same question
const NEAR = 0.92; // almost certainly the same question
const MAX_MATCHES = 3;

type Item = { index: number; question: string };
type Candidate = { id: number; question: string };

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 503 }
    );
  }

  const { items, candidates } = (await request.json()) as {
    items: Item[];
    candidates: Candidate[];
  };

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ matches: {} });
  }
  // Nothing to compare against — every item is unique by definition.
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json({ matches: {} });
  }

  const client = new OpenAI({ apiKey });

  try {
    const itemVecs = await embedTexts(
      client,
      items.map((i) => i.question)
    );
    const candVecs = await embedTexts(
      client,
      candidates.map((c) => c.question)
    );

    const matches: Record<
      number,
      { id: number; question: string; similarity: number; level: "near" | "similar" }[]
    > = {};

    items.forEach((item, ii) => {
      const iv = itemVecs[ii];
      if (!iv) return;
      const hits = candidates
        .map((c, ci) => ({
          id: c.id,
          question: c.question,
          similarity: cosine(iv, candVecs[ci] ?? []),
        }))
        .filter((h) => h.similarity >= SIMILAR)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, MAX_MATCHES)
        .map((h) => ({
          ...h,
          similarity: Math.round(h.similarity * 100) / 100,
          level: (h.similarity >= NEAR ? "near" : "similar") as "near" | "similar",
        }));
      if (hits.length) matches[item.index] = hits;
    });

    return NextResponse.json({ matches });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Duplicate check failed: ${message}` },
      { status: 500 }
    );
  }
}
