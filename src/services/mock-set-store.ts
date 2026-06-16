// ============================================================================
// mock-set-store — CRUD for admin-defined Mock Sets (named difficulty papers).
// ----------------------------------------------------------------------------
// Uses the shared Supabase table `mock_sets` when configured (so every student
// gets the same set), and falls back to localStorage so the app still runs
// without Supabase (per-browser only — not shared). Run
// supabase/mock-sets-setup.sql once to create the table.
// ============================================================================

import { supabase } from "@/lib/supabase";
import type { MockSet } from "@/types/mock";
import type { DifficultyLevel } from "@/types/question";

const LS_KEY = "eq_mock_sets";

type Row = {
  id: number;
  name: string;
  difficulty: DifficultyLevel;
  question_ids: unknown;
  status: MockSet["status"];
  created_at: string;
};

function mapRow(r: Row): MockSet {
  return {
    id: r.id,
    name: r.name,
    difficulty: r.difficulty,
    questionIds: Array.isArray(r.question_ids)
      ? r.question_ids.map((x) => Number(x))
      : [],
    status: r.status,
    createdAt: r.created_at,
  };
}

// ── localStorage fallback ────────────────────────────────────────────────────
function lsGet(): MockSet[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]") as MockSet[];
  } catch {
    return [];
  }
}
function lsSet(v: MockSet[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(v));
  } catch {}
}

// ── Reads ────────────────────────────────────────────────────────────────────
export async function getMockSets(): Promise<MockSet[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("mock_sets")
      .select("*")
      .order("difficulty", { ascending: true })
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return (data as Row[]).map(mapRow);
  }
  return lsGet();
}

export async function getPublishedMockSets(): Promise<MockSet[]> {
  return (await getMockSets()).filter((s) => s.status === "published");
}

// ── Writes ───────────────────────────────────────────────────────────────────
type SaveInput = Omit<MockSet, "id" | "createdAt"> & { id?: number };

export async function saveMockSet(set: SaveInput): Promise<MockSet> {
  if (supabase) {
    const payload = {
      name: set.name,
      difficulty: set.difficulty,
      question_ids: set.questionIds,
      status: set.status,
    };
    const query = set.id
      ? supabase.from("mock_sets").update(payload).eq("id", set.id)
      : supabase.from("mock_sets").insert(payload);
    const { data, error } = await query.select("*").single();
    if (error || !data) throw new Error(error?.message || "Could not save set.");
    return mapRow(data as Row);
  }
  // localStorage
  const all = lsGet();
  if (set.id) {
    const updated: MockSet = {
      ...(all.find((s) => s.id === set.id) as MockSet),
      name: set.name,
      difficulty: set.difficulty,
      questionIds: set.questionIds,
      status: set.status,
    };
    lsSet(all.map((s) => (s.id === set.id ? updated : s)));
    return updated;
  }
  const created: MockSet = {
    id: Date.now(),
    name: set.name,
    difficulty: set.difficulty,
    questionIds: set.questionIds,
    status: set.status,
    createdAt: new Date().toISOString(),
  };
  lsSet([created, ...all]);
  return created;
}

export async function deleteMockSet(id: number): Promise<void> {
  if (supabase) {
    await supabase.from("mock_sets").delete().eq("id", id);
    return;
  }
  lsSet(lsGet().filter((s) => s.id !== id));
}

export async function toggleMockSetStatus(
  id: number,
  current: MockSet["status"]
): Promise<void> {
  const next = current === "published" ? "draft" : "published";
  if (supabase) {
    await supabase.from("mock_sets").update({ status: next }).eq("id", id);
    return;
  }
  lsSet(lsGet().map((s) => (s.id === id ? { ...s, status: next } : s)));
}
