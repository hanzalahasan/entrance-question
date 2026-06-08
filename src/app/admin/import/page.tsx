"use client";

import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import AdminLayout from "@/components/admin/admin-layout";
import { getStoredSubjects, getStoredTopics } from "@/services/master-data-store";
import { getStoredQuestions, saveQuestions } from "@/services/admin-question-store";
import { recheckAllDuplicates } from "@/services/recheck-duplicate-service";
import type { Question } from "@/types/question";
import type { SubjectMaster as SM, TopicMaster as TM } from "@/types/master";

// ── Types ────────────────────────────────────────────────────────────

type SourceType = "excel" | "pdf-photo";
type YearType = "past-year" | "no-year";
type RowStatus = "valid" | "error";

type ParsedRow = {
  rowIndex: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: string;
  subjectName: string;
  topicName: string;
  year: string;
  explanation: string;
  explanationLong: string;
  concepts: string[];
  difficulty: string;
  status: RowStatus;
  errors: string[];
  subjectId?: number;
  topicId?: number;
  aiFilled?: string[];
};

// ── Constants ────────────────────────────────────────────────────────

const YEARS = Array.from({ length: 17 }, (_, i) => String(2026 - i));

const EXCEL_HEADERS = [
  "Question", "Option A", "Option B", "Option C", "Option D",
  "Answer", "Subject", "Topic", "Year", "Explanation", "Long Explanation",
  "Concepts", "Difficulty",
];

// ── Helpers ──────────────────────────────────────────────────────────

function validateRow(
  raw: Record<string, string>,
  idx: number,
  subjects: SM[],
  topics: TM[],
  yearOverride?: string
): ParsedRow {
  const get = (key: string) => (raw[key] ?? "").toString().trim();

  const question    = get("Question");
  const optionA     = get("Option A");
  const optionB     = get("Option B");
  const optionC     = get("Option C");
  const optionD     = get("Option D");
  const answer      = get("Answer").toUpperCase();
  const subjectName = get("Subject");
  const topicName   = get("Topic");
  const year        = yearOverride || get("Year");
  const explanation = get("Explanation");
  const explanationLong = get("Long Explanation");
  const concepts    = get("Concepts").split(",").map((c) => c.trim()).filter(Boolean);
  const difficulty  = get("Difficulty").toLowerCase() || "medium";

  const errors: string[] = [];

  if (!question)                                errors.push("Question is required");
  if (!optionA)                                 errors.push("Option A is required");
  if (!optionB)                                 errors.push("Option B is required");
  if (!optionC)                                 errors.push("Option C is required");
  if (!optionD)                                 errors.push("Option D is required");
  if (answer && !["A","B","C","D"].includes(answer))
                                                errors.push("Answer must be A, B, C, or D");
  if (!["easy","medium","hard"].includes(difficulty))
                                                errors.push("Difficulty must be easy, medium, or hard");

  const subject = subjects.find(
    (s) => s.name.toLowerCase() === subjectName.toLowerCase() && s.status === "active"
  );
  if (subjectName && !subject) errors.push(`Subject "${subjectName}" not found`);

  const topic = subject
    ? topics.find(
        (t) =>
          t.subjectId === subject.id &&
          t.name.toLowerCase() === topicName.toLowerCase() &&
          t.status === "active"
      )
    : undefined;
  if (topicName && subject && !topic) errors.push(`Topic "${topicName}" not found`);

  return {
    rowIndex: idx,
    question, optionA, optionB, optionC, optionD,
    answer, subjectName, topicName, year, explanation, explanationLong, concepts, difficulty,
    status: errors.length === 0 ? "valid" : "error",
    errors,
    subjectId: subject?.id,
    topicId: topic?.id,
  };
}

function needsAIFill(row: ParsedRow) {
  return !row.answer || !row.subjectId || !row.topicId || !row.explanation;
}

function rowToQuestion(row: ParsedRow): Question {
  return {
    id: Date.now() + row.rowIndex,
    uuid: crypto.randomUUID(),
    question: row.question,
    options: [
      { key: "A", value: row.optionA, type: "text" },
      { key: "B", value: row.optionB, type: "text" },
      { key: "C", value: row.optionC, type: "text" },
      { key: "D", value: row.optionD, type: "text" },
    ],
    answer: row.answer,
    explanation: row.explanation,
    explanationLong: row.explanationLong,
    concepts: row.concepts,
    subjectId: row.subjectId!,
    topicId: row.topicId!,
    subjectName: row.subjectName,
    topicName: row.topicName,
    year: row.year || undefined,
    repeatedYears: row.year ? [row.year] : [],
    repeatCount: 1,
    source: row.year ? "past_year" : "practice",
    importSource: "excel",
    difficulty: row.difficulty as Question["difficulty"],
    status: "draft",
    media: {},
    aiTags: [],
    aiReviewStatus: row.aiFilled?.length ? "suggested" : "not_checked",
    duplicateCheckStatus: "not_checked",
    possibleDuplicateIds: [],
    isMockEligible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Component ────────────────────────────────────────────────────────

export default function ExcelImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [subjects, setSubjects] = useState<SM[]>([]);
  const [topics, setTopics] = useState<TM[]>([]);

  // Settings
  const [sourceType, setSourceType] = useState<SourceType>("excel");
  const [yearType, setYearType] = useState<YearType>("no-year");
  const [selectedYear, setSelectedYear] = useState(YEARS[0]);

  // Data
  const [rows, setRows] = useState<ParsedRow[]>([]);

  // Status flags
  const [extracting, setExtracting] = useState(false);
  const [aiFilling, setAiFilling] = useState(false);
  const [aiFillProgress, setAiFillProgress] = useState({ done: 0, total: 0 });
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Feedback
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  useEffect(() => {
    Promise.all([getStoredSubjects(), getStoredTopics()]).then(([s, t]) => {
      setSubjects(s);
      setTopics(t);
    });
  }, []);

  const yearOverride = yearType === "past-year" ? selectedYear : undefined;

  // ── Excel template download ─────────────────────────────────────

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      EXCEL_HEADERS,
      ["What is the SI unit of Force?", "Joule","Newton","Pascal","Watt","B","Physics","Mechanics","2024","Force is measured in Newton (N).","The newton (kg·m/s²) follows from F=m·a; joule is energy, pascal is pressure, watt is power.","force, newton's laws, si units","easy"],
      ["Which particle determines atomic number?","Electron","Neutron","Proton","Nucleus","","","","","","","","medium"],
    ]);
    ws["!cols"] = [{wch:50},{wch:18},{wch:18},{wch:18},{wch:18},{wch:8},{wch:15},{wch:18},{wch:8},{wch:38},{wch:55},{wch:30},{wch:12}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");
    XLSX.writeFile(wb, "questions-template.xlsx");
  }

  // ── Excel parsing ───────────────────────────────────────────────

  function parseExcelFile(file: File) {
    setResult(null);
    setError("");
    setRows([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "", raw: false });
        if (!json.length) { setError("The file appears to be empty."); return; }
        setRows(json.map((raw, idx) => validateRow(raw, idx + 2, subjects, topics, yearOverride)));
      } catch {
        setError("Failed to read file. Make sure it matches the template format.");
      }
    };
    reader.readAsBinaryString(file);
  }

  // ── PDF / Photo extraction ──────────────────────────────────────

  async function extractFromFile(file: File) {
    setResult(null);
    setError("");
    setRows([]);
    setExtracting(true);

    try {
      const base64 = await fileToBase64(file);
      const mimeType = file.type || "image/jpeg";

      const res = await fetch("/api/admin/extract-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mimeType }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Extraction failed.");
        return;
      }

      const extracted: Array<Record<string, string>> = data.questions ?? [];

      if (!extracted.length) {
        setError("No questions found in this file. Try a clearer image or different file.");
        return;
      }

      // Map extracted fields to Excel-column format for validateRow
      const mapped = extracted.map((q, idx) => ({
        "Question":    q.question    ?? "",
        "Option A":    q.optionA     ?? "",
        "Option B":    q.optionB     ?? "",
        "Option C":    q.optionC     ?? "",
        "Option D":    q.optionD     ?? "",
        "Answer":      q.answer      ?? "",
        "Subject":     q.subject     ?? "",
        "Topic":       q.topic       ?? "",
        "Year":        yearOverride  ?? q.year ?? "",
        "Explanation": q.explanation ?? "",
        "Difficulty":  q.difficulty  ?? "medium",
      }));

      setRows(mapped.map((raw, idx) => validateRow(raw, idx + 1, subjects, topics, yearOverride)));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setExtracting(false);
    }
  }

  // ── File input handlers ─────────────────────────────────────────

  function handleFile(file: File) {
    if (sourceType === "excel") {
      if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
        setError("Please upload an Excel file (.xlsx, .xls) or CSV.");
        return;
      }
      parseExcelFile(file);
    } else {
      if (!file.name.match(/\.(pdf|jpg|jpeg|png|webp|gif)$/i)) {
        setError("Please upload a PDF or image file (.pdf, .jpg, .png, .webp).");
        return;
      }
      extractFromFile(file);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  // ── AI fill ─────────────────────────────────────────────────────

  async function handleAIFill() {
    const needFill = rows.filter((r) => r.question && needsAIFill(r));
    if (!needFill.length) return;

    setAiFilling(true);
    setAiFillProgress({ done: 0, total: needFill.length });
    setError("");

    const topicsWithSubject = topics.map((t) => ({
      name: t.name,
      subjectName: subjects.find((s) => s.id === t.subjectId)?.name ?? "",
    }));

    let updatedRows = [...rows];

    for (const row of needFill) {
      const missing: string[] = [];
      if (!row.answer)      missing.push("answer");
      if (!row.subjectId)   missing.push("subject");
      if (!row.topicId)     missing.push("topic");
      if (!row.explanation) missing.push("explanation");

      try {
        const res = await fetch("/api/admin/ai-fill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: row.question,
            optionA: row.optionA, optionB: row.optionB,
            optionC: row.optionC, optionD: row.optionD,
            subjects, topics: topicsWithSubject, missing,
          }),
        });

        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "AI fill failed."); break; }

        const filled = data.filled as Record<string, string>;
        const aiFilled: string[] = [];

        const newSubjectName  = filled.subject?.trim()              || row.subjectName;
        const newTopicName    = filled.topic?.trim()                || row.topicName;
        const newAnswer       = filled.answer?.trim().toUpperCase() || row.answer;
        const newExplanation  = filled.explanation?.trim()          || row.explanation;

        if (filled.subject)     aiFilled.push("subject");
        if (filled.topic)       aiFilled.push("topic");
        if (filled.answer)      aiFilled.push("answer");
        if (filled.explanation) aiFilled.push("explanation");

        const resolvedSubject = subjects.find(
          (s) => s.name.toLowerCase() === newSubjectName.toLowerCase() && s.status === "active"
        );
        const resolvedTopic = resolvedSubject
          ? topics.find(
              (t) =>
                t.subjectId === resolvedSubject.id &&
                t.name.toLowerCase() === newTopicName.toLowerCase() &&
                t.status === "active"
            )
          : undefined;

        const errors: string[] = [];
        if (!newAnswer || !["A","B","C","D"].includes(newAnswer)) errors.push("Answer must be A, B, C, or D");
        if (!resolvedSubject) errors.push(`Subject "${newSubjectName}" not found`);
        if (resolvedSubject && !resolvedTopic) errors.push(`Topic "${newTopicName}" not found`);
        if (!row.optionA || !row.optionB || !row.optionC || !row.optionD)
          errors.push("All options are required");

        const updatedRow: ParsedRow = {
          ...row,
          answer: newAnswer,
          subjectName: newSubjectName,
          topicName: newTopicName,
          explanation: newExplanation,
          subjectId: resolvedSubject?.id,
          topicId: resolvedTopic?.id,
          status: errors.length === 0 ? "valid" : "error",
          errors,
          aiFilled,
        };

        updatedRows = updatedRows.map((r) => (r.rowIndex === row.rowIndex ? updatedRow : r));
        setRows([...updatedRows]);
      } catch {
        setError("Network error during AI fill."); break;
      }

      setAiFillProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setAiFilling(false);
  }

  // ── Import ───────────────────────────────────────────────────────

  async function handleImport() {
    const validRows = rows.filter((r) => r.status === "valid");
    if (!validRows.length) return;

    setImporting(true);
    setError("");

    try {
      const existing = await getStoredQuestions();
      const newQuestions = validRows.map(rowToQuestion);
      await saveQuestions(recheckAllDuplicates([...newQuestions, ...existing]));
      setResult({ imported: validRows.length, skipped: rows.length - validRows.length });
      setRows([]);
    } catch {
      setError("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  // ── Derived ──────────────────────────────────────────────────────

  const validCount    = rows.filter((r) => r.status === "valid").length;
  const errorCount    = rows.filter((r) => r.status === "error").length;
  const needFillCount = rows.filter((r) => r.question && needsAIFill(r)).length;

  const acceptAttr = sourceType === "excel"
    ? ".xlsx,.xls,.csv"
    : ".pdf,.jpg,.jpeg,.png,.webp,.gif";

  // ── Render ───────────────────────────────────────────────────────

  return (
    <AdminLayout
      title="Import Questions"
      description="Bulk import from Excel or extract from PDF and photos using AI."
    >
      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
          <button onClick={() => setError("")} className="ml-3 underline">Dismiss</button>
        </div>
      )}

      {result && (
        <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">
          ✅ {result.imported} question{result.imported !== 1 ? "s" : ""} imported as drafts.
          {result.skipped > 0 && ` ${result.skipped} row${result.skipped !== 1 ? "s" : ""} skipped.`}
          <button onClick={() => setResult(null)} className="ml-3 underline">Dismiss</button>
        </div>
      )}

      <div className="space-y-5">

        {/* ── Step 1: Source type ─────────────────────────────────── */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-lg font-black text-gray-900 dark:text-white">Step 1 — Source Type</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {([
              { id: "excel",     label: "Excel / CSV",    desc: "Upload a filled spreadsheet. Download the template to get started.", icon: "📊" },
              { id: "pdf-photo", label: "PDF or Photo",   desc: "Upload a scanned question paper or photo. AI will extract the questions.", icon: "📄" },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                onClick={() => { setSourceType(opt.id); setRows([]); setError(""); }}
                className={`rounded-2xl border-2 p-4 text-left transition ${
                  sourceType === opt.id
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                    : "border-gray-200 hover:border-gray-300 dark:border-slate-600 dark:hover:border-slate-600"
                }`}
              >
                <div className="mb-1 text-2xl">{opt.icon}</div>
                <p className="font-black text-gray-900 dark:text-white">{opt.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-500 dark:text-slate-400">{opt.desc}</p>
              </button>
            ))}
          </div>

          {sourceType === "excel" && (
            <button
              onClick={downloadTemplate}
              className="mt-4 rounded-2xl border border-gray-300 px-5 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-white dark:hover:bg-slate-800"
            >
              Download Excel Template
            </button>
          )}

          {sourceType === "pdf-photo" && (
            <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm font-semibold text-orange-700 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-300">
              📌 Accepted: .pdf (searchable), .jpg, .png, .webp — for scanned PDFs, take a screenshot and upload as image.
              AI will extract all questions and options automatically. Requires <code className="rounded bg-orange-100 px-1 dark:bg-orange-900">OPENAI_API_KEY</code>.
            </div>
          )}
        </div>

        {/* ── Step 2: Year ────────────────────────────────────────── */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-lg font-black text-gray-900 dark:text-white">Step 2 — Question Year</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {([
              { id: "past-year", label: "Past Year Question Set", desc: "All questions in this file are from a specific exam year." },
              { id: "no-year",   label: "Practice / No Year",     desc: "Questions are not tied to any specific exam year." },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setYearType(opt.id)}
                className={`rounded-2xl border-2 p-4 text-left transition ${
                  yearType === opt.id
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                    : "border-gray-200 hover:border-gray-300 dark:border-slate-600"
                }`}
              >
                <p className="font-black text-gray-900 dark:text-white">{opt.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-500 dark:text-slate-400">{opt.desc}</p>
              </button>
            ))}
          </div>

          {yearType === "past-year" && (
            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm font-black text-gray-700 dark:text-white">Select Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-11 rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              >
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                All questions → {selectedYear}
              </span>
            </div>
          )}
        </div>

        {/* ── Step 3: Upload ──────────────────────────────────────── */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-lg font-black text-gray-900 dark:text-white">
            Step 3 — Upload {sourceType === "excel" ? "Spreadsheet" : "PDF or Photo"}
          </h2>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !extracting && fileRef.current?.click()}
            className={`flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
              extracting
                ? "cursor-default border-purple-300 bg-purple-50 dark:bg-purple-950/20"
                : dragOver
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                : "border-gray-300 hover:border-blue-400 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-800"
            }`}
          >
            {extracting ? (
              <>
                <div className="mb-2 text-3xl">🤖</div>
                <p className="text-lg font-black text-purple-700 dark:text-purple-300">
                  Extracting questions...
                </p>
                <p className="mt-1 text-sm font-semibold text-purple-500">
                  AI is reading your file. This may take 10–30 seconds.
                </p>
              </>
            ) : (
              <>
                <div className="mb-2 text-3xl">
                  {sourceType === "excel" ? "📊" : "📄"}
                </div>
                <p className="text-lg font-black text-gray-700 dark:text-white">
                  Drag &amp; drop or click to browse
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-slate-400">
                  {sourceType === "excel"
                    ? "Accepts .xlsx, .xls, .csv"
                    : "Accepts .pdf, .jpg, .png, .webp"}
                </p>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept={acceptAttr}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* ── Step 4: Preview, AI fill, Import ────────────────────── */}
        {rows.length > 0 && (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                  Step 4 — Review &amp; Import
                </h2>
                <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-slate-400">
                  {yearType === "past-year" && (
                    <span className="mr-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-black text-green-700">
                      Year: {selectedYear}
                    </span>
                  )}
                  <span className="text-green-600">{validCount} valid</span>
                  {errorCount > 0 && <span className="ml-2 text-red-600">{errorCount} errors</span>}
                  {needFillCount > 0 && <span className="ml-2 text-purple-600">{needFillCount} need AI fill</span>}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {needFillCount > 0 && (
                  <button
                    onClick={handleAIFill}
                    disabled={aiFilling}
                    className="rounded-2xl bg-purple-600 px-5 py-3 font-black text-white disabled:opacity-60 transition hover:bg-purple-700"
                  >
                    {aiFilling
                      ? `🤖 Filling ${aiFillProgress.done}/${aiFillProgress.total}...`
                      : `🤖 AI Fill ${needFillCount} Row${needFillCount !== 1 ? "s" : ""}`}
                  </button>
                )}

                <button
                  onClick={handleImport}
                  disabled={importing || validCount === 0}
                  className="rounded-2xl bg-green-600 px-5 py-3 font-black text-white disabled:opacity-50 transition hover:bg-green-700"
                >
                  {importing ? "Importing..." : `Import ${validCount} Question${validCount !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-xs font-black text-gray-500">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Question</th>
                    <th className="px-3 py-2">Subject</th>
                    <th className="px-3 py-2">Topic</th>
                    <th className="px-3 py-2">Answer</th>
                    <th className="px-3 py-2">Year</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.rowIndex}
                      className={`rounded-2xl font-semibold ${
                        row.status === "valid"
                          ? "bg-gray-50 dark:bg-slate-900"
                          : "bg-red-50 dark:bg-red-950/20"
                      }`}
                    >
                      <td className="rounded-l-2xl px-3 py-3 text-gray-500">{row.rowIndex}</td>

                      <td className="max-w-xs px-3 py-3 text-gray-900 dark:text-white">
                        <p className="line-clamp-2">{row.question || "—"}</p>
                      </td>

                      <td className="px-3 py-3">
                        <span className={row.subjectId ? "text-gray-700 dark:text-slate-300" : "text-gray-400"}>
                          {row.subjectName || "—"}
                        </span>
                        {row.aiFilled?.includes("subject") && (
                          <span className="ml-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-black text-purple-700">AI</span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <span className={row.topicId ? "text-gray-700 dark:text-slate-300" : "text-gray-400"}>
                          {row.topicName || "—"}
                        </span>
                        {row.aiFilled?.includes("topic") && (
                          <span className="ml-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-black text-purple-700">AI</span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <span className={row.answer ? "font-black text-gray-900 dark:text-white" : "text-gray-400"}>
                          {row.answer || "—"}
                        </span>
                        {row.aiFilled?.includes("answer") && (
                          <span className="ml-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-black text-purple-700">AI</span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-gray-700 dark:text-slate-300">
                        {row.year || "—"}
                      </td>

                      <td className="rounded-r-2xl px-3 py-3">
                        {needsAIFill(row) && row.status !== "valid" ? (
                          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-700">
                            Needs AI Fill
                          </span>
                        ) : row.status === "valid" ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                            Valid
                          </span>
                        ) : (
                          <div>
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">Error</span>
                            <ul className="mt-1 space-y-0.5">
                              {row.errors.map((e, i) => (
                                <li key={i} className="text-xs text-red-600">• {e}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
