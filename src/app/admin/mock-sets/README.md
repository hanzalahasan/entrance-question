# `/admin/mock-sets` — Mock Sets admin

Create the **named, fixed difficulty papers** ("Mock Sets") that students take
under **By difficulty**. A set is a frozen, ordered list of question ids tagged
with a difficulty — like a past-year paper, but identified by a set name, so
every student who takes "Medium Set 1" gets the **same** questions.

## Flow

1. **Name + difficulty**.
2. **Auto-fill** assembles a candidate paper from the admin distribution at that
   difficulty (`buildMockQuestions`), then you **add/remove** individual
   questions (search the bank). The list is what gets frozen.
3. **Create & publish** (or Save as draft). Only **published** sets appear to
   students.
4. Existing sets are grouped by difficulty with publish / edit / delete.

## Storage

Sets live in the shared Supabase table **`mock_sets`** (run
`supabase/mock-sets-setup.sql` once) so they're identical for every user. Without
Supabase it falls back to `localStorage` (per-browser only — not shared).

## Code

- Page: this file. Components: `components/admin/mock-sets/` (builder, list).
- Store: `services/mock-set-store.ts`. Resolve to questions:
  `services/mock-service.resolveSetQuestions`. Types: `types/mock.ts` (`MockSet`).
