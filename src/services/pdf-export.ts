// Client-only: builds a downloadable PDF of a mock-test result, with the user's
// photo. jsPDF is dynamically imported so it's code-split to the dashboard and
// never bundled into the student practice/mock pages.

import type { MockAttempt, MockResult } from "@/types/mock";
import type { Profile } from "@/types/profile";

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function selectionLabel(sel: MockAttempt["selection"]): string {
  if (sel.mode === "past_year") return `Past Year ${sel.year}`;
  if (sel.mode === "set") return `${sel.setName} (${sel.difficulty})`;
  return `Practice (${sel.difficulty})`;
}

// Fetch an image URL → data URL (avoids html2canvas CORS issues with the photo).
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadResultPdf(
  result: MockResult,
  attempt: MockAttempt,
  profile: Profile | null
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40; // margin
  let y = M;

  const line = (color: [number, number, number] = [220, 220, 220]) => {
    doc.setDrawColor(...color);
    doc.line(M, y, W - M, y);
  };

  // ── Header: title + photo ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39);
  doc.text("Entrance Question", M, y + 6);
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128);
  doc.setFont("helvetica", "normal");
  doc.text("Mock Test Report", M, y + 24);

  const photo = profile?.avatarUrl ? await toDataUrl(profile.avatarUrl) : null;
  if (photo) {
    try {
      const fmtType = photo.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(photo, fmtType, W - M - 64, y - 6, 64, 64);
    } catch {
      /* ignore a bad image */
    }
  }
  y += 80;

  // ── Student + meta ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(17, 24, 39);
  doc.text(profile?.fullName || "Student", M, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  if (profile?.email) {
    doc.text(profile.email, M, y);
    y += 14;
  }
  const taken = attempt.durationMinutes * 60 - attempt.remainingSeconds;
  const mins = Math.floor(taken / 60);
  const secs = taken % 60;
  const dateStr = attempt.submittedAt
    ? new Date(attempt.submittedAt).toLocaleString()
    : "";
  doc.text(
    `${selectionLabel(attempt.selection)}  ·  ${dateStr}  ·  Time taken: ${mins}m ${secs}s` +
      (attempt.pauseCount ? `  ·  Paused ${attempt.pauseCount}×` : "  ·  One go"),
    M,
    y
  );
  y += 16;
  line();
  y += 24;

  // ── Score summary ──
  const pct =
    result.maxMarks > 0
      ? Math.max(0, Math.round((result.marks / result.maxMarks) * 100))
      : 0;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(37, 99, 235);
  doc.text("NET SCORE", M, y);
  doc.setFontSize(22);
  doc.setTextColor(17, 24, 39);
  doc.text(`${fmt(result.marks)} / ${result.maxMarks}  (${pct}%)`, M, y + 26);
  y += 44;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(22, 163, 74);
  doc.text(`Correct: ${result.correct}`, M, y);
  doc.setTextColor(220, 38, 38);
  doc.text(`Wrong: ${result.wrong}`, M + 110, y);
  doc.setTextColor(107, 114, 128);
  doc.text(`Unanswered: ${result.unanswered}`, M + 210, y);
  y += 22;
  line();
  y += 22;

  // ── Per-subject → per-topic ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(17, 24, 39);
  doc.text("Performance by subject & topic", M, y);
  y += 22;

  const pageBreak = () => {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = M;
    }
  };

  for (const s of result.subjects) {
    pageBreak();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(s.subjectName, M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(
      `✓ ${s.correct}   ✗ ${s.wrong}   — ${s.unanswered}   ${fmt(s.marks)} marks`,
      W - M,
      y,
      { align: "right" }
    );
    y += 16;
    for (const t of s.topics) {
      pageBreak();
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      doc.text(`•  ${t.topicName}`, M + 12, y);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `${t.correct}/${t.total} correct`,
        W - M,
        y,
        { align: "right" }
      );
      y += 14;
    }
    y += 10;
  }

  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(
    "Generated by Entrance Question",
    M,
    doc.internal.pageSize.getHeight() - 24
  );

  const safe = (profile?.fullName || "student").replace(/[^a-z0-9]+/gi, "-");
  doc.save(`mock-result-${safe}-${Date.now()}.pdf`);
}
