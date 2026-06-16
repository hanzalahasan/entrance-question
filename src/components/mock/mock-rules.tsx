"use client";

import {
  OFFICIAL_DISTRIBUTION,
  OFFICIAL_TOTAL_QUESTIONS,
} from "@/services/mock-config-service";

type MockRulesProps = {
  durationMinutes: number;
  markCorrect: number;
  markWrong: number;
  onNext: () => void;
  onCancel: () => void;
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts = [
    h ? `${h} hour${h > 1 ? "s" : ""}` : "",
    m ? `${m} min` : "",
  ].filter(Boolean);
  return `${parts.join(" ")} (${minutes} minutes)`;
}

export default function MockRules({
  durationMinutes,
  markCorrect,
  markWrong,
  onNext,
  onCancel,
}: MockRulesProps) {
  const totalMarks = OFFICIAL_TOTAL_QUESTIONS * markCorrect;

  const format = [
    { label: "Duration", value: `3 hours (${durationMinutes} minutes)` },
    { label: "Total Questions", value: `${OFFICIAL_TOTAL_QUESTIONS} MCQs` },
    { label: "Total Marks", value: `${totalMarks}` },
    {
      label: "Marking Scheme",
      value: `Correct +${markCorrect} · Wrong ${markWrong}`,
    },
  ];

  const rules = [
    `Negative marking applies: every wrong answer deducts ${Math.abs(
      markWrong
    )} mark (4 wrong answers = 1 mark lost). Unanswered questions score 0.`,
    "You can move freely between questions and jump between subject sections, then come back.",
    "You can pause the test and resume later, or reset and start again.",
    "Answers cannot be revealed and explanations are hidden during the test.",
    "Merit list: you must score at or above the 50th percentile to be included.",
  ];

  return (
    <div className="mx-auto w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:p-8">
      <h1 className="mb-1 text-2xl font-black text-gray-900 dark:text-white">
        Mock Test — Rules &amp; Regulations
      </h1>
      <p className="mb-6 text-sm font-semibold text-gray-500 dark:text-slate-400">
        This mirrors the Nepal MBBS entrance exam (MECEE-BL / CEE). Read
        carefully before you begin.
      </p>

      {/* Exam format */}
      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500 dark:text-slate-400">
        Exam format
      </h2>
      <div className="mb-6 grid grid-cols-2 gap-3">
        {format.map((f) => (
          <div
            key={f.label}
            className="rounded-2xl border border-gray-200 p-4 dark:border-slate-600"
          >
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400">
              {f.label}
            </p>
            <p className="mt-1 font-black text-gray-900 dark:text-white">
              {f.value}
            </p>
          </div>
        ))}
      </div>

      {/* Distribution */}
      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500 dark:text-slate-400">
        Question distribution (MBBS cluster)
      </h2>
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-600">
        {OFFICIAL_DISTRIBUTION.map((d, i) => (
          <div
            key={d.name}
            className={`flex items-center justify-between px-4 py-2.5 ${
              i > 0 ? "border-t border-gray-100 dark:border-slate-700" : ""
            }`}
          >
            <span className="font-bold text-gray-700 dark:text-slate-300">
              {d.name}
            </span>
            <span className="font-black text-gray-900 dark:text-white">
              ~{d.count} questions
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-slate-600 dark:bg-slate-900">
          <span className="font-black text-gray-900 dark:text-white">Total</span>
          <span className="font-black text-gray-900 dark:text-white">
            {OFFICIAL_TOTAL_QUESTIONS} questions
          </span>
        </div>
      </div>

      {/* Rules */}
      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500 dark:text-slate-400">
        Rules
      </h2>
      <ol className="space-y-3">
        {rules.map((rule, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-black text-blue-700">
              {i + 1}
            </span>
            <p className="pt-0.5 leading-relaxed text-gray-700 dark:text-slate-300">
              {rule}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          onClick={onCancel}
          className="rounded-2xl border border-gray-300 px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          onClick={onNext}
          className="rounded-2xl bg-blue-600 px-8 py-3 font-black text-white transition hover:bg-blue-700 active:scale-95"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
