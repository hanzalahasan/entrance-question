import type { SubjectMaster } from "@/types/master";
import type { MockConfig, MockSubjectQuota } from "@/types/mock";

// v1: the admin mock config lives in localStorage (per-browser). It is wrapped
// behind this service so it can later move to a shared Supabase `app_settings`
// table without touching callers.
const CONFIG_KEY = "eq_mock_config";

// Official MECEE-BL (MBBS cluster) distribution, matched by subject name.
const DEFAULT_SUBJECT_COUNTS: Record<string, number> = {
  physics: 50,
  chemistry: 50,
  zoology: 40,
  botany: 40,
  mat: 20,
  "mental agility test": 20,
  "mental agility": 20,
};

export const DEFAULT_DURATION_MINUTES = 180;
export const DEFAULT_MARK_CORRECT = 1;
export const DEFAULT_MARK_WRONG = -0.25;

// The official MECEE-BL (MBBS cluster) exam format — shown verbatim in the
// rules window so students always see the real structure regardless of how the
// local question bank is currently filled.
export const OFFICIAL_TOTAL_QUESTIONS = 200;
export const OFFICIAL_DISTRIBUTION: { name: string; count: number }[] = [
  { name: "Physics", count: 50 },
  { name: "Chemistry", count: 50 },
  { name: "Zoology", count: 40 },
  { name: "Botany", count: 40 },
  { name: "Mental Agility Test (MAT)", count: 20 },
];

// Build a sensible default config from the active subjects (counts seeded from
// the official distribution; unknown subjects start at 0 for the admin to set).
export function buildDefaultConfig(subjects: SubjectMaster[]): MockConfig {
  const active = subjects
    .filter((s) => s.status === "active")
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const quotas: MockSubjectQuota[] = active.map((s) => ({
    subjectId: s.id,
    count: DEFAULT_SUBJECT_COUNTS[s.name.trim().toLowerCase()] ?? 0,
    topics: [],
  }));

  return {
    durationMinutes: DEFAULT_DURATION_MINUTES,
    markCorrect: DEFAULT_MARK_CORRECT,
    markWrong: DEFAULT_MARK_WRONG,
    subjects: quotas,
  };
}

// Merge a stored config with the current subject list so newly-added subjects
// always appear (with count 0) and removed subjects drop out.
export function reconcileConfig(
  config: MockConfig,
  subjects: SubjectMaster[]
): MockConfig {
  const active = subjects
    .filter((s) => s.status === "active")
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const bySubject = new Map(config.subjects.map((q) => [q.subjectId, q]));

  return {
    ...config,
    subjects: active.map(
      (s) =>
        bySubject.get(s.id) ?? { subjectId: s.id, count: 0, topics: [] }
    ),
  };
}

export function getStoredMockConfig(): MockConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as MockConfig) : null;
  } catch {
    return null;
  }
}

export function saveMockConfig(config: MockConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {}
}

// The config to use for building a mock: stored (reconciled) or a fresh default.
export function resolveMockConfig(subjects: SubjectMaster[]): MockConfig {
  const stored = getStoredMockConfig();
  return stored
    ? reconcileConfig(stored, subjects)
    : buildDefaultConfig(subjects);
}

export function totalConfiguredQuestions(config: MockConfig): number {
  return config.subjects.reduce((sum, s) => sum + (s.count || 0), 0);
}
