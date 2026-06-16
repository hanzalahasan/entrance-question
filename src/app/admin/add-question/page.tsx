"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import AdminLayout from "@/components/admin/admin-layout";
import QuestionForm from "@/components/admin/questions/question-form";

import { getStoredQuestions, saveQuestion, saveQuestions } from "@/services/admin-question-store";
import {
  findClassificationConflicts,
  findExactDuplicateQuestions,
  findRepeatedYearQuestions,
} from "@/services/duplicate-question-service";
import { recheckAllDuplicates } from "@/services/recheck-duplicate-service";
import {
  candidatesForSubject,
  checkSemanticDuplicates,
  type SemanticDupMatch,
} from "@/services/semantic-duplicate-service";
import { validateQuestion } from "@/lib/question-validation";
import type { Question } from "@/types/question";

function createEmptyQuestion(): Question {
  return {
    id: Date.now(),
    uuid: crypto.randomUUID(),
    question: "",
    options: [
      { key: "A", value: "", type: "text" },
      { key: "B", value: "", type: "text" },
      { key: "C", value: "", type: "text" },
      { key: "D", value: "", type: "text" },
    ],
    answer: "",
    explanation: "",
    subjectId: 0,
    topicId: 0,
    subjectName: "",
    topicName: "",
    year: "",
    repeatedYears: [],
    repeatCount: 1,
    source: "practice",
    importSource: "manual",
    difficulty: "medium",
    status: "draft",
    media: {},
    aiTags: [],
    aiReviewStatus: "not_checked",
    duplicateCheckStatus: "not_checked",
    possibleDuplicateIds: [],
    isMockEligible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function AddQuestionPage() {
  const router = useRouter();
  const [questionData, setQuestionData] = useState<Question>(createEmptyQuestion());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Semantic "rephrase" matches awaiting the admin's confirm-to-save decision.
  const [dupWarning, setDupWarning] = useState<{
    status: Question["status"];
    matches: SemanticDupMatch[];
  } | null>(null);

  async function saveAs(status: Question["status"], force = false) {
    const validationError = validateQuestion(questionData);
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    setError("");

    try {
      const existing = await getStoredQuestions();

      const conflicts = findClassificationConflicts(questionData, existing);
      if (conflicts.length > 0) {
        const c = conflicts[0];
        setError(`This question exists under ${c.subjectName || "another subject"} → ${c.topicName || "another topic"}. Edit that instead.`);
        return;
      }

      if (findExactDuplicateQuestions(questionData, existing).length > 0) {
        setError("This exact question already exists for the same subject, topic, and year.");
        return;
      }

      // Semantic (rephrased / same-meaning) check — a soft warning the admin can
      // override, since it's similarity-based, not an exact match.
      if (!force) {
        const matchesMap = await checkSemanticDuplicates(
          [{ index: 0, question: questionData.question }],
          candidatesForSubject(existing, questionData.subjectId)
        );
        const matches = matchesMap[0];
        if (matches && matches.length > 0) {
          setDupWarning({ status, matches });
          return;
        }
      }
      setDupWarning(null);

      const repeatedYears = [
        ...new Set([
          ...findRepeatedYearQuestions(questionData, existing)
            .map((q) => q.year)
            .filter(Boolean),
          questionData.year,
        ]),
      ] as string[];

      await saveQuestion({
        ...questionData,
        status,
        source: questionData.year ? "past_year" : "practice",
        repeatedYears,
        repeatCount: repeatedYears.length || 1,
        duplicateCheckStatus: "unique",
        possibleDuplicateIds: [],
        updatedAt: new Date().toISOString(),
      });

      const all = await getStoredQuestions();
      await saveQuestions(recheckAllDuplicates(all));

      router.push("/admin/questions");
    } catch {
      setError("Failed to save question. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout
      title="Add Question"
      description="Create question with dynamic subject, topic, answer, and review workflow."
    >
      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
          <button onClick={() => setError("")} className="ml-3 underline">Dismiss</button>
        </div>
      )}

      {dupWarning && (
        <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm font-black text-amber-800 dark:text-amber-200">
            ⚠ This looks like a reworded version of {dupWarning.matches.length}{" "}
            existing question{dupWarning.matches.length === 1 ? "" : "s"}:
          </p>
          <ul className="mt-2 space-y-1">
            {dupWarning.matches.map((m) => (
              <li
                key={m.id}
                className="text-xs font-semibold text-amber-700 dark:text-amber-300"
              >
                #{m.id} · {Math.round(m.similarity * 100)}% — {m.question}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => saveAs(dupWarning.status, true)}
              disabled={saving}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
            >
              Save anyway
            </button>
            <button
              onClick={() => setDupWarning(null)}
              className="rounded-xl border border-amber-300 px-4 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <QuestionForm
        questionData={questionData}
        onChange={setQuestionData}
        saving={saving}
        onSaveDraft={() => saveAs("draft")}
        onPublish={() => saveAs("published")}
        publishButtonLabel="Publish Question"
      />
    </AdminLayout>
  );
}
