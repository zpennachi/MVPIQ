# Session Credits Setup

## ⚠️ IMPORTANT: Run This SQL First!

The credits system requires a database table. **You must run this SQL in your Supabase SQL Editor before credits will work:**

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/session-credits-schema.sql`
4. Click "Run"

## What This Does

- Creates the `session_credits` table
- Sets up RLS policies for security
- Creates indexes for performance
- Adds a helper function to count credits

## Testing

After running the SQL:
1. Have a mentor cancel a session
2. Check the browser console - you should see: `✅ Credit granted successfully`
3. Go to the booking page - you should see "Credits: 1" at the top
4. When booking, you should see the credit option in the modal

## Troubleshooting

If credits aren't showing:
1. Check browser console for errors
2. Verify the table exists: Run `SELECT * FROM session_credits LIMIT 1;` in Supabase SQL Editor
3. Check that the credit was granted: Run `SELECT * FROM session_credits WHERE user_id = 'YOUR_USER_ID';`
