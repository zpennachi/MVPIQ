-- Give a specific user the admin_mentor role
UPDATE profiles 
SET role = 'admin_mentor' 
WHERE email = 'zackpennachi@gmail.com';
