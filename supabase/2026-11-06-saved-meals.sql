-- Spot Mates update: saved meals (private, only you see your own).
-- Paste into Supabase → SQL Editor → New query and press Run.
create table if not exists public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  foods jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.saved_meals enable row level security;
create policy "my saved meals" on public.saved_meals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.saved_meals to authenticated;
