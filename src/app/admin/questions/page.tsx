"use client";

import { useEffect, useMemo, useState } from "react";

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
} from "@/services/admin-question-store";

import { recheckAllDuplicates } from "@/services/recheck-duplicate-service";

const QUESTIONS_PER_PAGE = 10;

function normalizeStatus(q: Question): Question {
  const s = q.status as Question["status"] | "archived";
  return { ...q, status: s === "archived" ? "unpublished" : q.status };
}

type ConfirmState = { message: string; onConfirm: () => void } | null;

export default function QuestionManagementPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const [activeTab, setActiveTab] = useState<"active" | "unpublished">("active");
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

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

  const activeQuestions = questions.filter(
    (q) => q.status === "published" || q.status === "draft"
  );
  const unpublishedQuestions = questions.filter((q) => q.status === "unpublished");
  const baseQuestions = activeTab === "active" ? activeQuestions : unpublishedQuestions;

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
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500 dark:border-slate-800 dark:bg-slate-900">
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
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab("active"); resetPage(); }}
              className={`rounded-full px-4 py-2 text-sm font-black ${activeTab === "active" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              Active ({activeQuestions.length})
            </button>
            <button
              onClick={() => { setActiveTab("unpublished"); resetPage(); }}
              className={`rounded-full px-4 py-2 text-sm font-black ${activeTab === "unpublished" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              Unpublished ({unpublishedQuestions.length})
            </button>
          </div>

          <button
            onClick={handleRecheckDuplicates}
            className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-black text-yellow-700 transition hover:bg-yellow-200"
          >
            Recheck Duplicates
          </button>
        </div>

        <QuestionBulkActions
          selectedCount={selectedIds.length}
          activeTab={activeTab}
          onBulkPublish={handleBulkPublish}
          onBulkUnpublish={handleBulkUnpublish}
          onClearSelection={() => setSelectedIds([])}
        />

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
              activeTab={activeTab}
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
