"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import AdminLayout from "@/components/admin/admin-layout";
import QuestionForm from "@/components/admin/questions/question-form";

import {
  getStoredQuestions,
  getStoredQuestionById,
  saveQuestions,
  updateQuestion,
} from "@/services/admin-question-store";
import {
  findClassificationConflicts,
  findExactDuplicateQuestions,
  findRepeatedYearQuestions,
} from "@/services/duplicate-question-service";
import { recheckAllDuplicates } from "@/services/recheck-duplicate-service";
import { validateQuestion } from "@/lib/question-validation";
import type { Question } from "@/types/question";

export default function EditQuestionPage() {
  const params = useParams();
  const router = useRouter();
  const questionId = Number(params.id);

  const [questionData, setQuestionData] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getStoredQuestionById(questionId)
      .then(setQuestionData)
      .catch(() => setError("Failed to load question."))
      .finally(() => setLoading(false));
  }, [questionId]);

  async function saveChanges(status?: Question["status"]) {
    if (!questionData) return;

    const validationError = validateQuestion(questionData);
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    setError("");

    try {
      const prepared: Question = {
        ...questionData,
        status: status ?? questionData.status,
        source: questionData.year ? "past_year" : "practice",
        updatedAt: new Date().toISOString(),
      };

      const existing = await getStoredQuestions();

      const conflicts = findClassificationConflicts(prepared, existing);
      if (conflicts.length > 0) {
        const c = conflicts[0];
        setError(`This question exists under ${c.subjectName || "another subject"} → ${c.topicName || "another topic"}.`);
        return;
      }

      if (findExactDuplicateQuestions(prepared, existing).length > 0) {
        setError("This exact question already exists for the same subject, topic, and year.");
        return;
      }

      const repeatedYears = [
        ...new Set([
          ...findRepeatedYearQuestions(prepared, existing)
            .map((q) => q.year)
            .filter(Boolean),
          prepared.year,
        ]),
      ] as string[];

      await updateQuestion({
        ...prepared,
        repeatedYears,
        repeatCount: repeatedYears.length || 1,
        duplicateCheckStatus: "unique",
        possibleDuplicateIds: [],
      });

      const all = await getStoredQuestions();
      await saveQuestions(recheckAllDuplicates(all));

      router.push("/admin/questions");
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Edit / Review Question">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500 dark:border-slate-700 dark:bg-slate-800">
          Loading question...
        </div>
      </AdminLayout>
    );
  }

  if (!questionData) {
    return (
      <AdminLayout title="Question Not Found">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 font-bold text-red-700">
          Question not found.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Edit / Review Question"
      description="Update question details, answer, explanation, and status."
    >
      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
          <button onClick={() => setError("")} className="ml-3 underline">Dismiss</button>
        </div>
      )}

      <QuestionForm
        questionData={questionData}
        onChange={setQuestionData}
        saving={saving}
        onSaveDraft={() => saveChanges("draft")}
        onPublish={() => saveChanges("published")}
        publishButtonLabel="Save Changes"
      />
    </AdminLayout>
  );
}
