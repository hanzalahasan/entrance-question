"use client";

import { useEffect, useState } from "react";

import type { Question } from "@/types/question";
import type { MockAttempt } from "@/types/mock";
import { mockSections } from "@/services/mock-service";

import QuestionOption from "@/components/question/question-option";
import ExplanationWindow from "@/components/question/explanation-window";
import MockPalette from "./mock-palette";

type MockReviewProps = {
  questions: Question[];
  attempt: MockAttempt;
  onBack: () => void;
};

const DIFF_BADGE: Record<string, string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

// Read-only walkthrough of a submitted attempt: each question shows the
// student's pick, the correct answer, and an explanation window (the same one
// the practice mode uses). Options can't be changed; the palette is colour-coded
// by correctness.
export default function MockReview({
  questions,
  attempt,
  onBack,
}: MockReviewProps) {
  const [index, setIndex] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explFontSize, setExplFontSize] = useState(16);

  const sections = mockSections(questions);
  const current = questions[index];
  const userAnswer = attempt.answers[current.id];
  const isUnanswered = userAnswer == null || userAnswer === "";
  const isCorrect = !isUnanswered && userAnswer === current.answer;

  const selection = attempt.selection;

  function go(delta: number) {
    setIndex((i) => Math.min(questions.length - 1, Math.max(0, i + delta)));
    setShowExplanation(false);
  }

  // Keyboard: ←/→ or Enter move between questions (read-only, no option change).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length]);

  function optionStatus(optionKey: string): "default" | "correct" | "wrong" {
    if (optionKey === current.answer) return "correct";
    if (!isUnanswered && optionKey === userAnswer) return "wrong";
    return "default";
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div>
          <p className="text-sm font-black text-gray-900 dark:text-white">
            Review answers
          </p>
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
            Your answers are locked — green is correct, red is your wrong pick.
          </p>
        </div>
        <button
          onClick={onBack}
          className="rounded-2xl bg-blue-600 px-5 py-2 text-sm font-black text-white transition hover:bg-blue-700 active:scale-95"
        >
          ← Back to results
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Question */}
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {current.subjectName || "Subject"}
            </span>
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
              {current.topicName || "Topic"}
            </span>
            {current.difficulty && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${DIFF_BADGE[current.difficulty] ?? DIFF_BADGE.medium}`}
              >
                {current.difficulty}
              </span>
            )}
            {selection.mode === "past_year" && current.year && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                {current.year}
              </span>
            )}
            <span className="ml-auto text-sm font-black text-gray-400">
              Q {index + 1} / {questions.length}
            </span>
          </div>

          {current.media?.questionImageUrl && (
            <div className="mb-5 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.media.questionImageUrl}
                alt="Question diagram"
                className="max-h-72 rounded-2xl border border-gray-200 object-contain"
              />
            </div>
          )}

          <h2 className="mb-6 text-lg font-bold leading-relaxed text-gray-900 dark:text-white md:text-xl">
            {current.question}
          </h2>

          <div className="space-y-3">
            {current.options.map((option) => (
              <QuestionOption
                key={option.key}
                optionKey={option.key}
                value={option.value || ""}
                imageUrl={option.imageUrl}
                type={option.type}
                status={optionStatus(option.key)}
                disabled
                onClick={() => {}}
              />
            ))}
          </div>

          {/* Verdict */}
          <div
            className={`mt-5 rounded-2xl border p-4 text-center font-bold ${
              isCorrect
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-300"
                : isUnanswered
                  ? "border-gray-200 bg-gray-50 text-gray-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300"
            }`}
          >
            {isCorrect
              ? "✅ Correct"
              : isUnanswered
                ? `— Not answered. Correct answer: ${current.answer}`
                : `❌ Wrong — you chose ${userAnswer}. Correct answer: ${current.answer}`}
          </div>

          {/* Nav + explanation */}
          <div className="mt-6 grid grid-cols-3 items-stretch gap-2">
            <button
              onClick={() => go(-1)}
              disabled={index === 0}
              className="w-full rounded-2xl border border-gray-300 px-2 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700 md:px-5 md:py-3 md:text-base"
            >
              ← Prev
            </button>
            <button
              onClick={() => setShowExplanation(true)}
              className="w-full rounded-2xl bg-blue-600 px-2 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-95 md:px-5 md:py-3 md:text-base"
            >
              Explanation
            </button>
            <button
              onClick={() => go(1)}
              disabled={index === questions.length - 1}
              className="w-full rounded-2xl border border-gray-300 px-2 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700 md:px-5 md:py-3 md:text-base"
            >
              Next →
            </button>
          </div>

          <p className="mt-4 hidden text-center text-xs font-semibold text-gray-400 dark:text-slate-500 md:block">
            Keyboard: ← / → or Enter to move questions
          </p>
        </div>

        {/* Palette (colour-coded by correctness) */}
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:p-5">
          <MockPalette
            questions={questions}
            sections={sections}
            currentIndex={index}
            answers={attempt.answers}
            onJump={(i) => {
              setIndex(i);
              setShowExplanation(false);
            }}
            mode="review"
          />
        </div>
      </div>

      {showExplanation && (
        <ExplanationWindow
          question={current}
          fontSize={explFontSize}
          onFontSizeChange={setExplFontSize}
          // Review mode intentionally has no "Related questions" — passing an
          // empty list hides that button in the explanation window.
          relatedQuestions={[]}
          onStartRelated={() => {}}
          dimmed={false}
          onClose={() => setShowExplanation(false)}
        />
      )}
    </div>
  );
}
