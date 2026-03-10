-- Add RLS policy to allow admins and admin_mentors to update other profiles
-- Currently, the "Users can update own profile" policy restricts client-side updates
-- to only the user's own row. This policy grants admins the power to update any row.

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    public.get_current_user_role() IN ('admin', 'admin_mentor')
  )
  WITH CHECK (
    public.get_current_user_role() IN ('admin', 'admin_mentor')
  );
