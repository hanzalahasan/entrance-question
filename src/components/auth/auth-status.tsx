"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/context/auth-context";

function initials(name: string | null | undefined, email: string | null | undefined) {
  const base = name?.trim() || email?.split("@")[0] || "?";
  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// Header widget: a "Log in" link for guests, or the user's avatar + a small menu
// (Dashboard, Sign out) when signed in. Renders nothing if auth isn't configured.
export default function AuthStatus() {
  const { user, profile, loading, authReady, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!authReady || loading) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
      >
        Log in
      </Link>
    );
  }

  const name = profile?.fullName || user.email || "Account";
  const avatar = profile?.avatarUrl;

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.push("/");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white py-1 pl-1 pr-3 text-sm font-bold text-gray-800 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-xs font-black text-white">
            {initials(profile?.fullName, user.email)}
          </span>
        )}
        <span className="max-w-[10rem] truncate">{name}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm font-bold text-gray-800 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-700"
            >
              Dashboard
            </Link>
            <button
              onClick={handleSignOut}
              className="block w-full px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
