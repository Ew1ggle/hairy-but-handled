-- Add 'trend' to entries kind check constraint for rule-detected pattern entries.
-- A trend is a persistent record of a rule that fired (e.g. "temp creeping up"),
-- with a detectedAt timestamp and optional resolvedAt set when the rule stops
-- firing. Past-trends tab filters on resolvedAt IS NOT NULL.
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
  CHECK (kind IN ('daily','infusion','bloods','med','question','flag','appointment','admission','inventory','signal','trend'));
