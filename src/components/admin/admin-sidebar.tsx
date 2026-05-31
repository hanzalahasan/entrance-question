"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Question Management", href: "/admin/questions" },
  { label: "Add Question", href: "/admin/add-question" },
  { label: "Settings", href: "/admin/settings" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

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
        {menuItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block w-full rounded-2xl px-4 py-3 text-left font-bold transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
