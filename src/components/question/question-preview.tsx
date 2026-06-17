"use client";

import type { Question } from "@/types/question";
import QuestionOption from "./question-option";

// A static, non-interactive face of a question — used as the "card behind" while
// the active card is being swiped, so the real next/previous question shows
// through (dating-app card stack) instead of an empty shell.
export default function QuestionPreview({ question }: { question: Question }) {
  const subjectLabel = question.subjectName || `Subject ${question.subjectId}`;
  const topicLabel = question.topicName || `Topic ${question.topicId}`;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:p-8">
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
          {subjectLabel}
        </span>
        <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
          {topicLabel}
        </span>
      </div>

      {question.media?.questionImageUrl && (
        <div className="mb-5 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.media.questionImageUrl}
            alt=""
            className="max-h-52 rounded-2xl border border-gray-200 object-contain"
          />
        </div>
      )}

      <h2 className="mb-6 text-center text-xl font-bold leading-relaxed text-gray-900 dark:text-white md:text-2xl">
        {question.question}
      </h2>

      <div className="space-y-3">
        {question.options.map((option) => (
          <QuestionOption
            key={option.key}
            optionKey={option.key}
            value={option.value || ""}
            imageUrl={option.imageUrl}
            type={option.type}
            status="default"
            disabled
            onClick={() => {}}
          />
        ))}
      </div>
    </div>
  );
}
