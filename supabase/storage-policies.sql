-- Storage Bucket Policies for Videos bucket
-- Run this in Supabase SQL Editor after creating your Videos bucket
-- NOTE: Replace 'Videos' with your actual bucket name if different

-- First, drop any existing policies (optional, if you want to start fresh)
-- DROP POLICY IF EXISTS "Players can upload own videos" ON storage.objects;
-- DROP POLICY IF EXISTS "Players can view own videos" ON storage.objects;
-- DROP POLICY IF EXISTS "Players can delete own videos" ON storage.objects;
-- DROP POLICY IF EXISTS "Mentors can view all videos" ON storage.objects;

-- Allow authenticated users to upload to their own folder
-- The file path should be: {userId}/{filename}
CREATE POLICY "Players can upload own videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'Videos' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own videos
CREATE POLICY "Players can view own videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'Videos' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own videos
CREATE POLICY "Players can delete own videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'Videos' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow mentors to view all videos
CREATE POLICY "Mentors can view all videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'Videos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'mentor'
  )
);
