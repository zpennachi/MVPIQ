-- SAFE FIX: Remove problematic policies and create a working one
-- This version avoids recursive RLS checks

-- Step 1: Drop ALL potentially problematic policies
DROP POLICY IF EXISTS "Mentors can view profiles of users with booked sessions" ON profiles;
DROP POLICY IF EXISTS "Mentors can view all user profiles" ON profiles;

-- Step 2: Create a SECURITY DEFINER function to check if user is mentor
-- This avoids RLS recursion issues
CREATE OR REPLACE FUNCTION is_mentor(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'mentor'
  );
END;
$$;

-- Step 3: Create policy using the function (avoids recursion)
CREATE POLICY "Mentors can view all user profiles"
  ON profiles FOR SELECT
  USING (
    is_mentor(auth.uid())
    OR
    auth.uid() = id
  );
