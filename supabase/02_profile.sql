-- Add profile table (run this once, after the first schema.sql)
create table if not exists public.patient_profiles (
  patient_id uuid primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.patient_profiles enable row level security;

drop policy if exists profile_select on public.patient_profiles;
create policy profile_select on public.patient_profiles for select using (public.is_member(patient_id));

drop policy if exists profile_upsert on public.patient_profiles;
create policy profile_upsert on public.patient_profiles for insert with check (
  public.is_member(patient_id) and public.member_role(patient_id) in ('patient','support')
);

drop policy if exists profile_update on public.patient_profiles;
create policy profile_update on public.patient_profiles for update using (
  public.is_member(patient_id) and public.member_role(patient_id) in ('patient','support')
);

alter publication supabase_realtime add table public.patient_profiles;
