"use client";

type QuestionBulkActionsProps = {
  selectedCount: number;
  activeTab: "active" | "unpublished";
  onBulkPublish: () => void;
  onBulkUnpublish: () => void;
  onClearSelection: () => void;
};

export default function QuestionBulkActions({
  selectedCount,
  activeTab,
  onBulkPublish,
  onBulkUnpublish,
  onClearSelection,
}: QuestionBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
      <p className="text-sm font-black text-blue-800 dark:text-blue-300">
        {selectedCount} question(s) selected
      </p>

      <div className="flex flex-wrap gap-2">
        {activeTab === "active" ? (
          <button
            onClick={onBulkUnpublish}
            className="rounded-xl px-4 py-2 text-sm font-black text-red-600 transition hover:bg-red-100"
          >
            Bulk Unpublish
          </button>
        ) : (
          <button
            onClick={onBulkPublish}
            className="rounded-xl px-4 py-2 text-sm font-black text-green-600 transition hover:bg-green-100"
          >
            Bulk Publish
          </button>
        )}

        <button
          onClick={onClearSelection}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-black text-gray-700 transition hover:bg-white dark:border-slate-700 dark:text-white dark:hover:bg-slate-900"
        >
          Clear Selection
        </button>
      </div>
    </div>
  );
}