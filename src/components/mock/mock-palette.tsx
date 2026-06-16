"use client";

import type { Question } from "@/types/question";

type Section = {
  subjectId: number;
  subjectName: string;
  startIndex: number;
  count: number;
};

type MockPaletteProps = {
  questions: Question[];
  sections: Section[];
  currentIndex: number;
  answers: Record<number, string>;
  onJump: (index: number) => void;
  // "live" colours by answered/not-answered; "review" colours by correctness
  // (green = correct, red = wrong, grey = unattempted).
  mode?: "live" | "review";
};

export default function MockPalette({
  questions,
  sections,
  currentIndex,
  answers,
  onJump,
  mode = "live",
}: MockPaletteProps) {
  const activeSubjectId = questions[currentIndex]?.subjectId;

  // Per-question cell colour (the current cell always shows its blue ring).
  function cellClass(q: Question): string {
    const answered = answers[q.id] != null && answers[q.id] !== "";
    if (mode === "review") {
      if (!answered)
        return "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600";
      return answers[q.id] === q.answer
        ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300"
        : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300";
    }
    return answered
      ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300"
      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600";
  }

  return (
    <div className="flex h-full flex-col">
      {/* Section jump tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {sections.map((s) => (
          <button
            key={s.subjectId}
            onClick={() => onJump(s.startIndex)}
            className={`rounded-full px-3 py-1.5 text-xs font-black transition active:scale-95 ${
              s.subjectId === activeSubjectId
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
            }`}
          >
            {s.subjectName} ({s.count})
          </button>
        ))}
      </div>

      {/* Question number grid */}
      <div className="grid grid-cols-6 gap-2 overflow-y-auto sm:grid-cols-8 lg:grid-cols-6">
        {questions.map((q, i) => {
          const isCurrent = i === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => onJump(i)}
              className={`grid h-9 w-9 place-items-center rounded-lg text-xs font-black transition active:scale-95 ${
                isCurrent
                  ? "bg-blue-600 text-white ring-2 ring-blue-400"
                  : cellClass(q)
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-gray-500 dark:text-slate-400">
        {mode === "review" ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-green-100 dark:bg-green-900/40" />
              Correct
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-red-100 dark:bg-red-900/40" />
              Wrong
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-gray-100 dark:bg-slate-700" />
              Unattempted
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-green-100 dark:bg-green-900/40" />
              Answered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-gray-100 dark:bg-slate-700" />
              Not answered
            </span>
          </>
        )}
      </div>
    </div>
  );
}
