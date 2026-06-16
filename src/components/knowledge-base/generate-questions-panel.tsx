"use client";

import { useEffect, useMemo, useState } from "react";

import { getStoredSubjects, getStoredTopics } from "@/services/master-data-store";
import {
  getStoredQuestions,
  saveQuestion,
} from "@/services/admin-question-store";
import { findExactTextDuplicates } from "@/services/duplicate-question-service";
import {
  candidatesForSubject,
  checkSemanticDuplicates,
} from "@/services/semantic-duplicate-service";
import type { SubjectMaster, TopicMaster } from "@/types/master";
import type { Question, DifficultyLevel } from "@/types/question";
import type {
  GeneratedQuestion,
  KbGenerateMode,
  KbGenerateRequest,
  KbGenerateResponse,
} from "@/types/knowledge-base";
import { isKnowledgeBaseAvailable } from "@/services/knowledge-base-service";

const MODE_OPTIONS: { value: KbGenerateMode; label: string; hint: string }[] = [
  {
    value: "hybrid",
    label: "Book + AI (hybrid)",
    hint: "Ground in your Knowledge Base, let AI elaborate. Falls back to AI knowledge if no sources match.",
  },
  {
    value: "kb_only",
    label: "Knowledge Base only",
    hint: "Strictly from your books. Refuses if no sources match this topic.",
  },
  {
    value: "ai_only",
    label: "AI only",
    hint: "Generate purely from the AI's own knowledge. Ignores the Knowledge Base.",
  },
];

type DupMatch = { id: number; question: string; similarity?: number };
type DupInfo = {
  level: "exact" | "near" | "similar";
  matches: DupMatch[];
};
type ReviewItem = GeneratedQuestion & { keep: boolean; dup?: DupInfo };

const inputCls =
  "w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white";

const DIFF_STYLE: Record<DifficultyLevel, string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function GenerateQuestionsPanel() {
  const [subjects, setSubjects] = useState<SubjectMaster[]>([]);
  const [topics, setTopics] = useState<TopicMaster[]>([]);

  const [subjectId, setSubjectId] = useState<number | "">("");
  const [topicId, setTopicId] = useState<number | "">("");
  const [chapter, setChapter] = useState("");
  const [difficulty, setDifficulty] =
    useState<KbGenerateRequest["difficulty"]>("mixed");
  const [count, setCount] = useState(5);
  // Default to AI-only when there's no Knowledge Base to ground against.
  const [mode, setMode] = useState<KbGenerateMode>(
    isKnowledgeBaseAvailable ? "hybrid" : "ai_only"
  );

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [grounded, setGrounded] = useState<boolean | null>(null);
  const [usedMode, setUsedMode] = useState<KbGenerateMode>("hybrid");
  const [checkingDups, setCheckingDups] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    getStoredSubjects().then((s) =>
      setSubjects(s.filter((x) => x.status === "active"))
    );
    getStoredTopics().then(setTopics);
  }, []);

  const activeTopics = useMemo(
    () =>
      topics.filter(
        (t) => t.subjectId === subjectId && t.status === "active"
      ),
    [topics, subjectId]
  );

  async function handleGenerate() {
    setError("");
    setSaved("");
    if (subjectId === "") return setError("Pick a subject.");
    if (topicId === "") return setError("Pick a topic.");

    const subject = subjects.find((s) => s.id === subjectId);
    const topic = topics.find((t) => t.id === topicId);
    if (!subject || !topic) return setError("Invalid subject/topic.");

    setGenerating(true);
    setItems([]);
    setGrounded(null);
    try {
      const payload: KbGenerateRequest = {
        subjectId: subject.id,
        subjectName: subject.name,
        topicId: topic.id,
        topicName: topic.name,
        chapter: chapter.trim() || null,
        difficulty,
        count,
        mode,
      };
      const res = await fetch("/api/admin/kb-generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: KbGenerateResponse & { error?: string } = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed.");
        return;
      }
      const base: ReviewItem[] = data.questions.map((q) => ({
        ...q,
        keep: true,
      }));
      setItems(base);
      setGrounded(data.grounded);
      setUsedMode(mode);
      runDuplicateChecks(base, subject.id);
    } catch {
      setError("Network error during generation.");
    } finally {
      setGenerating(false);
    }
  }

  // Two-layer duplicate vetting against the existing bank:
  //   1. exact (word-by-word, normalized) — whole bank, client-side & free
  //   2. semantic (rephrased / same meaning) — embeddings, same-subject scope
  // Exact + "near" matches are auto-deselected; the admin can re-tick to override.
  async function runDuplicateChecks(base: ReviewItem[], subjId: number) {
    setCheckingDups(true);
    try {
      const existing = await getStoredQuestions();

      // Layer 1 — exact text match across the entire bank.
      const withExact = base.map((it) => {
        const exact = findExactTextDuplicates(it.question, existing);
        if (exact.length === 0) return it;
        return {
          ...it,
          keep: false,
          dup: {
            level: "exact" as const,
            matches: exact
              .slice(0, 3)
              .map((e) => ({ id: e.id, question: e.question })),
          },
        };
      });
      setItems(withExact);

      // Layer 2 — semantic similarity for the items that aren't exact dupes.
      const candidates = candidatesForSubject(existing, subjId);
      const toCheck = withExact
        .map((it, index) => ({ index, question: it.question, dup: it.dup }))
        .filter((x) => !x.dup)
        .map(({ index, question }) => ({ index, question }));

      const matches = await checkSemanticDuplicates(toCheck, candidates);
      if (Object.keys(matches).length === 0) return;

      setItems((prev) =>
        prev.map((it, index) => {
          const hits = matches[index];
          if (!hits || hits.length === 0 || it.dup) return it;
          const level = hits[0].level;
          return {
            ...it,
            keep: level === "near" ? false : it.keep,
            dup: { level, matches: hits },
          };
        })
      );
    } catch {
      // Non-fatal: generation still usable without the duplicate annotations.
    } finally {
      setCheckingDups(false);
    }
  }

  function patchItem(index: number, patch: Partial<ReviewItem>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  }

  async function handleSaveDrafts() {
    const subject = subjects.find((s) => s.id === subjectId);
    const topic = topics.find((t) => t.id === topicId);
    if (!subject || !topic) return;

    const kept = items.filter((it) => it.keep);
    if (kept.length === 0) return setError("Nothing selected to save.");

    setSaving(true);
    setError("");
    try {
      let i = 0;
      for (const it of kept) {
        await saveQuestion(toDraftQuestion(it, subject, topic, i));
        i += 1;
      }
      setSaved(
        `Saved ${kept.length} question${kept.length === 1 ? "" : "s"} as drafts. Review and publish them in Question Management.`
      );
      setItems([]);
      setGrounded(null);
    } catch {
      setError("Could not save the drafts. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const keepCount = items.filter((it) => it.keep).length;
  const dupCount = items.filter((it) => it.dup).length;

  return (
    <div className="space-y-6">
      {/* ── Generation form ─────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Subject">
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value === "" ? "" : Number(e.target.value));
                setTopicId("");
              }}
              className={inputCls}
            >
              <option value="">— Select —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Topic / chapter">
            <select
              value={topicId}
              onChange={(e) =>
                setTopicId(e.target.value === "" ? "" : Number(e.target.value))
              }
              className={inputCls}
              disabled={subjectId === ""}
            >
              <option value="">— Select —</option>
              {activeTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Chapter hint (optional)">
            <input
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="e.g. Laws of Motion"
              className={inputCls}
            />
          </Field>
          <Field label="Difficulty">
            <select
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as KbGenerateRequest["difficulty"])
              }
              className={inputCls}
            >
              <option value="mixed">Mixed (a spread, auto-tagged)</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
          <Field label="How many">
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) =>
                setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
              }
              className={inputCls}
            />
          </Field>
          <Field label="Source">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as KbGenerateMode)}
              className={inputCls}
            >
              {MODE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <p className="mt-3 text-xs font-semibold text-gray-500 dark:text-slate-400">
          {MODE_OPTIONS.find((m) => m.value === mode)?.hint}
        </p>
        {!isKnowledgeBaseAvailable && mode !== "ai_only" && (
          <p className="mt-2 rounded-xl bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            No Knowledge Base is configured, so book grounding is unavailable —
            this will behave like AI-only. Set up Supabase + add sources to ground
            questions in your books.
          </p>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="mt-5 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? "Generating…" : "✨ Generate questions"}
        </button>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        )}
        {saved && (
          <p className="mt-4 rounded-xl bg-green-50 px-4 py-2 text-sm font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
            {saved}
          </p>
        )}
      </div>

      {/* ── Review list ─────────────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                Review {items.length} generated question
                {items.length === 1 ? "" : "s"}
              </h2>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                {grounded
                  ? "📖 Grounded in your Knowledge Base sources."
                  : usedMode === "ai_only"
                    ? "🤖 Generated from the AI's own knowledge (AI-only mode). Review carefully."
                    : "⚠ No matching sources found — generated from general knowledge. Review carefully."}
              </p>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                {checkingDups
                  ? "🔍 Checking for duplicates in the question bank…"
                  : dupCount > 0
                    ? `⚠ ${dupCount} possible duplicate${dupCount === 1 ? "" : "s"} flagged — exact & near matches were unticked.`
                    : "✓ No duplicates found in the question bank."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveDrafts}
              disabled={saving || keepCount === 0}
              className="rounded-2xl bg-green-600 px-6 py-3 font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : `Save ${keepCount} as drafts`}
            </button>
          </div>

          {items.map((it, i) => (
            <QuestionReviewCard
              key={i}
              item={it}
              index={i}
              onPatch={patchItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionReviewCard({
  item,
  index,
  onPatch,
}: {
  item: ReviewItem;
  index: number;
  onPatch: (i: number, patch: Partial<ReviewItem>) => void;
}) {
  const options: { key: "A" | "B" | "C" | "D"; value: string }[] = [
    { key: "A", value: item.optionA },
    { key: "B", value: item.optionB },
    { key: "C", value: item.optionC },
    { key: "D", value: item.optionD },
  ];

  return (
    <div
      className={`rounded-3xl border bg-white p-5 dark:bg-slate-800 ${
        item.keep
          ? "border-gray-200 dark:border-slate-700"
          : "border-gray-200 opacity-50 dark:border-slate-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={item.keep}
            onChange={(e) => onPatch(index, { keep: e.target.checked })}
            className="mt-1 h-4 w-4"
          />
          <span className="font-bold text-gray-900 dark:text-white">
            {index + 1}. {item.question}
          </span>
        </label>

        <div className="flex shrink-0 items-center gap-2">
          {item.dup && <DupBadge level={item.dup.level} />}
          {item.sourcesDisagree && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              ⚠ Sources disagree
            </span>
          )}
          <select
            value={item.difficulty}
            onChange={(e) =>
              onPatch(index, {
                difficulty: e.target.value as DifficultyLevel,
              })
            }
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${DIFF_STYLE[item.difficulty]}`}
          >
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </div>
      </div>

      <ul className="mt-3 space-y-1">
        {options.map((o) => {
          const correct = o.key === item.answer;
          return (
            <li
              key={o.key}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
                correct
                  ? "bg-green-50 font-bold text-green-800 dark:bg-green-900/30 dark:text-green-200"
                  : "text-gray-700 dark:text-slate-300"
              }`}
            >
              {o.key}. {o.value} {correct && "✓"}
            </li>
          );
        })}
      </ul>

      {item.dup && (
        <div className="mt-3 rounded-2xl bg-red-50 px-4 py-2 dark:bg-red-900/20">
          <p className="text-xs font-bold text-red-700 dark:text-red-300">
            {item.dup.level === "exact"
              ? "Word-for-word duplicate already in the bank:"
              : item.dup.level === "near"
                ? "Almost certainly a duplicate (reworded) already in the bank:"
                : "Possibly a rephrase of an existing question:"}
          </p>
          <ul className="mt-1 space-y-0.5">
            {item.dup.matches.map((m) => (
              <li
                key={m.id}
                className="text-xs font-medium text-red-700 dark:text-red-300"
              >
                #{m.id}
                {typeof m.similarity === "number"
                  ? ` · ${Math.round(m.similarity * 100)}%`
                  : ""}{" "}
                — {m.question}
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-bold text-gray-600 dark:text-slate-300">
          Explanation{item.citation ? ` · 📖 ${item.citation}` : ""}
        </summary>
        <p className="mt-2 text-sm font-medium text-gray-700 dark:text-slate-300">
          {item.explanation}
        </p>
        {item.longExplanation && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-slate-400">
            {item.longExplanation}
          </p>
        )}
      </details>
    </div>
  );
}

function DupBadge({ level }: { level: DupInfo["level"] }) {
  const map = {
    exact: { text: "Exact duplicate", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
    near: { text: "Likely duplicate", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
    similar: { text: "Possible rephrase", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  } as const;
  const { text, cls } = map[level];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>
      ⚠ {text}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

// Turn a reviewed generated question into a draft Question (mirrors the import
// flow's rowToQuestion). Always status "draft" — book-grounded questions never
// auto-publish (TRAINING-MODULE-PLAN §9). Citation + conflict flag are recorded
// in aiTags so reviewers see them in Question Management.
function toDraftQuestion(
  it: ReviewItem,
  subject: SubjectMaster,
  topic: TopicMaster,
  offset: number
): Question {
  const now = new Date().toISOString();
  const aiTags: string[] = [];
  if (it.citation) aiTags.push(`source: ${it.citation}`);
  if (it.sourcesDisagree) aiTags.push("⚠ sources-disagree");

  return {
    id: Date.now() + offset,
    uuid: crypto.randomUUID(),
    question: it.question,
    options: [
      { key: "A", value: it.optionA, type: "text" },
      { key: "B", value: it.optionB, type: "text" },
      { key: "C", value: it.optionC, type: "text" },
      { key: "D", value: it.optionD, type: "text" },
    ],
    answer: it.answer,
    explanation: it.explanation,
    explanationLong: it.longExplanation,
    concepts: it.concepts,
    subjectId: subject.id,
    topicId: topic.id,
    subjectName: subject.name,
    topicName: topic.name,
    year: "",
    repeatedYears: [],
    repeatCount: 1,
    source: "practice",
    importSource: "ai_generated",
    difficulty: it.difficulty,
    status: "draft",
    media: {},
    aiTags,
    aiReviewStatus: "suggested",
    duplicateCheckStatus: "not_checked",
    possibleDuplicateIds: [],
    isMockEligible: true,
    createdAt: now,
    updatedAt: now,
  };
}
