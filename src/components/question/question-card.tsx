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

// Render text with **important** parts bolded (lightweight markdown).
function renderRich(text: string) {
  return text.split(/(\*\*.+?\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-bold text-gray-900 dark:text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

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
  // Free-floating explanation window: position + size (px). Null until opened.
  const [winPos, setWinPos] = useState<{ x: number; y: number } | null>(null);
  const [winSize, setWinSize] = useState<{ w: number; h: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const dragRef = useRef<
    | {
        mode: "move" | "resize";
        startX: number;
        startY: number;
        origX: number;
        origY: number;
        origW: number;
        origH: number;
      }
    | null
  >(null);
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

  // Drag-to-move (header) and drag-to-resize (corner) for the explanation window.
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (d.mode === "move") {
        const w = d.origW;
        const maxX = window.innerWidth - 60;
        const maxY = window.innerHeight - 60;
        setWinPos({
          x: Math.min(Math.max(8 - w + 80, d.origX + dx), maxX),
          y: Math.min(Math.max(0, d.origY + dy), maxY),
        });
      } else {
        setWinSize({
          w: Math.min(Math.max(320, d.origW + dx), window.innerWidth - 16),
          h: Math.min(Math.max(220, d.origH + dy), window.innerHeight - 16),
        });
      }
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
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

  // Default window size/position, centred. Called when the modal opens.
  function defaultWindow(big = false) {
    const w = Math.min(big ? 900 : 640, window.innerWidth - 24);
    const h = Math.min(
      Math.round(window.innerHeight * (big ? 0.9 : 0.55)),
      window.innerHeight - 24
    );
    return {
      size: { w, h },
      pos: {
        x: Math.max(12, Math.round((window.innerWidth - w) / 2)),
        y: Math.max(12, Math.round((window.innerHeight - h) / 2)),
      },
    };
  }

  function openExplanation() {
    setShowExplanation(true);
    setShowLong(false);
    setExpanded(false);
    setExplanationTab("explanation");
    setExplanationSeen(true);
    const d = defaultWindow(false);
    setWinSize(d.size);
    setWinPos(d.pos);
  }

  // Header drag → move the window.
  function startMove(event: React.PointerEvent) {
    if (!winPos || !winSize) return;
    dragRef.current = {
      mode: "move",
      startX: event.clientX,
      startY: event.clientY,
      origX: winPos.x,
      origY: winPos.y,
      origW: winSize.w,
      origH: winSize.h,
    };
  }

  // Corner grip drag → resize the window.
  function startResize(event: React.PointerEvent) {
    if (!winPos || !winSize) return;
    event.stopPropagation();
    dragRef.current = {
      mode: "resize",
      startX: event.clientX,
      startY: event.clientY,
      origX: winPos.x,
      origY: winPos.y,
      origW: winSize.w,
      origH: winSize.h,
    };
  }

  // Expand / shrink preset (recentres).
  function toggleWindowSize() {
    const next = !expanded;
    setExpanded(next);
    const d = defaultWindow(next);
    setWinSize(d.size);
    setWinPos(d.pos);
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

      {showExplanation && winPos && winSize && (
        <div className="fixed inset-0 z-50 bg-black/50">
          {/* Draggable (header) + resizable (corner grip) floating window. */}
          <div
            style={{ left: winPos.x, top: winPos.y, width: winSize.w, height: winSize.h }}
            className="absolute flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
          >
            {/* Header — drag handle */}
            <div
              onPointerDown={startMove}
              className="flex cursor-move select-none items-center justify-between border-b border-gray-200 p-5 dark:border-slate-700"
            >
              {explanationTab === "related" ? (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setExplanationTab("explanation")}
                  className="cursor-pointer text-sm font-black text-blue-600 transition hover:text-blue-700"
                >
                  ← Back to explanation
                </button>
              ) : (
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Explanation
                </h3>
              )}

              <div className="flex items-center gap-2">
                {/* Expand / shrink — on the RIGHT */}
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={toggleWindowSize}
                  title={expanded ? "Shrink window" : "Expand window"}
                  aria-label={expanded ? "Shrink window" : "Expand window"}
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-gray-300 text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
                >
                  {expanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>

                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setShowExplanation(false)}
                  className="cursor-pointer rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 active:scale-95"
                >
                  Close
                </button>
              </div>
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
                    {renderRich(currentQuestion.explanation)}
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
                              {renderRich(para)}
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
            {explanationTab === "explanation" && (hasLongExplanation || (showLong && relatedQuestions.length > 0)) && (
              <div className="flex flex-wrap gap-2 border-t border-gray-200 p-4 dark:border-slate-700">
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
            )}

            {/* Resize grip — bottom-right corner */}
            <div
              onPointerDown={startResize}
              title="Drag to resize"
              className="absolute bottom-0 right-0 z-10 h-7 w-7 cursor-nwse-resize"
            >
              <div className="absolute bottom-2 right-2 h-2.5 w-2.5 border-b-2 border-r-2 border-gray-400 dark:border-slate-500" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}