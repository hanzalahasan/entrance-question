# `kb-ingest` — Knowledge Base ingestion route

`POST /api/admin/kb-ingest` — ingests **one source** into the Knowledge Base for
RAG. Server-side because it needs the OpenAI key (embeddings + image OCR).

Pipeline (see [`blueprint/TRAINING-MODULE-PLAN.md`](../../../../../blueprint/TRAINING-MODULE-PLAN.md) §7):
**extract text → chunk → embed → store**.

## Request body (`KbIngestRequest`, JSON)

| Field | Required | Notes |
|---|---|---|
| `type` | yes | `"pdf" \| "image" \| "url" \| "text"` |
| `title` | yes | Display name of the source |
| `text` | type=text | Raw pasted text |
| `url` | type=url | Server fetches + strips HTML |
| `base64` / `mimeType` / `fileName` | type=pdf/image | File payload; PDFs use `pdf-parse`, images use GPT-4o vision OCR |
| `subjectId` / `subjectName` | no | Links the source to a subject (scopes retrieval) |
| `chapter`, `citationLabel` | no | Shown on citations |
| `trustTier` | no | `1\|2\|3` (higher wins on conflict); default `2` |

## Behaviour

- Creates a `kb_sources` row (`status='processing'`), chunks (~800 tokens with
  overlap), embeds with `text-embedding-3-small`, inserts `kb_chunks`, then flips
  the source to `status='ready'` with its `chunk_count`. On failure the source is
  marked `status='failed'` with the reason.
- Original PDF/image files are stored in the private `knowledge-base` bucket
  (best-effort; text ingestion still succeeds if upload fails).
- Returns `503` if `OPENAI_API_KEY` or Supabase isn't configured, `422` for
  unreadable sources (e.g. scanned PDFs with no selectable text).

Requires the one-time DB setup in `supabase/knowledge-base-setup.sql`.
The chunking/embedding/retrieval logic lives in `src/services/rag-service.ts`.
