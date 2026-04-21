-- Add 'inventory' to entries kind check constraint for the Home Ops inventory tracker.
-- Run this in the Supabase SQL Editor.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.entries'::regclass AND contype = 'c'
  LOOP
    EXECUTE 'ALTER TABLE public.entries DROP CONSTRAINT ' || r.conname;
  END LOOP;
END $$;

ALTER TABLE public.entries ADD CONSTRAINT entries_kind_check
  CHECK (kind IN ('daily','infusion','bloods','med','question','flag','appointment','admission','inventory'));
