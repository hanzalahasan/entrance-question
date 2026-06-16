"use client";

import { useCallback, useEffect, useState } from "react";

import AdminLayout from "@/components/admin/admin-layout";
import AddSourceForm from "@/components/knowledge-base/add-source-form";
import SourceList from "@/components/knowledge-base/source-list";

import {
  getKbSources,
  isKnowledgeBaseAvailable,
} from "@/services/knowledge-base-service";
import type { KbSource } from "@/types/knowledge-base";

export default function KnowledgeBasePage() {
  const [sources, setSources] = useState<KbSource[]>([]);
  const [loading, setLoading] = useState(isKnowledgeBaseAvailable);

  const refresh = useCallback(async () => {
    setSources(await getKbSources());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isKnowledgeBaseAvailable) return;
    getKbSources().then((s) => {
      setSources(s);
      setLoading(false);
    });
  }, []);

  return (
    <AdminLayout
      title="Knowledge Base"
      description="Feed the system book knowledge (RAG). Sources are chunked, embedded, and used to ground explanations."
    >
      {!isKnowledgeBaseAvailable ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-900/20">
          <h2 className="font-black text-amber-800 dark:text-amber-200">
            Supabase setup required
          </h2>
          <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            The Knowledge Base stores vector embeddings, which need the shared
            Supabase database. Configure{" "}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> /{" "}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then
            run <code className="font-mono">supabase/knowledge-base-setup.sql</code>{" "}
            in the Supabase SQL editor (enables pgvector, creates the tables, the
            match function, and the storage bucket).
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <AddSourceForm onAdded={refresh} />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                Sources{loading ? "" : ` (${sources.length})`}
              </h2>
              <button
                type="button"
                onClick={refresh}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">
                Loading sources…
              </p>
            ) : (
              <SourceList sources={sources} onChange={refresh} />
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
