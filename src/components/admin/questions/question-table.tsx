"use client";

import Link from "next/link";
import type { Question } from "@/types/question";

type QuestionTableProps = {
  questions?: Question[];
  selectedIds?: number[];
  onSelect: (id: number) => void;
  onSelectAll: () => void;
  onPublish: (id: number) => void;
  onUnpublish: (id: number) => void;
  onDelete: (id: number) => void;
  onDifficultyChange: (id: number, difficulty: Question["difficulty"]) => void;
};

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  hard: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function getDuplicateLabel(status?: Question["duplicateCheckStatus"]) {
  if (status === "possible_duplicate") return "Possible";
  if (status === "not_checked") return "Not checked";
  return status || "Not checked";
}

export default function QuestionTable({
  questions,
  selectedIds,
  onSelect,
  onSelectAll,
  onPublish,
  onUnpublish,
  onDelete,
  onDifficultyChange,
}: QuestionTableProps) {
  const safeQuestions = Array.isArray(questions) ? questions : [];
  const safeSelectedIds = Array.isArray(selectedIds) ? selectedIds : [];

  const allSelected =
    safeQuestions.length > 0 &&
    safeQuestions.every((question) => safeSelectedIds.includes(question.id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] border-separate border-spacing-y-3">
        <thead>
          <tr className="text-left text-sm font-black text-gray-500">
            <th className="w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                className="h-4 w-4"
              />
            </th>

            <th>Question</th>
            <th>Status</th>
            <th>Subject</th>
            <th>Topic</th>
            <th>Year</th>
            <th>Difficulty</th>
            <th>Duplicate</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {safeQuestions.map((question) => {
            const isSelected = safeSelectedIds.includes(question.id);

            return (
              <tr
                key={question.id}
                className={`rounded-2xl text-sm font-semibold transition ${
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-950/20"
                    : "bg-gray-50 dark:bg-slate-900"
                } text-gray-700 dark:text-slate-300`}
              >
                <td className="rounded-l-2xl p-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(question.id)}
                    className="h-4 w-4"
                  />
                </td>

                <td className="max-w-md p-4">{question.question}</td>

                <td className="p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      question.status === "published"
                        ? "bg-green-100 text-green-700"
                        : question.status === "draft"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {question.status === "published"
                      ? "Published"
                      : question.status === "draft"
                        ? "Draft"
                        : "Unpublished"}
                  </span>
                </td>

                <td className="p-4">{question.subjectName || "-"}</td>
                <td className="p-4">{question.topicName || "-"}</td>
                <td className="p-4">{question.year || "-"}</td>
                <td className="p-4">
                  <select
                    value={question.difficulty}
                    onChange={(e) =>
                      onDifficultyChange(
                        question.id,
                        e.target.value as Question["difficulty"]
                      )
                    }
                    title="Change difficulty"
                    className={`cursor-pointer rounded-full border-0 px-3 py-1 text-xs font-black capitalize outline-none ${
                      DIFFICULTY_STYLES[question.difficulty] ||
                      "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </td>

                <td className="p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      question.duplicateCheckStatus === "unique"
                        ? "bg-green-100 text-green-700"
                        : question.duplicateCheckStatus === "possible_duplicate"
                          ? "bg-yellow-100 text-yellow-700"
                          : question.duplicateCheckStatus === "duplicate"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {getDuplicateLabel(question.duplicateCheckStatus)}
                  </span>
                </td>

                <td className="rounded-r-2xl p-4">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/questions/${question.id}`}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-100 dark:border-slate-600 dark:text-white dark:hover:bg-slate-800"
                    >
                      Edit / Review
                    </Link>

                    {question.status === "published" ? (
                      <button
                        onClick={() => onUnpublish(question.id)}
                        className="rounded-xl px-3 py-2 text-xs font-black text-red-500 transition hover:bg-red-50 hover:text-red-700"
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        onClick={() => onPublish(question.id)}
                        className="rounded-xl px-3 py-2 text-xs font-black text-green-500 transition hover:bg-green-50 hover:text-green-700"
                      >
                        Publish
                      </button>
                    )}

                    <button
                      onClick={() => onDelete(question.id)}
                      className="rounded-xl px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {safeQuestions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm font-bold text-gray-500 dark:border-slate-600">
          No questions found.
        </div>
      )}
    </div>
  );
}