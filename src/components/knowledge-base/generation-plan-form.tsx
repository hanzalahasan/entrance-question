"use client";

import { useEffect, useMemo, useState } from "react";

import { getStoredSubjects, getStoredTopics } from "@/services/master-data-store";
import { isKnowledgeBaseAvailable } from "@/services/knowledge-base-service";
import type { SubjectMaster, TopicMaster } from "@/types/master";
import type {
  KbGenerateMode,
  KbGenerateRequest,
  KbGenerationPlanItem,
} from "@/types/knowledge-base";

type Difficulty = KbGenerateRequest["difficulty"];

const DEFAULT_PER_TOPIC = 5;

const MODE_OPTIONS: { value: KbGenerateMode; label: string; hint: string }[] = [
  {
    value: "hybrid",
    label: "Book + AI (hybrid)",
    hint: "Ground in your Knowledge Base, let AI elaborate. Falls back to AI knowledge if no sources match.",
  },
  {
    value: "kb_only",
    label: "Knowledge Base only",
    hint: "Strictly from your books. Skips any topic with no matching sources.",
  },
  {
    value: "ai_only",
    label: "AI only",
    hint: "Generate purely from the AI's own knowledge. Ignores the Knowledge Base.",
  },
];

const inputCls =
  "w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white";

/**
 * Selection form for question generation. Pick multiple subjects → their topics
 * appear (filtered to the chosen subjects) → tick the topics you want and set
 * "how many" for each. Emits a generation plan (one line per selected topic).
 */
export default function GenerationPlanForm({
  busy,
  onGenerate,
}: {
  busy: boolean;
  onGenerate: (
    plan: KbGenerationPlanItem[],
    difficulty: Difficulty,
    mode: KbGenerateMode
  ) => void;
}) {
  const [subjects, setSubjects] = useState<SubjectMaster[]>([]);
  const [topics, setTopics] = useState<TopicMaster[]>([]);

  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  // topicId → how many questions to generate for it (presence = selected).
  const [counts, setCounts] = useState<Record<number, number>>({});

  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [mode, setMode] = useState<KbGenerateMode>(
    isKnowledgeBaseAvailable ? "hybrid" : "ai_only"
  );
  const [error, setError] = useState("");

  useEffect(() => {
    getStoredSubjects().then((s) =>
      setSubjects(s.filter((x) => x.status === "active"))
    );
    getStoredTopics().then((t) =>
      setTopics(t.filter((x) => x.status === "active"))
    );
  }, []);

  // Topics of the selected subjects only, grouped by subject for display.
  const groupedTopics = useMemo(() => {
    return selectedSubjectIds
      .map((sid) => ({
        subject: subjects.find((s) => s.id === sid),
        topics: topics.filter((t) => t.subjectId === sid),
      }))
      .filter((g) => g.subject);
  }, [selectedSubjectIds, subjects, topics]);

  function toggleSubject(id: number) {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    // Drop counts for topics whose subject was just removed.
    if (selectedSubjectIds.includes(id)) {
      const removedTopicIds = topics
        .filter((t) => t.subjectId === id)
        .map((t) => t.id);
      setCounts((prev) => {
        const next = { ...prev };
        removedTopicIds.forEach((tid) => delete next[tid]);
        return next;
      });
    }
  }

  function toggleTopic(topicId: number, checked: boolean) {
    setCounts((prev) => {
      const next = { ...prev };
      if (checked) next[topicId] = next[topicId] ?? DEFAULT_PER_TOPIC;
      else delete next[topicId];
      return next;
    });
  }

  function setTopicCount(topicId: number, n: number) {
    setCounts((prev) => ({
      ...prev,
      [topicId]: Math.max(1, Math.min(20, n || 1)),
    }));
  }

  const selectedTopicCount = Object.keys(counts).length;
  const totalQuestions = Object.values(counts).reduce((a, b) => a + b, 0);

  function handleSubmit() {
    setError("");
    const plan: KbGenerationPlanItem[] = [];
    for (const [topicIdStr, count] of Object.entries(counts)) {
      const topicId = Number(topicIdStr);
      const topic = topics.find((t) => t.id === topicId);
      const subject = topic && subjects.find((s) => s.id === topic.subjectId);
      if (topic && subject) {
        plan.push({
          subjectId: subject.id,
          subjectName: subject.name,
          topicId: topic.id,
          topicName: topic.name,
          count,
        });
      }
    }
    if (plan.length === 0) {
      setError("Select at least one topic and how many questions you need.");
      return;
    }
    onGenerate(plan, difficulty, mode);
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      {/* Step 1 — subjects (multi-select) */}
      <FieldLabel>1. Subjects</FieldLabel>
      <div className="mt-2 flex flex-wrap gap-2">
        {subjects.map((s) => {
          const on = selectedSubjectIds.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleSubject(s.id)}
              className={`rounded-2xl border px-4 py-2 text-sm font-bold transition ${
                on
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              }`}
            >
              {on ? "✓ " : ""}
              {s.name}
            </button>
          );
        })}
        {subjects.length === 0 && (
          <p className="text-sm font-semibold text-gray-400">
            No active subjects — add some in Master Settings.
          </p>
        )}
      </div>

      {/* Step 2 — topics of selected subjects, with per-topic counts */}
      {selectedSubjectIds.length > 0 && (
        <div className="mt-6">
          <FieldLabel>2. Topics &amp; how many for each</FieldLabel>
          <div className="mt-2 space-y-4">
            {groupedTopics.map(({ subject, topics: subjectTopics }) => (
              <div
                key={subject!.id}
                className="rounded-2xl border border-gray-200 p-4 dark:border-slate-600"
              >
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  {subject!.name}
                </p>
                {subjectTopics.length === 0 ? (
                  <p className="text-xs font-semibold text-gray-400">
                    No topics for this subject yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {subjectTopics.map((t) => {
                      const selected = t.id in counts;
                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between gap-3"
                        >
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(e) => toggleTopic(t.id, e.target.checked)}
                              className="h-4 w-4"
                            />
                            <span className="text-sm font-bold text-gray-800 dark:text-slate-200">
                              {t.name}
                            </span>
                          </label>
                          {selected && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-500">
                                how many
                              </span>
                              <input
                                type="number"
                                min={1}
                                max={20}
                                value={counts[t.id]}
                                onChange={(e) =>
                                  setTopicCount(t.id, Number(e.target.value))
                                }
                                className="w-20 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-bold text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — difficulty + source */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <FieldLabel>Difficulty</FieldLabel>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className={`mt-2 ${inputCls}`}
          >
            <option value="mixed">Mixed (a spread, auto-tagged)</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label className="block">
          <FieldLabel>Source</FieldLabel>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as KbGenerateMode)}
            className={`mt-2 ${inputCls}`}
          >
            {MODE_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-slate-400">
        {MODE_OPTIONS.find((m) => m.value === mode)?.hint}
      </p>
      {!isKnowledgeBaseAvailable && mode !== "ai_only" && (
        <p className="mt-2 rounded-xl bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          No Knowledge Base is configured, so book grounding is unavailable — this
          behaves like AI-only.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={busy || selectedTopicCount === 0}
        className="mt-5 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {busy
          ? "Generating…"
          : selectedTopicCount === 0
            ? "✨ Generate questions"
            : `✨ Generate ${totalQuestions} question${totalQuestions === 1 ? "" : "s"} across ${selectedTopicCount} topic${selectedTopicCount === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
      {children}
    </span>
  );
}
