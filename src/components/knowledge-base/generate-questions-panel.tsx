"use client";

import { useState } from "react";

import {
  getStoredQuestions,
  saveQuestion,
} from "@/services/admin-question-store";
import { findExactTextDuplicates } from "@/services/duplicate-question-service";
import {
  candidatesForSubject,
  checkSemanticDuplicates,
} from "@/services/semantic-duplicate-service";
import type { Question, DifficultyLevel } from "@/types/question";
import type {
  GeneratedQuestion,
  KbGenerateMode,
  KbGenerateRequest,
  KbGenerationPlanItem,
  KbGenerateResponse,
} from "@/types/knowledge-base";

type Difficulty = KbGenerateRequest["difficulty"];

import GenerationPlanForm from "./generation-plan-form";

// A generated question carries the subject/topic it was generated for (the plan
// supports many at once) plus review state and any duplicate match.
type DupMatch = { id: number; question: string; similarity?: number };
type DupInfo = { level: "exact" | "near" | "similar"; matches: DupMatch[] };
type ReviewItem = GeneratedQuestion & {
  keep: boolean;
  dup?: DupInfo;
  subjectId: number;
  subjectName: string;
  topicId: number;
  topicName: string;
  grounded: boolean;
};

const DIFF_STYLE: Record<DifficultyLevel, string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function GenerateQuestionsPanel() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [checkingDups, setCheckingDups] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function handleGenerate(
    plan: KbGenerationPlanItem[],
    difficulty: Difficulty,
    mode: KbGenerateMode
  ) {
    setGenerating(true);
    setError("");
    setSaved("");
    setItems([]);

    const collected: ReviewItem[] = [];
    try {
      let done = 0;
      for (const line of plan) {
        done += 1;
        setProgress(`Generating ${line.subjectName} → ${line.topicName} (${done}/${plan.length})…`);
        try {
          const res = await fetch("/api/admin/kb-generate-questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subjectId: line.subjectId,
              subjectName: line.subjectName,
              topicId: line.topicId,
              topicName: line.topicName,
              difficulty,
              count: line.count,
              mode,
            }),
          });
          const data: KbGenerateResponse & { error?: string } = await res.json();
          if (!res.ok || !data.questions) continue; // skip this topic, keep going
          collected.push(
            ...data.questions.map((q) => ({
              ...q,
              keep: true,
              subjectId: line.subjectId,
              subjectName: line.subjectName,
              topicId: line.topicId,
              topicName: line.topicName,
              grounded: data.grounded,
            }))
          );
        } catch {
          // network hiccup on one topic — continue with the rest
        }
      }

      if (collected.length === 0) {
        setError(
          "No questions were generated. For Knowledge-Base-only mode, make sure the selected topics have sources."
        );
        return;
      }
      setItems(collected);
      runDuplicateChecks(collected);
    } finally {
      setGenerating(false);
      setProgress("");
    }
  }

  // Two-layer duplicate vetting against the existing bank (exact word-by-word +
  // semantic per subject). Exact + near matches are auto-unticked.
  async function runDuplicateChecks(base: ReviewItem[]) {
    setCheckingDups(true);
    try {
      const existing = await getStoredQuestions();

      // Layer 1 — exact text across the whole bank.
      const withExact = base.map((it) => {
        const exact = findExactTextDuplicates(it.question, existing);
        if (exact.length === 0) return it;
        return {
          ...it,
          keep: false,
          dup: {
            level: "exact" as const,
            matches: exact.slice(0, 3).map((e) => ({ id: e.id, question: e.question })),
          },
        };
      });
      setItems(withExact);

      // Layer 2 — semantic, grouped by subject (items without an exact dup).
      const bySubject = new Map<number, { index: number; question: string }[]>();
      withExact.forEach((it, index) => {
        if (it.dup) return;
        const list = bySubject.get(it.subjectId) ?? [];
        list.push({ index, question: it.question });
        bySubject.set(it.subjectId, list);
      });

      let next = withExact;
      for (const [subjectId, group] of bySubject) {
        const matches = await checkSemanticDuplicates(
          group,
          candidatesForSubject(existing, subjectId)
        );
        if (Object.keys(matches).length === 0) continue;
        next = next.map((it, index) => {
          const hits = matches[index];
          if (!hits || hits.length === 0 || it.dup) return it;
          const level = hits[0].level;
          return {
            ...it,
            keep: level === "near" ? false : it.keep,
            dup: { level, matches: hits },
          };
        });
      }
      setItems(next);
    } catch {
      // Non-fatal: generation still usable without the duplicate annotations.
    } finally {
      setCheckingDups(false);
    }
  }

  function patchItem(index: number, patch: Partial<ReviewItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  async function handleSaveDrafts() {
    const kept = items.filter((it) => it.keep);
    if (kept.length === 0) {
      setError("Nothing selected to save.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let i = 0;
      for (const it of kept) {
        await saveQuestion(toDraftQuestion(it, i));
        i += 1;
      }
      setSaved(
        `Saved ${kept.length} question${kept.length === 1 ? "" : "s"} as drafts. Review and publish them in Question Management.`
      );
      setItems([]);
    } catch {
      setError("Could not save the drafts. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const keepCount = items.filter((it) => it.keep).length;
  const dupCount = items.filter((it) => it.dup).length;
  const groundedCount = items.filter((it) => it.grounded).length;

  return (
    <div className="space-y-6">
      <GenerationPlanForm busy={generating} onGenerate={handleGenerate} />

      {generating && progress && (
        <p className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
          {progress}
        </p>
      )}
      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
          {saved}
        </p>
      )}

      {items.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                Review {items.length} generated question
                {items.length === 1 ? "" : "s"}
              </h2>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                📖 {groundedCount} grounded in sources · 🤖 {items.length - groundedCount} from general knowledge
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
            <QuestionReviewCard key={i} item={it} index={i} onPatch={patchItem} />
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
          <span>
            <span className="mb-0.5 block text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              {item.subjectName} → {item.topicName}
            </span>
            <span className="font-bold text-gray-900 dark:text-white">
              {index + 1}. {item.question}
            </span>
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
              onPatch(index, { difficulty: e.target.value as DifficultyLevel })
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

// Turn a reviewed generated question into a draft Question (mirrors the import
// flow's rowToQuestion). Always status "draft" — generated questions never
// auto-publish (TRAINING-MODULE-PLAN §9). Citation + conflict flag ride in aiTags.
function toDraftQuestion(it: ReviewItem, offset: number): Question {
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
    subjectId: it.subjectId,
    topicId: it.topicId,
    subjectName: it.subjectName,
    topicName: it.topicName,
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
