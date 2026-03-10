-- Fix for infinite recursion in profiles RLS policy
-- 
-- The previous policy caused a 500 error (infinite recursion) because it queried 
-- the profiles table from inside the profiles policy. To fix this, we create a 
-- SECURITY DEFINER function that bypasses RLS to check the user's role safely.

-- 1. Create a secure function to fetch the current user's role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Drop the recursive policy from the previous script
DROP POLICY IF EXISTS "Users can view relevant profiles" ON profiles;

-- 3. Create the new, safe non-recursive policy
CREATE POLICY "Users can view relevant profiles"
  ON profiles FOR SELECT
  USING (
    -- Users can always view their own profile
    id = auth.uid() OR
    -- Anyone can view mentor and admin profiles (for scheduling/UI purposes)
    role IN ('mentor', 'admin_mentor', 'admin', 'coach') OR
    -- Mentors, coaches, and admins can view EVERYONE'S profile
    public.get_current_user_role() IN ('mentor', 'admin_mentor', 'admin', 'coach')
  );

-- Note: We only need to fix the `profiles` table. The other tables (videos, feedback, etc) 
-- are safe because they query the `profiles` table, not themselves.
