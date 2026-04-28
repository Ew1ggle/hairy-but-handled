-- Hairy but Handled — schema (run once in Supabase SQL Editor)

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  kind text not null check (kind in ('daily','infusion','bloods','med','question','flag','appointment','admission','inventory','signal','trend','dose')),
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists entries_patient_created_idx on public.entries (patient_id, created_at desc);
create index if not exists entries_patient_kind_idx on public.entries (patient_id, kind);

create table if not exists public.members (
  patient_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('patient','support','doctor')),
  display_name text,
  created_at timestamptz not null default now(),
  primary key (patient_id, user_id)
);
create index if not exists members_user_idx on public.members (user_id);

-- Pending invites (by email). Accepted on next sign-in of matching email.
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  email text not null,
  role text not null check (role in ('support','doctor')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (patient_id, email)
);
create index if not exists invites_email_idx on public.invites (lower(email));

alter table public.entries enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;

create or replace function public.is_member(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members m where m.patient_id = pid and m.user_id = auth.uid());
$$;

create or replace function public.member_role(pid uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.members where patient_id = pid and user_id = auth.uid() limit 1;
$$;

-- entries
drop policy if exists entries_select on public.entries;
create policy entries_select on public.entries for select using (public.is_member(patient_id));
drop policy if exists entries_insert on public.entries;
create policy entries_insert on public.entries for insert with check (
  public.is_member(patient_id) and public.member_role(patient_id) in ('patient','support')
);
drop policy if exists entries_update on public.entries;
create policy entries_update on public.entries for update using (
  public.is_member(patient_id) and public.member_role(patient_id) in ('patient','support')
);
drop policy if exists entries_delete on public.entries;
create policy entries_delete on public.entries for delete using (
  public.is_member(patient_id) and public.member_role(patient_id) in ('patient','support')
);

-- members
drop policy if exists members_select on public.members;
create policy members_select on public.members for select using (
  user_id = auth.uid()
  or exists (select 1 from public.members m where m.patient_id = public.members.patient_id and m.user_id = auth.uid() and m.role = 'patient')
);
drop policy if exists members_insert_self on public.members;
create policy members_insert_self on public.members for insert with check (
  user_id = auth.uid() and role = 'patient' and patient_id = auth.uid()
);
drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete using (
  user_id = auth.uid()
  or exists (select 1 from public.members m where m.patient_id = public.members.patient_id and m.user_id = auth.uid() and m.role = 'patient')
);

-- invites: patient OR any of their support circle can manage invites.
-- Anyone can read invites addressed to their own email (to accept them).
drop policy if exists invites_select_own on public.invites;
create policy invites_select_own on public.invites for select using (
  lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  or exists (
    select 1 from public.members m
    where m.patient_id = public.invites.patient_id
      and m.user_id = auth.uid()
      and m.role in ('patient', 'support')
  )
);
drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites for insert with check (
  exists (
    select 1 from public.members m
    where m.patient_id = public.invites.patient_id
      and m.user_id = auth.uid()
      and m.role in ('patient', 'support')
  )
);
drop policy if exists invites_delete on public.invites;
create policy invites_delete on public.invites for delete using (
  lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  or exists (
    select 1 from public.members m
    where m.patient_id = public.invites.patient_id
      and m.user_id = auth.uid()
      and m.role in ('patient', 'support')
  )
);

-- RPC: a signed-in user claims any invites matching their email, adding themselves as a member and deleting the invite.
create or replace function public.accept_invites()
returns int language plpgsql security definer set search_path = public as $$
declare
  n int := 0;
begin
  with my_email as (
    select lower(coalesce((auth.jwt() ->> 'email'), '')) as e
  ), accepted as (
    insert into public.members (patient_id, user_id, role)
    select i.patient_id, auth.uid(), i.role
    from public.invites i, my_email
    where lower(i.email) = my_email.e
    on conflict (patient_id, user_id) do nothing
    returning patient_id
  )
  select count(*) into n from accepted;
  delete from public.invites i using (select lower(coalesce((auth.jwt() ->> 'email'), '')) as e) m
    where lower(i.email) = m.e;
  return n;
end; $$;

-- Realtime
alter publication supabase_realtime add table public.entries;
alter publication supabase_realtime add table public.members;
