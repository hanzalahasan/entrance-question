# `components/dashboard/` — user dashboard UI

Pieces of the `/dashboard` page (a signed-in user's home).

| Component | Purpose |
|---|---|
| `profile-card.tsx` | Photo + name + email, with inline name edit and photo upload (Supabase `avatars` bucket via `profile-service`). |
| `activity-stats.tsx` | Summary tiles from saved results: tests taken, average %, best %, questions answered, correct answers. |
| `results-history.tsx` | List of the user's mock tests — set/year + difficulty, date, score, a `MockScoreBar`, and a **View report** button (`selectionLabel` is exported for reuse). |

The page (`app/dashboard/page.tsx`) rebuilds each saved result into a
`MockAttempt` and reuses `MockDetailedReport` + `MockReview` to show the full
report and answer review. Data: `services/mock-result-store` + `profile-service`.
