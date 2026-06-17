"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "@/context/auth-context";
import { getMockResults } from "@/services/mock-result-store";
import { getPracticeAttempts, type PracticeAttempt } from "@/services/practice-attempt-store";
import { getStoredQuestions } from "@/services/admin-question-store";
import { scoreMock } from "@/services/mock-service";
import { computePerformance } from "@/services/performance-service";
import type { Question } from "@/types/question";
import type { MockAttempt, MockResult, MockResultRecord } from "@/types/mock";

import ThemeToggle from "@/components/theme-toggle";
import AuthStatus from "@/components/auth/auth-status";
import ProfileCard from "@/components/dashboard/profile-card";
import ActivityStats from "@/components/dashboard/activity-stats";
import PerformanceInsights from "@/components/dashboard/performance-insights";
import ResultsHistory from "@/components/dashboard/results-history";
import MockDetailedReport from "@/components/mock/mock-detailed-report";
import MockReview from "@/components/mock/mock-review";

type Viewing = {
  attempt: MockAttempt;
  questions: Question[];
  result: MockResult;
};

// Rebuild a MockAttempt from a saved record so the existing report + review
// components can render it.
function recordToAttempt(rec: MockResultRecord): MockAttempt {
  return {
    id: `hist_${rec.id}`,
    selection: rec.selection,
    questionIds: rec.questionIds,
    answers: rec.answers,
    remainingSeconds: 0,
    status: "submitted",
    startedAt: rec.startedAt ?? rec.createdAt,
    submittedAt: rec.submittedAt ?? rec.createdAt,
    pauseCount: rec.pauseCount,
    durationMinutes: rec.durationMinutes ?? 0,
    markCorrect: rec.markCorrect,
    markWrong: rec.markWrong,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, authReady } = useAuth();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [tab, setTab] = useState<"overview" | "insights" | "mocks">("overview");

  const [results, setResults] = useState<MockResultRecord[]>([]);
  const [practice, setPractice] = useState<PracticeAttempt[]>([]);
  const [bank, setBank] = useState<Question[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [viewing, setViewing] = useState<Viewing | null>(null);
  const [reviewing, setReviewing] = useState(false);

  // Require login.
  useEffect(() => {
    if (authReady && !authLoading && !user) {
      router.replace("/login?next=/dashboard");
    }
  }, [authReady, authLoading, user, router]);

  // Load history + the question bank (to rebuild reports).
  useEffect(() => {
    if (!user) return;
    Promise.all([
      getMockResults(user.id),
      getPracticeAttempts(user.id),
      getStoredQuestions(),
    ]).then(([res, prac, all]) => {
      setResults(res);
      setPractice(prac);
      setBank(all.filter((q) => q.status === "published"));
      setLoadingData(false);
    });
  }, [user]);

  const performance = useMemo(
    () => computePerformance(bank, results, practice),
    [bank, results, practice]
  );

  function rebuild(rec: MockResultRecord) {
    const attempt = recordToAttempt(rec);
    const byId = new Map(bank.map((q) => [q.id, q]));
    const questions = rec.questionIds
      .map((id) => byId.get(id))
      .filter((q): q is Question => Boolean(q));
    return { attempt, questions, result: scoreMock(attempt, questions) };
  }

  function openReport(rec: MockResultRecord) {
    setViewing(rebuild(rec));
    setReviewing(false);
  }

  async function downloadPdf(rec: MockResultRecord) {
    setDownloadingId(rec.id);
    try {
      const { attempt, result } = rebuild(rec);
      const { downloadResultPdf } = await import("@/services/pdf-export");
      await downloadResultPdf(result, attempt, profile);
    } catch {
      // ignore — the button just re-enables
    } finally {
      setDownloadingId(null);
    }
  }

  if (!authReady) {
    return (
      <Shell>
        <Notice>
          Accounts need Supabase configured. Set the env vars and run
          supabase/auth-setup.sql.
        </Notice>
      </Shell>
    );
  }
  if (authLoading || !user) {
    return (
      <Shell>
        <Notice>Loading…</Notice>
      </Shell>
    );
  }

  // Full-screen answer review.
  if (reviewing && viewing) {
    return (
      <Shell>
        <MockReview
          questions={viewing.questions}
          attempt={viewing.attempt}
          onBack={() => setReviewing(false)}
        />
      </Shell>
    );
  }

  const TABS = [
    { id: "overview", label: "Overview", icon: "🏠" },
    { id: "insights", label: "Strengths & Weaknesses", icon: "📊" },
    { id: "mocks", label: "Mock Tests", icon: "📝" },
  ] as const;

  return (
    <Shell>
      <div className="flex flex-col gap-5 md:flex-row md:gap-6">
        {/* Sidebar menu (horizontal scroll on phones, vertical on desktop) */}
        <nav className="flex gap-2 overflow-x-auto pb-1 md:w-56 md:shrink-0 md:flex-col md:overflow-visible md:pb-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-2xl px-4 py-2.5 text-left text-sm font-bold transition md:w-full ${
                tab === t.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span className="mr-2">{t.icon}</span>
              {t.label}
            </button>
          ))}
          <Link
            href="/mock"
            className="shrink-0 rounded-2xl border border-blue-300 px-4 py-2.5 text-center text-sm font-bold text-blue-700 transition hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 md:mt-2"
          >
            + Take a mock
          </Link>
        </nav>

        {/* Section content */}
        <div className="min-w-0 flex-1 space-y-6">
          {tab === "overview" && (
            <>
              <ProfileCard />
              <div>
                <h2 className="mb-3 text-lg font-black text-gray-900 dark:text-white">
                  Activity
                </h2>
                <ActivityStats results={results} />
              </div>
            </>
          )}

          {tab === "insights" && (
            <div>
              <h2 className="mb-3 text-lg font-black text-gray-900 dark:text-white">
                Strengths &amp; weaknesses
              </h2>
              {loadingData ? (
                <Notice>Analysing your performance…</Notice>
              ) : (
                <PerformanceInsights performance={performance} />
              )}
            </div>
          )}

          {tab === "mocks" && (
            <div>
              <h2 className="mb-3 text-lg font-black text-gray-900 dark:text-white">
                Your mock tests
              </h2>
              {loadingData ? (
                <Notice>Loading your results…</Notice>
              ) : (
                <ResultsHistory
                  results={results}
                  onView={openReport}
                  onDownload={downloadPdf}
                  downloadingId={downloadingId}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {viewing && (
        <MockDetailedReport
          result={viewing.result}
          attempt={viewing.attempt}
          onCheckAnswers={() => setReviewing(true)}
          onClose={() => setViewing(null)}
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-4 dark:bg-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
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

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-sm font-bold text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
      {children}
    </div>
  );
}
