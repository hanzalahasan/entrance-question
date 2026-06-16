"use client";

import { useRef, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { updateProfileName, uploadAvatar } from "@/services/profile-service";

function initials(name: string | null | undefined, email: string | null | undefined) {
  const base = name?.trim() || email?.split("@")[0] || "?";
  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// Profile header: photo, name, email — with inline name edit + photo upload.
export default function ProfileCard() {
  const { user, profile, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.fullName ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;
  const email = profile?.email || user.email;
  const avatar = profile?.avatarUrl;

  async function saveName() {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      await updateProfileName(user.id, name.trim());
      await refreshProfile();
      setEditing(false);
    } catch {
      setError("Could not save your name.");
    } finally {
      setBusy(false);
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setError("");
    try {
      await uploadAvatar(user.id, file);
      await refreshProfile();
    } catch {
      setError("Could not upload the photo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center">
      {/* Avatar with upload */}
      <div className="relative shrink-0">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            className="h-20 w-20 rounded-full object-cover ring-2 ring-blue-500/30"
          />
        ) : (
          <span className="grid h-20 w-20 place-items-center rounded-full bg-blue-600 text-2xl font-black text-white">
            {initials(profile?.fullName, user.email)}
          </span>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-gray-800 text-sm text-white transition hover:bg-gray-700 disabled:opacity-50 dark:border-slate-800"
          title="Change photo"
        >
          {uploading ? "…" : "📷"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPickFile}
          className="hidden"
        />
      </div>

      {/* Name + email */}
      <div className="min-w-0 flex-1 text-center sm:text-left">
        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-10 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm font-bold text-gray-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
            <button
              onClick={saveName}
              disabled={busy}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setName(profile?.fullName ?? "");
              }}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-600 dark:border-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <h1 className="truncate text-2xl font-black text-gray-900 dark:text-white">
              {profile?.fullName || "Add your name"}
            </h1>
            <button
              onClick={() => {
                setName(profile?.fullName ?? "");
                setEditing(true);
              }}
              className="rounded-lg px-2 py-0.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
            >
              Edit
            </button>
          </div>
        )}
        <p className="mt-1 truncate text-sm font-semibold text-gray-500 dark:text-slate-400">
          {email}
        </p>
        {error && (
          <p className="mt-1 text-xs font-bold text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}
