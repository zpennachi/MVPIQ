-- Fix profiles foreign key to cascade on delete
-- This allows deleting auth.users without manually deleting profiles first

-- Drop the existing foreign key constraint
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Recreate it with ON DELETE CASCADE
ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Note: This means when a user is deleted from auth.users,
-- their profile will be automatically deleted, which will
-- cascade to all related data (videos, feedback, etc.)
