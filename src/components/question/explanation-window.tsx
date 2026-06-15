"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import type { Question } from "@/types/question";
import { renderRich } from "./rich-text";

const POS_KEY = "eq_expl_pos";
const SIZE_KEY = "eq_expl_size";

type ExplanationWindowProps = {
  // The question whose explanation is shown.
  question: Question;
  // Reader font size (px) for the explanation text + the controlling slider.
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  // Related questions surfaced after "Explain more"; clicking opens them.
  relatedQuestions: Question[];
  onStartRelated: (questions: Question[]) => void;
  // While the related window is open this blurs (clear-on-hover), matching the
  // main card, and the backdrop becomes click-through.
  dimmed: boolean;
  onClose: () => void;
};

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

// The SHORT view: a small, movable window. Opens at the remembered position,
// else lower on screen so the question stays visible.
function shortSize() {
  if (typeof window === "undefined") return { w: 480, h: 300 };
  const w = Math.min(480, window.innerWidth - 24);
  return { w, h: Math.round(window.innerHeight * 0.4) };
}
function shortPos() {
  if (typeof window === "undefined") return { x: 12, y: 12 };
  const w = shortSize().w;
  const saved = readJSON<{ x: number; y: number }>(POS_KEY);
  const base =
    saved && typeof saved.x === "number"
      ? saved
      : {
          x: Math.round((window.innerWidth - w) / 2),
          y: Math.round(window.innerHeight * 0.32),
        };
  return {
    x: Math.min(Math.max(8, base.x), Math.max(8, window.innerWidth - w - 8)),
    y: Math.min(Math.max(8, base.y), window.innerHeight - 80),
  };
}
function defaultLongSize() {
  return {
    w: Math.min(640, window.innerWidth - 24),
    h: Math.min(Math.round(window.innerHeight * 0.55), window.innerHeight - 24),
  };
}
// Keep a window of size w×h within the viewport.
function clampPos(x: number, y: number, w: number, h: number) {
  const maxX = Math.max(8, window.innerWidth - w - 8);
  const maxY = Math.max(8, window.innerHeight - h - 8);
  return { x: Math.min(Math.max(8, x), maxX), y: Math.min(Math.max(8, y), maxY) };
}

/**
 * The free-floating explanation window. Short mode = small + movable; "Explain
 * more" switches to a resizable (8-grip) long mode. Position + long-size are
 * persisted so it reopens where the user left it.
 */
export default function ExplanationWindow({
  question,
  fontSize,
  onFontSizeChange,
  relatedQuestions,
  onStartRelated,
  dimmed,
  onClose,
}: ExplanationWindowProps) {
  const [showLong, setShowLong] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [winPos, setWinPos] = useState(shortPos);
  const [winSize, setWinSize] = useState(shortSize);

  const dragRef = useRef<{
    mode: "move" | "resize";
    dir?: string; // for resize: any combo of n/s/e/w
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);
  const winRef = useRef<HTMLDivElement>(null);
  const winPosRef = useRef(winPos);
  const winSizeRef = useRef(winSize);

  const hasLong = Boolean(question.explanationLong?.trim());

  // Drag-to-move (header) and drag-to-resize (any edge/corner). The position is
  // remembered after any drag; the chosen size after a resize.
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;

      if (d.mode === "move") {
        const pos = {
          x: Math.min(
            Math.max(8 - d.origW + 80, d.origX + dx),
            window.innerWidth - 60
          ),
          y: Math.min(Math.max(0, d.origY + dy), window.innerHeight - 60),
        };
        winPosRef.current = pos;
        setWinPos(pos);
        return;
      }

      const dir = d.dir || "se";
      const MINW = 320,
        MINH = 200;
      const maxW = window.innerWidth - 16;
      const maxH = window.innerHeight - 16;
      let w = d.origW,
        h = d.origH,
        x = d.origX,
        y = d.origY;
      if (dir.includes("e")) w = Math.min(maxW, Math.max(MINW, d.origW + dx));
      if (dir.includes("w")) {
        w = Math.min(maxW, Math.max(MINW, d.origW - dx));
        x = d.origX + (d.origW - w);
      }
      if (dir.includes("s")) h = Math.min(maxH, Math.max(MINH, d.origH + dy));
      if (dir.includes("n")) {
        h = Math.min(maxH, Math.max(MINH, d.origH - dy));
        y = d.origY + (d.origH - h);
      }
      winSizeRef.current = { w, h };
      setWinSize({ w, h });
      winPosRef.current = { x, y };
      setWinPos({ x, y });
    }

    function onUp() {
      const d = dragRef.current;
      if (d) {
        try {
          localStorage.setItem(POS_KEY, JSON.stringify(winPosRef.current));
        } catch {}
        if (d.mode === "resize") {
          try {
            localStorage.setItem(SIZE_KEY, JSON.stringify(winSizeRef.current));
          } catch {}
          setExpanded(false);
        }
      }
      dragRef.current = null;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  // Reveal the LONG explanation → resizable window at the remembered size,
  // opening from the window's CURRENT position (clamped).
  function openLong() {
    const size = readJSON<{ w: number; h: number }>(SIZE_KEY) ?? defaultLongSize();
    const pos = clampPos(winPos.x, winPos.y, size.w, size.h);
    setWinSize(size);
    winSizeRef.current = size;
    setWinPos(pos);
    winPosRef.current = pos;
    setExpanded(false);
    setShowLong(true);
  }

  function startMove(event: ReactPointerEvent) {
    const rect = winRef.current?.getBoundingClientRect();
    dragRef.current = {
      mode: "move",
      startX: event.clientX,
      startY: event.clientY,
      origX: winPos.x,
      origY: winPos.y,
      origW: rect?.width ?? winSize.w,
      origH: rect?.height ?? winSize.h,
    };
  }

  // One handler for all 8 grips; the edge/corner is read from `data-dir` so it
  // can be referenced directly (avoids per-grip closures in render).
  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    event.preventDefault();
    dragRef.current = {
      mode: "resize",
      dir: event.currentTarget.dataset.dir || "se",
      startX: event.clientX,
      startY: event.clientY,
      origX: winPos.x,
      origY: winPos.y,
      origW: winSize.w,
      origH: winSize.h,
    };
  }

  // Expand / shrink preset (long mode). Keeps the window roughly where it is.
  function toggleWindowSize() {
    if (!expanded) {
      const w = Math.min(1100, window.innerWidth - 24);
      const h = Math.min(
        Math.round(window.innerHeight * 0.9),
        window.innerHeight - 24
      );
      setWinSize({ w, h });
      winSizeRef.current = { w, h };
      const pos = clampPos(winPos.x, winPos.y, w, h);
      setWinPos(pos);
      winPosRef.current = pos;
      setExpanded(true);
    } else {
      const size = readJSON<{ w: number; h: number }>(SIZE_KEY) ?? defaultLongSize();
      setWinSize(size);
      winSizeRef.current = size;
      const pos = clampPos(winPos.x, winPos.y, size.w, size.h);
      setWinPos(pos);
      winPosRef.current = pos;
      setExpanded(false);
    }
  }

  return (
    <div className={`fixed inset-0 z-50 ${dimmed ? "pointer-events-none" : "bg-black/50"}`}>
      {/* Movable always. Short = small, auto-height. Long = sized + resizable. */}
      <div
        ref={winRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          left: winPos.x,
          top: winPos.y,
          width: winSize.w,
          ...(showLong ? { height: winSize.h } : {}),
          ...(dimmed && !hovered ? { filter: "blur(2.5px)" } : {}),
        }}
        className={`pointer-events-auto absolute flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800 ${
          showLong ? "" : "max-h-[60vh]"
        }`}
      >
        {/* Resize handles — every edge + corner (long explanation only) */}
        {showLong &&
          (
            [
              ["n", "left-0 right-0 top-0 h-1.5 cursor-ns-resize"],
              ["s", "left-0 right-0 bottom-0 h-1.5 cursor-ns-resize"],
              ["e", "top-0 bottom-0 right-0 w-1.5 cursor-ew-resize"],
              ["w", "top-0 bottom-0 left-0 w-1.5 cursor-ew-resize"],
              ["nw", "top-0 left-0 h-3.5 w-3.5 cursor-nwse-resize"],
              ["ne", "top-0 right-0 h-3.5 w-3.5 cursor-nesw-resize"],
              ["sw", "bottom-0 left-0 h-3.5 w-3.5 cursor-nesw-resize"],
              ["se", "bottom-0 right-0 h-3.5 w-3.5 cursor-nwse-resize"],
            ] as const
          ).map(([dir, cls]) => (
            <div
              key={dir}
              data-dir={dir}
              onPointerDown={startResize}
              className={`absolute z-30 ${cls}`}
            />
          ))}

        {/* Header — drag handle */}
        <div
          onPointerDown={startMove}
          className="flex cursor-move select-none items-center justify-between border-b border-gray-200 p-5 dark:border-slate-700"
        >
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Explanation
          </h3>

          <div className="flex items-center gap-2">
            {/* Font-size slider for the explanation text */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 rounded-full border border-gray-300 px-2.5 py-1 dark:border-slate-600"
              title="Text size"
            >
              <span className="text-xs font-bold text-gray-500 dark:text-slate-400">
                A
              </span>
              <input
                type="range"
                min={12}
                max={28}
                step={1}
                value={fontSize}
                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                className="h-1 w-20 cursor-pointer accent-blue-600"
                aria-label="Explanation text size"
              />
              <span className="text-base font-bold text-gray-500 dark:text-slate-400">
                A
              </span>
            </div>

            {/* Expand / shrink — only for the long explanation, on the RIGHT */}
            {showLong && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={toggleWindowSize}
                title={expanded ? "Shrink window" : "Expand window"}
                aria-label={expanded ? "Shrink window" : "Expand window"}
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-gray-300 text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
              >
                {expanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            )}

            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onClose}
              className="cursor-pointer rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 active:scale-95"
            >
              Close
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">
          {question.media?.explanationImageUrl && (
            <img
              src={question.media.explanationImageUrl}
              alt="Explanation diagram"
              className="mb-4 max-h-80 rounded-2xl border border-gray-200 object-contain"
            />
          )}

          <p
            style={{ fontSize }}
            className="leading-relaxed text-gray-700 dark:text-slate-300"
          >
            {renderRich(question.explanation)}
          </p>

          {showLong && hasLong && (
            <div className="mt-5 border-t border-gray-200 pt-5 dark:border-slate-700">
              <h4 className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500">
                In depth
              </h4>
              <div
                style={{ fontSize }}
                className="space-y-3 leading-relaxed text-gray-700 dark:text-slate-300"
              >
                {(question.explanationLong || "")
                  .split(/\n{2,}/)
                  .map((para) => para.trim())
                  .filter(Boolean)
                  .map((para, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {renderRich(para)}
                    </p>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {(hasLong || (showLong && relatedQuestions.length > 0)) && (
          <div className="flex flex-wrap gap-2 border-t border-gray-200 p-4 dark:border-slate-700">
            {hasLong && !showLong && (
              <button
                onClick={openLong}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-700 active:scale-95"
              >
                Explain more ↓
              </button>
            )}
            {/* Related questions only surface after the long explanation is
                opened. Clicking opens them in a floating window on top of the
                (blurred) main card; this window stays open. */}
            {showLong && relatedQuestions.length > 0 && (
              <button
                onClick={() => onStartRelated(relatedQuestions)}
                className="rounded-2xl border border-gray-300 px-5 py-3 font-black text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
              >
                Related questions ({relatedQuestions.length})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
