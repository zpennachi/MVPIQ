-- Add 'school' role to profiles table
-- Run this in Supabase SQL Editor

-- Drop existing constraint
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint with 'school' role
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('player', 'mentor', 'coach', 'admin', 'school'));
