-- Create MVPIQ Admin Account
-- Run this in your Supabase SQL Editor

-- IMPORTANT: First, create the user via Supabase Auth UI or API
-- Go to Authentication > Users > Add User
-- Email: admin@mvpiq.com (or your preferred admin email)
-- Password: (set a secure password)
-- Auto Confirm User: Yes
-- Then run the SQL below

-- Step 1: Get the user ID (replace with your admin email)
-- Run this first to get the user ID:
DO $$
DECLARE
  admin_user_id UUID;
  admin_email TEXT := 'admin@mvpiq.com';  -- Change this to your admin email
  admin_name TEXT := 'MVPIQ Admin';       -- Change this to admin's name
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % does not exist. Please create the user in Authentication > Users first.', admin_email;
  END IF;
  
  -- Create or update the profile with admin role
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (admin_user_id, admin_email, admin_name, 'admin')
  ON CONFLICT (id) DO UPDATE
  SET 
    role = 'admin',
    email = admin_email,
    full_name = admin_name;
  
  RAISE NOTICE 'Admin account created successfully!';
  RAISE NOTICE 'User ID: %', admin_user_id;
  RAISE NOTICE 'Email: %', admin_email;
END $$;

-- Step 2: Verify the admin was created
SELECT id, email, full_name, role, created_at
FROM profiles 
WHERE role = 'admin';

-- Alternative: If you already know the user ID, use this:
-- UPDATE profiles
-- SET role = 'admin', email = 'admin@mvpiq.com', full_name = 'MVPIQ Admin'
-- WHERE id = 'paste-user-id-here'
-- ON CONFLICT (id) DO NOTHING;
