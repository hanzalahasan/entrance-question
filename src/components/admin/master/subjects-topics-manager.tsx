"use client";

import { useEffect, useMemo, useState } from "react";

import type { SubjectMaster, TopicMaster } from "@/types/master";
import {
  getStoredSubjects,
  getStoredTopics,
  saveSubject,
  saveTopic,
  toggleSubjectStatus,
  toggleTopicStatus,
} from "@/services/master-data-store";

function fmt(v: string) {
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : v;
}
function slug(v: string) {
  return v.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Unified subjects + topics manager. Add subjects at the top; each subject is an
 * accordion row that expands to reveal, add, and toggle its own topics — so the
 * subject→topic relationship is visible in one place (replaces the old two cards).
 */
export default function SubjectsTopicsManager() {
  const [subjects, setSubjects] = useState<SubjectMaster[]>([]);
  const [topics, setTopics] = useState<TopicMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newSubject, setNewSubject] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // Per-subject "add topic" draft text, keyed by subject id.
  const [topicDrafts, setTopicDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    Promise.all([getStoredSubjects(), getStoredTopics()])
      .then(([s, t]) => {
        setSubjects(s);
        setTopics(t);
      })
      .catch(() => setError("Failed to load master data."))
      .finally(() => setLoading(false));
  }, []);

  const topicsBySubject = useMemo(() => {
    const map = new Map<number, TopicMaster[]>();
    for (const t of topics) {
      const list = map.get(t.subjectId) ?? [];
      list.push(t);
      map.set(t.subjectId, list);
    }
    return map;
  }, [topics]);

  async function addSubject() {
    const name = newSubject.trim();
    if (!name) return;
    try {
      const created = await saveSubject({
        name: fmt(name),
        slug: slug(name),
        status: "active",
        displayOrder: subjects.length + 1,
      });
      setSubjects((prev) => [...prev, created]);
      setNewSubject("");
      setExpandedId(created.id); // open the new subject so topics can be added
    } catch {
      setError("Failed to add subject.");
    }
  }

  async function addTopic(subjectId: number) {
    const name = (topicDrafts[subjectId] ?? "").trim();
    if (!name) return;
    try {
      const created = await saveTopic({
        subjectId,
        name: fmt(name),
        slug: slug(name),
        status: "active",
        displayOrder: topics.length + 1,
      });
      setTopics((prev) => [...prev, created]);
      setTopicDrafts((prev) => ({ ...prev, [subjectId]: "" }));
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
          s.id === id
            ? { ...s, status: s.status === "active" ? "inactive" : "active" }
            : s
        )
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
          t.id === id
            ? { ...t, status: t.status === "active" ? "inactive" : "active" }
            : t
        )
      );
    } catch {
      setError("Failed to update topic.");
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500 dark:border-slate-700 dark:bg-slate-800">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
          <button onClick={() => setError("")} className="ml-3 underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white">
              Subjects &amp; Topics
            </h2>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
              {subjects.length} subjects · {topics.length} topics. Expand a
              subject to manage its topics.
            </p>
          </div>
        </div>

        {/* Add subject */}
        <div className="mb-5 flex gap-2">
          <input
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSubject()}
            placeholder="Add a subject…"
            className="h-12 flex-1 rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
          <button
            onClick={addSubject}
            className="rounded-2xl bg-blue-600 px-6 font-black text-white transition hover:bg-blue-700"
          >
            Add subject
          </button>
        </div>

        {/* Accordion of subjects */}
        <div className="space-y-3">
          {subjects.map((subject) => {
            const subjectTopics = topicsBySubject.get(subject.id) ?? [];
            const isOpen = expandedId === subject.id;
            const draft = topicDrafts[subject.id] ?? "";
            return (
              <div
                key={subject.id}
                className="overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-600"
              >
                {/* Subject header */}
                <div className="flex items-center gap-3 p-4">
                  <button
                    onClick={() => setExpandedId(isOpen ? null : subject.id)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className={`text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                    >
                      ▶
                    </span>
                    <div>
                      <h3 className="font-black text-gray-900 dark:text-white">
                        {subject.name}
                      </h3>
                      <p className="mt-0.5 text-xs font-semibold text-gray-500">
                        {subjectTopics.length} topic
                        {subjectTopics.length === 1 ? "" : "s"} · {subject.slug}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleToggleSubject(subject.id)}
                    className={`rounded-full px-4 py-2 text-xs font-black ${
                      subject.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {subject.status}
                  </button>
                </div>

                {/* Topics (expanded) */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                    <div className="mb-3 flex gap-2">
                      <input
                        value={draft}
                        onChange={(e) =>
                          setTopicDrafts((prev) => ({
                            ...prev,
                            [subject.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && addTopic(subject.id)}
                        placeholder={`Add a topic to ${subject.name}…`}
                        className="h-11 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-purple-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                      <button
                        onClick={() => addTopic(subject.id)}
                        className="rounded-xl bg-purple-600 px-5 font-black text-white transition hover:bg-purple-700"
                      >
                        Add
                      </button>
                    </div>

                    {subjectTopics.length === 0 ? (
                      <p className="py-2 text-center text-xs font-semibold text-gray-400">
                        No topics yet — add the first one above.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {subjectTopics.map((topic) => (
                          <div
                            key={topic.id}
                            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800"
                          >
                            <span className="text-sm font-bold text-gray-800 dark:text-slate-200">
                              {topic.name}
                            </span>
                            <button
                              onClick={() => handleToggleTopic(topic.id)}
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                topic.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {topic.status}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {subjects.length === 0 && (
            <p className="py-6 text-center text-sm font-semibold text-gray-400">
              No subjects yet — add your first subject above.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
