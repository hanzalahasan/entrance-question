"use client";

import { useState } from "react";

import type { MockAttempt, MockResult } from "@/types/mock";
import MockMeta from "./mock-meta";
import MockScoreBar from "./mock-score-bar";
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

      {/* Net score + the correct/wrong/unanswered progress bar below it */}
      <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-6 dark:border-slate-600 dark:from-slate-700/60 dark:to-slate-800">
        <p className="text-center text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-300">
          Net score
        </p>
        <p className="mt-1 text-center text-5xl font-black text-gray-900 dark:text-white">
          {fmt(result.marks)}
          <span className="text-2xl font-bold text-gray-400">
            {" "}
            / {result.maxMarks}
          </span>
        </p>
        <p className="mt-1 text-center text-sm font-bold text-gray-500 dark:text-slate-400">
          {pct}% · {result.attempted}/{result.totalQuestions} attempted
        </p>

        <div className="mt-5">
          <MockScoreBar
            correct={result.correct}
            wrong={result.wrong}
            unanswered={result.unanswered}
            showLegend
          />
        </div>
      </div>

      {/* Per-subject summary */}
      <div className="mb-8">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-400 dark:text-slate-500">
          By subject
        </p>
        <div className="space-y-2">
          {result.subjects.map((s) => (
            <div
              key={s.subjectId}
              className="rounded-2xl border border-gray-200 p-4 dark:border-slate-700"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-bold text-gray-900 dark:text-white">
                  {s.subjectName}
                </span>
                <span className="text-sm font-black text-gray-900 dark:text-white">
                  {fmt(s.marks)}{" "}
                  <span className="text-xs font-bold text-gray-400">marks</span>
                </span>
              </div>
              <MockScoreBar
                correct={s.correct}
                wrong={s.wrong}
                unanswered={s.unanswered}
                size="sm"
                showLegend
              />
            </div>
          ))}
        </div>
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
