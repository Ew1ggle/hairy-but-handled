-- Create storage bucket for attachments (reports, photos, PDFs)
-- Run this in the Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'attachments');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attachments');
