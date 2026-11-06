-- Spot Mates update: PRs, weigh-ins and goal weight (for the Progress tab).
-- Paste into Supabase → SQL Editor → New query and press Run. Safe to run more than once.

-- PRs are posts with kind 'pr', so friends can give props and comment on them
alter table public.posts drop constraint if exists posts_kind_check;
alter table public.posts add constraint posts_kind_check check (kind in ('meal','workout','pr'));
alter table public.posts add column if not exists lbs numeric;
alter table public.posts add column if not exists reps int;

-- Weigh-ins: private, only you see your own
create table if not exists public.weighins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  lbs numeric not null check (lbs > 0 and lbs < 1000),
  created_at timestamptz not null default now()
);
alter table public.weighins enable row level security;
create index if not exists weighins_user_day on public.weighins (user_id, day);
drop policy if exists "my weigh-ins" on public.weighins;
create policy "my weigh-ins" on public.weighins for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Goal weight plan: private, only you see your own
create table if not exists public.goal_plans (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  plan jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.goal_plans enable row level security;
drop policy if exists "my goal plan" on public.goal_plans;
create policy "my goal plan" on public.goal_plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.weighins, public.goal_plans to authenticated;
