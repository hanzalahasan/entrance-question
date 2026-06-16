"use client";

import { useMemo, useState } from "react";
import type { DifficultyLevel } from "@/types/question";
import type { MockMode, MockSelection, MockSet } from "@/types/mock";
import { DIFFICULTY_LEVELS } from "@/types/mock";

type MockSetupProps = {
  years: string[];
  sets: MockSet[]; // published mock sets
  onStart: (selection: MockSelection) => void;
  onBack: () => void;
};

export default function MockSetup({ years, sets, onStart, onBack }: MockSetupProps) {
  const [mode, setMode] = useState<MockMode>("past_year");
  const [year, setYear] = useState<string>(years[0] ?? "");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [setId, setSetId] = useState<number | null>(null);

  // Sets available at the chosen difficulty.
  const setsForDifficulty = useMemo(
    () => sets.filter((s) => s.difficulty === difficulty),
    [sets, difficulty]
  );

  const canStart =
    mode === "past_year" ? Boolean(year) : setId != null;

  function start() {
    if (mode === "past_year") {
      if (!year) return;
      onStart({ mode: "past_year", year });
    } else {
      const set = sets.find((s) => s.id === setId);
      if (!set) return;
      onStart({
        mode: "set",
        setId: set.id,
        setName: set.name,
        difficulty: set.difficulty,
      });
    }
  }

  function pickDifficulty(level: DifficultyLevel) {
    setDifficulty(level);
    setSetId(null); // reset the chosen set when the difficulty changes
  }

  return (
    <div className="mx-auto w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:p-8">
      <h1 className="mb-1 text-2xl font-black text-gray-900 dark:text-white">
        Choose your paper
      </h1>
      <p className="mb-6 text-sm font-semibold text-gray-500 dark:text-slate-400">
        Take a real past-year paper, or a curated set at a difficulty level.
      </p>

      {/* Mode toggle */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => setMode("past_year")}
          className={`rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
            mode === "past_year"
              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/30 dark:bg-slate-700"
              : "border-gray-200 hover:border-blue-300 dark:border-slate-600"
          }`}
        >
          <p className="font-black text-gray-900 dark:text-white">Past years</p>
          <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-slate-400">
            The actual exam paper from a chosen year.
          </p>
        </button>
        <button
          onClick={() => setMode("difficulty")}
          className={`rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
            mode === "difficulty"
              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/30 dark:bg-slate-700"
              : "border-gray-200 hover:border-blue-300 dark:border-slate-600"
          }`}
        >
          <p className="font-black text-gray-900 dark:text-white">By difficulty</p>
          <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-slate-400">
            A curated set of easy / medium / hard questions.
          </p>
        </button>
      </div>

      {/* Mode-specific picker */}
      {mode === "past_year" ? (
        <div>
          <label className="mb-2 block text-sm font-black text-gray-500 dark:text-slate-400">
            Select year
          </label>
          {years.length === 0 ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
              No past-year papers are available yet.
            </p>
          ) : (
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="h-12 w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 font-semibold text-gray-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-black text-gray-500 dark:text-slate-400">
              Select difficulty
            </label>
            <div className="grid grid-cols-3 gap-3">
              {DIFFICULTY_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => pickDifficulty(level)}
                  className={`rounded-2xl border py-3 font-black capitalize transition active:scale-95 ${
                    difficulty === level
                      ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/30 dark:bg-slate-700 dark:text-white"
                      : "border-gray-200 text-gray-700 hover:border-blue-300 dark:border-slate-600 dark:text-white"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-gray-500 dark:text-slate-400">
              Select a set
            </label>
            {setsForDifficulty.length === 0 ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300">
                No {difficulty} sets are published yet. An admin can create them in
                Mock Sets.
              </p>
            ) : (
              <div className="space-y-2">
                {setsForDifficulty.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSetId(s.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                      setId === s.id
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/30 dark:bg-slate-700"
                        : "border-gray-200 hover:border-blue-300 dark:border-slate-600"
                    }`}
                  >
                    <span className="font-black text-gray-900 dark:text-white">
                      {s.name}
                    </span>
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400">
                      {s.questionIds.length} questions
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="rounded-2xl border border-gray-300 px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
        >
          ← Back
        </button>
        <button
          onClick={start}
          disabled={!canStart}
          className="rounded-2xl bg-blue-600 px-8 py-3 font-black text-white transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start test
        </button>
      </div>
    </div>
  );
}
