-- Add 'appointment' as a valid entry kind (run once in Supabase SQL Editor).
alter table public.entries drop constraint if exists entries_kind_check;
alter table public.entries add constraint entries_kind_check
  check (kind in ('daily','infusion','bloods','med','question','flag','appointment'));
