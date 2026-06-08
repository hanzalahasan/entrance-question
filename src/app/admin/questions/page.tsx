"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import AdminLayout from "@/components/admin/admin-layout";
import QuestionToolbar from "@/components/admin/questions/question-toolbar";
import QuestionFilters from "@/components/admin/questions/question-filters";
import QuestionTable from "@/components/admin/questions/question-table";
import QuestionPagination from "@/components/admin/questions/question-pagination";
import QuestionBulkActions from "@/components/admin/questions/question-bulk-actions";
import ConfirmDialog from "@/components/ui/confirm-dialog";

import type { Question } from "@/types/question";

import {
  getStoredQuestions,
  publishQuestion,
  unpublishQuestion,
  bulkUpdateQuestionStatus,
  saveQuestions,
  updateQuestion,
} from "@/services/admin-question-store";

import { recheckAllDuplicates } from "@/services/recheck-duplicate-service";

const QUESTIONS_PER_PAGE = 10;

function normalizeStatus(q: Question): Question {
  const s = q.status as Question["status"] | "archived";
  return { ...q, status: s === "archived" ? "unpublished" : q.status };
}

type ConfirmState = { message: string; onConfirm: () => void } | null;

type StatusFilter = "all" | "published" | "draft" | "unpublished";

function isStatusFilter(value: string | null): value is StatusFilter {
  return value === "published" || value === "draft" || value === "unpublished";
}

function QuestionManagementContent() {
  const searchParams = useSearchParams();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  // Status filter — seeds from the ?status= query param (e.g. dashboard cards
  // link to ?status=draft) so "go into drafts" works in one click.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const param = searchParams.get("status");
    return isStatusFilter(param) ? param : "all";
  });
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [genProgress, setGenProgress] = useState<{ done: number; total: number } | null>(null);

  async function load() {
    try {
      const all = await getStoredQuestions();
      setQuestions(all.map(normalizeStatus));
    } catch {
      setError("Failed to load questions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const counts = {
    all: questions.length,
    published: questions.filter((q) => q.status === "published").length,
    draft: questions.filter((q) => q.status === "draft").length,
    unpublished: questions.filter((q) => q.status === "unpublished").length,
  };

  const baseQuestions =
    statusFilter === "all"
      ? questions
      : questions.filter((q) => q.status === statusFilter);

  const filteredQuestions = useMemo(() => {
    return baseQuestions.filter((q) => {
      const matchesSearch = !search || q.question.toLowerCase().includes(search.toLowerCase());
      const matchesSubject = !subjectFilter || q.subjectName === subjectFilter;
      const matchesYear = !yearFilter || q.year === yearFilter;
      const matchesDifficulty = !difficultyFilter || q.difficulty === difficultyFilter;
      return matchesSearch && matchesSubject && matchesYear && matchesDifficulty;
    });
  }, [baseQuestions, search, subjectFilter, yearFilter, difficultyFilter]);

  const totalPages = Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE);
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * QUESTIONS_PER_PAGE,
    currentPage * QUESTIONS_PER_PAGE
  );

  const subjects = [...new Set(questions.map((q) => q.subjectName).filter(Boolean))] as string[];
  const years = [...new Set(questions.map((q) => q.year).filter(Boolean))] as string[];
  const difficulties = [...new Set(questions.map((q) => q.difficulty))];

  async function handleRecheckDuplicates() {
    try {
      const all = await getStoredQuestions();
      const rechecked = recheckAllDuplicates(all.map(normalizeStatus));
      await saveQuestions(rechecked);
      setQuestions(rechecked);
    } catch {
      setError("Duplicate recheck failed.");
    }
  }

  // Generate a long explanation (via AI) for every question that lacks one.
  async function handleGenerateMissingLong() {
    const all = await getStoredQuestions();
    const missing = all.filter((q) => !q.explanationLong?.trim());
    if (missing.length === 0) {
      setError("All questions already have a long explanation.");
      return;
    }

    setError("");
    setGenProgress({ done: 0, total: missing.length });

    for (const q of missing) {
      try {
        const opt = (key: string) =>
          q.options.find((o) => o.key === key)?.value ?? "";
        const res = await fetch("/api/admin/generate-explanation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: q.question,
            optionA: opt("A"),
            optionB: opt("B"),
            optionC: opt("C"),
            optionD: opt("D"),
            answer: q.answer,
            explanation: q.explanation,
            subjectName: q.subjectName,
            topicName: q.topicName,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Generation failed.");
          break;
        }
        await updateQuestion({
          ...q,
          explanationLong: data.longExplanation,
          concepts:
            q.concepts && q.concepts.length > 0 ? q.concepts : data.concepts ?? [],
          updatedAt: new Date().toISOString(),
        });
      } catch {
        setError("Network error during generation.");
        break;
      }
      setGenProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }

    setGenProgress(null);
    await load();
  }

  function handleUnpublish(id: number) {
    setConfirm({
      message: "Unpublish this question?",
      onConfirm: async () => {
        setConfirm(null);
        try {
          await unpublishQuestion(id);
          setSelectedIds((prev) => prev.filter((x) => x !== id));
          await load();
        } catch {
          setError("Failed to unpublish question.");
        }
      },
    });
  }

  async function handlePublish(id: number) {
    try {
      await publishQuestion(id);
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      await load();
    } catch {
      setError("Failed to publish question.");
    }
  }

  function handleBulkUnpublish() {
    setConfirm({
      message: `Unpublish ${selectedIds.length} question(s)?`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await bulkUpdateQuestionStatus(selectedIds, "unpublished");
          setSelectedIds([]);
          await load();
        } catch {
          setError("Bulk unpublish failed.");
        }
      },
    });
  }

  async function handleBulkPublish() {
    try {
      await bulkUpdateQuestionStatus(selectedIds, "published");
      setSelectedIds([]);
      await load();
    } catch {
      setError("Bulk publish failed.");
    }
  }

  function handleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSelectAll() {
    const pageIds = paginatedQuestions.map((q) => q.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected
      ? selectedIds.filter((id) => !pageIds.includes(id))
      : [...new Set([...selectedIds, ...pageIds])]
    );
  }

  function resetPage() {
    setCurrentPage(1);
    setSelectedIds([]);
  }

  if (loading) {
    return (
      <AdminLayout title="Question Management">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500 dark:border-slate-700 dark:bg-slate-800">
          Loading questions...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Question Management"
      description="View, search, edit, review, publish, and unpublish questions."
    >
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
          <button onClick={() => setError("")} className="ml-3 underline">Dismiss</button>
        </div>
      )}

      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {([
              { key: "all", label: "All" },
              { key: "published", label: "Published" },
              { key: "draft", label: "Draft" },
              { key: "unpublished", label: "Unpublished" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setStatusFilter(tab.key); resetPage(); }}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  statusFilter === tab.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {tab.label} ({counts[tab.key]})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleGenerateMissingLong}
              disabled={genProgress !== null}
              className="rounded-full bg-purple-600 px-4 py-2 text-sm font-black text-white transition hover:bg-purple-700 disabled:opacity-60"
            >
              {genProgress
                ? `✨ Generating ${genProgress.done}/${genProgress.total}…`
                : "✨ AI: Fill missing long explanations"}
            </button>
            <button
              onClick={handleRecheckDuplicates}
              className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-black text-yellow-700 transition hover:bg-yellow-200"
            >
              Recheck Duplicates
            </button>
          </div>
        </div>

        <QuestionBulkActions
          selectedCount={selectedIds.length}
          onBulkPublish={handleBulkPublish}
          onBulkUnpublish={handleBulkUnpublish}
          onClearSelection={() => setSelectedIds([])}
        />

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="space-y-5">
            <QuestionToolbar
              search={search}
              onSearchChange={(v) => { setSearch(v); resetPage(); }}
            />
            <QuestionFilters
              subject={subjectFilter} year={yearFilter} difficulty={difficultyFilter}
              subjects={subjects} years={years} difficulties={difficulties}
              onSubjectChange={(v) => { setSubjectFilter(v); resetPage(); }}
              onYearChange={(v) => { setYearFilter(v); resetPage(); }}
              onDifficultyChange={(v) => { setDifficultyFilter(v); resetPage(); }}
            />
            <QuestionTable
              questions={paginatedQuestions}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
            />
            <QuestionPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function QuestionManagementPage() {
  return (
    <Suspense
      fallback={
        <AdminLayout title="Question Management">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500 dark:border-slate-700 dark:bg-slate-800">
            Loading questions...
          </div>
        </AdminLayout>
      }
    >
      <QuestionManagementContent />
    </Suspense>
  );
}
