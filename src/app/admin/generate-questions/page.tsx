"use client";

import AdminLayout from "@/components/admin/admin-layout";
import GenerateQuestionsPanel from "@/components/knowledge-base/generate-questions-panel";
import { isKnowledgeBaseAvailable } from "@/services/knowledge-base-service";

export default function GenerateQuestionsPage() {
  return (
    <AdminLayout
      title="Generate Questions"
      description="Create MCQs grounded in your Knowledge Base. Generated questions are saved as drafts for review — they never auto-publish."
    >
      {!isKnowledgeBaseAvailable ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-900/20">
          <h2 className="font-black text-amber-800 dark:text-amber-200">
            Supabase setup required
          </h2>
          <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            Question generation retrieves passages from the Knowledge Base, which
            needs the shared Supabase database. Configure Supabase and run{" "}
            <code className="font-mono">supabase/knowledge-base-setup.sql</code>,
            then add sources in <strong>Knowledge Base</strong> before generating.
            (Without sources, generation still works but falls back to general
            knowledge.)
          </p>
        </div>
      ) : (
        <GenerateQuestionsPanel />
      )}
    </AdminLayout>
  );
}
