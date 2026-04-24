-- 12_user_profiles.sql
-- Per-user profile storage — for support people (and anyone, really) to hold
-- their own name, relationship preferences, phone, notification prefs, and
-- "what I want my supporters to know" notes. Separate from patient_profiles
-- (which is keyed by patient_id and holds the clinical record).
--
-- Safe to re-run.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own on public.user_profiles
  for select using (user_id = auth.uid());

drop policy if exists user_profiles_insert_own on public.user_profiles;
create policy user_profiles_insert_own on public.user_profiles
  for insert with check (user_id = auth.uid());

drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own on public.user_profiles
  for update using (user_id = auth.uid());

-- Patients need to see basic identity of the support people in their circle
-- so the profile's "Supports" section and the Care tab can show real names
-- instead of opaque ids. We expose name + preferredName only.
drop policy if exists user_profiles_select_by_patient on public.user_profiles;
create policy user_profiles_select_by_patient on public.user_profiles
  for select using (
    exists (
      select 1
      from public.members me
      join public.members them on them.patient_id = me.patient_id
      where me.user_id = auth.uid()
        and me.role = 'patient'
        and them.user_id = public.user_profiles.user_id
    )
  );
