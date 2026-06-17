"use client";

import { useState } from "react";

import type { Performance, TopicPerf } from "@/services/performance-service";
import MockScoreBar from "@/components/mock/mock-score-bar";

type AiPlan = {
  summary: string;
  items: { subjectName: string; topicName: string; advice: string }[];
};

function accuracyTone(acc: number) {
  if (acc >= 75) return "text-green-600 dark:text-green-400";
  if (acc >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

// Strengths & weaknesses, overall and per subject/topic, + an on-demand AI study
// plan. `performance` is computed from mocks + random practice.
export default function PerformanceInsights({
  performance,
}: {
  performance: Performance;
}) {
  const [plan, setPlan] = useState<AiPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function getPlan() {
    setLoading(true);
    setError("");
    try {
      const map = (t: TopicPerf) => ({
        subjectName: t.subjectName,
        topicName: t.topicName,
        accuracy: t.accuracy,
        attempted: t.attempted,
        correct: t.correct,
      });
      const res = await fetch("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accuracy: performance.accuracy,
          attempted: performance.attempted,
          weaknesses: performance.weaknesses.map(map),
          strengths: performance.strengths.map(map),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not generate the plan.");
        return;
      }
      setPlan({ summary: data.summary, items: data.items });
    } catch {
      setError("Network error generating the plan.");
    } finally {
      setLoading(false);
    }
  }

  if (performance.attempted === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-slate-600 dark:bg-slate-800">
        <p className="text-sm font-bold text-gray-500 dark:text-slate-400">
          Answer some practice questions or take a mock test — your strengths and
          weaknesses by subject and topic will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Overall */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-base font-black text-gray-900 dark:text-white">
            Overall accuracy
          </h3>
          <span className={`text-2xl font-black ${accuracyTone(performance.accuracy)}`}>
            {performance.accuracy}%
          </span>
        </div>
        <MockScoreBar
          correct={performance.correct}
          wrong={performance.attempted - performance.correct}
          unanswered={0}
          showLegend
        />
        <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-slate-400">
          Based on {performance.attempted} attempted questions (practice + mocks).
        </p>
      </div>

      {/* Strengths & weaknesses */}
      <div className="grid gap-4 md:grid-cols-2">
        <TopicList
          title="💪 Strengths"
          empty="Keep practising — strengths will show once you have a few topics going."
          topics={performance.strengths}
        />
        <TopicList
          title="🎯 Work on these"
          empty="No weak topics flagged yet — nice!"
          topics={performance.weaknesses}
        />
      </div>

      {/* AI study plan */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white">
              Personalised study plan
            </h3>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
              AI advice on what to study next and how, from your weak topics.
            </p>
          </div>
          <button
            onClick={getPlan}
            disabled={loading || performance.weaknesses.length === 0}
            className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
          >
            {loading ? "Thinking…" : plan ? "Regenerate" : "✨ Get AI study plan"}
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        )}

        {plan && (
          <div className="mt-4 space-y-3">
            {plan.summary && (
              <p className="rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-900 dark:bg-blue-900/20 dark:text-blue-100">
                {plan.summary}
              </p>
            )}
            {plan.items.map((it, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-200 p-4 dark:border-slate-600"
              >
                <p className="text-sm font-black text-gray-900 dark:text-white">
                  {it.subjectName} → {it.topicName}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
                  {it.advice}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TopicList({
  title,
  empty,
  topics,
}: {
  title: string;
  empty: string;
  topics: TopicPerf[];
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-3 text-base font-black text-gray-900 dark:text-white">
        {title}
      </h3>
      {topics.length === 0 ? (
        <p className="text-sm font-semibold text-gray-400">{empty}</p>
      ) : (
        <div className="space-y-2">
          {topics.map((t) => (
            <div
              key={`${t.subjectId}:${t.topicId}`}
              className="flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-800 dark:text-slate-200">
                  {t.topicName}
                </p>
                <p className="text-xs font-semibold text-gray-400">
                  {t.subjectName} · {t.correct}/{t.attempted}
                </p>
              </div>
              <span className={`shrink-0 text-sm font-black ${accuracyTone(t.accuracy)}`}>
                {t.accuracy}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
