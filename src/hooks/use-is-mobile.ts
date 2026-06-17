"use client";

import { useSyncExternalStore } from "react";

// True when the viewport is narrower than `breakpoint` (default 768px = Tailwind
// `md`). Uses useSyncExternalStore so it's SSR-safe (server snapshot = false, so
// desktop layout renders on the server) and doesn't trip the no-setState-in-
// effect rule. Re-renders on viewport changes.
export function useIsMobile(breakpoint = 768): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches,
    () => false
  );
}
