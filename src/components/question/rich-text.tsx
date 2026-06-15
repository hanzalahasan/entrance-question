import type { ReactNode } from "react";

// Render text with **important** parts bolded (lightweight markdown). Shared by
// the explanation + related-question windows so the formatting stays identical.
export function renderRich(text: string): ReactNode {
  return text.split(/(\*\*.+?\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-bold text-gray-900 dark:text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}
