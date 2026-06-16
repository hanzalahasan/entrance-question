"use client";

import { useMemo, useState } from "react";

import type { Question, DifficultyLevel } from "@/types/question";
import type { MockConfig, MockSet } from "@/types/mock";
import { DIFFICULTY_LEVELS } from "@/types/mock";
import { buildMockQuestions } from "@/services/mock-service";
import { saveMockSet } from "@/services/mock-set-store";

type Props = {
  allQuestions: Question[]; // published bank
  config: MockConfig;
  editing: MockSet | null; // when set, the form edits this set
  onSaved: () => void;
  onCancel: () => void;
};

const inputCls =
  "w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white";

// Build (or edit) one Mock Set: name + difficulty, auto-assemble a candidate
// paper from the difficulty distribution, then add/remove individual questions
// before freezing it with Save.
export default function MockSetBuilder({
  allQuestions,
  config,
  editing,
  onSaved,
  onCancel,
}: Props) {
  // State seeds from `editing`. The page passes a changing `key` so this whole
  // component remounts when the edit target changes — no prop-sync effect needed.
  const [name, setName] = useState(editing?.name ?? "");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    editing?.difficulty ?? "medium"
  );
  const [selectedIds, setSelectedIds] = useState<number[]>(
    editing?.questionIds ?? []
  );
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const byId = useMemo(
    () => new Map(allQuestions.map((q) => [q.id, q])),
    [allQuestions]
  );

  const selectedQuestions = useMemo(
    () => selectedIds.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q)),
    [selectedIds, byId]
  );

  // Candidate questions to add: published, not already selected, matching search.
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const chosen = new Set(selectedIds);
    return allQuestions
      .filter(
        (item) =>
          !chosen.has(item.id) &&
          (item.question.toLowerCase().includes(q) ||
            (item.subjectName || "").toLowerCase().includes(q) ||
            (item.topicName || "").toLowerCase().includes(q))
      )
      .slice(0, 20);
  }, [search, selectedIds, allQuestions]);

  function autoFill() {
    const qs = buildMockQuestions(
      allQuestions,
      { mode: "difficulty", difficulty },
      config
    );
    if (qs.length === 0) {
      setError(
        `No ${difficulty} mock-eligible questions found to assemble a set. Add questions or pick another difficulty.`
      );
      return;
    }
    setError("");
    setSelectedIds(qs.map((q) => q.id));
  }

  function addQuestion(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }
  function removeQuestion(id: number) {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  async function save(status: MockSet["status"]) {
    if (!name.trim()) return setError("Give the set a name.");
    if (selectedIds.length === 0) return setError("Add at least one question.");
    setBusy(true);
    setError("");
    try {
      await saveMockSet({
        id: editing?.id,
        name: name.trim(),
        difficulty,
        questionIds: selectedIds,
        status,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the set.");
    } finally {
      setBusy(false);
    }
  }

  // Subject spread of the current selection (quick sanity for the admin).
  const subjectCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of selectedQuestions) {
      const k = q.subjectName || `Subject ${q.subjectId}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()];
  }, [selectedQuestions]);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900 dark:text-white">
          {editing ? `Edit "${editing.name}"` : "Create a Mock Set"}
        </h2>
        {editing && (
          <button
            onClick={onCancel}
            className="rounded-xl border border-gray-300 px-3 py-1 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel edit
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Set name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Medium Set 1"
            className={inputCls}
          />
        </label>
        <div>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Difficulty
          </span>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTY_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`rounded-2xl border py-2.5 text-sm font-black capitalize transition ${
                  difficulty === level
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-slate-700 dark:text-white"
                    : "border-gray-200 text-gray-700 hover:border-blue-300 dark:border-slate-600 dark:text-white"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={autoFill}
          className="rounded-2xl bg-purple-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-purple-700 active:scale-95"
        >
          ✨ Auto-fill from {difficulty} distribution
        </button>
        <span className="text-sm font-bold text-gray-500 dark:text-slate-400">
          {selectedIds.length} question{selectedIds.length === 1 ? "" : "s"} selected
          {subjectCounts.length > 0 &&
            ` · ${subjectCounts.map(([s, c]) => `${s} ${c}`).join(", ")}`}
        </span>
      </div>

      {/* Add by search */}
      <div className="mt-5">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
          Add a question (search the bank)
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by question text, subject, or topic…"
          className={inputCls}
        />
        {searchResults.length > 0 && (
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-gray-200 p-2 dark:border-slate-600">
            {searchResults.map((q) => (
              <button
                key={q.id}
                onClick={() => addQuestion(q.id)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <span className="truncate text-gray-800 dark:text-slate-200">
                  {q.question}
                </span>
                <span className="shrink-0 text-xs font-bold text-blue-600">
                  + Add · {q.subjectName} · {q.difficulty}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected list */}
      {selectedQuestions.length > 0 && (
        <div className="mt-5">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Questions in this set ({selectedQuestions.length})
          </span>
          <div className="max-h-80 space-y-1 overflow-y-auto rounded-2xl border border-gray-200 p-2 dark:border-slate-600">
            {selectedQuestions.map((q, i) => (
              <div
                key={q.id}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm odd:bg-gray-50 dark:odd:bg-slate-900/50"
              >
                <span className="min-w-0 truncate text-gray-800 dark:text-slate-200">
                  <span className="font-black text-gray-400">{i + 1}.</span>{" "}
                  {q.question}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">
                    {q.subjectName} · {q.difficulty}
                  </span>
                  <button
                    onClick={() => removeQuestion(q.id)}
                    className="rounded-lg px-2 py-0.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                  >
                    Remove
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => save("published")}
          disabled={busy}
          className="rounded-2xl bg-blue-600 px-6 py-3 font-black text-white transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
        >
          {busy ? "Saving…" : editing ? "Save & publish" : "Create & publish"}
        </button>
        <button
          onClick={() => save("draft")}
          disabled={busy}
          className="rounded-2xl border border-gray-300 px-6 py-3 font-bold text-gray-700 transition hover:bg-gray-50 active:scale-95 disabled:opacity-50 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
        >
          Save as draft
        </button>
      </div>
    </div>
  );
}
