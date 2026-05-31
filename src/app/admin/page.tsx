"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import { getStoredQuestions } from "@/services/admin-question-store";

type Stats = { total: number; published: number; draft: number; unpublished: number };

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getStoredQuestions()
      .then((questions) =>
        setStats({
          total: questions.length,
          published: questions.filter((q) => q.status === "published").length,
          draft: questions.filter((q) => q.status === "draft").length,
          unpublished: questions.filter((q) => q.status === "unpublished").length,
        })
      )
      .catch(() => setError("Failed to load dashboard data."));
  }, []);

  const cards = stats
    ? [
        { label: "Total Questions", value: stats.total },
        { label: "Published", value: stats.published },
        { label: "Draft", value: stats.draft },
        { label: "Unpublished", value: stats.unpublished },
      ]
    : [
        { label: "Total Questions", value: "—" },
        { label: "Published", value: "—" },
        { label: "Draft", value: "—" },
        { label: "Unpublished", value: "—" },
      ];

  return (
    <AdminLayout
      title="Admin Dashboard"
      description="Manage questions, users, reviews, imports, and platform settings."
    >
      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-sm font-bold text-gray-500">{card.label}</p>
            <h2 className="mt-2 text-3xl font-black text-gray-900 dark:text-white">
              {card.value}
            </h2>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-white/60 p-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
        <h2 className="text-xl font-black text-gray-900 dark:text-white">
          Dashboard Activity
        </h2>
        <p className="mt-2 text-sm font-semibold text-gray-500 dark:text-slate-400">
          Recent imports, reviews, AI alerts, and question activity will appear here.
        </p>
      </div>
    </AdminLayout>
  );
}
