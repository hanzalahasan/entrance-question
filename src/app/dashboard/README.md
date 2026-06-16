# `/dashboard` — signed-in user home

Requires login (redirects to `/login?next=/dashboard` otherwise). Shows:

1. **Profile** (`ProfileCard`) — photo, name, email; edit name + upload photo.
2. **Activity** (`ActivityStats`) — tests taken, average/best %, questions
   answered, correct answers.
3. **Your mock tests** (`ResultsHistory`) — every submitted mock with score + a
   correct/wrong/unanswered bar, and **View report**.

**View report** rebuilds the saved record into a `MockAttempt`, resolves its
questions from the bank, runs `scoreMock`, and reuses `MockDetailedReport`
(per-subject/topic bars) → **Check your answers** opens `MockReview` (graded,
read-only walkthrough). So no report/review code is duplicated.

Data: `services/mock-result-store` (saved on mock submit, keyed by `user_id`) and
`services/profile-service`. Needs `supabase/auth-setup.sql`.
