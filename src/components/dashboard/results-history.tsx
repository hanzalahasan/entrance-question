"use client";

import type { MockResultRecord, MockSelection } from "@/types/mock";
import MockScoreBar from "@/components/mock/mock-score-bar";

export function selectionLabel(sel: MockSelection): string {
  if (sel.mode === "past_year") return `Past Year ${sel.year}`;
  if (sel.mode === "set") return `${sel.setName} · ${sel.difficulty}`;
  return `Practice · ${sel.difficulty}`;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

// The user's mock-test history. Each row opens its detailed report on "View".
export default function ResultsHistory({
  results,
  onView,
  onDownload,
  downloadingId,
}: {
  results: MockResultRecord[];
  onView: (record: MockResultRecord) => void;
  onDownload: (record: MockResultRecord) => void;
  downloadingId: number | null;
}) {
  if (results.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-800">
        <p className="text-sm font-bold text-gray-500 dark:text-slate-400">
          No mock tests yet. Take one to see your results here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((r) => {
        const pct =
          r.maxMarks > 0 ? Math.max(0, Math.round((r.marks / r.maxMarks) * 100)) : 0;
        return (
          <div
            key={r.id}
            className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white">
                  {selectionLabel(r.selection)}
                </h3>
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                  {new Date(r.submittedAt ?? r.createdAt).toLocaleString([], {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-black text-gray-900 dark:text-white">
                    {fmt(r.marks)}
                    <span className="text-sm font-bold text-gray-400">
                      {" "}
                      / {fmt(r.maxMarks)}
                    </span>
                  </p>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400">
                    {pct}%
                  </p>
                </div>
                <button
                  onClick={() => onView(r)}
                  className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-95"
                >
                  View report
                </button>
                <button
                  onClick={() => onDownload(r)}
                  disabled={downloadingId === r.id}
                  className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-100 active:scale-95 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {downloadingId === r.id ? "…" : "⬇ PDF"}
                </button>
              </div>
            </div>

            <MockScoreBar
              correct={r.correct}
              wrong={r.wrong}
              unanswered={r.unanswered}
              size="sm"
              showLegend
            />
          </div>
        );
      })}
    </div>
  );
}
