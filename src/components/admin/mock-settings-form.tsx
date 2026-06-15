"use client";

import { useState } from "react";
import type { SubjectMaster, TopicMaster } from "@/types/master";
import type { MockConfig, MockSubjectQuota } from "@/types/mock";

type MockSettingsFormProps = {
  subjects: SubjectMaster[];
  topics: TopicMaster[];
  initialConfig: MockConfig;
  onSave: (config: MockConfig) => void;
};

function topicSum(quota: MockSubjectQuota): number {
  return quota.topics.reduce((sum, t) => sum + (t.count || 0), 0);
}

export default function MockSettingsForm({
  subjects,
  topics,
  initialConfig,
  onSave,
}: MockSettingsFormProps) {
  const [config, setConfig] = useState<MockConfig>(initialConfig);
  const [openSubject, setOpenSubject] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const activeSubjects = subjects
    .filter((s) => s.status === "active")
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const total = config.subjects.reduce((sum, s) => sum + (s.count || 0), 0);

  function setField<K extends keyof MockConfig>(key: K, value: MockConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
    setSaved(false);
  }

  function setSubjectCount(subjectId: number, count: number) {
    setConfig((c) => ({
      ...c,
      subjects: c.subjects.map((q) =>
        q.subjectId === subjectId ? { ...q, count: Math.max(0, count) } : q
      ),
    }));
    setSaved(false);
  }

  function setTopicCount(subjectId: number, topicId: number, count: number) {
    setConfig((c) => ({
      ...c,
      subjects: c.subjects.map((q) => {
        if (q.subjectId !== subjectId) return q;
        const others = q.topics.filter((t) => t.topicId !== topicId);
        const next =
          count > 0 ? [...others, { topicId, count }] : others;
        return { ...q, topics: next };
      }),
    }));
    setSaved(false);
  }

  function quotaFor(subjectId: number): MockSubjectQuota {
    return (
      config.subjects.find((q) => q.subjectId === subjectId) ?? {
        subjectId,
        count: 0,
        topics: [],
      }
    );
  }

  function handleSave() {
    onSave(config);
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      {/* Exam-level settings */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-black text-gray-900 dark:text-white">
          Exam settings
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Duration (minutes)"
            value={config.durationMinutes}
            step={1}
            onChange={(v) => setField("durationMinutes", Math.max(1, v))}
          />
          <NumberField
            label="Marks per correct"
            value={config.markCorrect}
            step={0.25}
            onChange={(v) => setField("markCorrect", v)}
          />
          <NumberField
            label="Marks per wrong (negative)"
            value={config.markWrong}
            step={0.25}
            onChange={(v) => setField("markWrong", v)}
          />
        </div>
      </div>

      {/* Distribution */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">
            Question distribution
          </h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${
              total === 200
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            Total: {total}
          </span>
        </div>

        <div className="space-y-3">
          {activeSubjects.map((subject) => {
            const quota = quotaFor(subject.id);
            const subjectTopics = topics
              .filter((t) => t.subjectId === subject.id && t.status === "active")
              .sort((a, b) => a.displayOrder - b.displayOrder);
            const tSum = topicSum(quota);
            const isOpen = openSubject === subject.id;

            return (
              <div
                key={subject.id}
                className="rounded-2xl border border-gray-200 p-4 dark:border-slate-600"
              >
                <div className="flex items-center gap-3">
                  <h3 className="flex-1 font-black text-gray-900 dark:text-white">
                    {subject.name}
                  </h3>
                  <input
                    type="number"
                    min={0}
                    value={quota.count}
                    onChange={(e) =>
                      setSubjectCount(subject.id, Number(e.target.value))
                    }
                    className="h-10 w-20 rounded-xl border border-gray-300 bg-gray-50 px-3 text-center font-bold text-gray-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                  {subjectTopics.length > 0 && (
                    <button
                      onClick={() =>
                        setOpenSubject(isOpen ? null : subject.id)
                      }
                      className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {isOpen ? "Hide topics" : `Topics (${subjectTopics.length})`}
                    </button>
                  )}
                </div>

                {isOpen && subjectTopics.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 dark:border-slate-700">
                    <p
                      className={`text-xs font-bold ${
                        tSum > quota.count ? "text-red-600" : "text-gray-500"
                      }`}
                    >
                      Per-topic ({tSum}/{quota.count} assigned; the rest fills
                      from the subject at large).
                    </p>
                    {subjectTopics.map((topic) => {
                      const tc =
                        quota.topics.find((t) => t.topicId === topic.id)
                          ?.count ?? 0;
                      return (
                        <div
                          key={topic.id}
                          className="flex items-center gap-3"
                        >
                          <span className="flex-1 text-sm font-semibold text-gray-700 dark:text-slate-300">
                            {topic.name}
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={tc}
                            onChange={(e) =>
                              setTopicCount(
                                subject.id,
                                topic.id,
                                Math.max(0, Number(e.target.value))
                              )
                            }
                            className="h-9 w-16 rounded-lg border border-gray-300 bg-gray-50 px-2 text-center font-bold text-gray-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="rounded-2xl bg-blue-600 px-8 py-3 font-black text-white transition hover:bg-blue-700 active:scale-95"
        >
          Save settings
        </button>
        {saved && (
          <span className="text-sm font-bold text-green-600">Saved ✓</span>
        )}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-gray-500 dark:text-slate-400">
        {label}
      </label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-12 w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 font-bold text-gray-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
      />
    </div>
  );
}
