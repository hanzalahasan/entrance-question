"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Question } from "@/types/question";
import QuestionOption from "./question-option";

const WIDTH = 560;

// Initial window position: offset from the left so part of the main question
// stays visible behind it. Computed client-side (window is always present here).
function initialPos(): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;
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
  const [index, setIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showExpl, setShowExpl] = useState(false);
  const [showExplLong, setShowExplLong] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(initialPos);

  const dragRef = useRef<
    | { startX: number; startY: number; origX: number; origY: number }
    | null
  >(null);

  // Drag-to-move via the header.
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const next = {
        x: Math.min(
          Math.max(12 - WIDTH + 80, d.origX + (e.clientX - d.startX)),
          window.innerWidth - 60
        ),
        y: Math.min(
          Math.max(0, d.origY + (e.clientY - d.startY)),
          window.innerHeight - 60
        ),
      };
      setPos(next);
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

  // Escape closes related mode.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (questions.length === 0 || !pos) return null;

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
    setShowExplLong(false);
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
  const hasLong = Boolean(current.explanationLong?.trim());

  return (
    // Full-screen, click-through layer so the main card behind stays hoverable;
    // only the window itself captures pointer events.
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <div
        style={{
          left: pos.x,
          top: pos.y,
          width: Math.min(WIDTH, window.innerWidth - 24),
        }}
        className="pointer-events-auto absolute flex max-h-[85vh] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
      >
        {/* Header — drag handle + count + close */}
        <div
          onPointerDown={startMove}
          className="flex cursor-move select-none items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-700"
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
            {current.options.map((option) => (
              <QuestionOption
                key={option.key}
                optionKey={option.key}
                value={option.value || ""}
                imageUrl={option.imageUrl}
                type={option.type}
                status={getOptionStatus(option.key)}
                disabled={isLocked}
                onClick={() => {
                  if (!isLocked) setSelectedAnswer(option.key);
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

              {hasLong && !showExplLong && (
                <button
                  onClick={() => setShowExplLong(true)}
                  className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-700 active:scale-95"
                >
                  Explain more ↓
                </button>
              )}

              {showExplLong && hasLong && (
                <div className="mt-4 space-y-3 border-t border-gray-200 pt-4 dark:border-slate-700">
                  {(current.explanationLong || "")
                    .split(/\n{2,}/)
                    .map((para) => para.trim())
                    .filter(Boolean)
                    .map((para, i) => (
                      <p
                        key={i}
                        style={{ fontSize }}
                        className="whitespace-pre-line leading-relaxed text-gray-700 dark:text-slate-300"
                      >
                        {renderRich(para)}
                      </p>
                    ))}
                </div>
              )}
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
