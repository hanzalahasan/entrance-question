# `kb-generate-questions` — book-grounded MCQ generation (Phase 2)

`POST /api/admin/kb-generate-questions` — generates **MCQs grounded in the
Knowledge Base** for a chosen subject/topic, each with a difficulty level and a
source citation. Output is **review-only**: the admin UI saves kept questions as
**drafts** — this route never publishes anything. See
[`blueprint/TRAINING-MODULE-PLAN.md`](../../../../../blueprint/TRAINING-MODULE-PLAN.md) §4.2, §8, §9.

## Request body (`KbGenerateRequest`, JSON)

| Field | Notes |
|---|---|
| `subjectId`, `subjectName` | Scopes retrieval + lands on the draft questions |
| `topicId`, `topicName` | Required (draft questions need a topic to validate) |
| `chapter` | Optional — narrows the retrieval query |
| `difficulty` | `"easy" \| "medium" \| "hard" \| "mixed"` — targeted level, or `mixed` for a spread (each question auto-tagged) |
| `count` | 1–20 |

## Behaviour

1. **Retrieve** top-10 enabled KB chunks for `subject — topic — chapter` via
   `match_kb_chunks` (trust-tier ranked).
2. **Generate** `count` MCQs with `gpt-4o-mini`, grounded in those passages
   (paraphrased, not verbatim). If no passages exist it still generates from
   exam-standard facts but flags `grounded: false`.
3. **Conflict handling** (§9): if retrieved sources disagree on a relevant fact,
   the question is flagged `sourcesDisagree: true` so it's reviewed, never
   auto-published.
4. **Normalise**: drops incomplete items, validates `answer ∈ {A,B,C,D}`, clamps
   difficulty.

## Response (`KbGenerateResponse`)

`{ questions: GeneratedQuestion[], grounded: boolean, citations: [...] }`.
The page (`/admin/generate-questions`) renders these for review, lets the admin
edit difficulty / deselect, then saves the kept ones as **draft** `Question`s
(`importSource: "ai_generated"`) into the normal draft → review → publish flow.
