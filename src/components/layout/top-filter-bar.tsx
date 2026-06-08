"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { QuestionFilters } from "@/types/filter";
import { subjectsMaster, topicsMaster } from "@/lib/master-data";

type TopFilterBarProps = {
  totalQuestions: number;
  filters: QuestionFilters;
  onFiltersChange: (filters: QuestionFilters) => void;
};

const years = Array.from({ length: 17 }, (_, index) => String(2026 - index));

const subjects = subjectsMaster
  .filter((item) => item.status === "active")
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .map((item) => item.name);

function labelSubject(subject: string) {
  return subject === "Mathematics" ? "Mats" : subject;
}

function getTopicsBySubjects(selectedSubjects: string[]) {
  const subjectsToUse = selectedSubjects.length === 0 ? subjects : selectedSubjects;

  return subjectsToUse.flatMap((subject) => {
    const subjectData = subjectsMaster.find((item) => item.name === subject);

    if (!subjectData) return [];

    return topicsMaster
      .filter(
        (topic) =>
          topic.subjectId === subjectData.id && topic.status === "active"
      )
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((topic) => topic.name);
  });
}

export default function TopFilterBar({
  totalQuestions,
  filters,
  onFiltersChange,
}: TopFilterBarProps) {
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [yearSearch, setYearSearch] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

  const subjectRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  const filteredYears = useMemo(() => {
    return years.filter((year) => year.includes(yearSearch.trim()));
  }, [yearSearch]);

  const visibleTopics = useMemo(() => {
    if (filters.subjects.length === 0) return [];

    return getTopicsBySubjects(filters.subjects);
  }, [filters.subjects]);

  const moreFilterCount =
    filters.subjects.length + filters.years.length + filters.topics.length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (subjectRef.current && !subjectRef.current.contains(target)) {
        setSubjectOpen(false);
      }

      if (yearRef.current && !yearRef.current.contains(target)) {
        setYearOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function toggleSubject(subject: string) {
    const alreadySelected = filters.subjects.includes(subject);

    const updatedSubjects = alreadySelected
      ? filters.subjects.filter((item) => item !== subject)
      : [...filters.subjects, subject];

    onFiltersChange({
      ...filters,
      subjects: updatedSubjects,
      topics: [],
    });
  }

  function toggleYear(year: string) {
    const alreadySelected = filters.years.includes(year);

    const updatedYears = alreadySelected
      ? filters.years.filter((item) => item !== year)
      : [...filters.years, year];

    onFiltersChange({
      ...filters,
      years: updatedYears,
    });
  }

  function toggleTopic(topic: string) {
    const alreadySelected = filters.topics.includes(topic);

    const updatedTopics = alreadySelected
      ? filters.topics.filter((item) => item !== topic)
      : [...filters.topics, topic];

    onFiltersChange({
      ...filters,
      topics: updatedTopics,
    });
  }

  function clearSubjects() {
    onFiltersChange({
      ...filters,
      subjects: [],
      topics: [],
    });
  }

  function clearYears() {
    onFiltersChange({
      ...filters,
      years: [],
    });
  }

  function clearTopics() {
    onFiltersChange({
      ...filters,
      topics: [],
    });
  }

  function clearAllFilters() {
    onFiltersChange({
      subjects: [],
      years: [],
      topics: [],
    });
  }

  const subjectTitle =
    filters.subjects.length === 0
      ? "All Subject"
      : filters.subjects.length === 1
        ? labelSubject(filters.subjects[0])
        : `${filters.subjects.length} selected`;

  const yearTitle =
    filters.years.length === 0
      ? "All Year"
      : filters.years.length === 1
        ? filters.years[0]
        : `${filters.years.length} selected`;

  return (
    <>
      <section className="mb-5 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.1fr_1.1fr_.75fr_auto]">
          <div ref={subjectRef} className="relative">
            <label className="mb-2 block text-sm font-black text-gray-500 dark:text-slate-400">
              All Subject
            </label>

            <button
              onClick={() => {
                setSubjectOpen((prev) => !prev);
                setYearOpen(false);
              }}
              className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-gray-300 bg-white px-4 text-left font-bold text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <span className="truncate">{subjectTitle}</span>
              <span>▾</span>
            </button>

            {subjectOpen && (
              <div className="absolute left-0 top-[76px] z-50 max-h-80 w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-3 shadow-xl dark:border-slate-600 dark:bg-slate-800">
                <div className="mb-2 flex items-center justify-between">
                  <b className="text-sm text-gray-900 dark:text-white">
                    Subjects
                  </b>

                  {filters.subjects.length > 1 && (
                    <button
                      onClick={clearSubjects}
                      className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500 dark:bg-slate-700 dark:text-slate-300"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl p-2 text-sm font-bold text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={filters.subjects.length === 0}
                    onChange={clearSubjects}
                  />
                  All Subject
                </label>

                {subjects.map((subject) => (
                  <label
                    key={subject}
                    className="flex cursor-pointer items-center gap-2 rounded-xl p-2 text-sm font-bold text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={filters.subjects.includes(subject)}
                      onChange={() => toggleSubject(subject)}
                    />
                    {labelSubject(subject)}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div ref={yearRef} className="relative">
            <label className="mb-2 block text-sm font-black text-gray-500 dark:text-slate-400">
              Past Years
            </label>

            <button
              onClick={() => {
                setYearOpen((prev) => !prev);
                setSubjectOpen(false);
              }}
              className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-gray-300 bg-white px-4 text-left font-bold text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <span className="truncate">{yearTitle}</span>
              <span>▾</span>
            </button>

            {yearOpen && (
              <div className="absolute left-0 top-[76px] z-50 max-h-80 w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-3 shadow-xl dark:border-slate-600 dark:bg-slate-800">
                <input
                  value={yearSearch}
                  onChange={(event) => setYearSearch(event.target.value)}
                  placeholder="Search year..."
                  className="mb-2 h-10 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm font-semibold text-gray-800 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <div className="mb-2 flex items-center justify-between">
                  <b className="text-sm text-gray-900 dark:text-white">Years</b>

                  {filters.years.length > 1 && (
                    <button
                      onClick={clearYears}
                      className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500 dark:bg-slate-700 dark:text-slate-300"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl p-2 text-sm font-bold text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={filters.years.length === 0}
                    onChange={clearYears}
                  />
                  All Year
                </label>

                {filteredYears.map((year) => (
                  <label
                    key={year}
                    className="flex cursor-pointer items-center gap-2 rounded-xl p-2 text-sm font-bold text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={filters.years.includes(year)}
                      onChange={() => toggleYear(year)}
                    />
                    {year}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-gray-500 dark:text-slate-400">
              Mock Test
            </label>

            <button className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-gray-300 bg-white px-4 text-left font-bold text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
              Mock
            </button>
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-gray-500 dark:text-slate-400">
              &nbsp;
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => setMoreOpen(true)}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 font-bold text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                ☷ More Filters

                {moreFilterCount > 0 && (
                  <span className="grid h-6 min-w-6 place-items-center rounded-full bg-blue-600 px-2 text-xs font-black text-white">
                    {moreFilterCount}
                  </span>
                )}
              </button>

              {moreFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="grid h-12 w-12 place-items-center rounded-full bg-red-100 font-black text-red-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {moreFilterCount > 0 && totalQuestions > 0 && totalQuestions < 15 && (
          <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm font-bold text-orange-700">
            Only {totalQuestions} questions found. Please remove some filters to
            have more questions.
          </div>
        )}

        <p className="mt-3 text-center text-sm font-semibold text-gray-500 dark:text-slate-400">
          Total Questions: {totalQuestions}
        </p>
      </section>

      {moreOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-slate-600">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">
                More Filters
              </h2>

              <button
                onClick={() => setMoreOpen(false)}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white"
              >
                Close
              </button>
            </div>

            <div className="grid max-h-[70vh] gap-4 overflow-y-auto p-4 lg:grid-cols-3">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <b className="text-gray-900 dark:text-white">Years</b>

                  {filters.years.length > 0 && (
                    <button
                      onClick={clearYears}
                      className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500 dark:bg-slate-700 dark:text-slate-300"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 p-2 dark:border-slate-600 dark:bg-slate-900">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl p-2 text-sm font-bold text-gray-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={filters.years.length === 0}
                      onChange={clearYears}
                    />
                    All Year
                  </label>

                  {years.map((year) => (
                    <label
                      key={year}
                      className="flex cursor-pointer items-center gap-2 rounded-xl p-2 text-sm font-bold text-gray-700 dark:text-slate-300"
                    >
                      <input
                        type="checkbox"
                        checked={filters.years.includes(year)}
                        onChange={() => toggleYear(year)}
                      />
                      {year}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <b className="text-gray-900 dark:text-white">Subjects</b>

                  {filters.subjects.length > 0 && (
                    <button
                      onClick={clearSubjects}
                      className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500 dark:bg-slate-700 dark:text-slate-300"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 p-2 dark:border-slate-600 dark:bg-slate-900">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl p-2 text-sm font-bold text-gray-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={filters.subjects.length === 0}
                      onChange={clearSubjects}
                    />
                    All Subject
                  </label>

                  {subjects.map((subject) => (
                    <label
                      key={subject}
                      className="flex cursor-pointer items-center gap-2 rounded-xl p-2 text-sm font-bold text-gray-700 dark:text-slate-300"
                    >
                      <input
                        type="checkbox"
                        checked={filters.subjects.includes(subject)}
                        onChange={() => toggleSubject(subject)}
                      />
                      {labelSubject(subject)}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <b className="text-gray-900 dark:text-white">Topics</b>

                  {filters.topics.length > 0 && (
                    <button
                      onClick={clearTopics}
                      className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500 dark:bg-slate-700 dark:text-slate-300"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 p-2 dark:border-slate-600 dark:bg-slate-900">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl p-2 text-sm font-bold text-gray-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={filters.topics.length === 0}
                      onChange={clearTopics}
                    />
                    All Topics
                  </label>

                  {filters.subjects.length > 0 &&
                    visibleTopics.map((topic) => (
                      <label
                        key={topic}
                        className="flex cursor-pointer items-center gap-2 rounded-xl p-2 text-sm font-bold text-gray-700 dark:text-slate-300"
                      >
                        <input
                          type="checkbox"
                          checked={filters.topics.includes(topic)}
                          onChange={() => toggleTopic(topic)}
                        />
                        {topic}
                      </label>
                    ))}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 p-4 dark:border-slate-600">
              <button
                onClick={() => setMoreOpen(false)}
                className="h-12 w-full rounded-2xl bg-blue-600 font-black text-white"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}