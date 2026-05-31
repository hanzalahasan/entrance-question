const menuItems = [
  "Dashboard",
  "Question Management",
  "Add Question",
  "Excel Import",
  "Review & Publish",
  "Users",
  "Settings",
];

export default function AdminSidebar() {
  return (
    <aside className="hidden min-h-screen w-72 border-r border-gray-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:block">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">
          Entrance Admin
        </h1>

        <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-slate-400">
          Question Management System
        </p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item}
            className="w-full rounded-2xl px-4 py-3 text-left font-bold text-gray-700 transition hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}