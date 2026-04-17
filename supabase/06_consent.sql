-- Consent records — tracks when users consent to data collection
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_version text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  consent_type text NOT NULL CHECK (consent_type IN ('privacy_policy', 'terms_of_service', 'data_collection', 'care_circle_sharing', 'cross_border')),
  UNIQUE (user_id, consent_type, consent_version)
);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- Users can only read their own consent records
CREATE POLICY "Users can read own consent"
ON public.consent_records FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own consent records
CREATE POLICY "Users can insert own consent"
ON public.consent_records FOR INSERT
WITH CHECK (user_id = auth.uid());
