-- ============================================================================
-- Mock Sets — named, fixed difficulty papers (shared across all users)
-- ----------------------------------------------------------------------------
-- Run this ONCE in the Supabase dashboard → SQL Editor. Stores admin-defined
-- "Mock Sets": a named, frozen list of question ids tagged with a difficulty
-- (like a past-year paper, but identified by a set name). Every student who
-- takes "Medium Set 1" then gets the identical paper.
-- ============================================================================

create table if not exists mock_sets (
  id           bigint generated always as identity primary key,
  name         text        not null,                 -- e.g. "Medium Set 1"
  difficulty   text        not null check (difficulty in ('easy', 'medium', 'hard')),
  question_ids jsonb       not null default '[]'::jsonb,  -- ordered, frozen list of question ids
  status       text        not null default 'draft' check (status in ('draft', 'published')),
  created_at   timestamptz not null default now()
);

create index if not exists mock_sets_difficulty_idx on mock_sets(difficulty);

-- RLS — mirror the app's existing anon-key access model (permissive). Tighten
-- once real admin auth exists.
alter table mock_sets enable row level security;

drop policy if exists mock_sets_all on mock_sets;
create policy mock_sets_all on mock_sets
  for all using (true) with check (true);

-- Verify with:  select * from mock_sets;  (0 rows, no error)
