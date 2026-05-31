"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { Question } from "@/types/question";
import type { SubjectMaster, TopicMaster } from "@/types/master";
import {
  getStoredSubjects,
  getStoredTopics,
} from "@/services/master-data-store";

type QuestionFormProps = {
  questionData: Question;
  onChange: (question: Question) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  publishButtonLabel?: string;
  saving?: boolean;
};

const years = Array.from({ length: 17 }, (_, index) => String(2026 - index));

export default function QuestionForm({
  questionData,
  onChange,
  onSaveDraft,
  onPublish,
  publishButtonLabel = "Publish Question",
  saving = false,
}: QuestionFormProps) {
  const [allSubjects, setAllSubjects] = useState<SubjectMaster[]>([]);
  const [allTopics, setAllTopics] = useState<TopicMaster[]>([]);

  useEffect(() => {
    getStoredSubjects().then((subjects) =>
      setAllSubjects(subjects.filter((s) => s.status === "active"))
    );
    getStoredTopics().then(setAllTopics);
  }, []);

  const activeTopics = useMemo(() => {
    if (!questionData.subjectId) return [];

    return allTopics.filter(
      (topic) =>
        topic.subjectId === questionData.subjectId && topic.status === "active"
    );
  }, [questionData.subjectId, allTopics]);

  function updateField<K extends keyof Question>(key: K, value: Question[K]) {
    onChange({
      ...questionData,
      [key]: value,
      updatedAt: new Date().toISOString(),
    });
  }

  function updateMediaField(
    key: "questionImageUrl" | "explanationImageUrl",
    value: string
  ) {
    onChange({
      ...questionData,
      media: {
        ...questionData.media,
        [key]: value,
      },
      updatedAt: new Date().toISOString(),
    });
  }

  function updateOption(index: number, value: string) {
    const updatedOptions = [...questionData.options];

    updatedOptions[index] = {
      ...updatedOptions[index],
      value,
    };

    updateField("options", updatedOptions);
  }

  function updateOptionType(
    index: number,
    type: "text" | "image" | "text_image"
  ) {
    const updatedOptions = [...questionData.options];

    updatedOptions[index] = {
      ...updatedOptions[index],
      type,
    };

    updateField("options", updatedOptions);
  }

  function updateOptionImage(index: number, imageUrl: string) {
    const updatedOptions = [...questionData.options];

    updatedOptions[index] = {
      ...updatedOptions[index],
      imageUrl,
    };

    updateField("options", updatedOptions);
  }

  function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
    callback: (url: string) => void
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      callback(reader.result as string);
    };

    reader.readAsDataURL(file);
  }

  function handleSubjectChange(subjectId: number) {
    const subject = allSubjects.find((item) => item.id === subjectId);

    onChange({
      ...questionData,
      subjectId,
      subjectName: subject?.name || "",
      topicId: 0,
      topicName: "",
      updatedAt: new Date().toISOString(),
    });
  }

  function handleTopicChange(topicId: number) {
    const topic = allTopics.find((item) => item.id === topicId);

    onChange({
      ...questionData,
      topicId,
      topicName: topic?.name || "",
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label className="mb-2 block text-sm font-black text-gray-700 dark:text-white">
          Question
        </label>

        <textarea
          value={questionData.question}
          onChange={(event) => updateField("question", event.target.value)}
          rows={5}
          className="w-full rounded-2xl border border-gray-300 bg-gray-50 p-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={questionData.media?.questionImageUrl || ""}
            onChange={(event) =>
              updateMediaField("questionImageUrl", event.target.value)
            }
            placeholder="Question image URL / diagram URL"
            className="h-12 rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />

          <input
            type="file"
            accept="image/*"
            onChange={(event) =>
              handleImageUpload(event, (url) =>
                updateMediaField("questionImageUrl", url)
              )
            }
            className="h-12 rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        {questionData.media?.questionImageUrl && (
          <div className="mt-4">
            <img
              src={questionData.media.questionImageUrl}
              alt="Question preview"
              className="max-h-72 rounded-2xl border border-gray-200 object-contain"
            />

            <button
              type="button"
              onClick={() => updateMediaField("questionImageUrl", "")}
              className="mt-2 text-sm font-black text-red-600"
            >
              Remove question image
            </button>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-black text-gray-900 dark:text-white">
          Options & Correct Answer
        </h2>

        <div className="space-y-5">
          {questionData.options.map((option, index) => (
            <div
              key={option.key}
              className="rounded-2xl border border-gray-200 p-4 dark:border-slate-700"
            >
              <div className="mb-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateField("answer", option.key)}
                  className={`grid h-12 w-12 place-items-center rounded-2xl border text-sm font-black ${
                    questionData.answer === option.key
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-gray-300 bg-white text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  }`}
                >
                  {option.key}
                </button>

                <select
                  value={option.type}
                  onChange={(event) =>
                    updateOptionType(
                      index,
                      event.target.value as "text" | "image" | "text_image"
                    )
                  }
                  className="h-12 rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="text">Text</option>
                  <option value="image">Image</option>
                  <option value="text_image">Text + Image</option>
                </select>
              </div>

              {(option.type === "text" || option.type === "text_image") && (
                <input
                  value={option.value || ""}
                  onChange={(event) => updateOption(index, event.target.value)}
                  placeholder={`Option ${option.key} text`}
                  className="mb-3 h-12 w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              )}

              {(option.type === "image" || option.type === "text_image") && (
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={option.imageUrl || ""}
                    onChange={(event) =>
                      updateOptionImage(index, event.target.value)
                    }
                    placeholder={`Option ${option.key} image URL`}
                    className="h-12 rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      handleImageUpload(event, (url) =>
                        updateOptionImage(index, url)
                      )
                    }
                    className="h-12 rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              )}

              {option.imageUrl && (
                <div className="mt-3">
                  <img
                    src={option.imageUrl}
                    alt={`Option ${option.key} preview`}
                    className="max-h-52 rounded-2xl border border-gray-200 object-contain"
                  />

                  <button
                    type="button"
                    onClick={() => updateOptionImage(index, "")}
                    className="mt-2 text-sm font-black text-red-600"
                  >
                    Remove option image
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-black text-gray-900 dark:text-white">
            Question Details
          </h2>

          <div className="space-y-4">
            <select
              value={questionData.subjectId}
              onChange={(event) => handleSubjectChange(Number(event.target.value))}
              className="h-12 w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value={0}>Select Subject</option>

              {allSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>

            <select
              value={questionData.topicId}
              onChange={(event) => handleTopicChange(Number(event.target.value))}
              disabled={!questionData.subjectId}
              className="h-12 w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value={0}>Select Topic</option>

              {activeTopics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>

            <select
              value={questionData.year || ""}
              onChange={(event) =>
                updateField("year", event.target.value || undefined)
              }
              className="h-12 w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">No Year / Practice</option>

              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <select
              value={questionData.difficulty}
              onChange={(event) =>
                updateField(
                  "difficulty",
                  event.target.value as Question["difficulty"]
                )
              }
              className="h-12 w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-black text-gray-900 dark:text-white">
            Explanation
          </h2>

          <textarea
            value={questionData.explanation}
            onChange={(event) => updateField("explanation", event.target.value)}
            rows={8}
            className="w-full rounded-2xl border border-gray-300 bg-gray-50 p-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={questionData.media?.explanationImageUrl || ""}
              onChange={(event) =>
                updateMediaField("explanationImageUrl", event.target.value)
              }
              placeholder="Explanation image URL"
              className="h-12 rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />

            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                handleImageUpload(event, (url) =>
                  updateMediaField("explanationImageUrl", url)
                )
              }
              className="h-12 rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {questionData.media?.explanationImageUrl && (
            <div className="mt-4">
              <img
                src={questionData.media.explanationImageUrl}
                alt="Explanation preview"
                className="max-h-72 rounded-2xl border border-gray-200 object-contain"
              />

              <button
                type="button"
                onClick={() => updateMediaField("explanationImageUrl", "")}
                className="mt-2 text-sm font-black text-red-600"
              >
                Remove explanation image
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          onClick={onSaveDraft}
          disabled={saving}
          className="rounded-2xl border border-gray-300 px-6 py-3 font-black text-gray-700 disabled:opacity-50 dark:border-slate-700 dark:text-white"
        >
          {saving ? "Saving..." : "Save Draft"}
        </button>

        <button
          onClick={onPublish}
          disabled={saving}
          className="rounded-2xl bg-green-600 px-6 py-3 font-black text-white disabled:opacity-50"
        >
          {publishButtonLabel}
        </button>
      </div>
    </div>
  );
}
