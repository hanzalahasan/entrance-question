"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Question } from "@/types/question";
import { useIsMobile } from "@/hooks/use-is-mobile";
import QuestionOption from "./question-option";
import { renderRich } from "./rich-text";

const WIDTH = 560;

const POS_KEY = "eq_related_pos";

// Keep a point within the viewport.
function clamp(x: number, y: number) {
  return {
    x: Math.min(Math.max(8, x), Math.max(8, window.innerWidth - 60)),
    y: Math.min(Math.max(0, y), Math.max(0, window.innerHeight - 60)),
  };
}

// Initial window position: the user's last-placed spot if remembered, else
// offset from the left so part of the main question stays visible behind it.
function initialPos(): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p.x === "number" && typeof p.y === "number") {
        return clamp(p.x, p.y);
      }
    }
  } catch {}
  const w = Math.min(WIDTH, window.innerWidth - 24);
  return {
    x: Math.min(
      Math.max(12, Math.round(window.innerWidth * 0.32)),
      Math.max(12, window.innerWidth - w - 12)
    ),
    y: Math.max(12, Math.round(window.innerHeight * 0.1)),
  };
}

type RelatedQuestionWindowProps = {
  // The related questions to practice, in order.
  questions: Question[];
  // Reader font size (px) for the explanation text — shared with the main
  // explanation window's slider.
  fontSize: number;
  // Close related-question mode (the "X" button / Escape).
  onClose: () => void;
};

/**
 * A floating, movable practice window for related questions. It sits ON TOP of
 * the (blurred) main question card and the explanation window, and runs its own
 * small answer flow (select → reveal → next) independent of the main card.
 */
export default function RelatedQuestionWindow({
  questions,
  fontSize,
  onClose,
}: RelatedQuestionWindowProps) {
  const isMobile = useIsMobile();
  const [index, setIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showExpl, setShowExpl] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(initialPos);

  const dragRef = useRef<
    | { startX: number; startY: number; origX: number; origY: number }
    | null
  >(null);
  // Latest position, so we can persist it when a drag ends.
  const posRef = useRef<{ x: number; y: number } | null>(pos);

  // Drag-to-move via the header; the spot is remembered for next time.
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const next = clamp(
        d.origX + (e.clientX - d.startX),
        d.origY + (e.clientY - d.startY)
      );
      posRef.current = next;
      setPos(next);
    }
    function onUp() {
      if (dragRef.current && posRef.current) {
        try {
          localStorage.setItem(POS_KEY, JSON.stringify(posRef.current));
        } catch {}
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

  // Keyboard — mirrors the main card: ↑/↓ move the highlight, ←/→ prev/next,
  // Enter steps select → reveal → explanation → next, Esc closes.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }
      if (questions.length === 0) return;
      const cur = questions[index];

      const reset = () => {
        setSelectedAnswer(null);
        setShowAnswer(false);
        setShowExpl(false);
        setHighlightedIndex(0);
      };
      const next = () => {
        if (index < questions.length - 1) {
          setIndex(index + 1);
          reset();
        }
      };
      const prev = () => {
        if (index > 0) {
          setIndex(index - 1);
          reset();
        }
      };

      switch (event.key) {
        case "Escape":
          event.preventDefault();
          onClose();
          break;
        case "ArrowDown":
          event.preventDefault();
          setHighlightedIndex((i) => Math.min(cur.options.length - 1, i + 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          setHighlightedIndex((i) => Math.max(0, i - 1));
          break;
        case "ArrowRight":
          event.preventDefault();
          next();
          break;
        case "ArrowLeft":
          event.preventDefault();
          prev();
          break;
        case "Enter": {
          event.preventDefault();
          const answered = selectedAnswer !== null;
          const correct = selectedAnswer === cur.answer;
          const locked = correct || showAnswer;
          if (!answered) {
            const option = cur.options[highlightedIndex];
            if (option && !locked) setSelectedAnswer(option.key);
          } else if (correct) {
            next();
          } else if (!showAnswer) {
            setShowAnswer(true);
          } else if (cur.explanation?.trim() && !showExpl) {
            setShowExpl(true);
          } else {
            next();
          }
          break;
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    questions,
    index,
    selectedAnswer,
    showAnswer,
    showExpl,
    highlightedIndex,
    onClose,
  ]);

  if (questions.length === 0 || (!pos && !isMobile)) return null;

  const current = questions[index];
  const isAnswered = selectedAnswer !== null;
  const isCorrect = selectedAnswer === current.answer;
  const isLocked = isCorrect || showAnswer;

  function startMove(event: React.PointerEvent) {
    if (!pos) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origX: pos.x,
      origY: pos.y,
    };
  }

  function getOptionStatus(optionKey: string): "default" | "correct" | "wrong" {
    if (!isAnswered) return "default";
    if (optionKey === selectedAnswer && selectedAnswer === current.answer)
      return "correct";
    if (optionKey === selectedAnswer && selectedAnswer !== current.answer)
      return "wrong";
    if (showAnswer && optionKey === current.answer) return "correct";
    return "default";
  }

  function resetAnswer() {
    setSelectedAnswer(null);
    setShowAnswer(false);
    setShowExpl(false);
    setHighlightedIndex(0);
  }

  function selectAnswer(key: string) {
    if (!isLocked) setSelectedAnswer(key);
  }

  function goNext() {
    if (index < questions.length - 1) {
      setIndex(index + 1);
      resetAnswer();
    }
  }

  function goPrevious() {
    if (index > 0) {
      setIndex(index - 1);
      resetAnswer();
    }
  }

  const subjectLabel = current.subjectName || `Subject ${current.subjectId}`;
  const topicLabel = current.topicName || `Topic ${current.topicId}`;
  const hasExpl = Boolean(current.explanation?.trim());

  return (
    // Full-screen, click-through layer so the main card behind stays hoverable;
    // only the window itself captures pointer events.
    <div
      className={`fixed inset-0 z-[60] ${isMobile ? "bg-black/50" : "pointer-events-none"}`}
      onClick={isMobile ? onClose : undefined}
    >
      <div
        onClick={isMobile ? (e) => e.stopPropagation() : undefined}
        style={
          isMobile
            ? undefined
            : {
                left: pos!.x,
                top: pos!.y,
                width: Math.min(WIDTH, window.innerWidth - 24),
              }
        }
        className={
          isMobile
            ? "pointer-events-auto fixed inset-x-0 bottom-0 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-3xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
            : "pointer-events-auto absolute flex max-h-[85vh] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        }
      >
        {/* Mobile grab affordance */}
        {isMobile && (
          <div className="flex justify-center pt-2">
            <span className="h-1.5 w-10 rounded-full bg-gray-300 dark:bg-slate-600" />
          </div>
        )}

        {/* Header — drag handle on desktop, static on mobile */}
        <div
          onPointerDown={isMobile ? undefined : startMove}
          className={`flex select-none items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-700 ${
            isMobile ? "" : "cursor-move"
          }`}
        >
          <span className="text-sm font-black uppercase tracking-wide text-blue-600 dark:text-blue-400">
            Related question {index + 1} of {questions.length}
          </span>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClose}
            title="Close related questions"
            aria-label="Close related questions"
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-red-600 text-white transition hover:bg-red-700 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex flex-wrap justify-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {subjectLabel}
            </span>
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
              {topicLabel}
            </span>
            {current.year && (
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                Year: {current.year}
              </span>
            )}
          </div>

          {current.media?.questionImageUrl && (
            <div className="mb-4 flex justify-center">
              <img
                src={current.media.questionImageUrl}
                alt="Question diagram"
                className="max-h-64 rounded-2xl border border-gray-200 object-contain"
              />
            </div>
          )}

          <h2 className="mb-5 text-center text-lg font-bold leading-relaxed text-gray-900 dark:text-white">
            {current.question}
          </h2>

          <div className="space-y-3">
            {current.options.map((option, idx) => (
              <QuestionOption
                key={option.key}
                optionKey={option.key}
                value={option.value || ""}
                imageUrl={option.imageUrl}
                type={option.type}
                status={getOptionStatus(option.key)}
                disabled={isLocked}
                highlighted={!isAnswered && idx === highlightedIndex}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => {
                  setHighlightedIndex(idx);
                  selectAnswer(option.key);
                }}
              />
            ))}
          </div>

          {isAnswered && (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-center font-semibold text-gray-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {isCorrect
                ? "✅ Correct answer."
                : showAnswer
                  ? `Correct answer is ${current.answer}.`
                  : "❌ Wrong answer."}
            </div>
          )}

          {showExpl && hasExpl && (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-900">
              <h4 className="mb-2 text-sm font-black uppercase tracking-wide text-gray-500">
                Explanation
              </h4>
              <p
                style={{ fontSize }}
                className="leading-relaxed text-gray-700 dark:text-slate-300"
              >
                {renderRich(current.explanation)}
              </p>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="grid grid-cols-3 items-center gap-2 border-t border-gray-200 p-4 dark:border-slate-700">
          <button
            onClick={goPrevious}
            disabled={index === 0}
            className="justify-self-start rounded-2xl border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
          >
            Previous
          </button>

          <div className="flex justify-center gap-2">
            {isAnswered && !isCorrect && !showAnswer && (
              <button
                onClick={() => setShowAnswer(true)}
                className="rounded-2xl bg-red-600 px-4 py-2.5 font-semibold text-white transition hover:bg-red-700 active:scale-95"
              >
                Reveal
              </button>
            )}
            {isAnswered && (isCorrect || showAnswer) && hasExpl && (
              <button
                onClick={() => setShowExpl((v) => !v)}
                className="rounded-2xl bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700 active:scale-95"
              >
                {showExpl ? "Hide" : "Explanation"}
              </button>
            )}
          </div>

          <button
            onClick={goNext}
            disabled={index === questions.length - 1}
            className="justify-self-end rounded-2xl border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
