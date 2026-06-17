"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Drag behaviour for a mobile bottom sheet: grab the handle and drag UP to make
 * it taller, DOWN to shrink it, and drag down far enough to dismiss. Returns a
 * px `height` override (null = natural height) plus the ref + handle pointer-down
 * to wire up. Desktop doesn't use this.
 */
export function useSheetDrag(onClose: () => void) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startH: number } | null>(null);

  function onHandleDown(e: ReactPointerEvent) {
    drag.current = {
      startY: e.clientY,
      startH: sheetRef.current?.offsetHeight ?? 0,
    };
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = drag.current;
      if (!d) return;
      const dy = e.clientY - d.startY; // down = positive
      const max = Math.round(window.innerHeight * 0.92);
      // drag up (dy<0) grows; drag down (dy>0) shrinks
      setHeight(Math.min(max, Math.max(80, d.startH - dy)));
    }
    function onUp() {
      if (drag.current) {
        // Dragged down small enough → dismiss.
        if ((sheetRef.current?.offsetHeight ?? 999) < 140) onClose();
      }
      drag.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [onClose]);

  return { sheetRef, height, onHandleDown };
}
