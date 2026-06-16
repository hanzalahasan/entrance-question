"use client";

import AdminLayout from "@/components/admin/admin-layout";
import SubjectsTopicsManager from "@/components/admin/master/subjects-topics-manager";

export default function AdminSettingsPage() {
  return (
    <AdminLayout
      title="Master Settings"
      description="Manage subjects and their topics. Expand a subject to add or toggle its topics."
    >
      <SubjectsTopicsManager />
    </AdminLayout>
  );
}
