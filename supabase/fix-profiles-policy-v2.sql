-- Fix Profiles RLS Policy - Avoid Recursive Checks
-- The issue is that checking if user is a mentor requires querying profiles table
-- which triggers RLS again, causing recursion. We'll use a simpler approach.

-- Drop all existing profiles SELECT policies
DROP POLICY IF EXISTS "Users can view relevant profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view mentor profiles" ON profiles;
DROP POLICY IF EXISTS "Mentors can view all user profiles" ON profiles;

-- Create a helper function to check if current user is a mentor
-- This avoids recursive RLS checks by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_current_user_mentor()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- SECURITY DEFINER allows this to bypass RLS on profiles table
  SELECT role INTO user_role
  FROM profiles
  WHERE id = (select auth.uid());
  
  RETURN COALESCE(user_role = 'mentor', false);
END;
$$;

-- Now create the policies
-- Users can view own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING ((select auth.uid()) = id);

-- Users can view mentor profiles (anyone can see mentors)
CREATE POLICY "Users can view mentor profiles"
  ON profiles FOR SELECT
  USING (role = 'mentor');

-- Mentors can view all user profiles (using helper function to avoid recursion)
CREATE POLICY "Mentors can view all user profiles"
  ON profiles FOR SELECT
  USING (public.is_current_user_mentor());

SELECT '✅ Fixed profiles RLS policy - using helper function to avoid recursion' as status;
