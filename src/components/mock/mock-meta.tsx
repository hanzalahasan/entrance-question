"use client";

import type { MockAttempt } from "@/types/mock";

// Presents the attempt's framing + timing: mode (past-year or difficulty), the
// date, start/end clock times, total time taken, and whether it was done in one
// go or paused. Reused by the result view and the detailed report.

function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(" ");
}

function fmtTime(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString([], {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function MockMeta({ attempt }: { attempt: MockAttempt }) {
  const sel = attempt.selection;
  const modeBadge =
    sel.mode === "past_year"
      ? {
          text: `Past Year · ${sel.year}`,
          cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
        }
      : sel.mode === "set"
        ? {
            text: `${sel.setName} · ${sel.difficulty}`,
            cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
          }
        : {
            text: `Practice · ${sel.difficulty}`,
            cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
          };

  // Active time spent answering = full duration minus whatever was left on the
  // clock at submit (pauses don't burn the clock, so this is true working time).
  const timeTaken = attempt.durationMinutes * 60 - attempt.remainingSeconds;
  const pauses = attempt.pauseCount ?? 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-900/50">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-black ${modeBadge.cls}`}>
          {modeBadge.text}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            pauses > 0
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
          }`}
        >
          {pauses > 0 ? `Paused ${pauses} time${pauses === 1 ? "" : "s"}` : "Completed in one go"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <Meta label="Date" value={fmtDate(attempt.startedAt)} />
        <Meta label="Started" value={fmtTime(attempt.startedAt)} />
        <Meta label="Finished" value={fmtTime(attempt.submittedAt)} />
        <Meta label="Time taken" value={fmtDuration(timeTaken)} />
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">
        {label}
      </p>
      <p className="font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
