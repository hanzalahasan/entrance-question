# Training Module — Knowledge Base (RAG) Plan

> **Status:** ✅ **Phase 1 BUILT** (2026-06-16) — Knowledge Base upload + ingestion
> (pgvector tables, storage bucket, admin section) + grounded explanations.
> Phases 2–3 remain planned (see §14). Keep [`BLUEPRINT.md`](./BLUEPRINT.md) as
> the source of truth for the shipped app; this file is the forward plan for the
> rest of the "training" feature.
>
> **Phase 1 decisions taken:** all four input types shipped (PDF, paste, URL,
> image); image OCR uses **GPT-4o vision** (no new system dependency); trust
> tiers = recommended 3-tier; one-time DB setup lives in
> [`../supabase/knowledge-base-setup.sql`](../supabase/knowledge-base-setup.sql).

## 1. Goal

Make the system "smart" by letting admins feed it **book knowledge**, then use
that knowledge for two things, **combining book grounding + AI**:

1. **Generate questions** from the books, **each with a difficulty level**.
2. **Explain answers** grounded in the books **plus** AI elaboration.

## 2. Core decision: RAG, not fine-tuning

We will **NOT fine-tune** a model. We use **Retrieval-Augmented Generation
(RAG)**: store book content as a searchable vector index, retrieve the relevant
passages at generation time, and let the LLM ground its output in them while
adding explanation. Rationale: RAG keeps facts updatable, lets us **cite the
source**, and greatly reduces hallucination — fine-tuning teaches style, not
facts, and can't cite.

## 3. Fits the existing stack

- **Supabase Postgres** + **`pgvector`** extension → vector storage/search (no new DB).
- **OpenAI**: `text-embedding-3-small` for embeddings (cheap) + `gpt-4o-mini`
  (already used) for generation.
- **`pdf-parse`** already a dependency; a PDF import flow already exists
  (`/admin/import`, which extracts *questions* — the Knowledge Base is separate
  and extracts *knowledge*).
- Same vector infra also enables the blueprint's noted **Phase-2 embeddings for
  related questions** — one investment, multiple features.

## 4. The three features

1. **Knowledge Base upload section** (new admin area) — upload sources.
2. **Book-grounded question generation, with difficulty** — admin picks
   subject → topic/chapter → difficulty → count; system retrieves passages →
   AI writes MCQs grounded in them → land in the existing **draft → review →
   publish** flow. Each question carries an **editable difficulty** (form /
   inline dropdown / bulk — already built) and a **source citation**.
3. **Grounded explanations** — the existing `generate-explanation` route gains a
   retrieval step so explanations are "based on [Book, Ch X]" + AI elaboration.

### The loop it closes 🔁
Book → **difficulty-tagged questions** → marked `isMockEligible` → automatically
feed the **Mock Test difficulty distribution** (easy/medium/hard papers). The
Knowledge Base becomes the engine that stocks the bank and the mocks.

## 5. Upload section design ("Knowledge Base")

New admin sidebar entry **Knowledge Base** (separate from Excel Import).

Input types, all feeding one pipeline:

| Input | Add it | Processing |
|---|---|---|
| 📄 Book / PDF | drag-drop PDF | extract text (`pdf-parse`) → chunk → embed → store |
| 🖼️ Photo / image | upload image | OCR / vision → text → chunk → embed → store |
| 🔗 URL | paste link | server fetch → extract article text → chunk → embed → store |
| ✍️ Paste text | textarea | chunk → embed → store |

Page UI: a **list of sources** (title, type, subject/chapter tags, **trust
tier**, status `Processing → Ready/Failed`, # passages, date) + **Add source**
(pick type → upload/paste → tag subject/book/chapter + citation label + trust
tier). Per-source: view passages, re-process, enable/disable for retrieval,
delete (also removes its vectors).

## 6. Data model (Supabase)

- Original files → Supabase **Storage** bucket (`knowledge-base`).
- `kb_sources`: `id, title, type (pdf|image|url|text), subject_id, chapter,
  citation_label, trust_tier (1–3), status, chunk_count, enabled, created_at`.
- `kb_chunks`: `id, source_id, content, embedding vector(1536), chapter, page,
  metadata, created_at`. Index the embedding (ivfflat/hnsw) for similarity search.

## 7. Ingestion pipeline

1. **Ingest** — extract text (PDF/OCR/URL/paste).
2. **Chunk** — ~500–1000 tokens, tagged `{ source_id, subject, chapter, page }`.
3. **Embed** — `text-embedding-3-small` per chunk.
4. **Store** — `kb_chunks` (+ file in Storage, row in `kb_sources`).
5. **Retrieve** — embed the topic/concept, similarity search top-K (filtered by
   subject + enabled sources).
6. **Generate** — feed passages to `gpt-4o-mini` for question/explanation;
   record which chunks were used (for citation).

## 8. Difficulty for generation

Reuse the rubric already shipped (easy = recall/1-step, medium = 2–3 steps/one
concept, hard = multi-step/calculation/tricky) and the `tag-difficulty` route.
Two modes (pick a default in OPEN DECISIONS):
- **Targeted** — "generate N questions at level X."
- **Mixed + auto-tag** — generate a spread, classify each with `tag-difficulty`.
Book context also improves difficulty accuracy (recall vs multi-step is visible
in the source text).

## 9. Contradiction handling (when two books disagree)

**Cardinal rule: never silently blend conflicting facts.** Layered approach:

1. **Source trust tiers** (primary) — each source has a priority (recommended
   **3-tier**: `Official/curriculum (3) > Standard textbook (2) > web/notes (1)`);
   on conflict the higher tier wins and is cited.
2. **Conflict detection at generation** — prompt instructs: if passages disagree,
   do NOT merge; report it. No clear authority winner → route to **draft/review**
   with a `⚠ Sources disagree` flag showing both passages.
3. **Scope retrieval** by subject + relevant curriculum (avoids cross-context mixing).
4. **Per-concept overrides** (optional) — admin pins a canonical source/answer for
   contested concepts.
5. **Verification pass** (optional) — second AI check that the answer is
   consistently supported; else low-confidence → review.

Specifics: a contradicting **question** must **never auto-publish** (ambiguous
correct option) → review/skip. A contradicting **explanation** shows the
authoritative (cited) view, optionally noting the alternative. Contradiction is
often *signal* (updated science / context) — surface it, don't resolve blindly.
This reuses the existing **draft → review → publish** workflow.

## 10. Licensing / NCERT (important)

- NCERT books are **copyrighted**; free to download ≠ license to reproduce/
  redistribute commercially.
- **Facts/concepts aren't copyrightable — only exact wording is.** Safe pattern:
  use as a reference, **AI paraphrases in its own words**, keep raw text
  **internal** (private index), **never show large verbatim quotes** or
  redistribute PDFs.
- Safest: get NCERT permission (they grant on request); meanwhile **own notes**
  and **public-domain/openly-licensed** material are 100% safe.
- (Not legal advice — verify before launch.)

## 11. One-time setup (Supabase dashboard — anon key can't DDL)

Provide SQL/steps for: (1) enable `pgvector`; (2) create `kb_sources` +
`kb_chunks` (+ vector index); (3) create Storage bucket `knowledge-base`;
(4) choose photo-OCR engine.

## 12. Integration points with existing code

- `src/app/api/admin/generate-explanation/route.ts` → add retrieval step.
- `src/app/api/admin/tag-difficulty/route.ts` → reuse for generation difficulty.
- Difficulty system (form selector, inline dropdown, bulk set, bulk AI-tag) →
  generated questions plug straight in.
- Draft → review → publish workflow → destination for generated/conflicting items.
- Mock module (`src/services/mock-service.ts`) → consumes the difficulty-tagged,
  mock-eligible questions.
- `pdf-parse` + `/admin/import` → share PDF text extraction.
- Related-questions Phase 2 (embeddings) → reuse `kb_chunks`/embeddings infra.

## 13. New folders to create (each needs a `.md` per project rule)

- `src/app/admin/knowledge-base/` (admin page) → README
- `src/components/knowledge-base/` (UI components) → README
- `src/app/api/admin/kb-ingest/` (and/or `kb-generate-questions/`) → README each
- `src/services/` additions (`knowledge-base-service`, `rag-service`) — existing
  folder, no new README needed.

## 14. Phasing

- **Phase 1** — Knowledge Base upload + ingestion (pgvector, tables, bucket,
  admin section) + **grounded explanations**. Lowest risk, immediate payoff.
- **Phase 2** — **Book-grounded question generation with difficulty** → draft/review.
- **Phase 3** — Source citations in the student UI + contradiction-review UI +
  embeddings-based related questions.

## 15. OPEN DECISIONS — confirm at the start of the next session

1. **Input types for v1** — recommend **PDF + paste-text** first, then URL, then
   photo/OCR. (Confirm scope.)
2. **Photo OCR engine** (if in v1) — Tesseract (cheap, clean scans) vs GPT-4o
   vision (handles messy/handwritten, costs more).
3. **Difficulty generation default** — Targeted / Mixed+auto-tag / both.
4. **Trust tiers** — confirm the recommended **3-tier** priority.
5. **First book + format** to ingest (PDF? your own notes? an NCERT PDF for testing?).
6. **Config/sharing** — Knowledge Base data lives in Supabase (shared); confirm
   you'll run the dashboard SQL I provide.

---
*Prepared so a fresh session can resume the "training module" work from here.*
