"use client";

import { useCallback, useEffect, useState } from "react";

import AdminLayout from "@/components/admin/admin-layout";
import MockSetBuilder from "@/components/admin/mock-sets/mock-set-builder";
import MockSetList from "@/components/admin/mock-sets/mock-set-list";

import { getStoredQuestions } from "@/services/admin-question-store";
import { getStoredSubjects } from "@/services/master-data-store";
import { resolveMockConfig } from "@/services/mock-config-service";
import { getMockSets } from "@/services/mock-set-store";
import type { Question } from "@/types/question";
import type { MockConfig, MockSet } from "@/types/mock";

export default function MockSetsPage() {
  const [published, setPublished] = useState<Question[]>([]);
  const [config, setConfig] = useState<MockConfig | null>(null);
  const [sets, setSets] = useState<MockSet[]>([]);
  const [editing, setEditing] = useState<MockSet | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSets = useCallback(async () => {
    setSets(await getMockSets());
  }, []);

  useEffect(() => {
    Promise.all([
      getStoredQuestions(),
      getStoredSubjects(),
      getMockSets(),
    ]).then(([all, subjects, loadedSets]) => {
      setPublished(all.filter((q) => q.status === "published"));
      setConfig(resolveMockConfig(subjects));
      setSets(loadedSets);
      setLoading(false);
    });
  }, []);

  return (
    <AdminLayout
      title="Mock Sets"
      description="Named, fixed difficulty papers. Every student who takes a set gets the same questions — like a past-year paper."
    >
      {loading || !config ? (
        <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">
          Loading…
        </p>
      ) : (
        <div className="space-y-8">
          <MockSetBuilder
            key={editing?.id ?? "new"}
            allQuestions={published}
            config={config}
            editing={editing}
            onSaved={() => {
              setEditing(null);
              refreshSets();
            }}
            onCancel={() => setEditing(null)}
          />

          <div>
            <h2 className="mb-3 text-lg font-black text-gray-900 dark:text-white">
              Existing sets
            </h2>
            <MockSetList sets={sets} onEdit={setEditing} onChange={refreshSets} />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
