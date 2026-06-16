# `components/admin/mock-sets/` — Mock Sets admin UI

Components for `/admin/mock-sets` — building the named difficulty papers students
take under "By difficulty".

| Component | Purpose |
|---|---|
| `mock-set-builder.tsx` | Create/edit one set: name + difficulty, **auto-fill** from the difficulty distribution (`buildMockQuestions`), then add/remove individual questions (bank search), and Save (draft or published). Freezes an ordered list of question ids. |
| `mock-set-list.tsx` | Lists existing sets grouped by difficulty with publish / edit / delete. |

Store: `services/mock-set-store.ts` (Supabase `mock_sets`, localStorage fallback).
Types: `types/mock.ts` (`MockSet`). See `app/admin/mock-sets/README.md`.
