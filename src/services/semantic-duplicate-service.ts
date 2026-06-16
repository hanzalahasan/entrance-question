// Client wrapper around POST /api/admin/check-duplicate-questions — the semantic
// ("rephrased, same meaning") duplicate layer. Pairs with the exact, word-by-word
// check in duplicate-question-service (findExactTextDuplicates). Used by the
// question generator, manual Add Question, and Excel Import so reworded
// duplicates can't slip into the bank through any path.

import type { Question } from "@/types/question";

export type SemanticDupLevel = "near" | "similar";

export type SemanticDupMatch = {
  id: number;
  question: string;
  similarity: number;
  level: SemanticDupLevel;
};

/** Same-subject candidate list (capped) to compare a question against. */
export function candidatesForSubject(
  existing: Question[],
  subjectId: number,
  cap = 1500
) {
  return existing
    .filter((q) => q.subjectId === subjectId)
    .slice(0, cap)
    .map((q) => ({ id: q.id, question: q.question }));
}

/**
 * Run the semantic check. Returns a map keyed by each item's `index` → its
 * matches (sorted, strongest first). Returns {} on any error or empty input —
 * callers treat "no result" as "no duplicate found" (non-fatal).
 */
export async function checkSemanticDuplicates(
  items: { index: number; question: string }[],
  candidates: { id: number; question: string }[]
): Promise<Record<number, SemanticDupMatch[]>> {
  if (items.length === 0 || candidates.length === 0) return {};
  try {
    const res = await fetch("/api/admin/check-duplicate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, candidates }),
    });
    const data = await res.json();
    if (!res.ok || !data.matches) return {};
    return data.matches as Record<number, SemanticDupMatch[]>;
  } catch {
    return {};
  }
}
