-- ============================================================================
-- User accounts: profiles + saved mock results
-- ----------------------------------------------------------------------------
-- Run this ONCE in the Supabase dashboard → SQL Editor. Works with Supabase Auth
-- (email/password + Google). Creates:
--   • profiles      — one row per user (name, photo, email, phone)
--   • mock_results  — every submitted mock test, per user (for the dashboard)
--   • avatars       — public Storage bucket for profile photos
-- plus a trigger that auto-creates a profile when a user signs up.
--
-- ENABLE PROVIDERS in the dashboard separately:
--   Authentication → Providers → Email (on by default) and Google (paste the
--   OAuth client id/secret you create in Google Cloud).
-- ============================================================================

-- 1) Profiles ---------------------------------------------------------------
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  avatar_url text,
  email      text,
  phone      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles select own" on profiles;
create policy "profiles select own" on profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles update own" on profiles;
create policy "profiles update own" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles insert own" on profiles;
create policy "profiles insert own" on profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile row on signup, pulling name/photo from the provider
-- metadata (Google supplies name + picture; email/password supplies full_name).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    new.email,
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) Saved mock results -----------------------------------------------------
create table if not exists mock_results (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  selection        jsonb not null,   -- MockSelection (mode + set/year + difficulty)
  marks            numeric not null,
  max_marks        numeric not null,
  mark_correct     numeric not null default 1,    -- marking scheme (to rebuild the report)
  mark_wrong       numeric not null default 0,
  total_questions  integer not null,
  correct          integer not null,
  wrong            integer not null,
  unanswered       integer not null,
  question_ids     jsonb not null,   -- to rebuild the paper for review
  answers          jsonb not null,   -- questionId -> chosen option
  started_at       timestamptz,
  submitted_at     timestamptz,
  duration_minutes integer,
  pause_count      integer default 0,
  created_at       timestamptz not null default now()
);

create index if not exists mock_results_user_idx
  on mock_results(user_id, created_at desc);

alter table mock_results enable row level security;

drop policy if exists "mock_results own" on mock_results;
create policy "mock_results own" on mock_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) Avatars storage bucket (public read) -----------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars auth write" on storage.objects;
create policy "avatars auth write" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid() is not null);

drop policy if exists "avatars auth update" on storage.objects;
create policy "avatars auth update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid() is not null);

-- Done. New signups will get a profiles row automatically.
