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
}: QuestionOptionProps) {
  const statusClass =
    status === "correct"
      ? "border-green-500 bg-green-50 text-green-700"
      : status === "wrong"
        ? "border-red-500 bg-red-50 text-red-700"
        : "border-gray-200 bg-white text-gray-800 hover:border-blue-400 hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white";

  // Keyboard focus ring (Up/Down arrows move this highlight).
  const highlightClass = highlighted
    ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-800"
    : "";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl border p-4 text-left font-semibold transition disabled:cursor-not-allowed ${statusClass} ${highlightClass}`}
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