"use client";

import { useEffect, useRef, useState } from "react";
import type { Question } from "@/types/question";
import { useIsMobile } from "@/hooks/use-is-mobile";
import QuestionOption from "./question-option";
import QuestionPreview from "./question-preview";
import RelatedQuestionWindow from "./related-question-window";
import ExplanationWindow from "./explanation-window";
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
  // The related questions currently shown in the floating related-question
  // window (opened on top of the blurred main card). Null when closed.
  const [relatedSession, setRelatedSession] = useState<Question[] | null>(null);
  // While the related window is open the main card is blurred; hovering it
  // brings it back into focus (tracked here rather than via CSS :hover, which
  // is unreliable under the click-through overlays).
  const [originHovered, setOriginHovered] = useState(false);
  // Reader font size for the explanation text (px), adjustable via a slider.
  // Seeded from the persisted value (the explanation isn't in the initial DOM,
  // so reading localStorage here can't cause a hydration mismatch).
  const [explFontSize, setExplFontSize] = useState<number>(() => {
    if (typeof window === "undefined") return 16;
    const n = Number(localStorage.getItem("eq_expl_font"));
    return Number.isFinite(n) && n >= 12 && n <= 28 ? n : 16;
  });
  // Whether the explanation has been opened at least once this question — lets
  // the Enter flow know to advance (rather than re-open) after it's been closed.
  const [explanationSeen, setExplanationSeen] = useState(false);
  // Index of the option the keyboard (Up/Down arrows) is currently on.
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  // Brief "pressed" pulse on the nav buttons — fires for clicks AND arrow keys
  // so navigation always feels responsive.
  const [navPulse, setNavPulse] = useState<"next" | "prev" | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Touch swipe-to-navigate (mobile/tablet), Tinder-style: the card follows the
  // finger; past a threshold it flies off and advances, else it springs back.
  const isMobile = useIsMobile();
  const [dx, setDx] = useState(0); // current horizontal offset (px)
  const [swiping, setSwiping] = useState(false); // actively dragging horizontally
  const [snap, setSnap] = useState(false); // instant (no-transition) reposition
  // Pre-picked next question id, so the card behind shows the real next question
  // and the one you land on matches it.
  const [peekNextId, setPeekNextId] = useState<number | null>(null);
  const swipe = useRef<{ x: number; y: number; lock: null | "h" | "v" } | null>(
    null
  );

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
    setRelatedSession(null);
    setPeekNextId(getRandomQuestionId(questions, firstQuestionId ?? undefined));
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

  function changeFontSize(size: number) {
    setExplFontSize(size);
    try {
      localStorage.setItem("eq_expl_font", String(size));
    } catch {}
  }

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
    setExplanationSeen(false);
    setHighlightedIndex(0);
  }

  // Open the explanation window (it manages its own position/size/long view).
  function openExplanation() {
    setExplanationSeen(true);
    setShowExplanation(true);
  }

  // Open the floating related-questions window on top of the (now-blurred) main
  // card. The explanation window stays open behind it; the main card stays put.
  function startRelatedSession(related: Question[]) {
    if (related.length === 0) return;
    setOriginHovered(false);
    setRelatedSession(related);
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

  // The question shown BEHIND the active card while swiping: next on a right
  // drag, previous on a left drag (the real card you'll land on).
  const peekId = dx > 0 ? peekNextId : dx < 0 ? previousQuestionId : null;
  const peekQuestion =
    peekId == null
      ? null
      : lookup.find((q) => q.id === peekId) ??
        questions.find((q) => q.id === peekId) ??
        null;

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

  // `pulse` flashes the on-screen Next/Previous button; swipes pass false so the
  // button doesn't flicker mid-gesture.
  function goNext(pulse = true) {
    if (pulse) pulseNav("next");

    // Use the pre-picked next id so it matches the card shown behind the swipe.
    const nextQuestionId =
      peekNextId ?? getRandomQuestionId(questions, currentQuestion.id);

    if (!nextQuestionId) return;

    setPreviousQuestionId(currentQuestion.id);
    setCurrentQuestionId(nextQuestionId);
    setHasUsedPrevious(false);
    saveSeenQuestionId(nextQuestionId);
    setPeekNextId(getRandomQuestionId(questions, nextQuestionId));
    resetQuestionState();
  }

  function goPrevious(pulse = true) {
    if (previousQuestionId === null || hasUsedPrevious) return;

    if (pulse) pulseNav("prev");
    const prevId = previousQuestionId;
    setCurrentQuestionId(prevId);
    setPreviousQuestionId(null);
    setHasUsedPrevious(true);
    setPeekNextId(getRandomQuestionId(questions, prevId));
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

    // The related-question window owns the keyboard while it's open — don't let
    // keys (Enter especially) leak into the main card behind it.
    if (relatedSession) return;

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

  // Swipe RIGHT → next, LEFT → previous. The card tracks the finger; direction
  // is locked on the first move so vertical drags still scroll the page.
  function onTouchStart(e: React.TouchEvent) {
    if (showExplanation || relatedSession || dx !== 0) return;
    const t = e.touches[0];
    swipe.current = { x: t.clientX, y: t.clientY, lock: null };
  }
  function onTouchMove(e: React.TouchEvent) {
    const s = swipe.current;
    if (!s) return;
    const t = e.touches[0];
    const ddx = t.clientX - s.x;
    const ddy = t.clientY - s.y;
    if (s.lock === null) {
      if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return; // wait for intent
      s.lock = Math.abs(ddx) > Math.abs(ddy) ? "h" : "v";
      if (s.lock === "h") setSwiping(true);
    }
    if (s.lock === "h") setDx(ddx);
  }
  function onTouchEnd() {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.lock !== "h") {
      setSwiping(false);
      return;
    }
    setSwiping(false);
    const THRESHOLD = 90;
    const dir = dx > 0 ? 1 : -1;
    const canGo = dir > 0 ? peekNextId !== null : canGoPrevious;

    if (Math.abs(dx) > THRESHOLD && canGo) {
      // Fling the card fully off-screen, then swap to the next/prev question
      // (which is the card already showing behind) and snap to centre instantly.
      const off = (typeof window !== "undefined" ? window.innerWidth : 500) * 1.3;
      setDx(dir * off);
      window.setTimeout(() => {
        setSnap(true); // no transition for the swap → no slide-in flash
        if (dir > 0) goNext(false);
        else goPrevious(false);
        setDx(0);
        window.setTimeout(() => setSnap(false), 40);
      }, 230);
    } else {
      setDx(0); // spring back
    }
  }

  return (
    <>
      {/* Swipe stage: a blurred "next card" peeks behind while the top card is
          dragged (mobile/tablet). */}
      <div className="relative w-full max-w-3xl">
        {isMobile && dx !== 0 && peekQuestion && (
          <div className="pointer-events-none absolute inset-0 z-0">
            <QuestionPreview question={peekQuestion} />
          </div>
        )}

        {/* When related-question mode is on, the main card blurs to push focus to
            the floating related window; hovering it brings it back into focus. */}
        <div
          onMouseEnter={() => setOriginHovered(true)}
          onMouseLeave={() => setOriginHovered(false)}
          onTouchStart={isMobile ? onTouchStart : undefined}
          onTouchMove={isMobile ? onTouchMove : undefined}
          onTouchEnd={isMobile ? onTouchEnd : undefined}
          style={
            isMobile
              ? {
                  transform: `translateX(${dx}px) rotate(${dx * 0.04}deg)`,
                  transition:
                    swiping || snap
                      ? "none"
                      : "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                  touchAction: "pan-y",
                  ...(relatedSession ? { filter: "blur(2.5px)" } : {}),
                }
              : relatedSession && !originHovered
                ? { filter: "blur(2.5px)" }
                : undefined
          }
          className={`relative z-10 w-full rounded-3xl border bg-white p-5 shadow-sm transition duration-200 dark:bg-slate-800 md:p-8 ${
            swiping
              ? "border-blue-400 ring-2 ring-blue-400/60 dark:border-blue-300 dark:ring-blue-300/50"
              : "border-gray-200 dark:border-slate-700"
          }`}
        >
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

        <div className="mt-6 grid grid-cols-3 items-stretch gap-2">
          <button
            onClick={() => goPrevious()}
            disabled={!canGoPrevious}
            className={`w-full rounded-2xl border border-gray-300 px-2 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-95 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-600 dark:text-white dark:hover:bg-slate-700 dark:active:bg-slate-600 md:px-4 md:py-3 md:text-base ${
              navPulse === "prev" ? "scale-95 bg-gray-100 dark:bg-slate-600" : ""
            }`}
          >
            Previous
          </button>

          <div className="flex">
            {isAnswered && isCorrect && (
              <button
                onClick={openExplanation}
                className="w-full rounded-2xl bg-blue-600 px-2 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95 md:px-4 md:py-3 md:text-base"
              >
                Explanation
              </button>
            )}

            {isAnswered && !isCorrect && !showAnswer && (
              <button
                onClick={handleRevealAnswer}
                className="w-full rounded-2xl bg-red-600 px-2 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-95 md:px-4 md:py-3 md:text-base"
              >
                Reveal
              </button>
            )}

            {isAnswered && !isCorrect && showAnswer && (
              <button
                onClick={openExplanation}
                className="w-full rounded-2xl bg-blue-600 px-2 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95 md:px-4 md:py-3 md:text-base"
              >
                Explanation
              </button>
            )}
          </div>

          <button
            onClick={() => goNext()}
            className={`w-full rounded-2xl border border-gray-300 px-2 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-95 active:bg-gray-100 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700 dark:active:bg-slate-600 md:px-4 md:py-3 md:text-base ${
              navPulse === "next" ? "scale-95 bg-gray-100 dark:bg-slate-600" : ""
            }`}
          >
            Next
          </button>
        </div>
        </div>
      </div>

      {showExplanation && (
        <ExplanationWindow
          question={currentQuestion}
          fontSize={explFontSize}
          onFontSizeChange={changeFontSize}
          relatedQuestions={relatedQuestions}
          onStartRelated={startRelatedSession}
          dimmed={Boolean(relatedSession)}
          onClose={() => setShowExplanation(false)}
        />
      )}

      {relatedSession && (
        <RelatedQuestionWindow
          questions={relatedSession}
          fontSize={explFontSize}
          onClose={() => setRelatedSession(null)}
        />
      )}
    </>
  );
}