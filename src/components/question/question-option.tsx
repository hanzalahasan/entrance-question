import type { OptionContentType } from "@/types/question";

type QuestionOptionProps = {
  optionKey: string;
  value: string;
  imageUrl?: string;
  type?: OptionContentType;
  status: "default" | "correct" | "wrong";
  disabled: boolean;
  highlighted?: boolean;
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
  onClick,
  onMouseEnter,
}: QuestionOptionProps) {
  // One unified highlight state, shared by mouse hover and keyboard arrows.
  // No separate `hover:` background, so only ever one option looks active.
  const stateClass =
    status === "correct"
      ? "border-green-500 bg-green-50 text-green-700"
      : status === "wrong"
        ? "border-red-500 bg-red-50 text-red-700"
        : highlighted
          ? "border-blue-500 bg-blue-50 text-gray-900 ring-2 ring-blue-500/40 dark:border-blue-400 dark:bg-slate-700 dark:text-white"
          : "border-gray-200 bg-white text-gray-800 dark:border-slate-600 dark:bg-slate-900 dark:text-white";

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      disabled={disabled}
      className={`w-full rounded-2xl border p-4 text-left font-semibold transition disabled:cursor-not-allowed ${stateClass}`}
    >
      <div className="flex gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-sm font-black text-gray-700">
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
      </div>
    </button>
  );
}