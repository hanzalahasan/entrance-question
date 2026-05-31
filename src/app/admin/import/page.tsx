"use client";

import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import AdminLayout from "@/components/admin/admin-layout";
import { getStoredSubjects, getStoredTopics } from "@/services/master-data-store";
import { getStoredQuestions, saveQuestions } from "@/services/admin-question-store";
import { recheckAllDuplicates } from "@/services/recheck-duplicate-service";
import type { Question } from "@/types/question";
import type { SubjectMaster as SM, TopicMaster as TM } from "@/types/master";

// ── Column definitions (order in the Excel template) ────────────────
const TEMPLATE_HEADERS = [
  "Question",
  "Option A",
  "Option B",
  "Option C",
  "Option D",
  "Answer",      // A / B / C / D
  "Subject",
  "Topic",
  "Year",        // optional – e.g. 2024
  "Explanation", // optional
  "Difficulty",  // optional – easy / medium / hard  (default: medium)
];

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
  difficulty: string;
  status: RowStatus;
  errors: string[];
  subjectId?: number;
  topicId?: number;
};

function validateRow(
  raw: Record<string, string>,
  idx: number,
  subjects: SM[],
  topics: TM[]
): ParsedRow {
  const get = (key: string) => (raw[key] ?? "").toString().trim();

  const question   = get("Question");
  const optionA    = get("Option A");
  const optionB    = get("Option B");
  const optionC    = get("Option C");
  const optionD    = get("Option D");
  const answer     = get("Answer").toUpperCase();
  const subjectName = get("Subject");
  const topicName  = get("Topic");
  const year       = get("Year");
  const explanation = get("Explanation");
  const difficulty = get("Difficulty").toLowerCase() || "medium";

  const errors: string[] = [];

  if (!question)              errors.push("Question is required");
  if (!optionA)               errors.push("Option A is required");
  if (!optionB)               errors.push("Option B is required");
  if (!optionC)               errors.push("Option C is required");
  if (!optionD)               errors.push("Option D is required");
  if (!["A","B","C","D"].includes(answer))
                              errors.push("Answer must be A, B, C, or D");
  if (!subjectName)           errors.push("Subject is required");
  if (!topicName)             errors.push("Topic is required");
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
  if (topicName && subject && !topic)
    errors.push(`Topic "${topicName}" not found under ${subjectName}`);

  return {
    rowIndex: idx,
    question, optionA, optionB, optionC, optionD,
    answer, subjectName, topicName, year, explanation, difficulty,
    status: errors.length === 0 ? "valid" : "error",
    errors,
    subjectId: subject?.id,
    topicId: topic?.id,
  };
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
    aiReviewStatus: "not_checked",
    duplicateCheckStatus: "not_checked",
    possibleDuplicateIds: [],
    isMockEligible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function ExcelImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [subjects, setSubjects] = useState<SM[]>([]);
  const [topics, setTopics] = useState<TM[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    Promise.all([getStoredSubjects(), getStoredTopics()]).then(([s, t]) => {
      setSubjects(s);
      setTopics(t);
    });
  }, []);

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      [
        "What is the SI unit of Force?",
        "Joule", "Newton", "Pascal", "Watt",
        "B", "Physics", "Mechanics", "2024",
        "Force is measured in Newton (N) according to SI units.",
        "easy",
      ],
      [
        "Which particle determines atomic number?",
        "Electron", "Neutron", "Proton", "Nucleus",
        "C", "Chemistry", "Atomic Structure", "2023",
        "Atomic number equals the number of protons.",
        "medium",
      ],
    ]);

    // Set column widths
    ws["!cols"] = [
      { wch: 50 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
      { wch: 8 }, { wch: 15 }, { wch: 20 }, { wch: 8 }, { wch: 40 }, { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");
    XLSX.writeFile(wb, "questions-template.xlsx");
  }

  function processFile(file: File) {
    setResult(null);
    setError("");
    setRows([]);

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError("Please upload an Excel file (.xlsx, .xls) or CSV.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
          defval: "",
          raw: false,
        });

        if (json.length === 0) {
          setError("The file appears to be empty.");
          return;
        }

        const parsed = json.map((raw, idx) => validateRow(raw, idx + 2, subjects, topics));
        setRows(parsed);
      } catch {
        setError("Failed to read file. Please make sure it matches the template format.");
      }
    };
    reader.readAsBinaryString(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  async function handleImport() {
    const validRows = rows.filter((r) => r.status === "valid");
    if (validRows.length === 0) return;

    setImporting(true);
    setError("");

    try {
      const existing = await getStoredQuestions();
      const newQuestions = validRows.map(rowToQuestion);
      const all = recheckAllDuplicates([...newQuestions, ...existing]);
      await saveQuestions(all);
      setResult({ imported: validRows.length, skipped: rows.length - validRows.length });
      setRows([]);
    } catch {
      setError("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  const validCount = rows.filter((r) => r.status === "valid").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  return (
    <AdminLayout
      title="Excel Import"
      description="Import questions in bulk from an Excel or CSV file."
    >
      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
          <button onClick={() => setError("")} className="ml-3 underline">Dismiss</button>
        </div>
      )}

      {result && (
        <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">
          ✅ Import complete — {result.imported} question{result.imported !== 1 ? "s" : ""} imported as drafts.
          {result.skipped > 0 && ` ${result.skipped} row${result.skipped !== 1 ? "s" : ""} skipped due to errors.`}
          <button onClick={() => setResult(null)} className="ml-3 underline">Dismiss</button>
        </div>
      )}

      {/* Template + Upload */}
      <div className="space-y-5">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Step 1 — Download Template</h2>
              <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-slate-400">
                Fill in the template then upload it below. Required columns: Question, Options A–D, Answer, Subject, Topic.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-gray-500 dark:text-slate-400">
                {TEMPLATE_HEADERS.map((h) => (
                  <span key={h} className="rounded-full bg-gray-100 px-3 py-1 dark:bg-slate-800">{h}</span>
                ))}
              </div>
            </div>

            <button
              onClick={downloadTemplate}
              className="shrink-0 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white transition hover:bg-blue-700"
            >
              Download Template
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-black text-gray-900 dark:text-white">Step 2 — Upload File</h2>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileRef.current?.click()}
            className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
              dragOver
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                : "border-gray-300 hover:border-blue-400 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
            }`}
          >
            <p className="text-lg font-black text-gray-700 dark:text-white">
              Drag & drop your file here
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-slate-400">
              or click to browse — .xlsx, .xls, .csv accepted
            </p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Preview */}
        {rows.length > 0 && (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                  Step 3 — Review &amp; Import
                </h2>
                <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-slate-400">
                  <span className="text-green-600">{validCount} valid</span>
                  {errorCount > 0 && <span className="ml-2 text-red-600">{errorCount} with errors</span>}
                  {" "}— only valid rows will be imported as drafts.
                </p>
              </div>

              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="rounded-2xl bg-green-600 px-6 py-3 font-black text-white disabled:opacity-50 transition hover:bg-green-700"
              >
                {importing ? "Importing..." : `Import ${validCount} Question${validCount !== 1 ? "s" : ""}`}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-xs font-black text-gray-500">
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Question</th>
                    <th className="px-3 py-2">Subject</th>
                    <th className="px-3 py-2">Topic</th>
                    <th className="px-3 py-2">Year</th>
                    <th className="px-3 py-2">Answer</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.rowIndex}
                      className={`rounded-2xl font-semibold ${
                        row.status === "valid"
                          ? "bg-gray-50 dark:bg-slate-950"
                          : "bg-red-50 dark:bg-red-950/20"
                      }`}
                    >
                      <td className="rounded-l-2xl px-3 py-3 text-gray-500">{row.rowIndex}</td>
                      <td className="max-w-xs px-3 py-3 text-gray-900 dark:text-white">
                        <p className="line-clamp-2">{row.question || "—"}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={row.subjectId ? "text-gray-700 dark:text-slate-300" : "text-red-600"}>
                          {row.subjectName || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={row.topicId ? "text-gray-700 dark:text-slate-300" : "text-red-600"}>
                          {row.topicName || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-700 dark:text-slate-300">{row.year || "—"}</td>
                      <td className="px-3 py-3 text-gray-700 dark:text-slate-300">{row.answer || "—"}</td>
                      <td className="rounded-r-2xl px-3 py-3">
                        {row.status === "valid" ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                            Valid
                          </span>
                        ) : (
                          <div>
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                              Error
                            </span>
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
