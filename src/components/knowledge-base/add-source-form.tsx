"use client";

import { useEffect, useState } from "react";

import { getStoredSubjects } from "@/services/master-data-store";
import type { SubjectMaster } from "@/types/master";
import type {
  KbSourceType,
  KbTrustTier,
  KbIngestRequest,
} from "@/types/knowledge-base";
import { TRUST_TIER_LABELS } from "@/types/knowledge-base";

const TYPES: { value: KbSourceType; label: string; icon: string }[] = [
  { value: "pdf", label: "Book / PDF", icon: "📄" },
  { value: "text", label: "Paste text", icon: "✍️" },
  { value: "url", label: "URL / link", icon: "🔗" },
  { value: "image", label: "Photo / image", icon: "🖼️" },
];

/** Read a File as base64 (no data: prefix). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export default function AddSourceForm({ onAdded }: { onAdded: () => void }) {
  const [subjects, setSubjects] = useState<SubjectMaster[]>([]);
  const [type, setType] = useState<KbSourceType>("pdf");
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [chapter, setChapter] = useState("");
  const [citationLabel, setCitationLabel] = useState("");
  const [trustTier, setTrustTier] = useState<KbTrustTier>(2);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    getStoredSubjects().then((s) =>
      setSubjects(s.filter((x) => x.status === "active"))
    );
  }, []);

  function reset() {
    setTitle("");
    setChapter("");
    setCitationLabel("");
    setText("");
    setUrl("");
    setFile(null);
  }

  async function handleSubmit() {
    setError("");
    setOk("");

    if (!title.trim()) return setError("Give the source a title.");
    if (type === "text" && !text.trim()) return setError("Paste some text.");
    if (type === "url" && !url.trim()) return setError("Enter a URL.");
    if ((type === "pdf" || type === "image") && !file)
      return setError("Choose a file to upload.");

    setBusy(true);
    try {
      const subject = subjects.find((s) => s.id === subjectId);
      const payload: KbIngestRequest = {
        type,
        title: title.trim(),
        subjectId: subjectId === "" ? null : Number(subjectId),
        subjectName: subject?.name ?? null,
        chapter: chapter.trim() || null,
        citationLabel: citationLabel.trim() || null,
        trustTier,
      };

      if (type === "text") payload.text = text;
      else if (type === "url") payload.url = url.trim();
      else if (file) {
        payload.base64 = await fileToBase64(file);
        payload.mimeType = file.type || (type === "pdf" ? "application/pdf" : "");
        payload.fileName = file.name;
      }

      const res = await fetch("/api/admin/kb-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ingestion failed.");
        return;
      }
      setOk(`Added "${title.trim()}" — ${data.chunkCount} passages indexed.`);
      reset();
      onAdded();
    } catch {
      setError("Network error during ingestion.");
    } finally {
      setBusy(false);
    }
  }

  const fileAccept = type === "pdf" ? ".pdf,application/pdf" : "image/*";

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <h2 className="text-lg font-black text-gray-900 dark:text-white">
        Add source
      </h2>
      <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-slate-400">
        Feed the system book knowledge. It&apos;s chunked, embedded, and used to
        ground explanations.
      </p>

      {/* Type picker */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${
              type === t.value
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            }`}
          >
            <span className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Source-specific input */}
      <div className="mt-5 space-y-4">
        {type === "text" && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Paste book text, notes, or any reference material…"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
        )}
        {type === "url" && (
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
        )}
        {(type === "pdf" || type === "image") && (
          <input
            type="file"
            accept={fileAccept}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm font-semibold text-gray-700 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-bold file:text-white dark:text-slate-300"
          />
        )}
      </div>

      {/* Metadata */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Physics NCERT Class 11"
            className={inputCls}
          />
        </Field>
        <Field label="Subject (scopes retrieval)">
          <select
            value={subjectId}
            onChange={(e) =>
              setSubjectId(e.target.value === "" ? "" : Number(e.target.value))
            }
            className={inputCls}
          >
            <option value="">— Any / unspecified —</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Chapter / section (optional)">
          <input
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            placeholder="e.g. 4 — Laws of Motion"
            className={inputCls}
          />
        </Field>
        <Field label="Citation label (optional)">
          <input
            value={citationLabel}
            onChange={(e) => setCitationLabel(e.target.value)}
            placeholder="Shown on grounded answers"
            className={inputCls}
          />
        </Field>
        <Field label="Trust tier (higher wins on conflict)">
          <select
            value={trustTier}
            onChange={(e) => setTrustTier(Number(e.target.value) as KbTrustTier)}
            className={inputCls}
          >
            {([3, 2, 1] as KbTrustTier[]).map((t) => (
              <option key={t} value={t}>
                {t} — {TRUST_TIER_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </p>
      )}
      {ok && (
        <p className="mt-4 rounded-xl bg-green-50 px-4 py-2 text-sm font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
          {ok}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={busy}
        className="mt-5 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? "Processing…" : "Add to Knowledge Base"}
      </button>
    </div>
  );
}

const inputCls =
  "w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
