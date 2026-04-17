-- Fix entries kind check constraint to allow appointment and admission types
-- Run this in the Supabase SQL Editor

-- Drop ALL existing check constraints on entries (the auto-generated name may vary)
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

-- Add the correct constraint with all entry kinds
ALTER TABLE public.entries ADD CONSTRAINT entries_kind_check
  CHECK (kind IN ('daily','infusion','bloods','med','question','flag','appointment','admission'));
