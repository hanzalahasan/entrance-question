-- ============================================================================
-- Knowledge Base (Training Module / RAG) — one-time setup
-- ----------------------------------------------------------------------------
-- Run this ONCE in the Supabase dashboard → SQL Editor.
-- The app's anon key cannot run DDL (CREATE EXTENSION / TABLE / FUNCTION), so
-- this has to be applied from the dashboard. After it succeeds, the Knowledge
-- Base admin section becomes fully functional against the shared database.
--
-- See blueprint/TRAINING-MODULE-PLAN.md §6, §11 for the design rationale.
-- ============================================================================

-- 1) pgvector — vector storage + similarity search ---------------------------
create extension if not exists vector;

-- 2) Sources — one row per uploaded book / paste / URL / image ---------------
create table if not exists kb_sources (
  id             bigint generated always as identity primary key,
  title          text        not null,
  type           text        not null check (type in ('pdf', 'image', 'url', 'text')),
  subject_id     integer,                 -- references the app's subject master (nullable)
  subject_name   text,                    -- denormalised label for display
  chapter        text,
  citation_label text,                    -- e.g. "Physics NCERT, Ch 4" — shown on citations
  trust_tier     smallint    not null default 2 check (trust_tier between 1 and 3),
  -- 3 = Official/curriculum, 2 = Standard textbook, 1 = web/notes (higher wins on conflict)
  source_url     text,                    -- original URL (type='url') or storage path
  status         text        not null default 'processing'
                 check (status in ('processing', 'ready', 'failed')),
  error          text,                    -- failure reason when status='failed'
  chunk_count    integer     not null default 0,
  enabled        boolean     not null default true,  -- include in retrieval?
  created_at     timestamptz not null default now()
);

-- 3) Chunks — embedded passages, the actual retrieval units ------------------
create table if not exists kb_chunks (
  id         bigint generated always as identity primary key,
  source_id  bigint      not null references kb_sources(id) on delete cascade,
  content    text        not null,
  embedding  vector(1536),               -- text-embedding-3-small dimensionality
  chapter    text,
  page       integer,
  metadata   jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Approximate-nearest-neighbour index for cosine distance. ivfflat needs the
-- table to have rows before it's most effective; it's safe to create early.
create index if not exists kb_chunks_embedding_idx
  on kb_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index if not exists kb_chunks_source_id_idx on kb_chunks(source_id);

-- 4) RLS — mirror the app's existing anon-key access model -------------------
-- The app talks to Supabase with the public anon key (see src/lib/supabase.ts),
-- so we enable RLS and add permissive policies. Tighten these later if you add
-- real admin auth. (Matches how the questions tables are already accessed.)
alter table kb_sources enable row level security;
alter table kb_chunks  enable row level security;

drop policy if exists kb_sources_all on kb_sources;
create policy kb_sources_all on kb_sources
  for all using (true) with check (true);

drop policy if exists kb_chunks_all on kb_chunks;
create policy kb_chunks_all on kb_chunks
  for all using (true) with check (true);

-- 5) Similarity search RPC ---------------------------------------------------
-- supabase-js can't express `ORDER BY embedding <=> $1` directly, so retrieval
-- goes through this function. Returns the top-K most similar ENABLED chunks,
-- optionally scoped to a subject. Ordered so higher trust_tier breaks ties.
create or replace function match_kb_chunks(
  query_embedding   vector(1536),
  match_count       integer default 6,
  filter_subject_id integer default null
)
returns table (
  id          bigint,
  source_id   bigint,
  content     text,
  chapter     text,
  page        integer,
  similarity  float,
  trust_tier  smallint,
  citation_label text,
  title       text
)
language sql stable
as $$
  select
    c.id,
    c.source_id,
    c.content,
    c.chapter,
    c.page,
    1 - (c.embedding <=> query_embedding) as similarity,
    s.trust_tier,
    s.citation_label,
    s.title
  from kb_chunks c
  join kb_sources s on s.id = c.source_id
  where s.enabled = true
    and s.status = 'ready'
    and c.embedding is not null
    and (filter_subject_id is null or s.subject_id = filter_subject_id)
  order by s.trust_tier desc, c.embedding <=> query_embedding
  limit match_count;
$$;

-- 6) Storage bucket for original files (PDFs / images) -----------------------
insert into storage.buckets (id, name, public)
values ('knowledge-base', 'knowledge-base', false)
on conflict (id) do nothing;

-- Allow the anon role to manage objects in this private bucket (same trust
-- model as the tables above; the bucket itself stays non-public).
drop policy if exists kb_bucket_all on storage.objects;
create policy kb_bucket_all on storage.objects
  for all using (bucket_id = 'knowledge-base')
  with check (bucket_id = 'knowledge-base');

-- Done. Verify with:  select * from kb_sources;  (should return 0 rows, no error)
