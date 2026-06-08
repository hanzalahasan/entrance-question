import type { Question } from "@/types/question";

/**
 * Find questions related to `current` from a pool (Phase 1 — no ML).
 *
 * Ranking, best first:
 *   1. shares one or more concept tags (more shared concepts = higher)
 *   2. same topic
 *   3. same subject
 * Self and the current question are excluded. If `current.relatedQuestionIds`
 * is populated (Phase 2 pre-computes these), those win and are used directly.
 *
 * Returns up to `max` (caps at the pool size); the caller decides whether the
 * count meets the desired minimum.
 */
export function getRelatedQuestions(
  current: Question,
  pool: Question[],
  max = 10
): Question[] {
  const candidates = pool.filter(
    (q) => q.id !== current.id && q.status === "published"
  );

  // Phase 2 path: explicit pre-computed related ids take priority.
  if (current.relatedQuestionIds && current.relatedQuestionIds.length > 0) {
    const byId = new Map(candidates.map((q) => [q.id, q]));
    const explicit = current.relatedQuestionIds
      .map((id) => byId.get(id))
      .filter((q): q is Question => Boolean(q));
    if (explicit.length > 0) return explicit.slice(0, max);
  }

  const currentConcepts = new Set((current.concepts ?? []).map((c) => c.toLowerCase()));

  const scored = candidates.map((q) => {
    const sharedConcepts = (q.concepts ?? []).filter((c) =>
      currentConcepts.has(c.toLowerCase())
    ).length;

    let score = 0;
    if (sharedConcepts > 0) score += 100 + sharedConcepts * 10; // concept match dominates
    if (q.topicId === current.topicId) score += 30;
    if (q.subjectId === current.subjectId) score += 10;

    return { q, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((s) => s.q);
}
