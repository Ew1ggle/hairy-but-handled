-- Add 'dose' to entries kind check constraint for the Dose Trace tab.
-- A dose is one specific dose-taking event for a med in the Med Deck:
-- time due, time taken, status (taken / late / missed / vomited-after /
-- withheld / refused), did-it-help, what-changed-after, reaction-after.
-- Each MedEntry describes a med "in the mix"; each DoseEntry is one
-- recorded delivery (or non-delivery) of that med.
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
  CHECK (kind IN ('daily','infusion','bloods','med','question','flag','appointment','admission','inventory','signal','trend','dose'));
