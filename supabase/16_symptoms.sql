-- Add 'symptom' to entries kind check constraint for the Symptom Deck tab.
-- Symptom Deck is the master ongoing-symptom registry — what's currently
-- going on with the patient, with first-noticed, still-active, pattern,
-- triggers, relievers, severity. Distinct from quick-tap Signal Sweep
-- entries and from the static side-effect library.
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
  CHECK (kind IN ('daily','infusion','bloods','med','question','flag','appointment','admission','inventory','signal','trend','dose','fuel','hydration','symptom'));
