-- GATE CS Prep Desk: per-student progress, stored in Supabase.
-- Every table has Row Level Security: a signed-in student can only read and write their own rows.
-- Safe to run more than once.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  target_year int not null default 2027,
  created_at timestamptz not null default now()
);

-- One row per answered question (practice, today's set, revision, mock, game-free PYQ practice)
create table if not exists public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  qid text not null,
  subj text not null,
  topic text,
  source text,                 -- pyq | builtin | ai
  mode text not null,          -- practice | daily | revision | mock | pattern | topic
  correct boolean not null,
  gave_up boolean not null default false,
  response jsonb,
  time_ms int,
  created_at timestamptz not null default now()
);
create index if not exists attempts_user_time on public.attempts (user_id, created_at desc);
create index if not exists attempts_user_q on public.attempts (user_id, qid);

-- Spaced-revision state per question
create table if not exists public.srs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  qid text not null,
  box int not null,
  due int not null,            -- day number (local date / 86400000)
  updated_at timestamptz not null default now(),
  primary key (user_id, qid)
);

create table if not exists public.mocks (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null,
  score numeric not null,
  max numeric not null,
  ok int not null, bad int not null, na int not null,
  by_subject jsonb,
  minutes_used int,
  taken_at timestamptz not null default now()
);
create index if not exists mocks_user_time on public.mocks (user_id, taken_at desc);

-- What was studied and for how long (lessons, doubt chat, games, practice sessions)
create table if not exists public.study_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('lesson','pattern','revision_sheet','doubt','practice','game','mock')),
  subj text,
  topic text,
  seconds int not null default 0,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists study_user_time on public.study_log (user_id, created_at desc);

create table if not exists public.game_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game text not null,
  level int not null default 1,
  correct int not null,
  total int not null,
  seconds int,
  created_at timestamptz not null default now()
);
create index if not exists games_user_time on public.game_scores (user_id, created_at desc);

-- AI-generated practice questions a student has saved
create table if not exists public.user_questions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  qid text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, qid)
);

-- Row Level Security: own rows only
do $$
declare t text;
begin
  foreach t in array array['attempts','srs','mocks','study_log','game_scores','user_questions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format('create policy own_rows on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
drop policy if exists own_profile on public.profiles;
create policy own_profile on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Create a profile row when a student signs up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
