-- Fix: Allow players to view mentor profiles
-- Run this in Supabase SQL Editor

-- Drop existing policy if it exists (optional)
DROP POLICY IF EXISTS "Users can view mentor profiles" ON profiles;

-- Create policy to allow viewing mentor profiles
CREATE POLICY "Users can view mentor profiles"
  ON profiles FOR SELECT
  USING (role = 'mentor');
