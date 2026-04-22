-- 08_invites_support.sql
-- Widen invites RLS so support members can also create/read/delete invites for
-- their patient. Previously only role='patient' could, which broke the flow
-- where a caregiver (support) sets up the circle on behalf of someone at
-- capacity.
--
-- Safe to re-run: each policy is dropped first.

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
