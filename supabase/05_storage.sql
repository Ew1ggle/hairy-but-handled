-- Create PRIVATE storage bucket for attachments (reports, photos, PDFs)
-- Run this in the Supabase SQL Editor
-- If you already ran the previous version, run the DROP policies first

-- Drop any existing policies
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete attachments" ON storage.objects;
DROP POLICY IF EXISTS "Members can read patient attachments" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload patient attachments" ON storage.objects;
DROP POLICY IF EXISTS "Members can delete patient attachments" ON storage.objects;

-- Create or update bucket as PRIVATE (not public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Only care circle members can read files in their patient's folder
-- Files are stored as: {patient_id}/{random_uuid}.{ext}
CREATE POLICY "Members can read patient attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments'
  AND public.is_member((string_to_array(name, '/'))[1]::uuid)
);

-- Only patients and support people can upload to their patient's folder
CREATE POLICY "Members can upload patient attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND public.is_member((string_to_array(name, '/'))[1]::uuid)
  AND public.member_role((string_to_array(name, '/'))[1]::uuid) IN ('patient', 'support')
);

-- Only patients can delete files from their folder
CREATE POLICY "Members can delete patient attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments'
  AND public.is_member((string_to_array(name, '/'))[1]::uuid)
  AND public.member_role((string_to_array(name, '/'))[1]::uuid) = 'patient'
);
