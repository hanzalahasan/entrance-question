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
        dir?: string; // for resize: any combo of n/s/e/w
        startX: number;
        startY: number;
        origX: number;
        origY: number;
        origW: number;
        origH: number;
      }
    | null
  >(null);
  const winRef = useRef<HTMLDivElement>(null);
  const winSizeRef = useRef<{ w: number; h: number } | null>(null);
  const winPosRef = useRef<{ x: number; y: number } | null>(null);
  // Remembered window size + position (persisted) — reused on every open.
  const savedSizeRef = useRef<{ w: number; h: number } | null>(null);
  const savedPosRef = useRef<{ x: number; y: number } | null>(null);
  // When the user chooses "Practice related questions", the related questions
  // are loaded one-by-one in the normal card as a short session; afterwards
  // normal random practice resumes. Null when no session is running.
  const [relatedSession, setRelatedSession] = useState<{
    ids: number[];
    index: number;
  } | null>(null);
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
    setRelatedSession(null);
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

  // Load the remembered window size + position once.
  useEffect(() => {
    try {
      const rawSize = localStorage.getItem("eq_expl_size");
      if (rawSize) {
        const s = JSON.parse(rawSize);
        if (s && typeof s.w === "number" && typeof s.h === "number") savedSizeRef.current = s;
      }
      const rawPos = localStorage.getItem("eq_expl_pos");
      if (rawPos) {
        const p = JSON.parse(rawPos);
        if (p && typeof p.x === "number" && typeof p.y === "number") savedPosRef.current = p;
      }
    } catch {}
  }, []);

  // Drag-to-move (header) and drag-to-resize (any edge/corner).
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;

      if (d.mode === "move") {
        const maxX = window.innerWidth - 60;
        const maxY = window.innerHeight - 60;
        const pos = {
          x: Math.min(Math.max(8 - d.origW + 80, d.origX + dx), maxX),
          y: Math.min(Math.max(0, d.origY + dy), maxY),
        };
        winPosRef.current = pos;
        setWinPos(pos);
        return;
      }

      // Resize from whichever edges/corner the grip represents.
      const dir = d.dir || "se";
      const MINW = 320,
        MINH = 200;
      const maxW = window.innerWidth - 16;
      const maxH = window.innerHeight - 16;
      let w = d.origW,
        h = d.origH,
        x = d.origX,
        y = d.origY;
      if (dir.includes("e")) w = Math.min(maxW, Math.max(MINW, d.origW + dx));
      if (dir.includes("w")) {
        w = Math.min(maxW, Math.max(MINW, d.origW - dx));
        x = d.origX + (d.origW - w);
      }
      if (dir.includes("s")) h = Math.min(maxH, Math.max(MINH, d.origH + dy));
      if (dir.includes("n")) {
        h = Math.min(maxH, Math.max(MINH, d.origH - dy));
        y = d.origY + (d.origH - h);
      }
      const size = { w, h };
      winSizeRef.current = size;
      setWinSize(size);
      winPosRef.current = { x, y };
      setWinPos({ x, y });
    }

    function onUp() {
      const d = dragRef.current;
      // Remember the position after any drag (move or resize).
      if (d && winPosRef.current) {
        savedPosRef.current = winPosRef.current;
        try {
          localStorage.setItem("eq_expl_pos", JSON.stringify(winPosRef.current));
        } catch {}
      }
      if (d?.mode === "resize" && winSizeRef.current) {
        // Remember the user's chosen size for next time.
        savedSizeRef.current = winSizeRef.current;
        try {
          localStorage.setItem("eq_expl_size", JSON.stringify(winSizeRef.current));
        } catch {}
        setExpanded(false);
      }
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
    setExplanationSeen(false);
    setHighlightedIndex(0);
  }

  // Keep a window of size w×h within the viewport.
  function clampPos(x: number, y: number, w: number, h: number) {
    const maxX = Math.max(8, window.innerWidth - w - 8);
    const maxY = Math.max(8, window.innerHeight - h - 8);
    return { x: Math.min(Math.max(8, x), maxX), y: Math.min(Math.max(8, y), maxY) };
  }
  function defaultLongSize() {
    return {
      w: Math.min(640, window.innerWidth - 24),
      h: Math.min(Math.round(window.innerHeight * 0.55), window.innerHeight - 24),
    };
  }

  // Open the modal showing just the SHORT explanation: a small, movable
  // (but not resizable) window. Opens at the remembered position, else lower
  // on screen so the question stays visible.
  function openExplanation() {
    setShowExplanation(true);
    setShowLong(false);
    setExpanded(false);
    setExplanationSeen(true);
    const w = Math.min(480, window.innerWidth - 24);
    setWinSize({ w, h: Math.round(window.innerHeight * 0.4) });
    const base =
      savedPosRef.current ?? {
        x: Math.round((window.innerWidth - w) / 2),
        y: Math.round(window.innerHeight * 0.32), // lower → keeps the question visible
      };
    const pos = {
      x: Math.min(Math.max(8, base.x), Math.max(8, window.innerWidth - w - 8)),
      y: Math.min(Math.max(8, base.y), window.innerHeight - 80),
    };
    setWinPos(pos);
    winPosRef.current = pos;
  }

  // Reveal the LONG explanation → switch to the resizable window at the
  // remembered size, opening from the window's CURRENT position (clamped).
  function openLong() {
    const size = savedSizeRef.current ?? defaultLongSize();
    const base = winPos ?? savedPosRef.current ?? { x: 0, y: 0 };
    const pos = clampPos(base.x, base.y, size.w, size.h);
    setWinSize(size);
    winSizeRef.current = size;
    setWinPos(pos);
    winPosRef.current = pos;
    setExpanded(false);
    setShowLong(true);
  }

  // Header drag → move the window (works in both modes).
  function startMove(event: React.PointerEvent) {
    if (!winPos) return;
    const rect = winRef.current?.getBoundingClientRect();
    dragRef.current = {
      mode: "move",
      startX: event.clientX,
      startY: event.clientY,
      origX: winPos.x,
      origY: winPos.y,
      origW: rect?.width ?? winSize?.w ?? 480,
      origH: rect?.height ?? winSize?.h ?? 300,
    };
  }

  // Edge / corner grip drag → resize (long mode only).
  function startResize(event: React.PointerEvent, dir: string) {
    if (!winPos || !winSize) return;
    event.stopPropagation();
    event.preventDefault();
    dragRef.current = {
      mode: "resize",
      dir,
      startX: event.clientX,
      startY: event.clientY,
      origX: winPos.x,
      origY: winPos.y,
      origW: winSize.w,
      origH: winSize.h,
    };
  }

  // Expand / shrink preset (long mode). Keeps the window roughly where it is.
  function toggleWindowSize() {
    const cur = winPos ?? { x: 12, y: 12 };
    if (!expanded) {
      const w = Math.min(1100, window.innerWidth - 24);
      const h = Math.min(Math.round(window.innerHeight * 0.9), window.innerHeight - 24);
      setWinSize({ w, h });
      winSizeRef.current = { w, h };
      const pos = clampPos(cur.x, cur.y, w, h);
      setWinPos(pos);
      winPosRef.current = pos;
      setExpanded(true);
    } else {
      const size = savedSizeRef.current ?? defaultLongSize();
      setWinSize(size);
      winSizeRef.current = size;
      const pos = clampPos(cur.x, cur.y, size.w, size.h);
      setWinPos(pos);
      winPosRef.current = pos;
      setExpanded(false);
    }
  }

  // Start a related-questions practice session: close the explanation and load
  // the related questions one-by-one in the normal card. They may sit outside
  // the active filter — that's fine; finishing the session (or Exit) resumes
  // normal random practice within the filter. `ids` is captured up front so the
  // set stays stable even though "related" is recomputed per question.
  function startRelatedSession(ids: number[]) {
    if (ids.length === 0) return;
    setShowExplanation(false);
    setPreviousQuestionId(currentQuestionId);
    setRelatedSession({ ids, index: 0 });
    setCurrentQuestionId(ids[0]);
    setHasUsedPrevious(false);
    saveSeenQuestionId(ids[0]);
    resetQuestionState();
  }

  // Leave a related session early and jump to a fresh random question.
  function exitRelatedSession() {
    setRelatedSession(null);
    const nextId = getRandomQuestionId(questions, currentQuestionId ?? undefined);
    if (!nextId) return;
    setPreviousQuestionId(currentQuestionId);
    setCurrentQuestionId(nextId);
    setHasUsedPrevious(false);
    saveSeenQuestionId(nextId);
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

    // Inside a related session, advance through the queue; when it's exhausted,
    // drop back to normal random practice.
    if (relatedSession) {
      const nextIndex = relatedSession.index + 1;
      if (nextIndex < relatedSession.ids.length) {
        const nextId = relatedSession.ids[nextIndex];
        setPreviousQuestionId(currentQuestion.id);
        setRelatedSession({ ...relatedSession, index: nextIndex });
        setCurrentQuestionId(nextId);
        setHasUsedPrevious(false);
        saveSeenQuestionId(nextId);
        resetQuestionState();
        return;
      }
      setRelatedSession(null);
    }

    const nextQuestionId = getRandomQuestionId(questions, currentQuestion.id);

    if (!nextQuestionId) return;

    setPreviousQuestionId(currentQuestion.id);
    setCurrentQuestionId(nextQuestionId);
    setHasUsedPrevious(false);
    saveSeenQuestionId(nextQuestionId);
    resetQuestionState();
  }

  function goPrevious() {
    // Inside a related session, step back through the queue.
    if (relatedSession && relatedSession.index > 0) {
      pulseNav("prev");
      const prevIndex = relatedSession.index - 1;
      setRelatedSession({ ...relatedSession, index: prevIndex });
      setCurrentQuestionId(relatedSession.ids[prevIndex]);
      resetQuestionState();
      return;
    }

    if (previousQuestionId === null || hasUsedPrevious) return;

    pulseNav("prev");
    setCurrentQuestionId(previousQuestionId);
    setPreviousQuestionId(null);
    setHasUsedPrevious(true);
    resetQuestionState();
  }

  const canGoPrevious = relatedSession
    ? relatedSession.index > 0
    : previousQuestionId !== null && !hasUsedPrevious;

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
        {relatedSession && (
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 dark:bg-slate-700 dark:text-blue-300">
            <span>
              Related practice — Question {relatedSession.index + 1} of{" "}
              {relatedSession.ids.length}
            </span>
            <button
              onClick={exitRelatedSession}
              className="cursor-pointer rounded-full border border-blue-300 px-3 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-100 active:scale-95 dark:border-slate-500 dark:text-blue-300 dark:hover:bg-slate-600"
            >
              Exit
            </button>
          </div>
        )}

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
          {/* Movable always. Short = small, auto-height. Long = sized + resizable. */}
          <div
            ref={winRef}
            style={
              showLong
                ? { left: winPos.x, top: winPos.y, width: winSize.w, height: winSize.h }
                : { left: winPos.x, top: winPos.y, width: winSize.w }
            }
            className={`absolute flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800 ${
              showLong ? "" : "max-h-[60vh]"
            }`}
          >
            {/* Resize handles — every edge + corner (long explanation only) */}
            {showLong &&
              (
                [
                  ["n", "left-0 right-0 top-0 h-1.5 cursor-ns-resize"],
                  ["s", "left-0 right-0 bottom-0 h-1.5 cursor-ns-resize"],
                  ["e", "top-0 bottom-0 right-0 w-1.5 cursor-ew-resize"],
                  ["w", "top-0 bottom-0 left-0 w-1.5 cursor-ew-resize"],
                  ["nw", "top-0 left-0 h-3.5 w-3.5 cursor-nwse-resize"],
                  ["ne", "top-0 right-0 h-3.5 w-3.5 cursor-nesw-resize"],
                  ["sw", "bottom-0 left-0 h-3.5 w-3.5 cursor-nesw-resize"],
                  ["se", "bottom-0 right-0 h-3.5 w-3.5 cursor-nwse-resize"],
                ] as const
              ).map(([dir, cls]) => (
                <div
                  key={dir}
                  onPointerDown={(e) => startResize(e, dir)}
                  className={`absolute z-30 ${cls}`}
                />
              ))}

            {/* Header — drag handle */}
            <div
              onPointerDown={startMove}
              className="flex cursor-move select-none items-center justify-between border-b border-gray-200 p-5 dark:border-slate-700"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Explanation
              </h3>

              <div className="flex items-center gap-2">
                {/* Expand / shrink — only for the long explanation, on the RIGHT */}
                {showLong && (
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
                )}

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
            </div>

            {/* Footer actions */}
            {(hasLongExplanation || (showLong && relatedQuestions.length > 0)) && (
              <div className="flex flex-wrap gap-2 border-t border-gray-200 p-4 dark:border-slate-700">
                {hasLongExplanation && !showLong && (
                  <button
                    onClick={openLong}
                    className="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-700 active:scale-95"
                  >
                    Explain more ↓
                  </button>
                )}
                {/* Related questions only surface after the long explanation is
                    opened. Clicking starts a short practice session of them in
                    the normal question window. */}
                {showLong && relatedQuestions.length > 0 && (
                  <button
                    onClick={() =>
                      startRelatedSession(relatedQuestions.map((q) => q.id))
                    }
                    className="rounded-2xl border border-gray-300 px-5 py-3 font-black text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
                  >
                    Related questions ({relatedQuestions.length})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}