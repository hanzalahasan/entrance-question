"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import type { Question } from "@/types/question";
import type { MockAttempt, MockConfig, MockResult, MockSelection } from "@/types/mock";

import { getStoredQuestions } from "@/services/admin-question-store";
import { getStoredSubjects } from "@/services/master-data-store";
import {
  resolveMockConfig,
  totalConfiguredQuestions,
} from "@/services/mock-config-service";
import { buildMockQuestions, scoreMock } from "@/services/mock-service";
import {
  clearAttempt,
  getActiveAttempt,
  newAttemptId,
  saveAttempt,
} from "@/services/mock-attempt-store";

import ThemeToggle from "@/components/theme-toggle";
import MockRules from "@/components/mock/mock-rules";
import MockSetup from "@/components/mock/mock-setup";
import MockExam from "@/components/mock/mock-exam";
import MockResultView from "@/components/mock/mock-result";

type Phase = "loading" | "rules" | "setup" | "exam" | "result";

export default function MockPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [config, setConfig] = useState<MockConfig | null>(null);

  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<MockAttempt | null>(null);
  const [startPaused, setStartPaused] = useState(false);
  const [result, setResult] = useState<MockResult | null>(null);

  // Load the bank + config, and resume an in-progress attempt if there is one.
  useEffect(() => {
    Promise.all([getStoredQuestions(), getStoredSubjects()]).then(
      ([all, subjects]) => {
        const published = all.filter((q) => q.status === "published");
        setAllQuestions(published);
        setConfig(resolveMockConfig(subjects));

        const active = getActiveAttempt();
        if (active) {
          const byId = new Map(published.map((q) => [q.id, q]));
          const qs = active.questionIds
            .map((id) => byId.get(id))
            .filter((q): q is Question => Boolean(q));
          if (qs.length > 0) {
            setExamQuestions(qs);
            setAttempt(active);
            setStartPaused(true);
            setPhase("exam");
            return;
          }
          clearAttempt();
        }
        setPhase("rules");
      }
    );
  }, []);

  const years = Array.from(
    new Set(
      allQuestions.flatMap((q) => [q.year, ...(q.repeatedYears || [])])
    )
  )
    .filter((y): y is string => Boolean(y))
    .sort((a, b) => b.localeCompare(a));

  function startMock(selection: MockSelection) {
    if (!config) return;
    const qs = buildMockQuestions(allQuestions, selection, config);
    if (qs.length === 0) {
      window.alert(
        "No questions are available for this selection yet. Try another option."
      );
      return;
    }
    const fresh: MockAttempt = {
      id: newAttemptId(),
      selection,
      questionIds: qs.map((q) => q.id),
      answers: {},
      remainingSeconds: config.durationMinutes * 60,
      status: "in_progress",
      startedAt: new Date().toISOString(),
      durationMinutes: config.durationMinutes,
      markCorrect: config.markCorrect,
      markWrong: config.markWrong,
    };
    saveAttempt(fresh);
    setExamQuestions(qs);
    setAttempt(fresh);
    setStartPaused(false);
    setResult(null);
    setPhase("exam");
  }

  function handleSubmit(finalAttempt: MockAttempt) {
    setResult(scoreMock(finalAttempt, examQuestions));
    clearAttempt();
    setPhase("result");
  }

  function handleReset() {
    if (attempt) startMock(attempt.selection);
  }

  function exitHome() {
    router.push("/");
  }

  if (phase === "loading" || !config) {
    return (
      <Shell>
        <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center font-bold text-gray-500 dark:border-slate-700 dark:bg-slate-800">
          Loading mock test…
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {phase === "rules" && (
        <MockRules
          durationMinutes={config.durationMinutes}
          totalQuestions={totalConfiguredQuestions(config)}
          markCorrect={config.markCorrect}
          markWrong={config.markWrong}
          onNext={() => setPhase("setup")}
          onCancel={exitHome}
        />
      )}

      {phase === "setup" && (
        <MockSetup
          years={years}
          onStart={startMock}
          onBack={() => setPhase("rules")}
        />
      )}

      {phase === "exam" && attempt && (
        <MockExam
          key={attempt.id}
          questions={examQuestions}
          attempt={attempt}
          startPaused={startPaused}
          onSubmit={handleSubmit}
          onReset={handleReset}
          onExit={exitHome}
        />
      )}

      {phase === "result" && result && (
        <MockResultView
          result={result}
          onRetake={() => setPhase("setup")}
          onExit={exitHome}
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-4 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold text-gray-900 dark:text-white"
          >
            Entrance Question
          </Link>
          <ThemeToggle />
        </div>
        {children}
      </div>
    </main>
  );
}
