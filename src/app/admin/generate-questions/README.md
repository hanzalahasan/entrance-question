# `/admin/generate-questions` — book-grounded question generation (Phase 2)

Admin page for the Training Module's **question generation**. Admin picks
subject → topic → (optional chapter) → difficulty → count; the system retrieves
Knowledge Base passages and has the AI write MCQs grounded in them. See
[`blueprint/TRAINING-MODULE-PLAN.md`](../../../../blueprint/TRAINING-MODULE-PLAN.md) §4.2.

## Source modes

A **Source** selector controls where the facts come from:

- **Book + AI (hybrid)** — ground in the Knowledge Base, let AI elaborate; falls
  back to AI knowledge when no passages match. Default when a KB is configured.
- **Knowledge Base only** — strictly from book passages; refuses (422) if none
  match the topic.
- **AI only** — generate purely from the model's own knowledge, ignoring the KB.
  Works with **no Supabase / no sources at all**; default when no KB is configured.

## Flow

1. **Generate** → `POST /api/admin/kb-generate-questions` returns MCQs (each with
   options, answer, short + long explanation, concepts, **editable difficulty**,
   a source **citation**, and a `⚠ Sources disagree` flag where applicable).
2. **Review** — inline: edit each question's difficulty, deselect any you don't
   want. A banner says whether the batch was grounded in sources or fell back to
   general knowledge.
3. **Save as drafts** — kept questions become **draft** `Question`s
   (`importSource: "ai_generated"`, `status: "draft"`) and flow into the normal
   **draft → review → publish** workflow in Question Management. Citation +
   conflict markers are stored in `aiTags` so reviewers see them.

**Difficulty modes** (resolves the plan's open decision as *both*): pick a target
level (easy/medium/hard) or **Mixed** for a spread that the AI auto-tags.

Book-grounded questions **never auto-publish** (§9) — everything lands as a draft.

UI: `src/components/knowledge-base/generate-questions-panel.tsx`.
Route: `src/app/api/admin/kb-generate-questions/`.
