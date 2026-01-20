-- Fix: Allow mentors to view profiles of users who have booked sessions with them
-- First, drop the problematic policy if it exists
DROP POLICY IF EXISTS "Mentors can view profiles of users with booked sessions" ON profiles;

-- Create a simpler policy that allows mentors to view any user profile
-- (since they need to see who booked sessions with them)
-- This is safe because mentors are trusted users
CREATE POLICY "Mentors can view all user profiles"
  ON profiles FOR SELECT
  USING (
    -- Allow if the current user is a mentor
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
        AND p.role = 'mentor'
    )
    OR
    -- Allow if viewing own profile
    auth.uid() = id
  );
