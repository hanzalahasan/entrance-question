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

import type { Question } from "@/types/question";

export default function EditQuestionPage() {
  const params = useParams();
  const router = useRouter();

  const questionId = Number(params.id);

  const [questionData, setQuestionData] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoredQuestionById(questionId).then((found) => {
      setQuestionData(found);
      setLoading(false);
    });
  }, [questionId]);

  function validateQuestion(question: Question) {
    return (
      question.question.trim() &&
      question.subjectId &&
      question.topicId &&
      question.answer &&
      question.options.every((option) => {
        if (option.type === "image") return option.imageUrl;
        if (option.type === "text_image") {
          return option.value?.trim() && option.imageUrl;
        }

        return option.value?.trim();
      })
    );
  }

  async function saveChanges(status?: Question["status"]) {
    if (!questionData) return;

    if (!validateQuestion(questionData)) {
      alert("Please complete question, options, correct answer, subject, and topic.");
      return;
    }

    const preparedQuestion: Question = {
      ...questionData,
      status: status || questionData.status,
      source: questionData.year ? "past_year" : "practice",
      updatedAt: new Date().toISOString(),
    };

    const existingQuestions = await getStoredQuestions();

    const classificationConflicts = findClassificationConflicts(
      preparedQuestion,
      existingQuestions
    );

    if (classificationConflicts.length > 0) {
      const conflict = classificationConflicts[0];

      alert(
        `This question already exists under ${conflict.subjectName || "another subject"} → ${
          conflict.topicName || "another topic"
        }. Please review the existing question instead of saving the same question under a different classification.`
      );

      return;
    }

    const exactDuplicates = findExactDuplicateQuestions(
      preparedQuestion,
      existingQuestions
    );

    if (exactDuplicates.length > 0) {
      alert(
        "This question already exists for the same subject, topic, and year. Duplicate question is not allowed."
      );

      return;
    }

    const repeatedYearQuestions = findRepeatedYearQuestions(
      preparedQuestion,
      existingQuestions
    );

    const repeatedYears = Array.from(
      new Set([
        ...repeatedYearQuestions.map((question) => question.year).filter(Boolean),
        preparedQuestion.year,
      ])
    ) as string[];

    await updateQuestion({
      ...preparedQuestion,
      repeatedYears,
      repeatCount: repeatedYears.length || 1,
      duplicateCheckStatus: "unique",
      possibleDuplicateIds: [],
    });

    const allQuestions = await getStoredQuestions();
    const rechecked = recheckAllDuplicates(allQuestions);
    await saveQuestions(rechecked);

    router.push("/admin/questions");
  }

  if (loading) {
    return (
      <AdminLayout title="Edit / Review Question">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 font-bold text-gray-700">
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
      <QuestionForm
        questionData={questionData}
        onChange={setQuestionData}
        onSaveDraft={() => saveChanges("draft")}
        onPublish={() => saveChanges("published")}
        publishButtonLabel="Save Changes"
      />
    </AdminLayout>
  );
}
