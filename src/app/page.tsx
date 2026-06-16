"use client";

import { useEffect, useState } from "react";

import TopFilterBar from "@/components/layout/top-filter-bar";
import QuestionCard from "@/components/question/question-card";
import ThemeToggle from "@/components/theme-toggle";
import AuthStatus from "@/components/auth/auth-status";

import type { Question } from "@/types/question";
import type { QuestionFilters } from "@/types/filter";

import { getStoredQuestions } from "@/services/admin-question-store";
import { filterQuestions } from "@/services/question-service";

const defaultFilters: QuestionFilters = {
  subjects: [],
  years: [],
  topics: [],
};

export default function HomePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filters, setFilters] = useState<QuestionFilters>(defaultFilters);

  useEffect(() => {
    getStoredQuestions().then((all) => {
      setQuestions(all.filter((q) => q.status === "published"));
    });
  }, []);

  const filteredQuestions = filterQuestions(questions, filters);

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-4 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Entrance Question
          </h1>

          <div className="flex items-center gap-2">
            <AuthStatus />
            <ThemeToggle />
          </div>
        </div>

        <TopFilterBar
          totalQuestions={filteredQuestions.length}
          filters={filters}
          onFiltersChange={setFilters}
        />

        <section className="flex min-h-[70vh] items-center justify-center">
          <QuestionCard questions={filteredQuestions} pool={questions} />
        </section>
      </div>
    </main>
  );
}
