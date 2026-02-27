-- Add profile_photo_url column to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Note: You'll also need to create a storage bucket named 'profile-photos' in Supabase Storage
-- and set up appropriate RLS policies for it (similar to the Videos bucket)
