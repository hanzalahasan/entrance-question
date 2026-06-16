# `/admin/knowledge-base` — Knowledge Base admin page

The admin section for the **Training Module (RAG)**. Admins feed the system book
knowledge here; it's chunked, embedded (`text-embedding-3-small`), and stored in
Supabase + `pgvector` so explanations can be **grounded in trusted sources**.
See [`blueprint/TRAINING-MODULE-PLAN.md`](../../../../blueprint/TRAINING-MODULE-PLAN.md).

## What this page does

- **Add source** (`components/knowledge-base/add-source-form`): pick a type
  (PDF / paste text / URL / image), tag it with subject, chapter, citation label,
  and **trust tier** (1–3), then POST to `/api/admin/kb-ingest` which runs the
  ingestion pipeline.
- **Sources list** (`components/knowledge-base/source-list`): status
  (`processing → ready/failed`), passage count, view extracted passages,
  enable/disable for retrieval, delete (cascades chunks + removes the stored file).

## Requires

- Supabase configured (vectors can't live in localStorage). If not, the page
  shows a setup notice instead of the form.
- One-time DB setup: run `supabase/knowledge-base-setup.sql` in the dashboard.
- `OPENAI_API_KEY` (embeddings + image OCR), already used elsewhere in the app.

## Related

- Ingestion route: `src/app/api/admin/kb-ingest/`
- RAG helpers: `src/services/rag-service.ts` (server) / `knowledge-base-service.ts` (client)
- Grounded explanations: `src/app/api/admin/generate-explanation/route.ts`
