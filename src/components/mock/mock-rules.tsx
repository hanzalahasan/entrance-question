"use client";

type MockRulesProps = {
  durationMinutes: number;
  totalQuestions: number;
  markCorrect: number;
  markWrong: number;
  onNext: () => void;
  onCancel: () => void;
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hour${h > 1 ? "s" : ""}`;
  return `${m} min`;
}

export default function MockRules({
  durationMinutes,
  totalQuestions,
  markCorrect,
  markWrong,
  onNext,
  onCancel,
}: MockRulesProps) {
  const rules = [
    `Duration: ${formatDuration(durationMinutes)}. A countdown runs for the whole paper.`,
    `${totalQuestions} multiple-choice questions, ${totalQuestions} total marks.`,
    `Marking: +${markCorrect} for a correct answer, ${markWrong} for a wrong answer (negative marking). Unanswered questions score 0.`,
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
        Read carefully before you begin. The format mirrors the Nepal MBBS
        entrance exam (MECEE-BL / CEE).
      </p>

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
