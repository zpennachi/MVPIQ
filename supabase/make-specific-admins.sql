-- SQL script to make asurmani@mvp-iq.com and dcornelius@mvp-iq.com admins
-- Run this in the Supabase SQL Editor

-- 1. Ensure the users exist in the auth.users table first (they need to sign up or be invited)
-- 2. Then run this update statement to make them admins

UPDATE profiles
SET role = 'admin'
WHERE email IN ('asurmani@mvp-iq.com', 'dcornelius@mvp-iq.com');

-- Verify the changes were successful
SELECT id, email, full_name, role 
FROM profiles 
WHERE email IN ('asurmani@mvp-iq.com', 'dcornelius@mvp-iq.com');
