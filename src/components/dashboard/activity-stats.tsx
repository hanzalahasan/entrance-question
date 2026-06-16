"use client";

import type { MockResultRecord } from "@/types/mock";

// Quick activity summary computed from a user's saved results.
export default function ActivityStats({
  results,
}: {
  results: MockResultRecord[];
}) {
  const tests = results.length;
  const totalCorrect = results.reduce((a, r) => a + r.correct, 0);
  const totalAnswered = results.reduce((a, r) => a + r.correct + r.wrong, 0);
  const pcts = results.map((r) =>
    r.maxMarks > 0 ? Math.max(0, (r.marks / r.maxMarks) * 100) : 0
  );
  const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
  const best = pcts.length ? Math.round(Math.max(...pcts)) : 0;

  const tiles = [
    { label: "Tests taken", value: String(tests) },
    { label: "Average score", value: `${avg}%` },
    { label: "Best score", value: `${best}%` },
    { label: "Questions answered", value: String(totalAnswered) },
    { label: "Correct answers", value: String(totalCorrect) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-2xl border border-gray-200 bg-white p-4 text-center dark:border-slate-700 dark:bg-slate-800"
        >
          <p className="text-2xl font-black text-gray-900 dark:text-white">
            {t.value}
          </p>
          <p className="mt-1 text-xs font-bold text-gray-500 dark:text-slate-400">
            {t.label}
          </p>
        </div>
      ))}
    </div>
  );
}
