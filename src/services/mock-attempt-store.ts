import type { MockAttempt } from "@/types/mock";

// The single active attempt is persisted so the student can pause and resume
// later (even after closing the tab) or reset and start over.
const ATTEMPT_KEY = "eq_mock_attempt";

export function getActiveAttempt(): MockAttempt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ATTEMPT_KEY);
    if (!raw) return null;
    const attempt = JSON.parse(raw) as MockAttempt;
    return attempt.status === "in_progress" ? attempt : null;
  } catch {
    return null;
  }
}

export function saveAttempt(attempt: MockAttempt): void {
  try {
    localStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
  } catch {}
}

export function clearAttempt(): void {
  try {
    localStorage.removeItem(ATTEMPT_KEY);
  } catch {}
}

// Stable-ish id without Date.now()/Math.random restrictions in this context.
export function newAttemptId(): string {
  return `mock_${Date.now().toString(36)}_${Math.floor(
    Math.random() * 1e6
  ).toString(36)}`;
}
