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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newSubject, setNewSubject] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  useEffect(() => {
    Promise.all([getStoredSubjects(), getStoredTopics()])
      .then(([s, t]) => { setSubjects(s); setTopics(t); })
      .catch(() => setError("Failed to load master data."))
      .finally(() => setLoading(false));
  }, []);

  function fmt(v: string) {
    return v ? v.charAt(0).toUpperCase() + v.slice(1) : v;
  }
  function slug(v: string) {
    return v.trim().toLowerCase().replace(/\s+/g, "-");
  }

  async function addSubject() {
    if (!newSubject.trim()) return;
    try {
      const created = await saveSubject({
        name: fmt(newSubject.trim()),
        slug: slug(newSubject),
        status: "active",
        displayOrder: subjects.length + 1,
      });
      setSubjects((prev) => [...prev, created]);
      setNewSubject("");
    } catch {
      setError("Failed to add subject.");
    }
  }

  async function addTopic() {
    if (!newTopic.trim() || !selectedSubjectId) return;
    try {
      const created = await saveTopic({
        subjectId: Number(selectedSubjectId),
        name: fmt(newTopic.trim()),
        slug: slug(newTopic),
        status: "active",
        displayOrder: topics.length + 1,
      });
      setTopics((prev) => [...prev, created]);
      setNewTopic("");
    } catch {
      setError("Failed to add topic.");
    }
  }

  async function handleToggleSubject(id: number) {
    const subject = subjects.find((s) => s.id === id);
    if (!subject) return;
    try {
      await toggleSubjectStatus(id, subject.status);
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: s.status === "active" ? "inactive" : "active" } : s
        ) as SubjectMaster[]
      );
    } catch {
      setError("Failed to update subject.");
    }
  }

  async function handleToggleTopic(id: number) {
    const topic = topics.find((t) => t.id === id);
    if (!topic) return;
    try {
      await toggleTopicStatus(id, topic.status);
      setTopics((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: t.status === "active" ? "inactive" : "active" } : t
        ) as TopicMaster[]
      );
    } catch {
      setError("Failed to update topic.");
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Master Settings">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500 dark:border-slate-700 dark:bg-slate-800">
          Loading settings...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Master Settings"
      description="Manage subjects, topics, years, and platform defaults."
    >
      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
          <button onClick={() => setError("")} className="ml-3 underline">Dismiss</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900 dark:text-white">Subjects</h2>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
              {subjects.length}
            </span>
          </div>

          <div className="mb-5 flex gap-2">
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSubject()}
              placeholder="Add subject..."
              className="h-12 flex-1 rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
            <button onClick={addSubject} className="rounded-2xl bg-blue-600 px-5 font-black text-white">
              Add
            </button>
          </div>

          <div className="space-y-3">
            {subjects.map((subject) => (
              <div key={subject.id} className="flex items-center justify-between rounded-2xl border border-gray-200 p-4 dark:border-slate-600">
                <div>
                  <h3 className="font-black text-gray-900 dark:text-white">{subject.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-gray-500">{subject.slug}</p>
                </div>
                <button
                  onClick={() => handleToggleSubject(subject.id)}
                  className={`rounded-full px-4 py-2 text-xs font-black ${subject.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                >
                  {subject.status}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900 dark:text-white">Topics</h2>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-700">
              {topics.length}
            </span>
          </div>

          <div className="mb-5 space-y-3">
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="h-12 w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            >
              <option value="">Select Subject</option>
              {subjects.filter((s) => s.status === "active").map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <div className="flex gap-2">
              <input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTopic()}
                placeholder="Add topic..."
                className="h-12 flex-1 rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <button onClick={addTopic} className="rounded-2xl bg-purple-600 px-5 font-black text-white">
                Add
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {topics.map((topic) => {
              const subject = subjects.find((s) => s.id === topic.subjectId);
              return (
                <div key={topic.id} className="flex items-center justify-between rounded-2xl border border-gray-200 p-4 dark:border-slate-600">
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-white">{topic.name}</h3>
                    <p className="mt-1 text-xs font-semibold text-gray-500">{subject?.name || "No subject"}</p>
                  </div>
                  <button
                    onClick={() => handleToggleTopic(topic.id)}
                    className={`rounded-full px-4 py-2 text-xs font-black ${topic.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
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
