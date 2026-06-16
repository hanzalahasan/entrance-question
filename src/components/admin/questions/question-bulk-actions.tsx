"use client";

import type { Question } from "@/types/question";

type QuestionBulkActionsProps = {
  selectedCount: number;
  onBulkPublish: () => void;
  onBulkUnpublish: () => void;
  onBulkDelete: () => void;
  onBulkSetDifficulty: (difficulty: Question["difficulty"]) => void;
  onBulkAiTagDifficulty: () => void;
  aiTagging: boolean;
  onClearSelection: () => void;
};

export default function QuestionBulkActions({
  selectedCount,
  onBulkPublish,
  onBulkUnpublish,
  onBulkDelete,
  onBulkSetDifficulty,
  onBulkAiTagDifficulty,
  aiTagging,
  onClearSelection,
}: QuestionBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
      <p className="text-sm font-black text-blue-800 dark:text-blue-300">
        {selectedCount} question(s) selected
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onBulkPublish}
          className="rounded-xl px-4 py-2 text-sm font-black text-green-600 transition hover:bg-green-100"
        >
          Bulk Publish
        </button>

        <button
          onClick={onBulkUnpublish}
          className="rounded-xl px-4 py-2 text-sm font-black text-orange-600 transition hover:bg-orange-100"
        >
          Bulk Unpublish
        </button>

        <button
          onClick={onBulkDelete}
          className="rounded-xl px-4 py-2 text-sm font-black text-red-600 transition hover:bg-red-100"
        >
          Bulk Delete
        </button>

        {/* Set difficulty for all selected. Resets to the placeholder after use. */}
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              onBulkSetDifficulty(e.target.value as Question["difficulty"]);
            }
          }}
          className="cursor-pointer rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-black text-gray-700 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
        >
          <option value="">Set difficulty…</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <button
          onClick={onBulkAiTagDifficulty}
          disabled={aiTagging}
          className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-black text-white transition hover:bg-purple-700 disabled:opacity-60"
        >
          {aiTagging ? "✨ Tagging…" : "✨ AI: tag difficulty"}
        </button>

        <button
          onClick={onClearSelection}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-black text-gray-700 transition hover:bg-white dark:border-slate-600 dark:text-white dark:hover:bg-slate-900"
        >
          Clear Selection
        </button>
      </div>
    </div>
  );
}