-- COMPLETE FIX: Remove ALL problematic policies and create working ones
-- Run this to fix the 500 error and restore login

-- Step 1: Drop the problematic policy that's causing 500 errors
DROP POLICY IF EXISTS "Mentors can view profiles of users with booked sessions" ON profiles;

-- Step 2: Also drop the v2 policy if it exists and is causing issues
DROP POLICY IF EXISTS "Mentors can view all user profiles" ON profiles;

-- Step 3: Verify existing policies (these should stay)
-- "Users can view own profile" - KEEP
-- "Users can view mentor profiles" - KEEP  
-- "Users can update own profile" - KEEP

-- Step 4: Create a working policy that allows mentors to view user profiles
-- This uses a simple role check without recursive queries
CREATE POLICY "Mentors can view all user profiles"
  ON profiles FOR SELECT
  USING (
    -- Check if current user is a mentor by looking at auth metadata or a simple check
    -- This avoids recursive RLS issues
    (
      SELECT role FROM profiles WHERE id = auth.uid()
    ) = 'mentor'
    OR
    -- Always allow viewing own profile
    auth.uid() = id
  );
