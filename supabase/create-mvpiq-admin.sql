-- Create MVPIQ Admin Account
-- Instructions:
-- 1. First, create the user in Supabase Auth UI:
--    - Go to Authentication > Users > Add User
--    - Email: admin@mvpiq.com (or your preferred email)
--    - Password: (set a secure password)
--    - Auto Confirm User: Yes
--    - Click "Create User"
--
-- 2. Then run this SQL script

-- Replace these values with your admin details:
\set admin_email 'admin@mvpiq.com'
\set admin_name 'MVPIQ Admin'

-- Create admin profile
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = :'admin_email';
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % does not exist. Please create the user in Authentication > Users first.', :'admin_email';
  END IF;
  
  -- Create or update the profile with admin role
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (admin_user_id, :'admin_email', :'admin_name', 'admin')
  ON CONFLICT (id) DO UPDATE
  SET 
    role = 'admin',
    email = :'admin_email',
    full_name = :'admin_name';
  
  RAISE NOTICE 'Admin account created successfully!';
  RAISE NOTICE 'User ID: %', admin_user_id;
  RAISE NOTICE 'Email: %', :'admin_email';
END $$;

-- Verify the admin was created
SELECT id, email, full_name, role, created_at
FROM profiles 
WHERE role = 'admin';
