-- Add bio column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Update RLS policies to allow users to update their own bio (should already be covered by general profile update policy, but good to keep in mind)
-- The existing policy for updating profiles usually looks like:
-- CREATE POLICY "Users can update their own profile" ON profiles
-- FOR UPDATE USING (auth.uid() = id);
