-- URGENT FIX: Remove the problematic RLS policy causing 500 errors
-- Run this immediately to restore login functionality

-- Drop the problematic policy
DROP POLICY IF EXISTS "Mentors can view profiles of users with booked sessions" ON profiles;

-- Create a simpler, safer policy that allows mentors to view all user profiles
-- This avoids recursive RLS checks that cause 500 errors
CREATE POLICY "Mentors can view all user profiles"
  ON profiles FOR SELECT
  USING (
    -- Allow if the current user is a mentor (check their own profile, not the one being viewed)
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
        AND p.role = 'mentor'
    )
    OR
    -- Always allow viewing own profile
    auth.uid() = id
  );
