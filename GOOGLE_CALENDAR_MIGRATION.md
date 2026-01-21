# Google Calendar Migration Guide

This guide walks you through migrating from the `availability_slots` table to Google Calendar integration.

## Overview

The app now supports two calendar systems:
1. **Google Calendar (recommended)**: Mentors connect their Google Calendar via OAuth. Sessions sync automatically and Google Meet links are generated.
2. **Availability Slots (legacy)**: The old `availability_slots` table system is still supported as a fallback.

## Migration Steps

### 1. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/calendar/callback` (for local dev)
     - `https://mvpiq.vercel.app/api/calendar/callback` (for production on Vercel)
     - If you have a custom domain, also add: `https://yourdomain.com/api/calendar/callback`

5. Save your credentials:
   - Client ID: `GOOGLE_CLIENT_ID`
   - Client Secret: `GOOGLE_CLIENT_SECRET`

### 2. Set Environment Variables

Add these to your `.env.local` (local) and Vercel environment variables (production):

```bash
# Google OAuth (for calendar integration)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback  # Local
# GOOGLE_REDIRECT_URI=https://mvpiq.vercel.app/api/calendar/callback  # Production on Vercel
# If you have a custom domain, use: GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/callback

# Optional: Service account fallback (for Meet links if OAuth not available)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_CALENDAR_ID=primary  # or a specific calendar ID
```

### 3. Run Database Migration

Run the SQL migration to add Google Calendar fields to your database:

```sql
-- Run in Supabase SQL Editor
-- File: supabase/google-calendar-migration.sql

-- Add Google Calendar fields to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_access_token TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT false;

-- Add google_event_id to booked_sessions
ALTER TABLE booked_sessions
  ADD COLUMN IF NOT EXISTS google_event_id TEXT UNIQUE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_booked_sessions_google_event_id 
  ON booked_sessions(google_event_id);

CREATE INDEX IF NOT EXISTS idx_profiles_google_calendar_connected 
  ON profiles(google_calendar_connected) 
  WHERE google_calendar_connected = true;
```

### 4. Connect Mentor Calendars

1. Mentors should log in and go to **Dashboard > Settings**
2. In the "Google Calendar Integration" section, click **"Connect Google Calendar"**
3. They'll be redirected to Google to authorize access
4. After authorization, they'll be redirected back and their calendar will be connected

### 5. How It Works

#### For Mentors with Google Calendar Connected:
- **Availability**: Pulled from Google Calendar using Free/Busy API
- **Bookings**: Creates Google Calendar events automatically
- **Meet Links**: Real Google Meet links generated automatically
- **Cancellations**: Deletes Google Calendar events automatically

#### For Mentors Without Google Calendar:
- **Availability**: Falls back to `availability_slots` table (old system)
- **Bookings**: Works as before
- **Meet Links**: Uses service account or calendar invitation link

### 6. Gradual Migration

- You don't need to migrate all mentors at once
- The system supports both methods simultaneously
- As mentors connect their calendars, they automatically switch to Google Calendar
- Old `availability_slots` continue to work for mentors who haven't connected yet

## Features

### Automatic Sync
- Sessions created in the app automatically appear in the mentor's Google Calendar
- Cancellations automatically remove events from Google Calendar

### Google Meet Links
- Real Google Meet links are generated automatically when sessions are created
- Links are included in confirmation emails to both mentor and user

### Availability Management
- Mentors manage availability directly in Google Calendar
- No need to set up availability slots in the app
- Free/busy time is automatically respected

## Troubleshooting

### "Calendar connection failed"
- Check that `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` are set correctly
- Ensure the redirect URI matches exactly (including `http://` vs `https://`)
- Check that Google Calendar API is enabled in Google Cloud Console

### "No availability found"
- Ensure the mentor has connected their Google Calendar
- Check that the calendar has events during the requested time period
- Verify the mentor's calendar is not private/shared incorrectly

### "Failed to generate Meet link"
- If using OAuth, ensure the mentor's calendar has permission to create conferences
- If using service account, check that the service account email and key are correct
- Check that the calendar ID is correct (use `primary` for the default calendar)

### Token Refresh Issues
- The app automatically refreshes access tokens when they expire
- If refresh fails, the mentor may need to reconnect their calendar
- Tokens are stored in the database (consider encrypting in production)

## Security Notes

⚠️ **Important**: Access tokens and refresh tokens are currently stored in plain text in the database. For production:

1. **Encrypt tokens** before storing in the database
2. **Use secure storage** for sensitive credentials
3. **Rotate credentials** periodically
4. **Monitor access** to prevent unauthorized use

## Optional: Service Account Setup

If you want a fallback for Meet link generation (without OAuth):

1. Create a service account in Google Cloud Console
2. Grant it access to Google Calendar API
3. Share your calendar with the service account email (with "Make changes to events" permission)
4. Download the JSON key file
5. Set `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

## Removing Old System

Once all mentors have migrated to Google Calendar, you can optionally:

1. Remove the `availability_slots` table (if no longer needed)
2. Remove availability slot management UI
3. Simplify the booking flow

However, it's recommended to keep the old system as a fallback for mentors who prefer not to use Google Calendar.
