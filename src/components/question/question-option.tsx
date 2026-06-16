import type { OptionContentType } from "@/types/question";

type QuestionOptionProps = {
  optionKey: string;
  value: string;
  imageUrl?: string;
  type?: OptionContentType;
  status: "default" | "correct" | "wrong";
  disabled: boolean;
  highlighted?: boolean;
  // The student's chosen answer (distinct from `highlighted`, the keyboard/hover
  // navigation focus). Selected options get the green "ticked" treatment.
  selected?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
};

export default function QuestionOption({
  optionKey,
  value,
  imageUrl,
  type = "text",
  status,
  disabled,
  highlighted = false,
  selected = false,
  onClick,
  onMouseEnter,
}: QuestionOptionProps) {
  // A selected (but not yet graded) answer gets a green check so the student
  // clearly sees their pick — same green as a correct answer. `highlighted` is
  // the navigation focus (keyboard/hover) and stays blue.
  const isSelected = selected && status === "default";

  const stateClass =
    status === "correct"
      ? "border-green-500 bg-green-50 text-green-700"
      : status === "wrong"
        ? "border-red-500 bg-red-50 text-red-700"
        : isSelected
          ? "border-green-500 bg-green-50 text-gray-900 ring-2 ring-green-500/40 dark:border-green-400 dark:bg-green-900/20 dark:text-white"
          : highlighted
            ? "border-blue-500 bg-blue-50 text-gray-900 ring-2 ring-blue-500/40 dark:border-blue-400 dark:bg-slate-700 dark:text-white"
            : "border-gray-200 bg-white text-gray-800 dark:border-slate-600 dark:bg-slate-900 dark:text-white";

  const tick =
    status === "correct" || isSelected
      ? { symbol: "✓", cls: "bg-green-500 text-white" }
      : status === "wrong"
        ? { symbol: "✕", cls: "bg-red-500 text-white" }
        : null;

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      disabled={disabled}
      className={`w-full rounded-2xl border p-4 text-left font-semibold transition disabled:cursor-not-allowed ${stateClass}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black ${
            isSelected || status === "correct"
              ? "bg-green-500 text-white"
              : status === "wrong"
                ? "bg-red-500 text-white"
                : "bg-gray-100 text-gray-700"
          }`}
        >
          {optionKey}
        </span>

        <div className="flex-1 space-y-3">
          {(type === "text" || type === "text_image") && value && (
            <p>{value}</p>
          )}

          {(type === "image" || type === "text_image") && imageUrl && (
            <img
              src={imageUrl}
              alt={`Option ${optionKey}`}
              className="max-h-56 rounded-xl border border-gray-200 object-contain"
            />
          )}
        </div>

        {tick && (
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-black ${tick.cls}`}
          >
            {tick.symbol}
          </span>
        )}
      </div>
    </button>
  );
}