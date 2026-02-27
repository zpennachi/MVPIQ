-- Storage Bucket Policies for Profile Photos bucket
-- Run this in Supabase SQL Editor after creating your 'profile-photos' bucket
-- 
-- First, create the bucket in Supabase Storage:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket named 'profile-photos'
-- 3. Make it public (or configure RLS as needed)
-- 4. Then run this SQL

-- Allow authenticated users to upload their own profile photos
CREATE POLICY "Users can upload own profile photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view all profile photos (for displaying in UI)
CREATE POLICY "Users can view profile photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'profile-photos' AND
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to update their own profile photos
CREATE POLICY "Users can update own profile photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own profile photos
CREATE POLICY "Users can delete own profile photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);
