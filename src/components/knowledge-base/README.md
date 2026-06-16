# `components/knowledge-base/` — Knowledge Base UI

Client components for the `/admin/knowledge-base` page (Training Module / RAG).

| Component | Purpose |
|---|---|
| `add-source-form.tsx` | Pick input type (PDF / paste / URL / image), tag subject·chapter·citation·trust tier, and POST to `/api/admin/kb-ingest`. Reads files to base64 client-side. |
| `source-list.tsx` | Lists `kb_sources` with status/passage count; view passages, enable/disable for retrieval, delete. Uses `knowledge-base-service`. |

Types live in `src/types/knowledge-base.ts`. See
[`blueprint/TRAINING-MODULE-PLAN.md`](../../../blueprint/TRAINING-MODULE-PLAN.md).
