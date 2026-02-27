-- Migration: Split full_name into first_name and last_name
-- Run this to update your database schema

-- Step 1: Add first_name and last_name columns
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Step 2: Migrate existing full_name data
-- This splits full_name into first_name and last_name
-- If full_name is "John Doe", it becomes first_name="John", last_name="Doe"
-- If full_name is "John", it becomes first_name="John", last_name=NULL
-- If full_name is NULL or empty, both fields remain NULL
UPDATE profiles
SET 
  first_name = CASE 
    WHEN full_name IS NULL OR TRIM(full_name) = '' THEN NULL
    WHEN POSITION(' ' IN TRIM(full_name)) > 0 THEN 
      TRIM(SUBSTRING(TRIM(full_name) FROM 1 FOR POSITION(' ' IN TRIM(full_name)) - 1))
    ELSE 
      TRIM(full_name)
  END,
  last_name = CASE 
    WHEN full_name IS NULL OR TRIM(full_name) = '' THEN NULL
    WHEN POSITION(' ' IN TRIM(full_name)) > 0 THEN 
      TRIM(SUBSTRING(TRIM(full_name) FROM POSITION(' ' IN TRIM(full_name)) + 1))
    ELSE 
      NULL
  END
WHERE first_name IS NULL AND last_name IS NULL;

-- Step 3: Update the trigger function to use first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'role', 'player')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4 (OPTIONAL): Drop the full_name column after verifying migration
-- Uncomment the line below only after you've verified that all data migrated correctly
-- and your application is working with first_name and last_name
-- ALTER TABLE profiles DROP COLUMN IF EXISTS full_name;

-- Verify migration (optional - run this to check results)
-- SELECT 
--   id, 
--   email, 
--   full_name, 
--   first_name, 
--   last_name,
--   CASE 
--     WHEN full_name IS NOT NULL AND (first_name IS NULL AND last_name IS NULL) THEN 'MIGRATION FAILED'
--     ELSE 'OK'
--   END as migration_status
-- FROM profiles
-- ORDER BY created_at DESC
-- LIMIT 20;
