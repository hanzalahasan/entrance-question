"use client";

import type { MockAttempt, MockResult } from "@/types/mock";
import MockMeta from "./mock-meta";
import MockScoreBar from "./mock-score-bar";

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

        {/* Overall progress */}
        <div className="mt-5 rounded-2xl border border-gray-200 p-5 dark:border-slate-600">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-gray-400 dark:text-slate-500">
              Overall
            </p>
            <p className="text-sm font-black text-gray-900 dark:text-white">
              {result.attempted}/{result.totalQuestions}{" "}
              <span className="text-xs font-bold text-gray-400">attempted</span>
            </p>
          </div>
          <MockScoreBar
            correct={result.correct}
            wrong={result.wrong}
            unanswered={result.unanswered}
            showLegend
          />
        </div>

        {/* Subject → topic breakdown, each with its own bar */}
        <div className="mt-6 space-y-4">
          {result.subjects.map((s) => (
            <div
              key={s.subjectId}
              className="rounded-2xl border border-gray-200 p-5 dark:border-slate-600"
            >
              {/* Subject header + subject-level bar */}
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  {s.subjectName}
                </h3>
                <span className="text-sm font-black text-gray-900 dark:text-white">
                  {fmt(s.marks)}{" "}
                  <span className="text-xs font-bold text-gray-400">marks</span>
                </span>
              </div>
              <MockScoreBar
                correct={s.correct}
                wrong={s.wrong}
                unanswered={s.unanswered}
                showLegend
              />

              {/* Per-topic rows, each with a mini bar */}
              <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-slate-700">
                {s.topics.map((t) => (
                  <div key={t.topicId}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-gray-800 dark:text-slate-200">
                        {t.topicName}
                      </span>
                      <span className="flex shrink-0 items-center gap-2.5 text-xs font-bold">
                        <span className="text-green-600 dark:text-green-400">
                          {t.correct}✓
                        </span>
                        <span className="text-red-600 dark:text-red-400">
                          {t.wrong}✗
                        </span>
                        <span className="text-gray-400">{t.unanswered}—</span>
                        <span className="text-gray-500 dark:text-slate-400">
                          /{t.total}
                        </span>
                      </span>
                    </div>
                    <MockScoreBar
                      correct={t.correct}
                      wrong={t.wrong}
                      unanswered={t.unanswered}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
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
