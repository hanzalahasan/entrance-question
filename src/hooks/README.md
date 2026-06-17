# `hooks/` — shared React hooks

| Hook | Purpose |
|---|---|
| `use-is-mobile.ts` (`useIsMobile`) | Returns `true` on small (phone) viewports via `matchMedia` + `useSyncExternalStore` (SSR-safe, no setState-in-effect). Used to swap desktop draggable windows for mobile bottom sheets in the practice/explanation flow. Default breakpoint 768px (Tailwind `md`). |
