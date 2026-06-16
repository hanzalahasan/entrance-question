"use client";

import AdminLayout from "@/components/admin/admin-layout";
import GenerateQuestionsPanel from "@/components/knowledge-base/generate-questions-panel";

export default function GenerateQuestionsPage() {
  return (
    <AdminLayout
      title="Generate Questions"
      description="Create MCQs with AI — grounded in your Knowledge Base, from the AI's own knowledge, or both. Generated questions are saved as drafts for review; they never auto-publish."
    >
      <GenerateQuestionsPanel />
    </AdminLayout>
  );
}
