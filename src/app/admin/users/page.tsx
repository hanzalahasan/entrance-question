"use client";

import { useEffect, useState } from "react";

import AdminLayout from "@/components/admin/admin-layout";

type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string | null;
  lastSignIn: string | null;
  mocks: number;
  avgMockPct: number;
  lastMock: string | null;
  practice: number;
  practiceAccuracy: number;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [everSignedIn, setEverSignedIn] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not load users.");
          return;
        }
        setUsers(data.users ?? []);
        setTotal(data.total ?? 0);
        setEverSignedIn(data.everSignedIn ?? 0);
      })
      .catch(() => setError("Network error loading users."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout
      title="Users"
      description="Everyone who signed up — contact details and their activity."
    >
      {loading ? (
        <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">
          Loading users…
        </p>
      ) : error ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-900/20">
          <p className="font-bold text-amber-800 dark:text-amber-200">
            {error}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Stat label="Total users" value={total} />
            <Stat label="Signed in at least once" value={everSignedIn} />
          </div>

          <div className="overflow-x-auto rounded-3xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-gray-200 text-xs font-black uppercase text-gray-500 dark:border-slate-700 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Last login</th>
                  <th className="px-4 py-3 text-center">Mocks</th>
                  <th className="px-4 py-3 text-center">Avg %</th>
                  <th className="px-4 py-3 text-center">Practice</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-gray-100 last:border-0 dark:border-slate-700/50"
                  >
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                      {u.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-300">
                      {u.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-300">
                      {u.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400">
                      {fmtDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400">
                      {fmtDate(u.lastSignIn)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">
                      {u.mocks}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-slate-300">
                      {u.mocks ? `${u.avgMockPct}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-slate-300">
                      {u.practice
                        ? `${u.practice} (${u.practiceAccuracy}%)`
                        : "—"}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-sm font-semibold text-gray-400"
                    >
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs font-bold text-gray-500 dark:text-slate-400">
        {label}
      </p>
    </div>
  );
}
