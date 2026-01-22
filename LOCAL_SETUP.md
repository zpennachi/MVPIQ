# Local Development Setup Guide

This guide will help you set up the local development environment for the Football Feedback App.

## Prerequisites

- ✅ Node.js 18+ installed (you have v24.13.0)
- ✅ npm installed
- ✅ Git installed

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Environment Variables

1. **Copy the example file:**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Fill in your environment variables** (see details below)

### Required: Supabase Setup

1. Go to [supabase.com](https://supabase.com) and sign in
2. Open your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy these values to `.env.local`:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

5. **Run database migrations:**
   - Go to **SQL Editor** in Supabase
   - Run `supabase/schema.sql` (if not already run)
   - Run `supabase/add-school-role.sql` (for the new school role)

### Required: Google OAuth Setup (for Calendar & Gmail)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. **Enable APIs:**
   - Go to **APIs & Services** → **Library**
   - Enable **Google Calendar API**
   - Enable **Gmail API**
4. **Create OAuth 2.0 Credentials:**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - If prompted, configure OAuth consent screen:
     - User Type: **External** (for testing)
     - App name: "MVPIQ"
     - Support email: your email
     - Add scopes: `https://www.googleapis.com/auth/calendar`, `https://www.googleapis.com/auth/gmail.send`
     - Add test users: your email address
   - Application type: **Web application**
   - Name: "MVPIQ Local Dev"
   - **Authorized redirect URIs:**
     - `http://localhost:3000/api/calendar/oauth/callback`
   - Click **Create**
   - Copy **Client ID** → `GOOGLE_CLIENT_ID`
   - Copy **Client secret** → `GOOGLE_CLIENT_SECRET`
5. **Add to `.env.local`:**
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/oauth/callback
   ```

### Optional: Stripe Setup (for payment testing)

1. Go to [stripe.com](https://stripe.com) and sign in
2. Go to **Developers** → **API keys**
3. Use **Test mode** keys (toggle in top right)
4. Copy:
   - **Publishable key** (starts with `pk_test_`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** (starts with `sk_test_`) → `STRIPE_SECRET_KEY`
5. **For webhooks (local testing with ngrok):**
   - Install ngrok: `npm install -g ngrok` or download from [ngrok.com](https://ngrok.com)
   - Run: `ngrok http 3000`
   - Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
   - In Stripe Dashboard → **Developers** → **Webhooks**
   - Add endpoint: `https://abc123.ngrok.io/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
   - Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`

## Step 3: Verify Environment Variables

Your `.env.local` should look like this:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth (Required)
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/oauth/callback

# Stripe (Optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 4: Start the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Step 5: Initial Setup in the App

1. **Create an Admin Account:**
   - Go to [http://localhost:3000/register](http://localhost:3000/register)
   - Register with email/password
   - Select role: **Player** (we'll change it to admin in the database)
   - Or use SQL in Supabase to create admin:
     ```sql
     -- First, create user in auth.users (via Supabase Auth or app)
     -- Then update profile:
     UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
     ```

2. **Connect Google Calendar (for admin):**
   - Log in as admin
   - Go to `/dashboard/settings`
   - Click "Connect Google Calendar"
   - Complete OAuth flow
   - This enables:
     - Google Calendar event creation
     - Google Meet link generation
     - Gmail email sending (uses admin's OAuth tokens)

## Testing the Setup

### Test Google Calendar Integration

1. Visit: [http://localhost:3000/api/calendar/test](http://localhost:3000/api/calendar/test)
2. Should see: `"success": true` with OAuth status

### Test Email Sending

1. Visit: [http://localhost:3000/api/test-email](http://localhost:3000/api/test-email)
2. Should send a test email via Gmail API

### Test User Registration

1. Go to [http://localhost:3000/register](http://localhost:3000/register)
2. Try registering as:
   - **Player** ✅ (should work)
   - **Coach** ✅ (should work)
   - **Mentor** ❌ (should show "invite-only" message)
   - **School** ❌ (should show "invite-only" message)

### Test Admin Dashboard

1. Log in as admin
2. Go to `/dashboard/admin`
3. Should see:
   - All user types (players, coaches, mentors, schools, admins)
   - "Invite User" button
   - Ability to invite mentors and schools

## Common Issues

### "Invalid environment variables" error

- Check that `.env.local` exists (not `.env`)
- Verify all required variables are set
- Restart the dev server after changing `.env.local`

### "OAuth not connected" error

- Make sure you've connected Google Calendar in `/dashboard/settings` as an admin
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Verify redirect URI matches: `http://localhost:3000/api/calendar/oauth/callback`

### "Database error" or "RLS policy" errors

- Make sure you ran `supabase/schema.sql` in Supabase SQL Editor
- Run `supabase/add-school-role.sql` for the school role
- Check that your Supabase keys are correct

### Port 3000 already in use

```bash
# Use a different port
npm run dev -- -p 3001
```

Then update `NEXT_PUBLIC_APP_URL=http://localhost:3001` and `GOOGLE_REDIRECT_URI=http://localhost:3001/api/calendar/oauth/callback`

## Next Steps

- Test booking a session
- Test email notifications
- Test admin invite system
- Make changes and see them hot-reload
- Check browser console for any errors

## Tips

- **Hot Reload**: Changes to code will automatically refresh in the browser
- **TypeScript Errors**: Check terminal for type errors
- **Database Changes**: Use Supabase SQL Editor to make schema changes
- **Environment Variables**: Never commit `.env.local` to git (it's in `.gitignore`)

## Need Help?

- Check `README.md` for general documentation
- Check `QUICKSTART.md` for quick start guide
- Check other `.md` files in the root for specific features
- Check browser console and terminal for error messages
