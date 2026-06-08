"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import type { Question } from "@/types/question";
import QuestionOption from "./question-option";
import {
  getRandomQuestionId,
  saveSeenQuestionId,
} from "@/services/question-service";
import { getRelatedQuestions } from "@/services/related-question-service";

type QuestionCardProps = {
  questions: Question[];
  // All published questions (unfiltered) — used to look up + show related
  // questions, which may fall outside the current subject/year/topic filter.
  pool?: Question[];
};

export default function QuestionCard({ questions, pool }: QuestionCardProps) {
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);
  const [previousQuestionId, setPreviousQuestionId] = useState<number | null>(null);
  const [hasUsedPrevious, setHasUsedPrevious] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  // Inside the explanation modal: whether the long explanation is expanded, and
  // which panel is shown (the explanation vs the related-questions list).
  const [showLong, setShowLong] = useState(false);
  // Compact (scrollable) vs expanded (tall) explanation modal.
  const [expanded, setExpanded] = useState(false);
  const [explanationTab, setExplanationTab] = useState<"explanation" | "related">(
    "explanation"
  );
  // Whether the explanation has been opened at least once this question — lets
  // the Enter flow know to advance (rather than re-open) after it's been closed.
  const [explanationSeen, setExplanationSeen] = useState(false);
  // Index of the option the keyboard (Up/Down arrows) is currently on.
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  // Brief "pressed" pulse on the nav buttons — fires for clicks AND arrow keys
  // so navigation always feels responsive.
  const [navPulse, setNavPulse] = useState<"next" | "prev" | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pulseNav(direction: "next" | "prev") {
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    setNavPulse(direction);
    pulseTimer.current = setTimeout(() => setNavPulse(null), 180);
  }

  useEffect(() => {
    return () => {
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
    };
  }, []);

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

  // Keyboard navigation. The listener is bound once; it always calls the
  // latest handler via a ref, so it sees fresh state/closures each render.
  const keyHandlerRef = useRef<(event: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      keyHandlerRef.current(event);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Resolve the current question from the full pool (so we can show a related
  // question that sits outside the active filter), falling back to the filter.
  const lookup = pool && pool.length > 0 ? pool : questions;
  const foundQuestion =
    lookup.find((question) => question.id === currentQuestionId) ??
    questions.find((question) => question.id === currentQuestionId);

  function resetQuestionState() {
    setSelectedAnswer(null);
    setShowAnswer(false);
    setShowExplanation(false);
    setShowLong(false);
    setExpanded(false);
    setExplanationTab("explanation");
    setExplanationSeen(false);
    setHighlightedIndex(0);
  }

  function openExplanation() {
    setShowExplanation(true);
    setShowLong(false);
    setExpanded(false);
    setExplanationTab("explanation");
    setExplanationSeen(true);
  }

  // Jump to a related question (it may be outside the active filter — that's
  // fine; "Next" afterwards resumes normal random practice within the filter).
  function goToRelatedQuestion(id: number) {
    setShowExplanation(false);
    setPreviousQuestionId(currentQuestionId);
    setCurrentQuestionId(id);
    setHasUsedPrevious(false);
    saveSeenQuestionId(id);
    resetQuestionState();
  }

  if (questions.length === 0) {
    return (
      <div className="w-full max-w-3xl rounded-3xl border border-gray-200 bg-white p-6 text-center font-semibold text-gray-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
        No questions found. Please remove filters to see more questions.
      </div>
    );
  }

  if (!foundQuestion) {
    return (
      <div className="rounded-3xl bg-white p-6 text-center font-semibold dark:bg-slate-800 dark:text-white">
        Loading question...
      </div>
    );
  }

  const currentQuestion = foundQuestion;
  const subjectLabel =
    currentQuestion.subjectName || `Subject ${currentQuestion.subjectId}`;
  const topicLabel =
    currentQuestion.topicName || `Topic ${currentQuestion.topicId}`;

  const hasLongExplanation = Boolean(currentQuestion.explanationLong?.trim());
  const relatedQuestions = getRelatedQuestions(
    currentQuestion,
    pool && pool.length > 0 ? pool : questions,
    10
  );

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
    pulseNav("next");

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

    pulseNav("prev");
    setCurrentQuestionId(previousQuestionId);
    setPreviousQuestionId(null);
    setHasUsedPrevious(true);
    resetQuestionState();
  }

  const canGoPrevious = previousQuestionId !== null && !hasUsedPrevious;

  // Latest keyboard handler (re-assigned each render so closures stay fresh):
  //  • Up / Down  → move the option highlight
  //  • Left / Right → previous / next question
  //  • Enter      → step through the answer flow (see below)
  //  • Escape     → close the explanation modal
  keyHandlerRef.current = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
      return;
    }

    // While the explanation is open, Enter or Escape closes it.
    if (showExplanation) {
      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        setShowExplanation(false);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlightedIndex((index) =>
          Math.min(currentQuestion.options.length - 1, index + 1)
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlightedIndex((index) => Math.max(0, index - 1));
        break;
      case "ArrowRight":
        event.preventDefault();
        goNext();
        break;
      case "ArrowLeft":
        event.preventDefault();
        if (canGoPrevious) goPrevious();
        break;
      case "Enter":
        // Stepped Enter flow:
        //  1) not answered      → select the highlighted option
        //  correct              → next question
        //  2) wrong, hidden     → reveal the correct answer
        //  3) wrong, no expl yet → open the explanation
        //  (Enter while open closes it — handled above)
        //  4) wrong, expl seen  → next question
        event.preventDefault();
        if (!isAnswered) {
          const option = currentQuestion.options[highlightedIndex];
          if (option) handleSelectAnswer(option.key);
        } else if (isCorrect) {
          goNext();
        } else if (!showAnswer) {
          handleRevealAnswer();
        } else if (!explanationSeen) {
          openExplanation();
        } else {
          goNext();
        }
        break;
    }
  };

  return (
    <>
      <div className="w-full max-w-3xl rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:p-8">
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
          {currentQuestion.options.map((option, index) => (
            <QuestionOption
              key={option.key}
              optionKey={option.key}
              value={option.value || ""}
              imageUrl={option.imageUrl}
              type={option.type}
              status={getOptionStatus(option.key)}
              disabled={isLocked}
              highlighted={!isAnswered && index === highlightedIndex}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => {
                setHighlightedIndex(index);
                handleSelectAnswer(option.key);
              }}
            />
          ))}
        </div>

        {isAnswered && (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center font-semibold text-gray-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
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
            className={`justify-self-start rounded-2xl border border-gray-300 px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-95 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-600 dark:text-white dark:hover:bg-slate-700 dark:active:bg-slate-600 ${
              navPulse === "prev" ? "scale-95 bg-gray-100 dark:bg-slate-600" : ""
            }`}
          >
            Previous
          </button>

          <div className="flex justify-center gap-2">
            {isAnswered && isCorrect && (
              <button
                onClick={openExplanation}
                className="rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 active:scale-95"
              >
                Explanation
              </button>
            )}

            {isAnswered && !isCorrect && !showAnswer && (
              <button
                onClick={handleRevealAnswer}
                className="rounded-2xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 active:scale-95"
              >
                Reveal
              </button>
            )}

            {isAnswered && !isCorrect && showAnswer && (
              <button
                onClick={openExplanation}
                className="rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 active:scale-95"
              >
                Explanation
              </button>
            )}
          </div>

          <button
            onClick={goNext}
            className={`justify-self-end rounded-2xl border border-gray-300 px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-95 active:bg-gray-100 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700 dark:active:bg-slate-600 ${
              navPulse === "next" ? "scale-95 bg-gray-100 dark:bg-slate-600" : ""
            }`}
          >
            Next
          </button>
        </div>
      </div>

      {showExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          {/* Compact + scrollable by default; the expand toggle grows it tall.
              The body always scrolls so a long explanation never overwhelms. */}
          <div
            className={`flex w-full flex-col rounded-3xl bg-white shadow-xl transition-all dark:bg-slate-800 ${
              showLong || explanationTab === "related"
                ? "max-w-3xl"
                : "max-w-xl"
            } ${expanded ? "max-h-[90vh]" : "max-h-[55vh]"}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-slate-700">
              {explanationTab === "related" ? (
                <button
                  onClick={() => setExplanationTab("explanation")}
                  className="text-sm font-black text-blue-600 transition hover:text-blue-700"
                >
                  ← Back to explanation
                </button>
              ) : (
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Explanation
                </h3>
              )}

              <button
                onClick={() => setShowExplanation(false)}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 active:scale-95"
              >
                Close
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-6">
              {explanationTab === "explanation" ? (
                <>
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

                  {showLong && hasLongExplanation && (
                    <div className="mt-5 border-t border-gray-200 pt-5 dark:border-slate-700">
                      <h4 className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500">
                        In depth
                      </h4>
                      <div className="space-y-3 leading-relaxed text-gray-700 dark:text-slate-300">
                        {(currentQuestion.explanationLong || "")
                          .split(/\n{2,}/)
                          .map((para) => para.trim())
                          .filter(Boolean)
                          .map((para, i) => (
                            <p key={i} className="whitespace-pre-line">
                              {para}
                            </p>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <p className="mb-4 text-sm font-semibold text-gray-500 dark:text-slate-400">
                    Practice {relatedQuestions.length} question
                    {relatedQuestions.length !== 1 ? "s" : ""} related to this concept.
                  </p>
                  <div className="space-y-3">
                    {relatedQuestions.map((rq) => (
                      <button
                        key={rq.id}
                        onClick={() => goToRelatedQuestion(rq.id)}
                        className="block w-full rounded-2xl border border-gray-200 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50 active:scale-[0.99] dark:border-slate-600 dark:hover:border-blue-500 dark:hover:bg-slate-700"
                      >
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {rq.question}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                            {rq.subjectName || "Subject"}
                          </span>
                          <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700">
                            {rq.topicName || "Topic"}
                          </span>
                          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold capitalize text-gray-600">
                            {rq.difficulty}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            {explanationTab === "explanation" && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 p-4 dark:border-slate-700">
                {/* Bottom-left: expand / shrink the window (only when long is open) */}
                <div>
                  {showLong && (
                    <button
                      onClick={() => setExpanded((e) => !e)}
                      title={expanded ? "Shrink window" : "Expand window"}
                      aria-label={expanded ? "Shrink window" : "Expand window"}
                      className="grid h-11 w-11 place-items-center rounded-2xl border border-gray-300 text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
                    >
                      {expanded ? (
                        <Minimize2 className="h-5 w-5" />
                      ) : (
                        <Maximize2 className="h-5 w-5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Bottom-right: primary actions */}
                <div className="flex flex-wrap gap-2">
                  {hasLongExplanation && !showLong && (
                    <button
                      onClick={() => setShowLong(true)}
                      className="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-700 active:scale-95"
                    >
                      Explain more ↓
                    </button>
                  )}
                  {/* Related questions only surface after the long explanation is opened. */}
                  {showLong && relatedQuestions.length > 0 && (
                    <button
                      onClick={() => setExplanationTab("related")}
                      className="rounded-2xl border border-gray-300 px-5 py-3 font-black text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
                    >
                      Related questions ({relatedQuestions.length})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}