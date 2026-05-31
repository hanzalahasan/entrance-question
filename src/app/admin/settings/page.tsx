"use client";

import { useEffect, useState } from "react";

import AdminLayout from "@/components/admin/admin-layout";

import type { SubjectMaster, TopicMaster } from "@/types/master";

import {
  getStoredSubjects,
  getStoredTopics,
  saveSubject,
  saveTopic,
  toggleSubjectStatus,
  toggleTopicStatus,
} from "@/services/master-data-store";

export default function AdminSettingsPage() {
  const [subjects, setSubjects] = useState<SubjectMaster[]>([]);
  const [topics, setTopics] = useState<TopicMaster[]>([]);

  const [newSubject, setNewSubject] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  useEffect(() => {
    getStoredSubjects().then(setSubjects);
    getStoredTopics().then(setTopics);
  }, []);

  function formatSentence(value: string) {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function createSlug(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, "-");
  }

  async function addSubject() {
    if (!newSubject.trim()) return;

    const created = await saveSubject({
      name: formatSentence(newSubject.trim()),
      slug: createSlug(newSubject),
      status: "active",
      displayOrder: subjects.length + 1,
    });

    setSubjects((prev) => [...prev, created]);
    setNewSubject("");
  }

  async function addTopic() {
    if (!newTopic.trim() || !selectedSubjectId) return;

    const created = await saveTopic({
      subjectId: Number(selectedSubjectId),
      name: formatSentence(newTopic.trim()),
      slug: createSlug(newTopic),
      status: "active",
      displayOrder: topics.length + 1,
    });

    setTopics((prev) => [...prev, created]);
    setNewTopic("");
  }

  async function handleToggleSubjectStatus(id: number) {
    const subject = subjects.find((s) => s.id === id);
    if (!subject) return;

    await toggleSubjectStatus(id, subject.status);
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === "active" ? "inactive" : "active" }
          : s
      ) as SubjectMaster[]
    );
  }

  async function handleToggleTopicStatus(id: number) {
    const topic = topics.find((t) => t.id === id);
    if (!topic) return;

    await toggleTopicStatus(id, topic.status);
    setTopics((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "active" ? "inactive" : "active" }
          : t
      ) as TopicMaster[]
    );
  }

  return (
    <AdminLayout
      title="Master Settings"
      description="Manage subjects, topics, years, and platform defaults."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900 dark:text-white">
              Subjects
            </h2>

            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
              {subjects.length}
            </span>
          </div>

          <div className="mb-5 flex gap-2">
            <input
              value={newSubject}
              onChange={(event) => setNewSubject(event.target.value)}
              placeholder="Add subject..."
              className="h-12 flex-1 rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />

            <button
              onClick={addSubject}
              className="rounded-2xl bg-blue-600 px-5 font-black text-white"
            >
              Add
            </button>
          </div>

          <div className="space-y-3">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center justify-between rounded-2xl border border-gray-200 p-4 dark:border-slate-700"
              >
                <div>
                  <h3 className="font-black text-gray-900 dark:text-white">
                    {subject.name}
                  </h3>

                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    {subject.slug}
                  </p>
                </div>

                <button
                  onClick={() => handleToggleSubjectStatus(subject.id)}
                  className={`rounded-full px-4 py-2 text-xs font-black ${
                    subject.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {subject.status}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900 dark:text-white">
              Topics
            </h2>

            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-700">
              {topics.length}
            </span>
          </div>

          <div className="mb-5 space-y-3">
            <select
              value={selectedSubjectId}
              onChange={(event) => setSelectedSubjectId(event.target.value)}
              className="h-12 w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">Select Subject</option>

              {subjects
                .filter((subject) => subject.status === "active")
                .map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
            </select>

            <div className="flex gap-2">
              <input
                value={newTopic}
                onChange={(event) => setNewTopic(event.target.value)}
                placeholder="Add topic..."
                className="h-12 flex-1 rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />

              <button
                onClick={addTopic}
                className="rounded-2xl bg-purple-600 px-5 font-black text-white"
              >
                Add
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {topics.map((topic) => {
              const subject = subjects.find(
                (item) => item.id === topic.subjectId
              );

              return (
                <div
                  key={topic.id}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 p-4 dark:border-slate-700"
                >
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-white">
                      {topic.name}
                    </h3>

                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      {subject?.name || "No subject"}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleTopicStatus(topic.id)}
                    className={`rounded-full px-4 py-2 text-xs font-black ${
                      topic.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {topic.status}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
