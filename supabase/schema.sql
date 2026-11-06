-- Spot Mates database setup.
-- Paste into Supabase → SQL Editor → New query and press Run (or run it in two parts: tables, then the rest).

-- ============ Tables ============

create table public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  code text not null unique,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
alter table public.crews enable row level security;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) <= 30),
  crew_id uuid references public.crews on delete set null,
  kcal_goal int,
  macro_mode text not null default 'pct' check (macro_mode in ('pct','g')),
  pct_p int, pct_c int, pct_f int,
  protein_goal int, carb_goal int, fat_goal int,
  water_goal int not null default 100,
  workout_goal int not null default 4,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author uuid not null default auth.uid() references auth.users on delete cascade,
  crew_id uuid not null references public.crews on delete cascade,
  kind text not null check (kind in ('meal','workout','pr')),
  day date not null,
  title text check (char_length(title) <= 80),
  notes text check (char_length(notes) <= 600),
  photo_path text,
  -- meals
  meal_type text, place text,
  kcal int, protein numeric, carbs numeric, fat numeric,
  -- workouts
  wtype text, minutes int,
  exercises jsonb not null default '[]'::jsonb,
  -- PRs (title = the lift)
  lbs numeric, reps int,
  foods jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.posts enable row level security;
create index posts_crew_day on public.posts (crew_id, day desc);
create index posts_author_day on public.posts (author, day desc);

create table public.props (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.props enable row level security;

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  author uuid not null default auth.uid() references auth.users on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;
create index comments_post on public.comments (post_id, created_at);

create table public.water (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  oz int not null default 0,
  entries jsonb not null default '[]'::jsonb,
  primary key (user_id, day)
);
alter table public.water enable row level security;

-- ============ Helpers ============

-- The signed-in person's crew (security definer so policies can use it without recursion)
create or replace function public.my_crew() returns uuid
as $$ select crew_id from public.profiles where id = auth.uid() $$
language sql stable security definer set search_path to public;

-- Make a profile row for every new account
create or replace function public.handle_new_user() returns trigger
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end
$$ language plpgsql security definer set search_path to public;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Start a crew and join it; returns the crew with its invite code
create or replace function public.create_crew(crew_name text) returns public.crews
as $$
declare c public.crews; new_code text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  loop
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.crews where code = new_code);
  end loop;
  insert into public.crews (name, code, created_by) values (left(trim(crew_name), 40), new_code, auth.uid()) returning * into c;
  update public.profiles set crew_id = c.id where id = auth.uid();
  return c;
end
$$ language plpgsql security definer set search_path to public;

-- Join a crew with its invite code
create or replace function public.join_crew(crew_code text) returns public.crews
as $$
declare c public.crews;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into c from public.crews where code = upper(trim(crew_code));
  if not found then raise exception 'No crew uses that code. Check it and try again.'; end if;
  update public.profiles set crew_id = c.id where id = auth.uid();
  return c;
end
$$ language plpgsql security definer set search_path to public;

-- ============ Row level security ============


create policy "see my crew" on public.crews for select using (id = public.my_crew());

create policy "see me and my crew" on public.profiles for select
  using (id = auth.uid() or (crew_id is not null and crew_id = public.my_crew()));
create policy "edit my profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "see crew posts" on public.posts for select using (crew_id = public.my_crew());
create policy "post to my crew" on public.posts for insert with check (author = auth.uid() and crew_id = public.my_crew());
create policy "edit my posts" on public.posts for update using (author = auth.uid()) with check (author = auth.uid());
create policy "delete my posts" on public.posts for delete using (author = auth.uid());

create policy "see crew props" on public.props for select
  using (exists (select 1 from public.posts p where p.id = post_id and p.crew_id = public.my_crew()));
create policy "give props" on public.props for insert
  with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.crew_id = public.my_crew() and p.author <> auth.uid()));
create policy "take back props" on public.props for delete using (user_id = auth.uid());

create policy "see crew comments" on public.comments for select
  using (exists (select 1 from public.posts p where p.id = post_id and p.crew_id = public.my_crew()));
create policy "comment in crew" on public.comments for insert
  with check (author = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.crew_id = public.my_crew()));
create policy "delete my comments" on public.comments for delete using (author = auth.uid());

create policy "my water" on public.water for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ Table access ============
-- Policies above decide which rows; these grants let signed-in users reach the tables at all
grant usage on schema public to authenticated;
grant select on public.crews to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, delete on public.props to authenticated;
grant select, insert, delete on public.comments to authenticated;
grant select, insert, update, delete on public.water to authenticated;
grant execute on function public.create_crew(text), public.join_crew(text), public.my_crew() to authenticated;

-- ============ Live updates ============
alter publication supabase_realtime add table public.posts, public.props, public.comments;

-- ============ Photo storage ============
-- Public bucket: photo links are long random paths, so they can't be guessed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "upload my photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete my photos" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============ Progress: weigh-ins and goal weight (private) ============
create table public.weighins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  lbs numeric not null check (lbs > 0 and lbs < 1000),
  created_at timestamptz not null default now()
);
alter table public.weighins enable row level security;
create index weighins_user_day on public.weighins (user_id, day);
create policy "my weigh-ins" on public.weighins for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.goal_plans (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  plan jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.goal_plans enable row level security;
create policy "my goal plan" on public.goal_plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.weighins, public.goal_plans to authenticated;

-- ============ Saved meals (private) ============
create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  foods jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.saved_meals enable row level security;
create policy "my saved meals" on public.saved_meals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.saved_meals to authenticated;
