"use client";

import { useState } from "react";

import {
  getKbChunks,
  setKbSourceEnabled,
  deleteKbSource,
} from "@/services/knowledge-base-service";
import type { KbSource, KbChunk } from "@/types/knowledge-base";
import { TRUST_TIER_LABELS } from "@/types/knowledge-base";

const TYPE_ICON: Record<KbSource["type"], string> = {
  pdf: "📄",
  text: "✍️",
  url: "🔗",
  image: "🖼️",
};

const STATUS_STYLE: Record<KbSource["status"], string> = {
  ready: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  processing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function SourceList({
  sources,
  onChange,
}: {
  sources: KbSource[];
  onChange: () => void;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [chunks, setChunks] = useState<KbChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  async function toggleView(source: KbSource) {
    if (openId === source.id) {
      setOpenId(null);
      return;
    }
    setOpenId(source.id);
    setLoadingChunks(true);
    setChunks(await getKbChunks(source.id));
    setLoadingChunks(false);
  }

  async function toggleEnabled(source: KbSource) {
    await setKbSourceEnabled(source.id, !source.enabled);
    onChange();
  }

  async function remove(source: KbSource) {
    if (!confirm(`Delete "${source.title}" and all its passages?`)) return;
    await deleteKbSource(source);
    if (openId === source.id) setOpenId(null);
    onChange();
  }

  if (sources.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-800">
        <p className="text-sm font-bold text-gray-500 dark:text-slate-400">
          No sources yet. Add a book, paste, link, or photo above to start
          building the Knowledge Base.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sources.map((s) => (
        <div
          key={s.id}
          className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">{TYPE_ICON[s.type]}</span>
                <h3 className="truncate font-black text-gray-900 dark:text-white">
                  {s.title}
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[s.status]}`}
                >
                  {s.status}
                </span>
                {!s.enabled && (
                  <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-bold text-gray-600 dark:bg-slate-600 dark:text-slate-200">
                    disabled
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-slate-400">
                {[
                  s.subjectName,
                  s.chapter && `Ch ${s.chapter}`,
                  `${s.chunkCount} passages`,
                  `Tier ${s.trustTier} · ${TRUST_TIER_LABELS[s.trustTier]}`,
                  new Date(s.createdAt).toLocaleDateString(),
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </p>
              {s.status === "failed" && s.error && (
                <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
                  {s.error}
                </p>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              {s.status === "ready" && (
                <button
                  type="button"
                  onClick={() => toggleView(s)}
                  className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {openId === s.id ? "Hide" : "View"} passages
                </button>
              )}
              <button
                type="button"
                onClick={() => toggleEnabled(s)}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {s.enabled ? "Disable" : "Enable"}
              </button>
              <button
                type="button"
                onClick={() => remove(s)}
                className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                Delete
              </button>
            </div>
          </div>

          {openId === s.id && (
            <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 dark:border-slate-700">
              {loadingChunks ? (
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                  Loading passages…
                </p>
              ) : (
                chunks.map((c, i) => (
                  <details
                    key={c.id}
                    className="rounded-2xl bg-gray-50 px-4 py-2 dark:bg-slate-900"
                  >
                    <summary className="cursor-pointer text-xs font-bold text-gray-600 dark:text-slate-300">
                      Passage {i + 1}
                      {c.chapter ? ` · Ch ${c.chapter}` : ""}
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-gray-700 dark:text-slate-300">
                      {c.content}
                    </p>
                  </details>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
