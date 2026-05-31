import AdminLayout from "@/components/admin/admin-layout";

export default function AdminDashboardPage() {
  return (
    <AdminLayout
      title="Admin Dashboard"
      description="Manage questions, users, reviews, imports, and platform settings."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          "Total Questions",
          "Draft Questions",
          "Pending Review",
          "Users",
        ].map((item) => (
          <div
            key={item}
            className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-sm font-bold text-gray-500">
              {item}
            </p>

            <h2 className="mt-2 text-3xl font-black text-gray-900 dark:text-white">
              0
            </h2>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-white/60 p-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
        <h2 className="text-xl font-black text-gray-900 dark:text-white">
          Dashboard Activity
        </h2>

        <p className="mt-2 text-sm font-semibold text-gray-500 dark:text-slate-400">
          Recent imports, reviews, AI alerts, and question activity will appear here.
        </p>
      </div>
    </AdminLayout>
  );
}