-- Fix Profiles RLS Policy - Revert to working version
-- The consolidated policy was causing recursive RLS checks
-- This restores the original separate policies that work correctly

-- Drop the problematic consolidated policy
DROP POLICY IF EXISTS "Users can view relevant profiles" ON profiles;

-- Restore original separate policies (with performance fix)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can view mentor profiles"
  ON profiles FOR SELECT
  USING (role = 'mentor');

CREATE POLICY "Mentors can view all user profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'mentor'
    )
  );

SELECT '✅ Fixed profiles RLS policy - restored to working version' as status;
