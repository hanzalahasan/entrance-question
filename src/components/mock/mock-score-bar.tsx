"use client";

// A segmented progress bar showing the correct / wrong / unanswered split of a
// set of questions. Green = correct, red = wrong, grey = unanswered. Reused on
// the result page and for every subject + topic in the detailed report.

type Props = {
  correct: number;
  wrong: number;
  unanswered: number;
  size?: "sm" | "md";
  showLegend?: boolean;
};

export default function MockScoreBar({
  correct,
  wrong,
  unanswered,
  size = "md",
  showLegend = false,
}: Props) {
  const total = correct + wrong + unanswered;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const height = size === "sm" ? "h-2" : "h-3";

  return (
    <div>
      <div
        className={`flex w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700 ${height}`}
        role="img"
        aria-label={`${correct} correct, ${wrong} wrong, ${unanswered} unanswered of ${total}`}
      >
        {correct > 0 && (
          <div className="bg-green-500" style={{ width: `${pct(correct)}%` }} />
        )}
        {wrong > 0 && (
          <div className="bg-red-500" style={{ width: `${pct(wrong)}%` }} />
        )}
        {unanswered > 0 && (
          <div
            className="bg-gray-400 dark:bg-slate-500"
            style={{ width: `${pct(unanswered)}%` }}
          />
        )}
      </div>

      {showLegend && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold">
          <LegendItem
            dot="bg-green-500"
            label="Correct"
            value={correct}
            cls="text-green-600 dark:text-green-400"
          />
          <LegendItem
            dot="bg-red-500"
            label="Wrong"
            value={wrong}
            cls="text-red-600 dark:text-red-400"
          />
          <LegendItem
            dot="bg-gray-400 dark:bg-slate-500"
            label="Unanswered"
            value={unanswered}
            cls="text-gray-500 dark:text-slate-400"
          />
        </div>
      )}
    </div>
  );
}

function LegendItem({
  dot,
  label,
  value,
  cls,
}: {
  dot: string;
  label: string;
  value: number;
  cls: string;
}) {
  return (
    <span className={`flex items-center gap-1.5 ${cls}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      {value} {label}
    </span>
  );
}
