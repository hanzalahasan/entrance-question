"use client";

import { useState } from "react";

import type { MockAttempt, MockResult } from "@/types/mock";
import MockMeta from "./mock-meta";
import MockDetailedReport from "./mock-detailed-report";

type MockResultViewProps = {
  result: MockResult;
  attempt: MockAttempt;
  onRetake: () => void;
  onExit: () => void;
  // Open the question-by-question review of this attempt.
  onReview: () => void;
};

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export default function MockResultView({
  result,
  attempt,
  onRetake,
  onExit,
  onReview,
}: MockResultViewProps) {
  const [showDetailed, setShowDetailed] = useState(false);

  const pct =
    result.maxMarks > 0
      ? Math.max(0, Math.round((result.marks / result.maxMarks) * 100))
      : 0;

  return (
    <div className="mx-auto w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:p-8">
      <h1 className="mb-1 text-2xl font-black text-gray-900 dark:text-white">
        Test submitted
      </h1>
      <p className="mb-5 text-sm font-semibold text-gray-500 dark:text-slate-400">
        Negative marking applied ({fmt(result.wrong)} wrong answers).
      </p>

      {/* Timing + mode at the top */}
      <div className="mb-6">
        <MockMeta attempt={attempt} />
      </div>

      <div className="mb-6 rounded-2xl bg-blue-50 p-6 text-center dark:bg-slate-700">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700 dark:text-blue-300">
          Net score
        </p>
        <p className="mt-1 text-4xl font-black text-gray-900 dark:text-white">
          {fmt(result.marks)}{" "}
          <span className="text-2xl text-gray-400">/ {result.maxMarks}</span>
        </p>
        <p className="mt-1 text-sm font-bold text-gray-500 dark:text-slate-400">
          {pct}%
        </p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3 text-center">
        <Stat label="Correct" value={result.correct} tone="green" />
        <Stat label="Wrong" value={result.wrong} tone="red" />
        <Stat label="Unanswered" value={result.unanswered} tone="gray" />
      </div>

      <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-600">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs font-black uppercase text-gray-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Subject</th>
              <th className="px-2 py-2 text-center">✓</th>
              <th className="px-2 py-2 text-center">✗</th>
              <th className="px-2 py-2 text-center">—</th>
              <th className="px-4 py-2 text-right">Marks</th>
            </tr>
          </thead>
          <tbody>
            {result.subjects.map((s) => (
              <tr
                key={s.subjectId}
                className="border-t border-gray-100 dark:border-slate-700"
              >
                <td className="px-4 py-2 font-bold text-gray-900 dark:text-white">
                  {s.subjectName}
                </td>
                <td className="px-2 py-2 text-center text-green-600">{s.correct}</td>
                <td className="px-2 py-2 text-center text-red-600">{s.wrong}</td>
                <td className="px-2 py-2 text-center text-gray-400">{s.unanswered}</td>
                <td className="px-4 py-2 text-right font-black text-gray-900 dark:text-white">
                  {fmt(s.marks)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onExit}
          className="rounded-2xl border border-gray-300 px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
        >
          Exit
        </button>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowDetailed(true)}
            className="rounded-2xl border border-blue-300 bg-blue-50 px-6 py-3 font-black text-blue-700 transition hover:bg-blue-100 active:scale-95 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
          >
            Detailed report
          </button>
          <button
            onClick={onRetake}
            className="rounded-2xl bg-blue-600 px-8 py-3 font-black text-white transition hover:bg-blue-700 active:scale-95"
          >
            Take another
          </button>
        </div>
      </div>

      {showDetailed && (
        <MockDetailedReport
          result={result}
          attempt={attempt}
          onCheckAnswers={() => {
            setShowDetailed(false);
            onReview();
          }}
          onClose={() => setShowDetailed(false)}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "red" | "gray";
}) {
  const toneClass =
    tone === "green"
      ? "text-green-600"
      : tone === "red"
        ? "text-red-600"
        : "text-gray-500";
  return (
    <div className="rounded-2xl border border-gray-200 p-4 dark:border-slate-600">
      <p className={`text-2xl font-black ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs font-bold text-gray-500 dark:text-slate-400">
        {label}
      </p>
    </div>
  );
}
