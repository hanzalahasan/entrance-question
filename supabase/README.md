# `supabase/` — database setup scripts

SQL that must be run from the **Supabase dashboard → SQL Editor** because the
app's public anon key cannot execute DDL (`CREATE EXTENSION / TABLE / FUNCTION`,
bucket creation). These are one-time setup scripts, not app code.

## Files

| File | Purpose |
|---|---|
| `knowledge-base-setup.sql` | Training Module / RAG. Enables `pgvector`; creates `kb_sources` + `kb_chunks` (+ vector index); the `match_kb_chunks` similarity-search RPC; the private `knowledge-base` Storage bucket; and permissive RLS policies that mirror the app's existing anon-key access. |
| `mock-sets-setup.sql` | Mock Sets — named, fixed difficulty papers. Creates the `mock_sets` table (name, difficulty, frozen `question_ids`, status) + permissive RLS, so every student who takes a set gets the same questions. |

## How to run

1. Open your project at https://supabase.com/dashboard → **SQL Editor**.
2. Paste the contents of `knowledge-base-setup.sql`, click **Run**.
3. Confirm success: `select * from kb_sources;` returns 0 rows with no error.

After this, the **Knowledge Base** admin section (`/admin/knowledge-base`) can
upload, embed, retrieve, and ground explanations against the shared database.

Design rationale lives in [`../blueprint/TRAINING-MODULE-PLAN.md`](../blueprint/TRAINING-MODULE-PLAN.md).
