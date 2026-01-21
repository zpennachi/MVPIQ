-- Create MVPIQ Admin Account (Simple Version)
-- 
-- STEP 1: Create the user in Supabase Auth first:
--   - Go to: Authentication > Users > Add User
--   - Email: admin@mvpiq.com
--   - Password: [set a secure password]
--   - Auto Confirm User: ✅ Yes
--   - Click "Create User"
--
-- STEP 2: Run this SQL (replace email if different):

-- Update the email below to match what you used in Step 1
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@mvpiq.com';

-- If the profile doesn't exist yet, use this instead:
-- (Replace 'USER-UUID-HERE' with the actual UUID from auth.users)
-- INSERT INTO profiles (id, email, full_name, role)
-- VALUES (
--   'USER-UUID-HERE',
--   'admin@mvpiq.com',
--   'MVPIQ Admin',
--   'admin'
-- );

-- Verify it worked:
SELECT id, email, full_name, role 
FROM profiles 
WHERE role = 'admin';
