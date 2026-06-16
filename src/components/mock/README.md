# Mock Test Module

A timed, MECEE-BL / CEE–style mock exam: rules → mode select → timed paper →
scored result. This file documents the whole module, whose files live in their
conventional homes across the codebase (UI here in `components/mock/`, routes in
`app/`, logic in `services/`, types in `types/`).

## File map

```
src/app/mock/page.tsx                       Student route (/mock) — phase orchestrator + resume
src/app/admin/mock-settings/page.tsx        Admin route (/admin/mock-settings)

src/components/mock/                         Student UI (this folder)
  mock-rules.tsx      Rules & official-format window (200 Q / 200 marks / 180 min + distribution)
  mock-setup.tsx      Mode select: past-year dropdown OR easy/medium/hard
  mock-exam.tsx       The runner: countdown, pause/resume/reset, navigation, palette, submit
  mock-palette.tsx    Question-number grid + section tabs (live: answered; review: correct/wrong/grey)
  mock-result.tsx     Score breakdown + timing meta + "Detailed report" button
  mock-meta.tsx       Reusable header: mode (year/difficulty), date, start/end, time taken, pauses
  mock-detailed-report.tsx  Modal: per-subject → per-topic breakdown + "Check your answers"
  mock-review.tsx     Read-only graded walkthrough (correct/wrong options + explanation window)
src/components/admin/mock-settings-form.tsx Admin config form (duration, marks, per-subject+topic)

src/types/mock.ts                           MockConfig, MockSelection, MockAttempt, MockResult, ...
src/services/mock-config-service.ts         Config get/save + defaults + OFFICIAL_* constants
src/services/mock-service.ts                buildMockQuestions, scoreMock, mockSections
src/services/mock-attempt-store.ts          Active-attempt persistence (pause/resume)
```

## Student flow (`app/mock/page.tsx`)

Phases: `loading → rules → setup → exam → result → review`.

1. **rules** — `MockRules` shows the official format + distribution + rules.
2. **setup** — `MockSetup` picks a `MockSelection`: `{ mode: "past_year", year }`
   or `{ mode: "difficulty", difficulty }`.
3. **exam** — `MockExam` runs the paper built by `buildMockQuestions`. A
   10-second grace window precedes the countdown; ←/→/Enter move questions, ↑/↓
   choose an option; pauses are counted on the attempt.
4. **result** — `MockResultView` shows `scoreMock` output + a **timing/mode
   header** (`MockMeta`) and a **Detailed report** button → `MockDetailedReport`
   (per-subject → per-topic correct/wrong/unanswered).
5. **review** — from the detailed report's **Check your answers**, `MockReview`
   replays each question read-only: correct option green, the student's wrong
   pick red, an **explanation window** per question, and a correctness-coloured
   palette (green/red/grey). Answers can't be changed.

On load, an in-progress attempt (from `getActiveAttempt`) is resumed straight
into **exam** (opened **paused**). The submitted attempt is kept in memory so
result + review can use its answers and timing.

## Paper assembly (`mock-service.buildMockQuestions`)

- **past_year**: every published question of the chosen year (and `repeatedYears`),
  grouped by subject. No quota enforcement — it's the real paper.
- **difficulty**: built to the admin distribution from `isMockEligible` published
  questions at the chosen difficulty:
  1. fill each subject's **per-topic** quotas (difficulty pool only),
  2. fill the rest of the **subject** quota from the difficulty pool.
  Difficulty papers are **pure** — there is no cross-difficulty top-up, so a
  "medium" paper contains only medium questions (it may be shorter than the
  quota if the bank is thin) and the "Practice · medium" label stays truthful.

## Scoring (`mock-service.scoreMock`)

`+markCorrect` per correct, `+markWrong` (negative) per wrong, `0` unanswered.
Returns net marks, max marks, attempted/correct/wrong/unanswered, a per-subject
breakdown, and **per-topic** sub-breakdowns inside each subject (for the
detailed report).

## Timing & persistence

- 180-min countdown in `MockExam`; **pause** stops the timer, **reset** starts a
  fresh attempt (component remounts via `key={attempt.id}`), **save & exit**
  leaves with progress saved, auto-submit at `0:00`.
- The single active attempt is persisted to `localStorage`
  (`eq_mock_attempt`) so it survives reloads. Guards prevent a submitted/reset
  attempt from being resurrected by the unmount save.

## Admin config (`/admin/mock-settings`)

Sets `durationMinutes`, `markCorrect`, `markWrong`, and the per-subject +
per-topic distribution. Defaults seed the official MECEE-BL counts
(Physics 50, Chemistry 50, Zoology 40, Botany 40, MAT 20 = 200).

## Known limitations / next steps

- **Config storage is per-browser** (`localStorage`, key `eq_mock_config`).
  To share across devices, add a Supabase `app_settings` table and swap the
  storage inside `mock-config-service` (callers don't change).
- A generated MAT section needs a **"Mental Agility Test (MAT)" subject** with
  mock-eligible questions in the bank.
- No server-side attempt history yet (results aren't persisted after exit).

See the project-wide changelog in `blueprint/BLUEPRINT.md` for dated entries.
