"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import AdminLayout from "@/components/admin/admin-layout";
import QuestionForm from "@/components/admin/questions/question-form";

import {
  getStoredQuestions,
  saveQuestion,
  saveQuestions,
} from "@/services/admin-question-store";

import {
  findClassificationConflicts,
  findExactDuplicateQuestions,
  findRepeatedYearQuestions,
} from "@/services/duplicate-question-service";

import { recheckAllDuplicates } from "@/services/recheck-duplicate-service";

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

  function validateQuestion() {
    return (
      questionData.question.trim() &&
      questionData.subjectId &&
      questionData.topicId &&
      questionData.answer &&
      questionData.options.every((option) => {
        if (option.type === "image") return option.imageUrl;
        if (option.type === "text_image") {
          return option.value?.trim() && option.imageUrl;
        }

        return option.value?.trim();
      })
    );
  }

  async function saveAs(status: Question["status"]) {
    if (!validateQuestion()) {
      alert("Please complete question, options, correct answer, subject, and topic.");
      return;
    }

    const existingQuestions = await getStoredQuestions();

    const classificationConflicts = findClassificationConflicts(
      questionData,
      existingQuestions
    );

    if (classificationConflicts.length > 0) {
      const conflict = classificationConflicts[0];

      alert(
        `This question already exists under ${conflict.subjectName || "another subject"} → ${conflict.topicName || "another topic"}. Please review the existing question instead of creating the same question under a different classification.`
      );

      return;
    }

    const exactDuplicates = findExactDuplicateQuestions(
      questionData,
      existingQuestions
    );

    if (exactDuplicates.length > 0) {
      alert(
        "This question already exists for the same subject, topic, and year. Duplicate question is not allowed."
      );

      return;
    }

    const repeatedYearQuestions = findRepeatedYearQuestions(
      questionData,
      existingQuestions
    );

    const repeatedYears = Array.from(
      new Set([
        ...repeatedYearQuestions.map((question) => question.year).filter(Boolean),
        questionData.year,
      ])
    ) as string[];

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

    const allQuestions = await getStoredQuestions();
    const rechecked = recheckAllDuplicates(allQuestions);
    await saveQuestions(rechecked);

    router.push("/admin/questions");
  }

  return (
    <AdminLayout
      title="Add Question"
      description="Create question with dynamic subject, topic, answer, and review workflow."
    >
      <QuestionForm
        questionData={questionData}
        onChange={setQuestionData}
        onSaveDraft={() => saveAs("draft")}
        onPublish={() => saveAs("published")}
        publishButtonLabel="Publish Question"
      />
    </AdminLayout>
  );
}
