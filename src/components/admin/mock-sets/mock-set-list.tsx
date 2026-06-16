"use client";

import type { MockSet } from "@/types/mock";
import { DIFFICULTY_LEVELS } from "@/types/mock";
import { deleteMockSet, toggleMockSetStatus } from "@/services/mock-set-store";

type Props = {
  sets: MockSet[];
  onEdit: (set: MockSet) => void;
  onChange: () => void;
};

const DIFF_BADGE: Record<string, string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

// Lists existing Mock Sets grouped by difficulty, with publish/edit/delete.
export default function MockSetList({ sets, onEdit, onChange }: Props) {
  async function toggle(set: MockSet) {
    await toggleMockSetStatus(set.id, set.status);
    onChange();
  }
  async function remove(set: MockSet) {
    if (!confirm(`Delete "${set.name}"?`)) return;
    await deleteMockSet(set.id);
    onChange();
  }

  if (sets.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-800">
        <p className="text-sm font-bold text-gray-500 dark:text-slate-400">
          No mock sets yet. Create one above — students pick these under
          “By difficulty”.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {DIFFICULTY_LEVELS.map((level) => {
        const group = sets.filter((s) => s.difficulty === level);
        if (group.length === 0) return null;
        return (
          <div key={level}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-black capitalize ${DIFF_BADGE[level]}`}
              >
                {level}
              </span>
              <span className="text-xs font-bold text-gray-400">
                {group.length} set{group.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="space-y-2">
              {group.map((set) => (
                <div
                  key={set.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-gray-900 dark:text-white">
                        {set.name}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          set.status === "published"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-gray-200 text-gray-600 dark:bg-slate-600 dark:text-slate-200"
                        }`}
                      >
                        {set.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-gray-500 dark:text-slate-400">
                      {set.questionIds.length} questions ·{" "}
                      {new Date(set.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggle(set)}
                      className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      {set.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => onEdit(set)}
                      className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(set)}
                      className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
