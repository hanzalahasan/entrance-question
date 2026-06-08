"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  // Each card links into Question Management, filtered to that status, so e.g.
  // clicking "Draft" lands directly on the drafts ready to publish.
  const cards = [
    { label: "Total Questions", value: stats?.total ?? "—", href: "/admin/questions" },
    { label: "Published", value: stats?.published ?? "—", href: "/admin/questions?status=published" },
    { label: "Draft", value: stats?.draft ?? "—", href: "/admin/questions?status=draft" },
    { label: "Unpublished", value: stats?.unpublished ?? "—", href: "/admin/questions?status=unpublished" },
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
          <Link
            key={card.label}
            href={card.href}
            className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md active:scale-[0.99] dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500"
          >
            <p className="text-sm font-bold text-gray-500">{card.label}</p>
            <h2 className="mt-2 text-3xl font-black text-gray-900 dark:text-white">
              {card.value}
            </h2>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-white/60 p-8 text-center dark:border-slate-600 dark:bg-slate-800/60">
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
