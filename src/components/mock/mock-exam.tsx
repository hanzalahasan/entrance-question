"use client";

import { useEffect, useRef, useState } from "react";
import type { Question } from "@/types/question";
import type { MockAttempt } from "@/types/mock";
import { mockSections } from "@/services/mock-service";
import { getActiveAttempt, saveAttempt } from "@/services/mock-attempt-store";
import QuestionOption from "@/components/question/question-option";
import MockPalette from "./mock-palette";

type MockExamProps = {
  questions: Question[];
  attempt: MockAttempt;
  // Resumed attempts open paused so the student can choose to continue.
  startPaused: boolean;
  onSubmit: (finalAttempt: MockAttempt) => void;
  onReset: () => void;
  onExit: () => void;
};

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export default function MockExam({
  questions,
  attempt,
  startPaused,
  onSubmit,
  onReset,
  onExit,
}: MockExamProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>(
    attempt.answers
  );
  const [remaining, setRemaining] = useState(attempt.remainingSeconds);
  const [paused, setPaused] = useState(startPaused);
  // Grace period: when a student lands fresh, the countdown only begins after a
  // 10-second prep window. Resumed (paused) attempts skip it.
  const [prepSeconds, setPrepSeconds] = useState(startPaused ? 0 : 10);
  // Count of pause events (persisted) → the result shows "one go" vs "paused N×".
  const pauseCountRef = useRef(attempt.pauseCount ?? 0);

  function togglePause() {
    setPaused((p) => {
      if (!p) pauseCountRef.current += 1; // entering a pause
      return !p;
    });
  }

  const sections = mockSections(questions);
  const current = questions[index];
  const answeredCount = Object.values(answers).filter(
    (v) => v != null && v !== ""
  ).length;

  // The paper's framing: a past-year paper shows its year; a difficulty paper
  // shows "Practice" + the level. Driven by how the student set up the attempt.
  const selection = attempt.selection;
  const modeBadge =
    selection.mode === "past_year"
      ? {
          text: `Past Year · ${selection.year}`,
          cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
        }
      : selection.mode === "set"
        ? {
            text: `${selection.setName} · ${selection.difficulty}`,
            cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
          }
        : {
            text: `Practice · ${selection.difficulty}`,
            cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
          };

  const DIFF_BADGE: Record<string, string> = {
    easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };

  // Assemble the persistable attempt from current state.
  function snapshot(
    overrides: Partial<MockAttempt> = {}
  ): MockAttempt {
    return {
      ...attempt,
      answers,
      remainingSeconds: remaining,
      status: "in_progress",
      pauseCount: pauseCountRef.current,
      ...overrides,
    };
  }

  // Keep a ref to the latest snapshot so the unmount save uses fresh values.
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  // Once submitted, never re-persist as in-progress.
  const submittedRef = useRef(false);

  // Persist whenever answers change.
  useEffect(() => {
    if (!submittedRef.current) saveAttempt(snapshot());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  // Save the latest state on unmount (e.g. navigating away mid-test) — but not
  // if we've submitted, nor if a newer attempt (e.g. after Reset) has replaced
  // this one in storage.
  useEffect(() => {
    return () => {
      if (submittedRef.current) return;
      const stored = getActiveAttempt();
      if (stored && stored.id !== attempt.id) return;
      saveAttempt(snapshotRef.current());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Grace countdown before the main timer starts (ticks only while running).
  useEffect(() => {
    if (paused || prepSeconds <= 0) return;
    const id = setTimeout(() => setPrepSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [paused, prepSeconds]);

  // Keyboard navigation: ←/→ (and Enter) move between questions; ↑/↓ move the
  // selected option. Ignored while paused, during the grace window, or when
  // typing in a field.
  useEffect(() => {
    if (paused || prepSeconds > 0) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      switch (e.key) {
        case "ArrowRight":
        case "Enter":
          e.preventDefault();
          go(1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          go(-1);
          break;
        case "ArrowDown":
          e.preventDefault();
          moveOption(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          moveOption(-1);
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, prepSeconds, index, current, answers]);

  // Countdown — runs only while not paused and after the grace window;
  // auto-submits at zero.
  useEffect(() => {
    if (paused || prepSeconds > 0) return;
    if (remaining <= 0) {
      handleSubmit();
      return;
    }
    const id = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1;
        if (next % 10 === 0) saveAttempt(snapshotRef.current({ remainingSeconds: next }));
        if (next <= 0) {
          clearInterval(id);
          handleSubmit();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, prepSeconds, remaining <= 0]);

  function selectOption(key: string) {
    setAnswers((prev) => {
      const next = { ...prev };
      if (next[current.id] === key) {
        delete next[current.id]; // toggle off → leave unanswered
      } else {
        next[current.id] = key;
      }
      return next;
    });
  }

  function go(delta: number) {
    setIndex((i) => Math.min(questions.length - 1, Math.max(0, i + delta)));
  }

  // Move the selected option with ↑/↓ (wraps; picks the first/last if none yet).
  function moveOption(delta: number) {
    const keys = current.options.map((o) => o.key);
    if (keys.length === 0) return;
    const cur = answers[current.id];
    const curIdx = keys.indexOf(cur);
    const nextIdx =
      curIdx === -1
        ? delta > 0
          ? 0
          : keys.length - 1
        : (curIdx + delta + keys.length) % keys.length;
    setAnswers((prev) => ({ ...prev, [current.id]: keys[nextIdx] }));
  }

  function handleSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const finalAttempt = snapshotRef.current({
      status: "submitted",
      submittedAt: new Date().toISOString(),
    });
    saveAttempt(finalAttempt);
    onSubmit(finalAttempt);
  }

  function confirmSubmit() {
    const blank = questions.length - answeredCount;
    if (
      window.confirm(
        `Submit the test? ${answeredCount} answered, ${blank} left blank.`
      )
    ) {
      handleSubmit();
    }
  }

  function confirmReset() {
    if (
      window.confirm("Reset the test? Your answers and timer will be cleared.")
    ) {
      onReset();
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Header bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div>
          <p className="text-sm font-black text-gray-900 dark:text-white">
            Mock Test
          </p>
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
            {answeredCount}/{questions.length} answered
          </p>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span
            className={`rounded-full px-3 py-0.5 text-xs font-black ${modeBadge.cls}`}
          >
            {modeBadge.text}
          </span>
          <div
            className={`rounded-2xl px-5 py-2 text-center font-black tabular-nums ${
              remaining <= 300
                ? "bg-red-100 text-red-700"
                : "bg-blue-50 text-blue-700 dark:bg-slate-700 dark:text-white"
            }`}
          >
            <span className="text-xl">{formatClock(remaining)}</span>
            {paused && <span className="ml-2 text-xs">PAUSED</span>}
          </div>
          {!paused && prepSeconds > 0 && (
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              Starts in {prepSeconds}s
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={togglePause}
            className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={confirmReset}
            className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
          >
            Reset
          </button>
          <button
            onClick={onExit}
            className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
          >
            Save &amp; exit
          </button>
          <button
            onClick={confirmSubmit}
            className="rounded-2xl bg-blue-600 px-5 py-2 text-sm font-black text-white transition hover:bg-blue-700 active:scale-95"
          >
            Submit
          </button>
        </div>
      </div>

      {paused ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-lg font-black text-gray-900 dark:text-white">
            Test paused
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-slate-400">
            The timer is stopped. Resume when you&apos;re ready — your progress is
            saved.
          </p>
          <button
            onClick={() => setPaused(false)}
            className="mt-6 rounded-2xl bg-blue-600 px-8 py-3 font-black text-white transition hover:bg-blue-700 active:scale-95"
          >
            Resume
          </button>
        </div>
      ) : (
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
                  status="default"
                  disabled={false}
                  selected={answers[current.id] === option.key}
                  onClick={() => selectOption(option.key)}
                />
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => go(-1)}
                disabled={index === 0}
                className="rounded-2xl border border-gray-300 px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
              >
                ← Previous
              </button>
              {answers[current.id] != null && (
                <button
                  onClick={() => selectOption(answers[current.id])}
                  className="text-sm font-bold text-gray-500 underline hover:text-gray-700 dark:text-slate-400"
                >
                  Clear answer
                </button>
              )}
              <button
                onClick={() => go(1)}
                disabled={index === questions.length - 1}
                className="rounded-2xl border border-gray-300 px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
              >
                Next →
              </button>
            </div>

            <p className="mt-4 text-center text-xs font-semibold text-gray-400 dark:text-slate-500">
              Keyboard: ← / → or Enter to move questions · ↑ / ↓ to choose an option
            </p>
          </div>

          {/* Palette */}
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <MockPalette
              questions={questions}
              sections={sections}
              currentIndex={index}
              answers={answers}
              onJump={setIndex}
            />
          </div>
        </div>
      )}
    </div>
  );
}
