-- ============================================================================
-- Practice attempts — records each answer a signed-in user gives in random
-- practice, so the dashboard can analyse strengths/weaknesses per subject/topic
-- (alongside saved mock results). Run ONCE in the Supabase dashboard SQL editor.
-- ============================================================================

create table if not exists practice_attempts (
  id          bigint generated always as identity primary key,
  user_id     uuid    not null references auth.users(id) on delete cascade,
  question_id bigint  not null,
  subject_id  integer,
  topic_id    integer,
  is_correct  boolean not null,
  created_at  timestamptz not null default now()
);

create index if not exists practice_attempts_user_idx
  on practice_attempts(user_id, created_at desc);

alter table practice_attempts enable row level security;

drop policy if exists "practice_attempts own" on practice_attempts;
create policy "practice_attempts own" on practice_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
