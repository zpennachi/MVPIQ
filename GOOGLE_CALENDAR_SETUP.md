# Google Calendar Integration Setup Guide

This guide will walk you through setting up Google Calendar integration so that when sessions are booked, they automatically create Google Calendar events with Google Meet links.

## Prerequisites

- Google Cloud Console account
- Supabase project
- Your app deployed (or running locally)

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Name it (e.g., "MVPIQ Calendar Integration")
4. Click **"Create"**

## Step 2: Enable Google Calendar API

1. In your Google Cloud project, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Calendar API"**
3. Click on it and press **"Enable"**
4. Also enable **"Google OAuth2 API"** (if not already enabled)

## Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** (unless you have Google Workspace)
3. Fill in the required fields:
   - **App name**: MVPIQ (or your app name)
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **"Save and Continue"**
5. On **"Scopes"** page, click **"Add or Remove Scopes"**
6. Add these scopes:
   - `https://www.googleapis.com/auth/calendar` (Create, edit, and delete calendars)
   - `https://www.googleapis.com/auth/calendar.events` (Create, edit, and delete events)
7. Click **"Update"** → **"Save and Continue"**
8. On **"Test users"** (if in testing mode), add test emails
9. Click **"Save and Continue"** → **"Back to Dashboard"**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Choose **"Web application"**
4. Name it (e.g., "MVPIQ Web Client")
5. Add **Authorized redirect URIs**:
   - For Supabase: `https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/auth/v1/callback`
   - For local dev: `http://localhost:3000/auth/callback`
   - For production: `https://[YOUR_VERCEL_APP].vercel.app/auth/callback`
6. Click **"Create"**
7. **Copy the Client ID and Client Secret** - you'll need these!

## Step 5: Add Environment Variables

Add these to your `.env.local` and Vercel:

```env
# Google OAuth (for Calendar integration)
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/auth/callback
```

**Also add to Supabase:**
1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Google** provider
3. Enable it and add:
   - **Client ID**: Your Google Client ID
   - **Client Secret**: Your Google Client Secret
4. Add redirect URL: `https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/auth/v1/callback`
5. Save

## Step 6: Update Database Schema

Run this SQL in your Supabase SQL Editor to add Google Calendar fields to profiles:

```sql
-- Add Google Calendar integration fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
ADD COLUMN IF NOT EXISTS google_calendar_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_calendar_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_google_calendar_connected 
ON profiles(google_calendar_connected) 
WHERE google_calendar_connected = true;
```

## Step 7: Install Required Packages

```bash
npm install googleapis
```

## Step 8: Test the Integration

1. Have a mentor log in with Google OAuth
2. The system will automatically request calendar permissions
3. When a session is booked, it should create a Google Calendar event
4. The event will include a Google Meet link automatically

## Troubleshooting

### "Access blocked: This app's request is invalid"
- Make sure you've added the correct redirect URIs in Google Cloud Console
- Verify the OAuth consent screen is configured

### "Invalid client"
- Double-check your Client ID and Client Secret
- Make sure they're added to both `.env.local` and Vercel

### "Calendar not found"
- Ensure the mentor has connected their Google account
- Check that calendar permissions were granted

### Events not creating
- Check server logs for errors
- Verify the Google Calendar API is enabled
- Ensure the mentor's access token hasn't expired

## Security Notes

- Never commit `.env.local` to git
- Store tokens securely in the database
- Tokens will auto-refresh when they expire
- Only mentors with `role = 'mentor'` will have calendar integration

## Next Steps

After setup, mentors will:
1. Log in with Google OAuth
2. Grant calendar permissions
3. Have their sessions automatically added to their Google Calendar
4. Get Google Meet links automatically generated
