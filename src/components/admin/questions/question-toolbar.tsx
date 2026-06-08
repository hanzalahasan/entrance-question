"use client";

import Link from "next/link";

type QuestionToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
};

export default function QuestionToolbar({
  search,
  onSearchChange,
}: QuestionToolbarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex-1">
        <input
          value={search}
          onChange={(event) =>
            onSearchChange(event.target.value)
          }
          placeholder="Search questions..."
          className="h-12 w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
        />
      </div>

      <div className="flex gap-2">
        <Link
          href="/admin/add-question"
          className="flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700"
        >
          Add Question
        </Link>
      </div>
    </div>
  );
}