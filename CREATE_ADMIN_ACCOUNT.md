# How to Create an Admin Account

## The Problem
Your test shows `totalAdmins: 0`, which means there are **no admin accounts** in your database. OAuth requires an admin account to store the calendar connection.

## Solution: Create an Admin Account

### Step 1: Create a User Account (if you don't have one)

**Option A: Register through the app**
1. Go to `/register` on your site
2. Register with your email and password
3. Note your email address

**Option B: Create directly in Supabase Auth**
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter your email and password
4. Click "Create user"

### Step 2: Make That User an Admin

1. Go to Supabase Dashboard → SQL Editor
2. Click "New query"
3. Run this SQL (replace `your-email@example.com` with your actual email):

```sql
-- Update your user to be admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Verify it worked
SELECT id, email, role, google_calendar_connected 
FROM profiles 
WHERE role = 'admin';
```

### Step 3: Connect Google Calendar

1. Go to `/dashboard/settings` as that admin user
2. Scroll to "Google Calendar Integration"
3. Click "Connect Google Calendar"
4. Complete the OAuth flow
5. You should see "Calendar Connected" with a green checkmark

### Step 4: Test Again

1. Run the test endpoint: `/api/calendar/test`
2. Should now show:
   - `totalAdmins: 1`
   - `adminsWithTokens: 1`
   - `connected: true`
   - `hasAccessToken: true`
   - `hasRefreshToken: true`

## Troubleshooting

**If the UPDATE doesn't work:**
- Make sure the user exists in `auth.users` first
- Check that a profile was created (should happen automatically on registration)
- Verify the email matches exactly (case-sensitive)

**If you can't find your user:**
```sql
-- List all users
SELECT id, email, role FROM profiles ORDER BY created_at DESC;

-- List all auth users
SELECT id, email FROM auth.users ORDER BY created_at DESC;
```

**If the profile doesn't exist:**
- The profile should be created automatically when you register
- If not, you may need to run the profile creation trigger manually
- Or just register through the app - it will create the profile automatically
