"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import MockSettingsForm from "@/components/admin/mock-settings-form";
import type { SubjectMaster, TopicMaster } from "@/types/master";
import type { MockConfig } from "@/types/mock";
import { getStoredSubjects, getStoredTopics } from "@/services/master-data-store";
import { resolveMockConfig, saveMockConfig } from "@/services/mock-config-service";

export default function AdminMockSettingsPage() {
  const [subjects, setSubjects] = useState<SubjectMaster[]>([]);
  const [topics, setTopics] = useState<TopicMaster[]>([]);
  const [config, setConfig] = useState<MockConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getStoredSubjects(), getStoredTopics()])
      .then(([s, t]) => {
        setSubjects(s);
        setTopics(t);
        setConfig(resolveMockConfig(s));
      })
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !config) {
    return (
      <AdminLayout title="Mock Test Settings">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500 dark:border-slate-700 dark:bg-slate-800">
          {error || "Loading settings…"}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Mock Test Settings"
      description="Set the duration, marking scheme, and how many questions each subject and topic contributes to a mock paper."
    >
      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}
      <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
        These settings are saved on this device for now. To share them across all
        admins/students we&apos;ll move them to the shared database later.
      </div>

      <MockSettingsForm
        subjects={subjects}
        topics={topics}
        initialConfig={config}
        onSave={(c) => saveMockConfig(c)}
      />
    </AdminLayout>
  );
}
