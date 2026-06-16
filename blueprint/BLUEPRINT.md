# Entrance Question — Full Build Blueprint

> **Purpose of this file:** This is a complete, self-contained specification of the
> **Entrance Question** web application. Hand this single file to any AI coding agent and it
> should be able to rebuild the entire app from scratch, exactly as it exists today — same
> stack, same data model, same features, same UI behavior.
>
> **This file is the single source of truth.** It lives in the project at `/blueprint`. Every
> time a feature is added or changed in the app, this file is updated to match — automatically,
> without being asked.
>
> **Last synced with codebase:** 2026-06-16 (Mock Test module)

---

## Table of Contents

1. [What the app is](#1-what-the-app-is)
2. [Tech stack](#2-tech-stack)
3. [Project setup from zero](#3-project-setup-from-zero)
4. [Configuration files](#4-configuration-files)
5. [Environment variables](#5-environment-variables)
6. [Directory structure](#6-directory-structure)
7. [Data model (types)](#7-data-model-types)
8. [Data layer & persistence](#8-data-layer--persistence)
9. [Database schema (Supabase)](#9-database-schema-supabase)
10. [Services layer](#10-services-layer)
11. [Public app (student-facing)](#11-public-app-student-facing)
12. [Admin app](#12-admin-app)
13. [API routes](#13-api-routes)
14. [Auth & middleware](#14-auth--middleware)
15. [Business rules & logic](#15-business-rules--logic)
16. [UI/design conventions](#16-uidesign-conventions)
17. [Build & deploy](#17-build--deploy)
18. [Changelog](#18-changelog)

---

## 1. What the app is

**Entrance Question** is a Next.js web app for practicing multiple-choice entrance-exam questions
(e.g. medical/engineering entrance prep — Physics, Chemistry, Botany, Zoology, Mathematics). It has
two surfaces:

- **Public app (`/`)** — a student-facing flashcard-style practice interface. Students filter
  questions by subject/year/topic, get a random unseen question, pick an answer, get instant
  correct/wrong feedback, can reveal the answer, and read an explanation. Only `published`
  questions are shown.
- **Admin app (`/admin/*`)** — a full question-management back office. Admins add questions
  manually, bulk-import from Excel/CSV, extract questions from PDF/photo using AI (OpenAI vision),
  auto-fill missing fields with AI, manage subjects/topics (master data), detect duplicates, and
  publish/unpublish questions.

The app is intentionally built so the **data backend is swappable**: it ships working out of the box
on browser `localStorage` (with seed sample data), and is designed to move to **Supabase PostgreSQL**
by changing one file.

---

## 2. Tech stack

| Concern | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | `16.2.6` |
| Runtime | React | `19.2.4` |
| Language | TypeScript | `^5` (strict) |
| Styling | Tailwind CSS | `^4` (via `@tailwindcss/postcss`) |
| UI primitives | shadcn/ui (configured, **hand-rolled in practice**) | new-york style, neutral base |
| Icons | lucide-react | `^1.17.0` |
| Class utils | clsx + tailwind-merge | `^2.1.1` / `^3.6.0`, `class-variance-authority ^0.7.1` |
| Spreadsheet parsing | xlsx (SheetJS) | `^0.18.5` |
| PDF text extraction | pdf-parse | `^2.4.5` (dynamic import) |
| AI | openai (Node SDK) | `^6.39.1` |
| DB (target) | @supabase/supabase-js + @supabase/ssr | `^2.106.2` / `^0.10.3` |
| E2E tooling (dev) | playwright | `^1.60.0` |
| Linting | eslint + eslint-config-next | `^9` / `16.2.6` |
| Fonts | Geist + Geist Mono (`next/font/google`) | — |

**Node**: `@types/node ^20`. **Package manager**: npm (lockfile is `package-lock.json`).

---

## 3. Project setup from zero

```bash
# 1. Scaffold (or recreate package.json exactly as in section 4)
npx create-next-app@latest entrance-question --typescript --tailwind --app --src-dir --import-alias "@/*"

cd entrance-question

# 2. Install runtime deps
npm install @supabase/ssr @supabase/supabase-js class-variance-authority clsx \
  lucide-react openai pdf-parse tailwind-merge xlsx

# 3. Install dev deps
npm install -D @types/pdf-parse playwright

# 4. Initialize shadcn/ui infra (creates components.json, lib/utils, CSS vars)
npx shadcn@latest init   # style: new-york, base color: neutral, CSS variables: yes

# 5. Copy env template and fill in
cp .env.local.example .env.local

# 6. Run
npm run dev   # http://localhost:3000  (admin at /admin)
```

Scripts (`package.json`):

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  }
}
```

---

## 4. Configuration files

### `package.json`
```json
{
  "name": "entrance-question",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@supabase/ssr": "^0.10.3",
    "@supabase/supabase-js": "^2.106.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^1.17.0",
    "next": "16.2.6",
    "openai": "^6.39.1",
    "pdf-parse": "^2.4.5",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "tailwind-merge": "^3.6.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/pdf-parse": "^1.1.5",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.6",
    "playwright": "^1.60.0",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### `next.config.ts`
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  /* config options here */
};
export default nextConfig;
```

### `tsconfig.json`
Key bits: `strict: true`, `moduleResolution: "bundler"`, path alias `"@/*": ["./src/*"]`,
`jsx: "react-jsx"`, target `ES2017`, `allowJs: true`.

### `postcss.config.mjs`
```js
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

### `eslint.config.mjs`
Flat config: spreads `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`,
ignores `.next/**`, `out/**`, `build/**`, `next-env.d.ts`.

### `components.json` (shadcn/ui)
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": { "config": "", "css": "src/app/globals.css", "baseColor": "neutral", "cssVariables": true, "prefix": "" },
  "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" },
  "iconLibrary": "lucide"
}
```

### `src/app/globals.css`
- `@import "tailwindcss";`
- `@custom-variant dark (&:where(.dark, .dark *));` — makes `dark:` utilities respond to a `.dark`
  class on `<html>` (toggle-driven) instead of the OS `prefers-color-scheme`.
- Defines `:root` light tokens and a **`.dark`** block (class-based, not a media query) with full
  shadcn/ui semantic tokens (`--card`, `--popover`, `--primary`, `--muted`, `--accent`,
  `--destructive`, `--border`, `--input`, `--ring`, `--sidebar*`) using `oklch()` values.
  Dark `--background` is `#0f172a` (slate-900, softer than pure black). `--radius: 0.625rem`.
- `@theme inline { ... }` maps the CSS vars to Tailwind v4 color/font/radius tokens
  (`--color-*`, `--font-sans: var(--font-geist-sans)`, `--font-mono`, radius scale sm/md/lg/xl).
- Base: `body { background; color; font-family: Arial, Helvetica, sans-serif; }` and
  `@layer base { * { border-color: var(--border); } }`.

### `.gitignore`
Standard Next.js ignores: `/node_modules`, `/.next/`, `/out/`, `/build`, `.DS_Store`, `*.pem`,
`.env*`, `.vercel`, `*.tsbuildinfo`, `next-env.d.ts`.

---

## 5. Environment variables

`.env.local.example` (copy to `.env.local`):

```bash
# ── OpenAI ───────────────────────────────────────────────────────────
# Required for AI auto-fill in Import (subject, topic, answer, explanation)
# and for PDF/Photo question extraction.
OPENAI_API_KEY=sk-...

# ── Admin password (optional) ────────────────────────────────────────
# Set this to protect /admin routes. Leave unset for open access.
ADMIN_PASSWORD=your-secret-password

# ── Supabase (optional) ──────────────────────────────────────────────
# Connect a real database when ready to move off localStorage.
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Behavior when unset:**
- No `OPENAI_API_KEY` → AI endpoints return `503` with a clear message; AI features degrade.
- No `ADMIN_PASSWORD` → `/admin` is open (dev/demo mode); login sets cookie value `"open"`.
- No / placeholder `NEXT_PUBLIC_SUPABASE_URL` → app uses `localStorage` + seed sample data.

---

## 6. Directory structure

```
src/
├── app/
│   ├── globals.css                         # Tailwind v4 + shadcn tokens
│   ├── layout.tsx                          # Root layout (Geist fonts, <html>/<body>)
│   ├── page.tsx                            # PUBLIC home — practice interface
│   ├── favicon.ico
│   ├── admin/
│   │   ├── page.tsx                        # Dashboard (stat cards)
│   │   ├── login/page.tsx                  # Password login (Suspense-wrapped)
│   │   ├── add-question/page.tsx           # Create new question
│   │   ├── questions/page.tsx              # Question list/management
│   │   ├── questions/[id]/page.tsx         # Edit / review one question
│   │   ├── import/page.tsx                 # Excel/CSV + PDF/Photo import (AI)
│   │   └── settings/page.tsx               # Master data: subjects & topics
│   └── api/admin/
│       ├── login/route.ts                  # POST — set admin cookie
│       ├── ai-fill/route.ts                # POST — fill missing fields via OpenAI
│       └── extract-questions/route.ts      # POST — extract MCQs from PDF/image via OpenAI
├── components/
│   ├── admin/
│   │   ├── admin-layout.tsx                # Sidebar + titled content shell
│   │   ├── admin-sidebar.tsx               # Nav menu
│   │   └── questions/
│   │       ├── question-form.tsx           # Shared add/edit form
│   │       ├── question-table.tsx          # List table
│   │       ├── question-toolbar.tsx        # Search + Add button
│   │       ├── question-filters.tsx        # Subject/Year/Difficulty selects
│   │       ├── question-bulk-actions.tsx   # Bulk publish/unpublish bar
│   │       └── question-pagination.tsx     # Prev/Next pager
│   ├── layout/
│   │   └── top-filter-bar.tsx              # Public subject/year/topic filter UI
│   ├── question/
│   │   ├── question-card.tsx               # Public flashcard (answer flow + keyboard nav)
│   │   └── question-option.tsx             # Single option button (supports highlight ring)
│   ├── theme-toggle.tsx                    # Working light/dark switch
│   └── ui/
│       └── confirm-dialog.tsx              # Modal confirm
├── lib/
│   ├── repository.ts                       # ★ Backend abstraction (localStorage now)
│   ├── master-data.ts                      # Seed subjects + topics
│   ├── sample-questions.ts                 # Seed questions
│   ├── question-validation.ts             # validateQuestion()
│   └── utils.ts                            # cn() helper
├── services/
│   ├── admin-question-store.ts             # Question CRUD facade → repository
│   ├── master-data-store.ts                # Subject/topic facade → repository
│   ├── question-service.ts                 # Public filtering + random/seen logic
│   ├── duplicate-question-service.ts       # Duplicate/conflict detection
│   └── recheck-duplicate-service.ts        # Bulk duplicate recompute
├── types/
│   ├── question.ts                         # Question + all enums
│   ├── master.ts                           # SubjectMaster, TopicMaster
│   └── filter.ts                           # QuestionFilters
└── middleware.ts                           # Admin auth gate

supabase/
└── schema.sql                              # Postgres schema + seeds + RLS
```

---

## 7. Data model (types)

### `src/types/question.ts`
```ts
export type DifficultyLevel = "easy" | "medium" | "hard";
export type QuestionSource = "past_year" | "practice";
export type QuestionStatus = "published" | "draft" | "unpublished";
export type OptionContentType = "text" | "image" | "text_image";

export type QuestionOptionType = {
  key: string;            // "A" | "B" | "C" | "D"
  value?: string;         // text content
  imageUrl?: string;      // image content (URL or base64 data URL)
  type: OptionContentType;
};

export type QuestionMedia = {
  questionImageUrl?: string;
  explanationImageUrl?: string;
};

export type DuplicateCheckStatus =
  | "not_checked" | "unique" | "possible_duplicate" | "duplicate";

export type AiReviewStatus =
  | "not_checked" | "suggested" | "reviewed" | "approved";

export type ImportSourceType =
  | "manual" | "excel" | "pdf" | "ai_generated";

export type Question = {
  id: number;
  uuid: string;

  question: string;
  options: QuestionOptionType[];
  answer: string;                  // the correct option key, e.g. "B"
  explanation: string;             // short explanation (always shown)
  explanationLong?: string;        // deep "Explain more" content (Phase 2: AI from books)
  concepts?: string[];             // concept tags → power related questions
  relatedQuestionIds?: number[];   // Phase 2 pre-computed; else computed live by concept/topic

  subjectId: number;
  topicId: number;
  subjectName?: string;            // denormalized for display/filtering
  topicName?: string;

  year?: string;                   // e.g. "2024"; absent = practice
  repeatedYears: string[];         // years this same question appeared in
  repeatCount: number;             // = repeatedYears.length (min 1)

  source: QuestionSource;          // derived: year ? "past_year" : "practice"
  importSource: ImportSourceType;

  difficulty: DifficultyLevel;
  status: QuestionStatus;

  media?: QuestionMedia;

  aiTags: string[];
  aiReviewStatus: AiReviewStatus;

  duplicateCheckStatus: DuplicateCheckStatus;
  possibleDuplicateIds: number[];

  isMockEligible: boolean;

  createdBy?: string;
  reviewedBy?: string;

  createdAt: string;               // ISO string
  updatedAt: string;               // ISO string
};
```

### `src/types/master.ts`
```ts
export type MasterStatus = "active" | "inactive";

export type SubjectMaster = {
  id: number;
  name: string;
  slug: string;
  status: MasterStatus;
  displayOrder: number;
};

export type TopicMaster = {
  id: number;
  subjectId: number;     // FK → SubjectMaster.id
  name: string;
  slug: string;
  status: MasterStatus;
  displayOrder: number;
};
```

### `src/types/filter.ts`
```ts
export type QuestionFilters = {
  subjects: string[];    // by subject NAME
  years: string[];       // by year string
  topics: string[];      // by topic NAME
};
```

---

## 8. Data layer & persistence

**Backend selection is automatic.** `src/lib/supabase.ts` exports `isSupabaseConfigured` (true when
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set and not placeholders) and a
`supabase` client (or `null`). `src/lib/repository.ts` exports `questionRepo`/`masterRepo` that are
the **Supabase** implementations when configured (shared PostgreSQL — admin-added/imported questions
reach every student on every device) and the **localStorage** implementations otherwise (per-browser
seed data, zero setup). Both implement the same interfaces, so nothing else in the app changes.

The Supabase repo maps snake_case columns ⇄ camelCase fields; `insert`/`replaceAll` use
`upsert(..., { onConflict: "id" })` (non-destructive — never deletes other rows), preserving the
app's existing client-generated-id model. `getAll` orders by `created_at desc`.

**Core abstraction: `src/lib/repository.ts`.** This is the one file that decides the backend.
It exports two interfaces with BOTH a `localStorage` and a Supabase implementation, then exports the
active instances chosen by `isSupabaseConfigured`:

```ts
export interface QuestionRepo {
  getAll(): Promise<Question[]>;
  getById(id: number): Promise<Question | null>;
  insert(q: Question): Promise<Question>;
  update(q: Question): Promise<void>;
  patchStatus(id: number, status: Question["status"]): Promise<void>;
  bulkPatchStatus(ids: number[], status: Question["status"]): Promise<void>;
  remove(id: number): Promise<void>;
  bulkRemove(ids: number[]): Promise<void>;
  replaceAll(questions: Question[]): Promise<void>;
}

export interface MasterRepo {
  getSubjects(): Promise<SubjectMaster[]>;
  getTopics(): Promise<TopicMaster[]>;
  insertSubject(s: Omit<SubjectMaster, "id">): Promise<SubjectMaster>;
  insertTopic(t: Omit<TopicMaster, "id">): Promise<TopicMaster>;
  patchSubjectStatus(id: number, status: SubjectMaster["status"]): Promise<void>;
  patchTopicStatus(id: number, status: TopicMaster["status"]): Promise<void>;
}

export const questionRepo: QuestionRepo = localQuestionRepo;
export const masterRepo: MasterRepo = localMasterRepo;
```

**localStorage keys:**
- `admin_questions` → `Question[]` (falls back to `sampleQuestions` seed)
- `master_subjects` → `SubjectMaster[]` (falls back to `subjectsMaster` seed)
- `master_topics` → `TopicMaster[]` (falls back to `topicsMaster` seed)
- `seen_random_question_ids` → `number[]` (public app, tracks shown questions)

**Read helper behavior:** `read(key, fallback)` returns `fallback` on SSR (`window` undefined);
on first read with no stored value it writes the fallback to storage then returns it; JSON parse
errors return the fallback. All repo methods are `async` (return Promises) so the Supabase swap
is drop-in. New IDs for subjects/topics use `Date.now()`. New question IDs use `Date.now()`
(+ row index for bulk import) and `crypto.randomUUID()` for `uuid`.

**To migrate to Supabase:** implement `QuestionRepo`/`MasterRepo` against
`@supabase/supabase-js`, mapping snake_case columns ↔ camelCase fields, and reassign
`questionRepo`/`masterRepo` exports. Activate only when `NEXT_PUBLIC_SUPABASE_URL` is a real
(non-placeholder) value; otherwise keep localStorage.

### Seed data
- `src/lib/master-data.ts` — 5 subjects: Physics(1), Chemistry(2), Botany(3), Zoology(4),
  Mathematics(5). 7 topics: Mechanics(1,→1), Electricity(2,→1), Atomic Structure(3,→2),
  Bonding(4,→2), Photosynthesis(5,→3), Cell Biology(6,→4), Algebra(7,→5). All `active`.
- `src/lib/sample-questions.ts` — 3 published sample questions (Physics/Force,
  Chemistry/Proton, Zoology/Mitochondria) fully populated with all `Question` fields.

---

### Live Supabase connection (as of 2026-06-08)
A real Supabase project **is connected** and the production site uses it:
- Org: "Hasan's Org" (`pnfmikyxlehkbqnwoekp`). Project: **entrance-question**
  (ref `isohkebvmuskaorcjawg`, region `eu-central-1`). URL: `https://isohkebvmuskaorcjawg.supabase.co`.
- `schema.sql` has been run (5 subjects, 7 topics seeded; questions start empty).
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel (production/preview/
  development) and in local `.env.local` (gitignored). The anon key is the public client key.
- Verified end-to-end: a question published in admin appears in student view across devices, and
  admin status changes write back to the DB.
- **Security caveat:** the schema's RLS policies are fully permissive (`FOR ALL USING (true)`), so
  the public anon key can read/write everything. Functional for now (admin is password-gated at the
  app layer), but should be tightened before real production (move writes server-side with the
  service-role key + real admin auth, and restrict the write policies).

## 9. Database schema (Supabase)

`supabase/schema.sql` — run in the Supabase SQL editor. Tables:

- **`subjects`**: `id serial PK`, `name text`, `slug text unique`, `status text default 'active'
  CHECK in (active,inactive)`, `display_order int default 0`.
- **`topics`**: `id serial PK`, `subject_id int FK→subjects ON DELETE CASCADE`, `name`, `slug
  unique`, `status`, `display_order`.
- **`questions`**: `id bigserial PK`, `uuid text unique default gen_random_uuid()::text`,
  `question text`, `options jsonb default '[]'`, `answer text`, `explanation text default ''`,
  `subject_id int FK→subjects`, `topic_id int FK→topics`, `subject_name text`, `topic_name text`,
  `year text`, `repeated_years text[] default '{}'`, `repeat_count int default 1`,
  `source text default 'practice' CHECK in (past_year,practice)`,
  `import_source text default 'manual' CHECK in (manual,excel,pdf,ai_generated)`,
  `difficulty text default 'medium' CHECK in (easy,medium,hard)`,
  `status text default 'draft' CHECK in (published,draft,unpublished)`,
  `media jsonb`, `ai_tags text[] default '{}'`, `ai_review_status text default 'not_checked'`,
  `duplicate_check_status text default 'not_checked'`, `possible_duplicate_ids bigint[] default '{}'`,
  `is_mock_eligible boolean default true`, `created_by text`, `reviewed_by text`,
  `created_at timestamptz default now()`, `updated_at timestamptz default now()`.

**Trigger:** `set_updated_at()` BEFORE UPDATE on `questions` sets `updated_at = now()`.

**RLS:** enabled on all three tables. Policies: public `SELECT` on subjects, topics, and
`questions WHERE status = 'published'`; permissive `FOR ALL USING (true)` "service write"
policies on all three (lock these down per real auth before production).

**Seeds:** same 5 subjects + 7 topics as the localStorage seed.

---

## 10. Services layer

Thin facades over `repository.ts` so pages never import the repo directly.

### `src/services/admin-question-store.ts`
```
getStoredQuestions()            → questionRepo.getAll()
getStoredQuestionById(id)       → questionRepo.getById(id)
saveQuestion(q)                 → questionRepo.insert(q)
updateQuestion(q)               → questionRepo.update(q)
publishQuestion(id)             → questionRepo.patchStatus(id, "published")
unpublishQuestion(id)           → questionRepo.patchStatus(id, "unpublished")
bulkUpdateQuestionStatus(ids,s) → questionRepo.bulkPatchStatus(ids, s)
saveQuestions(qs)               → questionRepo.replaceAll(qs)
```

### `src/services/master-data-store.ts`
```
getStoredSubjects() / getStoredTopics()
saveSubject(s) / saveTopic(t)
toggleSubjectStatus(id, current) → flips active⇄inactive
toggleTopicStatus(id, current)   → flips active⇄inactive
```

### `src/services/question-service.ts` (public)
- `SEEN_QUESTIONS_KEY = "seen_random_question_ids"`.
- `filterQuestions(questions, filters)` — matches by `subjectName`, `year`, `topicName`; an empty
  filter array means "match all" for that dimension. AND across dimensions.
- `getSeenQuestionIds()` / `saveSeenQuestionId(id)` — localStorage-backed seen set.
- `getRandomQuestionId(questions, excludeId?)` — picks a random id not in seen set and ≠ excludeId.
  When none remain, **clears the seen set** and retries (excluding only excludeId). Returns `null`
  if still none.

### `src/services/duplicate-question-service.ts`
Text normalization: lowercase → trim → strip non-`\w\s` → collapse whitespace.
- `findExactDuplicateQuestions(new, existing)` — same normalized text **AND** same subjectId,
  topicId, year. (excludes self by id)
- `findClassificationConflicts(new, existing)` — same normalized text but **different** subjectId
  or topicId (i.e. the same question filed under a different subject/topic).
- `findRepeatedYearQuestions(new, existing)` — same text + same subject + same topic but a
  **different** (both non-empty) year → these become the question's `repeatedYears`.

### `src/services/recheck-duplicate-service.ts`
- `recheckAllDuplicates(questions): Question[]` — groups by key `normalizedText__subjectId__topicId`,
  then for each question: collects `repeatedYears` (distinct non-empty years in the group),
  sets `repeatCount = repeatedYears.length`, and flags `duplicate_check_status` =
  `possible_duplicate` if another question in the group shares the **same year** (with that id list
  in `possibleDuplicateIds`), else `unique`. Bumps `updatedAt`.

---

## 11. Public app (student-facing)

### `src/app/layout.tsx` (root)
- Loads Geist + Geist Mono via `next/font/google` as CSS vars `--font-geist-sans` / `--font-geist-mono`.
- `<html lang="en" suppressHydrationWarning className="...variables h-full antialiased">`,
  `<body className="min-h-full flex flex-col">`.
- `metadata`: title "Entrance Question", description "Practice entrance-exam multiple-choice questions.".
- **Theme init script** — a blocking inline `<script>` in `<head>` that, before paint, reads
  `localStorage.theme` (falling back to `prefers-color-scheme`) and toggles the `dark` class on
  `<html>`. Prevents a flash of the wrong theme. `suppressHydrationWarning` covers the class diff.

### `src/app/page.tsx` — `HomePage` (Client Component)
- Loads all questions via `getStoredQuestions()` in `useEffect`, keeps only `status === "published"`.
- Holds `filters` state (`QuestionFilters`), default all-empty.
- Renders header ("Entrance Question" + a working `<ThemeToggle>` and a placeholder "👤 Sign in"
  button), `<TopFilterBar>`, and a centered `<QuestionCard>` fed the **filtered** published questions.
- `filterQuestions()` applies the active filters.

### `src/components/theme-toggle.tsx` — `ThemeToggle`
- Working light/dark switch. Reads current state via `useSyncExternalStore` watching the `dark`
  class on `<html>` with a `MutationObserver` (SSR snapshot = light). Clicking toggles the class
  and writes `localStorage.theme` = `"dark"|"light"`. Shows 🌙 in light mode, ☀️ in dark mode.
- Dark mode is **class-based** (`.dark` on `<html>`), not OS-driven — see globals.css
  `@custom-variant dark`. Initial theme is applied pre-paint by the layout's theme init script.

### `src/components/layout/top-filter-bar.tsx` — `TopFilterBar`
- Reads subjects/topics directly from `master-data.ts` seeds (active, sorted by `displayOrder`).
- `years` = 17 entries, `2026` down to `2010` (`2026 - i`, i=0..16).
- **Subject dropdown** (multi-select checkboxes, "All Subject" option, "Clear all" when >1).
  Mathematics is displayed as **"Mats"** via `labelSubject()`.
- **Year dropdown** — searchable (filter by substring), multi-select.
- **Mock Test** button — present but non-functional placeholder ("Mock").
- **More Filters** modal — three columns (Years / Subjects / Topics). Topics only show once at
  least one subject is selected (`getTopicsBySubjects`), derived from selected subjects' topics.
- Selecting/clearing subjects **resets topics** (`topics: []`).
- Filter count badge on More Filters; a red "×" clears all filters.
- Click-outside closes the subject & year dropdowns (mousedown listener on refs).
- Shows "Total Questions: N"; warns (orange) when filters active and `0 < total < 15`:
  "Only N questions found. Please remove some filters…".

### `src/components/question/question-card.tsx` — `QuestionCard`
Flashcard practice flow over the filtered list:
- On `questions` change: pick `getRandomQuestionId`, reset state, mark seen.
- State: `currentQuestionId`, `previousQuestionId`, `hasUsedPrevious`, `selectedAnswer`,
  `showAnswer`, `showExplanation`.
- Empty list → "No questions found. Please remove filters…". Missing current → "Loading question…".
- Header chips: subject (blue), topic (purple), and year(s) green chips. If `repeatCount > 1`
  shows each `repeatedYears` chip; else shows single "Year: YYYY".
- Optional question image (`media.questionImageUrl`).
- Options via `<QuestionOption>`. Answer logic:
  - Pick option → `selectedAnswer`. Correct (`= answer`) locks the card. Wrong shows ❌ and a
    **Reveal** button; revealing shows the correct option and an **Explanation** button.
  - Correct → shows ✅ and an **Explanation** button.
  - `isLocked = isCorrect || showAnswer` disables further option clicks.
- Footer: **Previous** (only once, only if a previous exists & unused), center action button
  (Explanation/Reveal depending on state), **Next** (random next, marks seen, stores previous).
- Explanation modal (Phase 1 — multi-panel, grows + scrolls):
  - **Explanation panel:** short `explanation` (+ optional image). An **"Explain more ↓"** button
    (shown only when `explanationLong` is non-empty) reveals the long explanation in a scrollable
    "In depth" section; the modal widens to `max-w-3xl`.
  - The long explanation is split on blank lines (`\n{2,}`) into spaced paragraphs (the AI is
    prompted to return 3–5 short paragraphs with examples).
  - The modal is a **movable floating window** (`winPos`/`winSize`, drag the header via `startMove`).
    Two modes: **short** = small auto-height, movable only (no expand/resize); **long** (after
    "Explain more" → `openLong`) = opens compact+scrollable (~55vh), gains the expand/shrink preset
    icon (header right, `toggleWindowSize`) and is **resizable from every edge + corner** (8 handles
    → `startResize(dir)`). The resized size AND position are remembered (`savedSizeRef`/`savedPosRef` +
    `localStorage` `eq_expl_size`/`eq_expl_pos`) and reused on every later open until changed. The
    short window defaults to a lower position so the question stays visible, and **Explain more
    opens from the window's current position** (clamped) rather than recentring.
  - **"Related questions (n)"** button → appears **only after the long explanation is opened**
    (`showLong`); switches to the **related panel**: a list of 5–10 questions sharing this
    question's concept/topic (via `related-question-service`), each clickable.
  - Clicking a related question (`goToRelatedQuestion`) closes the modal and loads that question
    into the card — even if it's outside the active filter (the card resolves the current question
    from the `pool` prop = all published questions). "Next" afterward resumes normal random practice.
  - "← Back to explanation" returns to the explanation panel; Close/Escape/Enter exits.

### `src/services/related-question-service.ts`
`getRelatedQuestions(current, pool, max=10)` — if `current.relatedQuestionIds` is set (Phase 2),
returns those; else scores every other published question by shared concept tags (dominant) + same
topic + same subject, sorts, and returns the top `max`. Phase 1 = no ML; Phase 2 swaps in embeddings.
- **Keyboard navigation** (global `keydown` listener, bound once via a ref that always calls the
  latest closure; ignores events when focus is in an input/textarea/select):
  - **↑ / ↓** — move the option highlight (`highlightedIndex`, clamped 0..n-1). Mouse hover and
    the arrow keys share this **one** highlight state: hovering an option sets `highlightedIndex`
    (`onMouseEnter`), so pressing arrows afterward continues from the hovered option. There is no
    separate `hover:` background — only ever one option looks active.
  - The highlighted option (while unanswered) shows: light mode → `bg-blue-50` + blue border/ring;
    dark mode → `bg-slate-700` (clearly lighter than the slate-900 option / slate-800 card) + white
    text + blue border/ring, so it stays readable in dark mode.
  - **← / →** — previous / next question.
  - **Enter** — steps through the answer flow. **Correct answer:** select → next question.
    **Wrong answer:** (1) select → shows wrong, (2) reveal the correct answer, (3) open the
    explanation, (4) close the explanation, (5) next question. The flow tracks `explanationSeen`
    (reset per question; also set when the on-screen Explanation button is used) to know that an
    Enter after the explanation was closed should advance rather than re-open it.
  - **Escape** — close the explanation modal (Enter also closes it while open; other keys are
    ignored while it's open).
  - Highlight resets to index 0 on every question change. Clicking an option also syncs the highlight.
- **Nav button feedback:** Previous/Next have hover + `active:scale-95` (mouse) states, plus a brief
  `navPulse` "pressed" flash (`scale-95` + tint, ~180ms) that fires from *both* clicks and the
  ←/→ arrow keys — so keyboard navigation visibly registers on the button. The center action
  buttons (Explanation/Reveal) also have hover + `active:scale-95`.

### `src/components/question/question-option.tsx` — `QuestionOption`
- Props: `optionKey, value, imageUrl, type, status("default"|"correct"|"wrong"), disabled, onClick`.
- Colors: correct=green, wrong=red, default=white w/ blue hover.
- Renders text for `text`/`text_image`, image for `image`/`text_image`. Key shown in a round badge.

---

## 12. Admin app

All admin pages are Client Components wrapped in `<AdminLayout title description>`, which renders
`<AdminSidebar>` + a titled content area (`max-w-7xl`).

### `src/components/admin/admin-sidebar.tsx`
Fixed left nav (hidden below `lg`). Menu items (active state via `usePathname`):
`Dashboard /admin` · `Question Management /admin/questions` · `Add Question /admin/add-question` ·
`Excel Import /admin/import` · `Settings /admin/settings`. Brand: "Entrance Admin" /
"Question Management System". `/admin` matches exactly; others match by `startsWith`.

### `/admin` — Dashboard (`src/app/admin/page.tsx`)
Loads all questions, computes 4 stat cards: **Total**, **Published**, **Draft**, **Unpublished**.
Each card is a **clickable `<Link>`** into Question Management filtered to that status
(`/admin/questions?status=draft` etc.), so e.g. clicking "Draft" lands directly on the drafts.
Shows "—" until loaded. Below: a dashed placeholder "Dashboard Activity" panel.

### `/admin/login` (`src/app/admin/login/page.tsx`)
Password form (`<Suspense>`-wrapped because it reads `useSearchParams` for `?from=`). POSTs to
`/api/admin/login`; on success routes to `from` (default `/admin`); 401 → "Incorrect password.".

### `/admin/add-question` (`src/app/admin/add-question/page.tsx`)
- `createEmptyQuestion()` seeds a blank `Question` (4 text options A–D, `status: "draft"`,
  `importSource: "manual"`, etc., `id: Date.now()`, `uuid: crypto.randomUUID()`).
- Renders shared `<QuestionForm>` with `onSaveDraft → saveAs("draft")`, `onPublish → saveAs("published")`,
  publish label "Publish Question".
- `saveAs(status)`:
  1. `validateQuestion()` — block on first error.
  2. `findClassificationConflicts` → if any, error: "This question exists under {Subject} → {Topic}. Edit that instead."
  3. `findExactDuplicateQuestions` → if any, error: "This exact question already exists for the same subject, topic, and year."
  4. Compute `repeatedYears` (union of `findRepeatedYearQuestions` years + this year).
  5. `saveQuestion({...status, source: year?past_year:practice, repeatedYears, repeatCount, duplicateCheckStatus:"unique", possibleDuplicateIds:[]})`.
  6. Reload all, `saveQuestions(recheckAllDuplicates(all))`, route to `/admin/questions`.

### `/admin/questions` (`src/app/admin/questions/page.tsx`)
Question management list. The content is in `QuestionManagementContent`, wrapped in a `<Suspense>`
boundary by the default export (required because it reads `useSearchParams`).
- `normalizeStatus()` maps any legacy `"archived"` → `"unpublished"`.
- **Status pills:** All / Published / Draft / Unpublished, each with a live count; the active one
  filters the list (`statusFilter`). Seeds from the `?status=` query param (dashboard cards link to
  e.g. `?status=draft`). `QUESTIONS_PER_PAGE = 10`.
- **Filters:** search (question text contains), subject, year, difficulty (selects populated from
  data). Changing any resets to page 1 and clears selection.
- **`<QuestionTable>`**: checkbox select (per-row + select-all-on-page), columns Question / **Status**
  (Published=green / Draft=yellow / Unpublished=grey badge) / Subject / Topic / Year / Difficulty /
  Duplicate (color-coded badge) / Action. Action = "Edit / Review" link + a **status-based** button
  (Published→"Unpublish", else "Publish") + a **"Delete"** button (red). Delete goes through
  `<ConfirmDialog>`.
- **`<QuestionBulkActions>`**: appears when selection > 0; offers **Bulk Publish**, **Bulk
  Unpublish**, and **Bulk Delete** (with confirm) + clear selection.
- Unpublish (single or bulk) goes through `<ConfirmDialog>`. Publish is immediate.
- **"Recheck Duplicates"** button → `recheckAllDuplicates(all)` then persist.
- `<QuestionPagination>` Prev/Next (hidden when ≤1 page).

### `/admin/questions/[id]` (`src/app/admin/questions/[id]/page.tsx`)
Edit/review one question. Loads by numeric id; "Loading…" / "Question not found." states. Same
`<QuestionForm>` with publish label "Save Changes". `saveChanges(status?)` mirrors add-question's
validation + conflict/duplicate checks + `recheckAllDuplicates`, then routes back to the list.
`status` defaults to the existing status if not passed; `source` re-derived from `year`.

### `src/components/admin/questions/question-form.tsx` — `QuestionForm` (shared)
Props: `questionData, onChange, onSaveDraft, onPublish, publishButtonLabel?, saving?`.
- Loads **active** subjects and all topics; `activeTopics` = topics of the selected subject that
  are active. Subject change resets topic to 0.
- **Question** textarea + question image (URL input **or** file upload → base64 data URL via
  FileReader) + preview with remove.
- **Options & Correct Answer**: for each option A–D — a key button (click sets `answer`, green when
  selected), a type select (Text / Image / Text + Image), conditional text input and/or image
  URL+upload, and image preview/remove.
- **Question Details**: subject select, topic select (disabled until subject), year select
  ("No Year / Practice" + 2026→2010), difficulty select (easy/medium/hard).
- **Explanation**: textarea + explanation image (URL/upload/preview/remove).
- Footer: "Save Draft" (outline) and the publish/save primary (green). Disabled while `saving`.
- Every edit bumps `updatedAt`.

### `/admin/settings` (`src/app/admin/settings/page.tsx`)
Master data manager (two columns).
- **Subjects:** add (name → `fmt` capitalizes first letter, `slug` = lowercase-hyphenated,
  `displayOrder = subjects.length+1`, status active). Toggle active⇄inactive via colored pill.
- **Topics:** select a parent subject (active subjects only), add topic, list with parent name and
  status toggle.
- Enter key submits the add inputs. Count badges per column.

---

## 13. API routes

All under `src/app/api/admin/`. All check `OPENAI_API_KEY` where needed and return `503` if missing.

### `POST /api/admin/login` — `login/route.ts`
Body `{ password }`. If no `ADMIN_PASSWORD` set **or** password matches → set httpOnly cookie
`admin_token` = `ADMIN_PASSWORD ?? "open"` (sameSite lax, path `/`, 7-day maxAge, secure in prod),
return `{ ok: true }`. Else `401 { error: "Incorrect password" }`.

### `POST /api/admin/ai-fill` — `ai-fill/route.ts`
Body `{ question, optionA..D, subjects, topics, missing[] }`. Builds a prompt instructing the model
to fill **only** the missing fields among `answer` (exactly A/B/C/D), `subject` (exact match from
list), `topic` (exact match, "Subject: Topic" format), `explanation` (1–3 sentences). Uses OpenAI
**`gpt-4o-mini`**, `response_format: json_object`, `temperature: 0.2`. Returns `{ filled }` (parsed
JSON) or `500` on invalid JSON.

### `POST /api/admin/generate-explanation` — `generate-explanation/route.ts`
Body `{ question, optionA..D, answer, explanation, subjectName, topicName }`. Asks OpenAI
**`gpt-4o-mini`** (`json_object`, temp 0.3) to write **both** a SHORT explanation (1–2 sentences) and
a THOROUGH long explanation (4–8 sentences: why the answer is right, why others are wrong, concept +
intuition + exam traps) plus 3–6 lowercase **concept** tags. Returns `{ explanation, longExplanation,
concepts }`. `503` if `OPENAI_API_KEY` unset. Used by the admin form's "✨ Generate with AI" button
(fills short + long + concepts, all editable) and the questions-list bulk action (fills missing long
for every question; fills short only when empty). (Phase 2 will add book-grounded RAG to this prompt.)

### `POST /api/admin/extract-questions` — `extract-questions/route.ts`
Body `{ base64, mimeType }`. Extracts **all** MCQs from a document.
- **`EXTRACT_PROMPT`** asks for an array of `{question, optionA..D, answer(""|A/B/C/D), explanation("")}`,
  cleaning OCR artifacts, mapping 1/2/3/4 or i/ii/iii/iv → A/B/C/D, never inventing answers.
- **PDF** (`application/pdf`): dynamic `import("pdf-parse")` → `new PDFParse({data}).getText()`. If
  text length > 50 → send text (sliced to 12000 chars) to **`gpt-4o`**. If little/no text →
  `422` "scanned PDF, upload an image instead". Read failure → `422`.
- **Image** (jpg/png/webp/gif): send as `image_url` (data URL, `detail:"high"`) to **`gpt-4o`**,
  `max_tokens: 4096`.
- Tolerant parsing: accepts `[...]`, `{questions:[...]}`, or first array value in the object.
  Returns `{ questions }`.

> **Note:** dynamic-importing `pdf-parse` is deliberate — avoids Vercel build issues.

---

## 14. Auth & middleware

### `src/middleware.ts`
- `matcher: ["/admin/:path*"]`.
- Always allows `/admin/login`.
- If `ADMIN_PASSWORD` unset → allow all (open mode).
- Else require cookie `admin_token === ADMIN_PASSWORD`; otherwise redirect to
  `/admin/login?from={pathname}`.

This is lightweight gating, not real user auth. When moving to Supabase/real auth, replace both the
middleware check and the login route, and tighten the RLS "service write" policies.

---

## 15. Business rules & logic

1. **Public visibility:** only `status === "published"` questions appear in the public app.
2. **Source derivation:** `source = year ? "past_year" : "practice"` — set on every save.
3. **Years list:** always the 17 years `2026 … 2010` (`2026 - i`), used in forms, filters, import.
4. **Duplicate model (3 cases):**
   - *Exact duplicate* (same text + subject + topic + year) → **blocked** on save.
   - *Classification conflict* (same text, different subject/topic) → **blocked**, points to the
     existing classification.
   - *Repeated-year* (same text + subject + topic, different years) → **allowed**, merged into
     `repeatedYears` / `repeatCount`; surfaced as green year chips in the public card.
5. **Recheck duplicates:** recomputes `repeatedYears`, `repeatCount`, `duplicateCheckStatus`,
   `possibleDuplicateIds` across the whole set; run after every add/edit/import and on demand.
6. **Validation (`validateQuestion`):** question text required; subject & topic & answer required;
   per option — `image` needs `imageUrl`; `text_image` needs both text and `imageUrl`; `text`
   needs text.
7. **Import → draft:** all imported questions land as `status: "draft"`, `importSource: "excel"`
   (even PDF/photo path currently writes via the same row→question mapper), to be reviewed before
   publishing.
8. **Seen-question rotation:** public app avoids repeats until the pool is exhausted, then resets.
9. **Mathematics label:** shown as **"Mats"** in the public subject filter only.

---

## 16. Import feature (detailed) — `/admin/import`

A 4-step wizard (`src/app/admin/import/page.tsx`):

- **Step 1 — Source Type:** "Excel / CSV" or "PDF or Photo". Excel shows a **Download Excel
  Template** button; PDF/Photo shows an OpenAI-key notice.
- **Step 2 — Question Year:** "Past Year Question Set" (pick one year → applied to all rows via
  `yearOverride`) or "Practice / No Year".
- **Step 3 — Upload:** drag-&-drop or click. Excel accepts `.xlsx,.xls,.csv`; PDF/Photo accepts
  `.pdf,.jpg,.jpeg,.png,.webp,.gif`. Shows an "Extracting…" state during AI extraction.
- **Step 4 — Review & Import:** preview table (#, Question, Subject, Topic, Answer, Year, Status),
  counts of valid / error / need-AI-fill; **AI Fill N Rows** (purple) and **Import N Questions**
  (green) buttons.

**Excel columns (template order):** `Question, Option A, Option B, Option C, Option D, Answer,
Subject, Topic, Year, Explanation, Long Explanation, Concepts, Difficulty`. `Concepts` is a
comma-separated list. Template includes 2 example rows. Parsed with
`XLSX.read(..., {type:"binary"})` → `sheet_to_json({defval:"", raw:false})`.

**Row validation (`validateRow`):** question + all 4 options required; answer (if present) ∈ A/B/C/D;
difficulty ∈ easy/medium/hard (default medium); subject must exist & be active (case-insensitive);
topic must exist under that subject & be active. Resolves `subjectId`/`topicId`. Status `valid` if no
errors.

**AI Fill (`handleAIFill`):** for rows where `needsAIFill` (missing answer/subject/topic/explanation),
sequentially POST each to `/api/admin/ai-fill` with the subjects list and topics-with-subject list;
merge results, re-resolve subject/topic ids, re-validate, tag filled fields with an "AI" badge,
update progress `done/total`.

**Import (`handleImport`):** map valid rows → `Question` via `rowToQuestion` (`id: Date.now()+rowIndex`,
`uuid: crypto.randomUUID()`, `status: "draft"`, `importSource: "excel"`, `source: year?past_year:practice`,
`aiReviewStatus: aiFilled? "suggested":"not_checked"`), prepend to existing, run
`recheckAllDuplicates`, persist, show "{imported} imported as drafts. {skipped} skipped."

**PDF/Photo (`extractFromFile`):** file → base64 → POST `/api/admin/extract-questions` → map returned
questions into the Excel-column shape (applying `yearOverride`) → `validateRow` each → into the same
preview table (then AI-fill / import as above).

---

## 17. UI/design conventions

- **Hand-rolled Tailwind, not shadcn primitives.** shadcn/ui is configured (`components.json`,
  `lib/utils.ts` `cn()`, CSS vars) so `npx shadcn@latest add <component>` works for **new**
  components, but existing UI is bespoke Tailwind. **Do not** rewrite existing components as shadcn.
- **Visual language:** rounded-2xl/3xl cards, `border` + `bg-white` / `dark:bg-slate-800`,
  `shadow-sm`, `font-black`/`font-bold` headings, pill badges. Full dark-mode classes everywhere
  (`dark:` variants). **Dark surfaces use slate-900 (page bg) / slate-800 (cards) / slate-700–600
  (borders)** — intentionally softer than near-black. Dark mode is **class-based** and toggled by
  `<ThemeToggle>` (persisted in `localStorage.theme`), defaulting to the OS preference on first visit.
- **Color semantics:** blue = primary/active, green = published/correct/valid, red =
  unpublish/wrong/error, yellow = possible-duplicate/recheck, purple = topic/AI, orange = warnings.
- **All pages are Client Components**; data loads in `useEffect` via the services (async).
- **Path alias** `@/*` → `src/*` everywhere.
- **Errors** show as dismissible red banners; confirmations use the shared `<ConfirmDialog>` modal.

---

## 18. Build & deploy

- **Local:** `npm run dev` (port 3000). `npm run build` then `npm start` for production.
- **Hosting:** Vercel (a `.vercel` project dir exists). Set `OPENAI_API_KEY`, optionally
  `ADMIN_PASSWORD`, and the `NEXT_PUBLIC_SUPABASE_*` vars in Vercel env settings.
- **Lint:** `npm run lint`.
- **Without any env vars** the app still builds and runs fully on localStorage + seed data (AI and
  auth features simply degrade gracefully).

---

## 19. Changelog

> Newest first. Each app change adds an entry here. Commit hashes reference the **app** repo.

- **2026-06-16** — **Difficulty levels: AI-decided + fully editable (admin).** Every question still has
  a required `difficulty` (easy/medium/hard) for past-year and no-year questions alike; now the
  **AI suggests** it and it's editable everywhere. (1) `generate-explanation` also returns a
  rubric-based `difficulty` (easy = recall/1-step, medium = 2–3 steps/one concept, hard =
  multi-step/calculation/tricky), which the Edit form's "Generate with AI" applies (still editable).
  (2) New lightweight route **`POST /api/admin/tag-difficulty`** (difficulty-only classifier; folder
  has its own README). (3) Question Management gained an **inline per-row difficulty dropdown**, a
  bulk **"Set difficulty"** selector, and a bulk **"✨ AI: tag difficulty"** action (classifies each
  selected question, saves grouped by level). New repo method `bulkPatchDifficulty` (+ store
  `bulkUpdateQuestionDifficulty`) for local + Supabase. Difficulty remains editable via the form,
  inline dropdown, or bulk set.

- **2026-06-16** — **Mock rules window now states the official MECEE-BL format clearly.** It shows an
  "Exam format" card grid (Duration 3 hours (180 minutes), Total Questions 200 MCQs, Total Marks 200,
  Marking +1 / −0.25) and a "Question distribution (MBBS cluster)" table (Physics ~50, Chemistry ~50,
  Zoology ~40, Botany ~40, MAT ~20, Total 200). These are driven by new constants
  `OFFICIAL_TOTAL_QUESTIONS` / `OFFICIAL_DISTRIBUTION` in `mock-config-service`, so the rules always
  show the real 200/200 structure regardless of how the local bank/admin config currently sums (the
  earlier window mistakenly showed the config total, e.g. 180 when the MAT subject was missing).

- **2026-06-16** — **Mock Test module (MECEE-BL / CEE format).** New student route `/mock`: rules
  window → mode select (past-year dropdown **or** easy/medium/hard) → timed exam → scored result.
  Exam runner has a 180-min countdown with **pause/resume (persists across reloads), reset, and
  save & exit**, free navigation, a question palette, and **subject-section jump tabs**; no reveal/
  explanation during the test. Marking +1 / −0.25 (negative). Difficulty papers are assembled to an
  **admin-defined per-subject + per-topic distribution** (default official 50/50/40/40/20 = 200) from
  mock-eligible published questions, topping up short subjects from the same subject (any
  difficulty/source) so the paper keeps its size. New admin page `/admin/mock-settings` (sidebar
  link) to set duration, marks, and the distribution. New code: `types/mock.ts`; services
  `mock-config-service` (config, default builder — localStorage v1), `mock-service` (build + score +
  sections), `mock-attempt-store` (active-attempt persistence for pause/resume); components under
  `components/mock/` (rules, setup, exam, palette, result) + `components/admin/mock-settings-form`.
  The top filter bar's "Mock" button now links to `/mock`. **Note:** admin mock config is stored
  per-browser (localStorage) for now — to share it across devices we'll add a Supabase
  `app_settings` table later.

- **2026-06-15** — **Structural refactor of the question card (no behavior change).** Split the
  monolithic `question-card.tsx` (was 832 lines) into focused components to keep every file well
  under 1000 lines: extracted the floating **explanation window** (drag/resize/position/font/long
  view) into `explanation-window.tsx`, and a shared `rich-text.tsx` (`renderRich`) now used by both
  the explanation + related windows. Result: `question-card.tsx` 436, `explanation-window.tsx` 419,
  `related-question-window.tsx` 392, `rich-text.tsx` 15. `question-card` now just owns the main card +
  answer flow and renders `<ExplanationWindow>` / `<RelatedQuestionWindow>`; the explanation window
  self-manages its position/size (persisted in `eq_expl_pos`/`eq_expl_size`) and font lives in the
  card and is passed down.

- **2026-06-15** — **Related-question window refinements.** (1) Removed "Explain more" inside the
  related window — it now shows only the short explanation. (2) The window **remembers its position**
  (persisted to `eq_related_pos`) and reopens exactly where the user last placed it. (3) The
  **explanation window also blurs** (clear-on-hover) while the related window is open, matching the
  main card. (4) **Arrows + Enter now drive the related window** like the main card (↑/↓ highlight,
  ←/→ prev/next, stepped Enter: select → reveal → explanation → next, Esc closes) via a self-contained
  keydown effect.

- **2026-06-15** — **Explanation text size slider.** Added an `A ──○── A` range slider in the
  explanation window header that scales the short + long explanation text (12–28px), persisted in
  `localStorage` (`eq_expl_font`) and shared with the related-question window's explanation.
- **2026-06-15** — **Related questions open in a floating window (not inline).** Clicking "Related
  questions (N)" (surfaced after "Explain more") now opens a **separate, draggable window on top**
  (`related-question-window.tsx`) while the **explanation window stays open** and the **main card
  stays put but blurs** to shift focus. Hovering the main card un-blurs it (JS hover state, since the
  overlays are click-through `pointer-events-none`); moving away re-blurs. The related window runs its
  own select → Reveal → **Explanation** (short + "Explain more" long) flow, has Previous/Next across
  the N questions, an **X** (top-right) to close, and "Related question X of N". While it's open the
  main card's keyboard handler is disabled so Enter doesn't leak through. Replaces the earlier
  inline-session attempt — `relatedSession` is now a `Question[]`; removed the in-card banner and the
  session-aware nav.
- **2026-06-08** — Explanation window now **remembers its position** too: short window opens lower
  (question stays visible) and at the last-moved spot; **Explain more opens from that same spot**.
- **2026-06-08** — Explanation window split into two modes: **short** = small + movable only;
  **long** (Explain more) = opens compact+scrollable, **resizable from any edge/corner** (8 handles),
  expand/shrink preset, and the chosen size is **remembered** across opens (localStorage).
- **2026-06-08** — Explanations now **bold the important keywords/sentences** (AI marks them with
  `**...**`; `renderRich` in the card renders them as `<strong>` for both short + long).
- **2026-06-08** — Explanation modal is now a **draggable + resizable floating window**: drag the
  header to move it anywhere, drag the bottom-right corner to resize freely; expand/shrink preset
  icon moved to the header **right**. Opens compact + scrollable so long explanations don't intimidate.
- **2026-06-08** — Added a **Delete** feature for questions: per-row Delete + Bulk Delete (both with
  a confirm dialog), backed by new `remove`/`bulkRemove` on `QuestionRepo` (localStorage + Supabase).
- **2026-06-08** — Long explanations now render as **multiple paragraphs with examples** (AI prompted
  for 3–5 short paras; modal splits on blank lines). **"Related questions" only appears after opening
  the long explanation** ("Explain more").
- **2026-06-08** — AI now generates **both short + long** explanations (and concepts) in one call;
  the admin form's "✨ Generate with AI" fills all three (editable), and the bulk action fills missing
  longs + empty shorts.
- **2026-06-08** — **AI long-explanation generation + Excel columns.** New
  `/api/admin/generate-explanation` route (gpt-4o-mini). Admin Edit form gained a "✨ Generate with
  AI" button; questions list gained a bulk "✨ AI: Fill missing long explanations". Excel
  import/template now has **Long Explanation** + **Concepts** columns. Needs `OPENAI_API_KEY` on
  Vercel (returns 503 until set).
- **2026-06-08** — **Phase 1 (richer explanations + related questions).** Added `explanationLong`,
  `concepts`, `relatedQuestionIds` to the `Question` model + DB (migrated live Supabase + schema.sql).
  Student explanation modal is now multi-panel: short → **"Explain more"** (long, scrollable, wider
  modal) → **"Related questions"** (5–10 by shared concept/topic, clickable → jumps to that question,
  then resumes random). New `related-question-service` (no ML — concept/topic scoring; Phase 2 swaps
  in embeddings). Admin form gained Long Explanation + Concepts (comma-separated) fields. Designed to
  blend book knowledge + AI in Phase 2.
- **2026-06-08** — **Connected a live Supabase project** (ref `isohkebvmuskaorcjawg`, eu-central-1):
  ran `schema.sql`, set `NEXT_PUBLIC_SUPABASE_*` in Vercel + `.env.local`, redeployed. The
  production site now uses the shared PostgreSQL DB — admin/imported+published questions reach all
  students on all devices. Verified read + write end-to-end.
- **2026-06-08** — Made the dashboard stat cards **clickable links** into Question Management
  filtered by status (`?status=draft` etc.). Replaced the Active/Unpublished tabs with **All /
  Published / Draft / Unpublished status pills** (live counts) that seed from the `?status=` query
  param, so "go into drafts" is one click from the dashboard. Bulk Publish + Bulk Unpublish are now
  both always available. (Questions page wrapped in `<Suspense>` for `useSearchParams`.)
- **2026-06-08** — Wired the **Supabase (PostgreSQL/SQL) backend**: added `src/lib/supabase.ts`
  (`isSupabaseConfigured` + client) and full Supabase implementations of `QuestionRepo`/`MasterRepo`
  in `repository.ts` (snake_case⇄camelCase mappers, upsert-by-id). The app now uses the shared DB
  automatically when `NEXT_PUBLIC_SUPABASE_*` env vars are set, else falls back to localStorage.
  This makes admin-added/imported questions visible to all students across devices.
  **Draft fixes:** added a Status (Published/Draft/Unpublished) column to the admin question table;
  made the row action status-based so drafts can be **Published directly from the list** (previously
  every Active-tab row only offered Unpublish); Bulk Publish now available in the Active tab too.
- **2026-06-08** — Expanded the Enter-key answer flow for wrong answers: select → reveal → open
  explanation → close explanation → next question (tracked via `explanationSeen`; Enter closes the
  modal while open). Correct answers still go select → next.
- **2026-06-08** — Unified the option highlight: mouse hover and keyboard arrows now drive the same
  `highlightedIndex` (hover sets it via `onMouseEnter`, so arrows continue from the hovered option).
  Removed the separate `hover:bg-blue-50` (which in dark mode turned the option near-white and hid
  the text and looked like a second selection). The single highlight now uses a dark-mode-readable
  `bg-slate-700` style. Only ever one option appears active.
- **2026-06-08** — Added press feedback to the practice-card nav buttons: Previous/Next now have
  hover + `active:scale-95` states and a `navPulse` flash that fires on both click and ←/→ keys
  (keyboard navigation now visibly registers). Explanation/Reveal got hover + active states too.
- **2026-06-08** — Dark mode reworked: switched from OS-only `prefers-color-scheme` to a
  **class-based toggle** (`<ThemeToggle>`, `.dark` on `<html>`, persisted in `localStorage`, no-flash
  init script in layout); **lightened the dark palette** one step (slate-950/900 → slate-900/800,
  borders → slate-700/600). Added **keyboard navigation** to the practice card (↑/↓ move option
  highlight, ←/→ prev/next, Enter select→reveal→next, Esc closes explanation). Set the real page
  `<title>`. Moved the blueprint into the project at `/blueprint`.
- **2026-06-08** — Blueprint created; full spec captured from app commit `75438ed`.
- `75438ed` — Add PDF/Photo import source with year association.
- `efdeb80` — Add AI auto-fill for Excel import using ChatGPT (`/api/admin/ai-fill`, `gpt-4o-mini`).
- `fe93627` — Add Excel bulk import feature (`/admin/import`, xlsx template + validation).
- `225ac92` — Full architecture refactor (repository abstraction, services, types split).
- `7cb4e34` — Fix: remove server-action dynamic imports from service files.

---

*End of blueprint. Keep this file in sync with every app change.*
