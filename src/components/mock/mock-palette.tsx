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
};

export default function MockPalette({
  questions,
  sections,
  currentIndex,
  answers,
  onJump,
}: MockPaletteProps) {
  const activeSubjectId = questions[currentIndex]?.subjectId;

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
          const answered = answers[q.id] != null && answers[q.id] !== "";
          const isCurrent = i === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => onJump(i)}
              className={`grid h-9 w-9 place-items-center rounded-lg text-xs font-black transition active:scale-95 ${
                isCurrent
                  ? "bg-blue-600 text-white ring-2 ring-blue-400"
                  : answered
                    ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-gray-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-green-100 dark:bg-green-900/40" />
          Answered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-gray-100 dark:bg-slate-700" />
          Not answered
        </span>
      </div>
    </div>
  );
}
