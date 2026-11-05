-- Adds the list of foods to meal posts (MyFitnessPal-style food log). Run once in Supabase → SQL Editor.
alter table public.posts add column if not exists foods jsonb not null default '[]'::jsonb;
