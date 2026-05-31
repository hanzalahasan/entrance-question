"use client";

import { useEffect, useState } from "react";
import type { Question } from "@/types/question";
import QuestionOption from "./question-option";
import {
  getRandomQuestionId,
  saveSeenQuestionId,
} from "@/services/question-service";

type QuestionCardProps = {
  questions: Question[];
};

export default function QuestionCard({ questions }: QuestionCardProps) {
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);
  const [previousQuestionId, setPreviousQuestionId] = useState<number | null>(null);
  const [hasUsedPrevious, setHasUsedPrevious] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    const firstQuestionId = getRandomQuestionId(questions);

    setCurrentQuestionId(firstQuestionId);
    setPreviousQuestionId(null);
    setHasUsedPrevious(false);
    resetQuestionState();

    if (firstQuestionId) {
      saveSeenQuestionId(firstQuestionId);
    }
  }, [questions]);

  const foundQuestion = questions.find(
    (question) => question.id === currentQuestionId
  );

  function resetQuestionState() {
    setSelectedAnswer(null);
    setShowAnswer(false);
    setShowExplanation(false);
  }

  if (questions.length === 0) {
    return (
      <div className="w-full max-w-3xl rounded-3xl border border-gray-200 bg-white p-6 text-center font-semibold text-gray-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white">
        No questions found. Please remove filters to see more questions.
      </div>
    );
  }

  if (!foundQuestion) {
    return (
      <div className="rounded-3xl bg-white p-6 text-center font-semibold dark:bg-slate-900 dark:text-white">
        Loading question...
      </div>
    );
  }

  const currentQuestion = foundQuestion;
  const subjectLabel =
    currentQuestion.subjectName || `Subject ${currentQuestion.subjectId}`;
  const topicLabel =
    currentQuestion.topicName || `Topic ${currentQuestion.topicId}`;

  const repeatedYears = currentQuestion.repeatedYears || [];
  const repeatCount = currentQuestion.repeatCount || repeatedYears.length;

  const isAnswered = selectedAnswer !== null;
  const isCorrect = selectedAnswer === currentQuestion.answer;
  const isLocked = isCorrect || showAnswer;

  function getOptionStatus(optionKey: string) {
    if (!isAnswered) return "default";

    if (optionKey === selectedAnswer && selectedAnswer === currentQuestion.answer) {
      return "correct";
    }

    if (optionKey === selectedAnswer && selectedAnswer !== currentQuestion.answer) {
      return "wrong";
    }

    if (showAnswer && optionKey === currentQuestion.answer) {
      return "correct";
    }

    return "default";
  }

  function handleSelectAnswer(optionKey: string) {
    if (isLocked) return;
    setSelectedAnswer(optionKey);
  }

  function handleRevealAnswer() {
    setShowAnswer(true);
  }

  function goNext() {
    const nextQuestionId = getRandomQuestionId(questions, currentQuestion.id);

    if (!nextQuestionId) return;

    setPreviousQuestionId(currentQuestion.id);
    setCurrentQuestionId(nextQuestionId);
    setHasUsedPrevious(false);
    saveSeenQuestionId(nextQuestionId);
    resetQuestionState();
  }

  function goPrevious() {
    if (previousQuestionId === null || hasUsedPrevious) return;

    setCurrentQuestionId(previousQuestionId);
    setPreviousQuestionId(null);
    setHasUsedPrevious(true);
    resetQuestionState();
  }

  const canGoPrevious = previousQuestionId !== null && !hasUsedPrevious;

  return (
    <>
      <div className="w-full max-w-3xl rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {subjectLabel}
          </span>

          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
            {topicLabel}
          </span>

          {repeatCount > 1 && repeatedYears.length > 0 ? (
            repeatedYears.map((year) => (
              <span
                key={year}
                className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
              >
                {year}
              </span>
            ))
          ) : (
            currentQuestion.year && (
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                Year: {currentQuestion.year}
              </span>
            )
          )}
        </div>

        {currentQuestion.media?.questionImageUrl && (
          <div className="mb-5 flex justify-center">
            <img
              src={currentQuestion.media.questionImageUrl}
              alt="Question diagram"
              className="max-h-80 rounded-2xl border border-gray-200 object-contain"
            />
          </div>
        )}

        <h2 className="mb-6 text-center text-xl font-bold leading-relaxed text-gray-900 dark:text-white md:text-2xl">
          {currentQuestion.question}
        </h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option) => (
            <QuestionOption
              key={option.key}
              optionKey={option.key}
              value={option.value || ""}
              imageUrl={option.imageUrl}
              type={option.type}
              status={getOptionStatus(option.key)}
              disabled={isLocked}
              onClick={() => handleSelectAnswer(option.key)}
            />
          ))}
        </div>

        {isAnswered && (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center font-semibold text-gray-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            {isCorrect
              ? "✅ Correct answer."
              : showAnswer
                ? `Correct answer is ${currentQuestion.answer}.`
                : "❌ Wrong answer."}
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 items-center gap-2">
          <button
            onClick={goPrevious}
            disabled={!canGoPrevious}
            className="justify-self-start rounded-2xl border border-gray-300 px-4 py-3 font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-white"
          >
            Previous
          </button>

          <div className="flex justify-center gap-2">
            {isAnswered && isCorrect && (
              <button
                onClick={() => setShowExplanation(true)}
                className="rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white"
              >
                Explanation
              </button>
            )}

            {isAnswered && !isCorrect && !showAnswer && (
              <button
                onClick={handleRevealAnswer}
                className="rounded-2xl bg-red-600 px-4 py-3 font-semibold text-white"
              >
                Reveal
              </button>
            )}

            {isAnswered && !isCorrect && showAnswer && (
              <button
                onClick={() => setShowExplanation(true)}
                className="rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white"
              >
                Explanation
              </button>
            )}
          </div>

          <button
            onClick={goNext}
            className="justify-self-end rounded-2xl border border-gray-300 px-4 py-3 font-semibold text-gray-700 dark:border-slate-700 dark:text-white"
          >
            Next
          </button>
        </div>
      </div>

      {showExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Explanation
              </h3>

              <button
                onClick={() => setShowExplanation(false)}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white"
              >
                Close
              </button>
            </div>

            {currentQuestion.media?.explanationImageUrl && (
              <img
                src={currentQuestion.media.explanationImageUrl}
                alt="Explanation diagram"
                className="mb-4 max-h-80 rounded-2xl border border-gray-200 object-contain"
              />
            )}

            <p className="leading-relaxed text-gray-700 dark:text-slate-300">
              {currentQuestion.explanation}
            </p>
          </div>
        </div>
      )}
    </>
  );
}