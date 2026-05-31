"use client";

import { useEffect, useMemo, useState } from "react";

import AdminLayout from "@/components/admin/admin-layout";
import QuestionToolbar from "@/components/admin/questions/question-toolbar";
import QuestionFilters from "@/components/admin/questions/question-filters";
import QuestionTable from "@/components/admin/questions/question-table";
import QuestionPagination from "@/components/admin/questions/question-pagination";
import QuestionBulkActions from "@/components/admin/questions/question-bulk-actions";

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

function normalizeQuestionStatus(question: Question): Question {
  const legacyStatus = question.status as Question["status"] | "archived";

  return {
    ...question,
    status: legacyStatus === "archived" ? "unpublished" : question.status,
  };
}

export default function QuestionManagementPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "unpublished">("active");

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    getStoredQuestions().then((all) => {
      setQuestions(all.map(normalizeQuestionStatus));
    });
  }, []);

  const activeQuestions = questions.filter(
    (question) => question.status === "published" || question.status === "draft"
  );

  const unpublishedQuestions = questions.filter(
    (question) => question.status === "unpublished"
  );

  const baseQuestions =
    activeTab === "active" ? activeQuestions : unpublishedQuestions;

  const filteredQuestions = useMemo(() => {
    return baseQuestions.filter((question) => {
      const matchesSearch =
        !search ||
        question.question.toLowerCase().includes(search.toLowerCase());

      const matchesSubject =
        !subjectFilter || question.subjectName === subjectFilter;

      const matchesYear = !yearFilter || question.year === yearFilter;

      const matchesDifficulty =
        !difficultyFilter || question.difficulty === difficultyFilter;

      return matchesSearch && matchesSubject && matchesYear && matchesDifficulty;
    });
  }, [baseQuestions, search, subjectFilter, yearFilter, difficultyFilter]);

  const totalPages = Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE);

  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * QUESTIONS_PER_PAGE,
    currentPage * QUESTIONS_PER_PAGE
  );

  const subjects = Array.from(
    new Set(questions.map((question) => question.subjectName).filter(Boolean))
  ) as string[];

  const years = Array.from(
    new Set(questions.map((question) => question.year).filter(Boolean))
  ) as string[];

  const difficulties = Array.from(
    new Set(questions.map((question) => question.difficulty))
  );

  async function refreshQuestions() {
    const all = await getStoredQuestions();
    setQuestions(all.map(normalizeQuestionStatus));
  }

  async function handleRecheckDuplicates() {
    const all = await getStoredQuestions();
    const normalized = all.map(normalizeQuestionStatus);
    const rechecked = recheckAllDuplicates(normalized);
    await saveQuestions(rechecked);
    setQuestions(rechecked);
    alert("Duplicate check completed.");
  }

  async function handleUnpublish(id: number) {
    const confirmAction = window.confirm(
      "Are you sure you want to unpublish this question?"
    );
    if (!confirmAction) return;

    await unpublishQuestion(id);
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    await refreshQuestions();
  }

  async function handlePublish(id: number) {
    await publishQuestion(id);
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    await refreshQuestions();
  }

  async function handleBulkUnpublish() {
    const confirmAction = window.confirm(
      `Are you sure you want to unpublish ${selectedIds.length} question(s)?`
    );
    if (!confirmAction) return;

    await bulkUpdateQuestionStatus(selectedIds, "unpublished");
    setSelectedIds([]);
    await refreshQuestions();
  }

  async function handleBulkPublish() {
    await bulkUpdateQuestionStatus(selectedIds, "published");
    setSelectedIds([]);
    await refreshQuestions();
  }

  function handleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  }

  function handleSelectAll() {
    const currentPageIds = paginatedQuestions.map((question) => question.id);

    const allSelected = currentPageIds.every((id) =>
      selectedIds.includes(id)
    );

    if (allSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !currentPageIds.includes(id))
      );
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...currentPageIds])]);
    }
  }

  function resetPage() {
    setCurrentPage(1);
    setSelectedIds([]);
  }

  return (
    <AdminLayout
      title="Question Management"
      description="View, search, edit, review, publish, and unpublish questions."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab("active");
                resetPage();
              }}
              className={`rounded-full px-4 py-2 text-sm font-black ${
                activeTab === "active"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              Active ({activeQuestions.length})
            </button>

            <button
              onClick={() => {
                setActiveTab("unpublished");
                resetPage();
              }}
              className={`rounded-full px-4 py-2 text-sm font-black ${
                activeTab === "unpublished"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
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
              onSearchChange={(value) => {
                setSearch(value);
                resetPage();
              }}
            />

            <QuestionFilters
              subject={subjectFilter}
              year={yearFilter}
              difficulty={difficultyFilter}
              subjects={subjects}
              years={years}
              difficulties={difficulties}
              onSubjectChange={(value) => {
                setSubjectFilter(value);
                resetPage();
              }}
              onYearChange={(value) => {
                setYearFilter(value);
                resetPage();
              }}
              onDifficultyChange={(value) => {
                setDifficultyFilter(value);
                resetPage();
              }}
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
