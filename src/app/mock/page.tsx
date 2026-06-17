"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import type { Question } from "@/types/question";
import type {
  MockAttempt,
  MockConfig,
  MockResult,
  MockSelection,
  MockSet,
} from "@/types/mock";

import { getStoredQuestions } from "@/services/admin-question-store";
import { getStoredSubjects } from "@/services/master-data-store";
import { resolveMockConfig } from "@/services/mock-config-service";
import {
  buildMockQuestions,
  resolveSetQuestions,
  scoreMock,
} from "@/services/mock-service";
import { getPublishedMockSets } from "@/services/mock-set-store";
import {
  clearAttempt,
  getActiveAttempt,
  newAttemptId,
  saveAttempt,
} from "@/services/mock-attempt-store";

import { useAuth } from "@/context/auth-context";
import { saveMockResult } from "@/services/mock-result-store";

import ThemeToggle from "@/components/theme-toggle";
import AuthStatus from "@/components/auth/auth-status";
import MockRules from "@/components/mock/mock-rules";
import MockSetup from "@/components/mock/mock-setup";
import MockExam from "@/components/mock/mock-exam";
import MockResultView from "@/components/mock/mock-result";
import MockReview from "@/components/mock/mock-review";

type Phase = "loading" | "rules" | "setup" | "exam" | "result" | "review";

export default function MockPage() {
  const router = useRouter();
  const { user, loading: authLoading, authReady } = useAuth();

  const [phase, setPhase] = useState<Phase>("loading");
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [config, setConfig] = useState<MockConfig | null>(null);
  const [sets, setSets] = useState<MockSet[]>([]);

  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<MockAttempt | null>(null);
  const [startPaused, setStartPaused] = useState(false);
  const [result, setResult] = useState<MockResult | null>(null);

  // Load the bank + config, and resume an in-progress attempt if there is one.
  useEffect(() => {
    Promise.all([
      getStoredQuestions(),
      getStoredSubjects(),
      getPublishedMockSets(),
    ]).then(([all, subjects, publishedSets]) => {
        const published = all.filter((q) => q.status === "published");
        setAllQuestions(published);
        setConfig(resolveMockConfig(subjects));
        setSets(publishedSets);

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
      })
      .catch(() => {
        // Never leave the user stuck on the spinner if a load fails.
        setConfig((c) => c ?? resolveMockConfig([]));
        setPhase("rules");
      });
  }, []);

  // Taking a mock requires an account (so results save to the dashboard).
  useEffect(() => {
    if (authReady && !authLoading && !user) {
      router.replace("/login?next=/mock");
    }
  }, [authReady, authLoading, user, router]);

  const years = Array.from(
    new Set(
      allQuestions.flatMap((q) => [q.year, ...(q.repeatedYears || [])])
    )
  )
    .filter((y): y is string => Boolean(y))
    .sort((a, b) => b.localeCompare(a));

  function startMock(selection: MockSelection) {
    if (!config) return;
    // A set is a frozen list of questions; everything else is assembled live.
    const qs =
      selection.mode === "set"
        ? resolveSetQuestions(
            allQuestions,
            sets.find((s) => s.id === selection.setId)?.questionIds ?? []
          )
        : buildMockQuestions(allQuestions, selection, config);
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
    // Keep the final attempt in memory so the result + answer review can use the
    // submitted answers and timing (it's removed from storage so it won't resume).
    setAttempt(finalAttempt);
    const scored = scoreMock(finalAttempt, examQuestions);
    setResult(scored);
    clearAttempt();
    // Save to the user's history (best-effort; the result still shows if it fails).
    if (user) saveMockResult(user.id, finalAttempt, scored).catch(() => {});
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
          markCorrect={config.markCorrect}
          markWrong={config.markWrong}
          onNext={() => setPhase("setup")}
          onCancel={exitHome}
        />
      )}

      {phase === "setup" && (
        <MockSetup
          years={years}
          sets={sets}
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

      {phase === "result" && result && attempt && (
        <MockResultView
          result={result}
          attempt={attempt}
          onRetake={() => setPhase("setup")}
          onExit={exitHome}
          onReview={() => setPhase("review")}
        />
      )}

      {phase === "review" && attempt && (
        <MockReview
          questions={examQuestions}
          attempt={attempt}
          onBack={() => setPhase("result")}
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
          <div className="flex items-center gap-3">
            <AuthStatus />
            <ThemeToggle />
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
