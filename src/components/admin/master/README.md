# `components/admin/master/` — Master data management UI

Components for the **Master Settings** page (`/admin/settings`) — managing the
subject + topic taxonomy that every other feature (questions, mocks, generation)
depends on.

| Component | Purpose |
|---|---|
| `subjects-topics-manager.tsx` | One unified panel: add subjects, and **each subject is an accordion** that expands to show, add, and toggle its own topics. Replaces the old two-separate-cards layout. |

Data goes through `services/master-data-store` (→ `repository` → Supabase or
localStorage). The page (`src/app/admin/settings/page.tsx`) stays thin and just
renders this component.
