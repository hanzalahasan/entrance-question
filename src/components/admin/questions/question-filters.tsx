"use client";

type QuestionFiltersProps = {
  subject: string;
  year: string;
  difficulty: string;
  subjects: string[];
  years: string[];
  difficulties: string[];
  onSubjectChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onDifficultyChange: (value: string) => void;
};

export default function QuestionFilters({
  subject,
  year,
  difficulty,
  subjects,
  years,
  difficulties,
  onSubjectChange,
  onYearChange,
  onDifficultyChange,
}: QuestionFiltersProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <select
        value={subject}
        onChange={(event) => onSubjectChange(event.target.value)}
        className="h-12 rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
      >
        <option value="">All Subjects</option>
        {subjects.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <select
        value={year}
        onChange={(event) => onYearChange(event.target.value)}
        className="h-12 rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
      >
        <option value="">All Years</option>
        {years.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <select
        value={difficulty}
        onChange={(event) => onDifficultyChange(event.target.value)}
        className="h-12 rounded-2xl border border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
      >
        <option value="">All Difficulty</option>
        {difficulties.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}