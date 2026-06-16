"use client";

import type { MockAttempt, MockResult } from "@/types/mock";
import MockMeta from "./mock-meta";

type Props = {
  result: MockResult;
  attempt: MockAttempt;
  onCheckAnswers: () => void;
  onClose: () => void;
};

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

// Full-screen report: attempt timing/mode at the top, then a per-subject →
// per-topic breakdown (correct / wrong / unanswered / marks), and a button to
// review the answers question-by-question.
export default function MockDetailedReport({
  result,
  attempt,
  onCheckAnswers,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="my-6 w-full max-w-3xl rounded-3xl border border-gray-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800 md:p-8">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              Detailed report
            </h2>
            <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">
              Performance by subject and topic.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-gray-300 px-3 py-1 text-sm font-bold text-gray-600 transition hover:bg-gray-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            ✕ Close
          </button>
        </div>

        {/* Timing + mode */}
        <MockMeta attempt={attempt} />

        {/* Overall */}
        <div className="mt-5 grid grid-cols-4 gap-2 text-center">
          <Tile label="Total" value={result.totalQuestions} tone="gray" />
          <Tile label="Correct" value={result.correct} tone="green" />
          <Tile label="Wrong" value={result.wrong} tone="red" />
          <Tile label="Unanswered" value={result.unanswered} tone="gray" />
        </div>

        {/* Subject → topic breakdown */}
        <div className="mt-6 space-y-5">
          {result.subjects.map((s) => (
            <div
              key={s.subjectId}
              className="overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-600"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 px-4 py-3 dark:bg-slate-900/60">
                <h3 className="font-black text-gray-900 dark:text-white">
                  {s.subjectName}
                </h3>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="text-green-600">{s.correct} correct</span>
                  <span className="text-red-600">{s.wrong} wrong</span>
                  <span className="text-gray-400">{s.unanswered} unanswered</span>
                  <span className="text-gray-900 dark:text-white">
                    {fmt(s.marks)} marks
                  </span>
                </div>
              </div>

              <table className="w-full text-left text-sm">
                <thead className="text-xs font-black uppercase text-gray-400 dark:text-slate-500">
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th className="px-4 py-2">Topic</th>
                    <th className="px-2 py-2 text-center">✓</th>
                    <th className="px-2 py-2 text-center">✗</th>
                    <th className="px-2 py-2 text-center">—</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {s.topics.map((t) => (
                    <tr
                      key={t.topicId}
                      className="border-b border-gray-50 last:border-0 dark:border-slate-700/50"
                    >
                      <td className="px-4 py-2 font-bold text-gray-800 dark:text-slate-200">
                        {t.topicName}
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-green-600">
                        {t.correct}
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-red-600">
                        {t.wrong}
                      </td>
                      <td className="px-2 py-2 text-center text-gray-400">
                        {t.unanswered}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-gray-900 dark:text-white">
                        {t.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="rounded-2xl border border-gray-300 px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
          >
            Back
          </button>
          <button
            onClick={onCheckAnswers}
            className="rounded-2xl bg-blue-600 px-6 py-3 font-black text-white transition hover:bg-blue-700 active:scale-95"
          >
            Check your answers →
          </button>
        </div>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "red" | "gray";
}) {
  const toneClass =
    tone === "green" ? "text-green-600" : tone === "red" ? "text-red-600" : "text-gray-500";
  return (
    <div className="rounded-2xl border border-gray-200 p-3 dark:border-slate-600">
      <p className={`text-xl font-black ${toneClass}`}>{value}</p>
      <p className="mt-0.5 text-xs font-bold text-gray-500 dark:text-slate-400">
        {label}
      </p>
    </div>
  );
}
