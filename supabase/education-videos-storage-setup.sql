-- Storage Bucket Setup for Education Videos
-- Run this in Supabase SQL Editor after creating the bucket

-- Create the education-videos bucket (if it doesn't exist)
-- Note: Bucket creation must be done via Supabase Dashboard > Storage > New Bucket
-- Bucket name: education-videos
-- Public: true (so videos are accessible to all users)
-- File size limit: 524288000 (500MB)

-- Storage Policies for education-videos bucket
-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Admins can upload education videos" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can view education videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete education videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update education videos" ON storage.objects;

-- Allow admins to upload videos
CREATE POLICY "Admins can upload education videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'education-videos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Allow everyone to view education videos (public bucket)
CREATE POLICY "Everyone can view education videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'education-videos');

-- Allow admins to delete education videos
CREATE POLICY "Admins can delete education videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'education-videos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Allow admins to update education videos
CREATE POLICY "Admins can update education videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'education-videos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
