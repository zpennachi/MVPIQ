# Google Meet Link Setup Guide

This guide explains how to set up real Google Meet link generation for sessions using the Google Calendar API.

## Overview

When configured, the app will automatically create Google Calendar events with Google Meet links when sessions are booked. Without configuration, it falls back to generating calendar invitation links that allow manual Meet creation.

## Setup Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing one)
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### Step 2: Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in details:
   - Name: `mvpiq-meet-generator` (or any name)
   - Click "Create and Continue"
   - Skip role assignment (click "Continue")
   - Click "Done"

### Step 3: Create and Download Key

1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON" format
5. Download the JSON file (keep it secure - never commit to git!)

### Step 4: Share Calendar with Service Account

1. Open the JSON file you downloaded
2. Copy the `client_email` value (e.g., `mvpiq-meet-generator@project-id.iam.gserviceaccount.com`)
3. Open [Google Calendar](https://calendar.google.com/)
4. In the left sidebar, find your calendar and click the three dots → "Settings and sharing"
5. Under "Share with specific people", click "Add people"
6. Paste the service account email and give it "Make changes to events" permission
7. Click "Send"

### Step 5: Set Environment Variables in Vercel

1. Go to your Vercel project → Settings → Environment Variables
2. Add these three variables:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
GOOGLE_CALENDAR_ID=primary
```

**Important Notes:**
- For `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: Copy the entire `private_key` value from the JSON file, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
- In Vercel, you need to replace actual newlines with `\n` (the code handles this automatically)
- `GOOGLE_CALENDAR_ID` should be `primary` for your main calendar, or a specific calendar ID if you want to use a different one

### Step 6: Redeploy

After adding environment variables:
- Vercel will automatically redeploy, or
- Manually trigger a redeploy from the Vercel dashboard

## How It Works

1. **With Configuration**: 
   - When a session is booked, the app creates a Google Calendar event
   - Google automatically generates a Meet link for the event
   - The Meet link is stored in the database and sent in confirmation emails

2. **Without Configuration (Fallback)**:
   - The app generates a Google Calendar invitation link
   - Users can click the link to create a calendar event and add a Meet link manually
   - Or mentors can add Meet links manually later

## Testing

After setup, test by:
1. Booking a test session
2. Check that a Meet link appears in:
   - The confirmation email
   - The appointment details in the dashboard
3. Verify the Meet link works by joining the meeting

## Troubleshooting

**Error: "Calendar API not enabled"**
- Make sure Google Calendar API is enabled in Google Cloud Console

**Error: "Insufficient permissions"**
- Verify the service account email has "Make changes to events" permission on the calendar

**Error: "Invalid credentials"**
- Check that `GOOGLE_SERVICE_ACCOUNT_EMAIL` matches the `client_email` in your JSON file
- Verify `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` is the complete key from the JSON file
- Make sure newlines are preserved (use `\n` in Vercel env vars)

**Meet links not generating**
- Check Vercel function logs for errors
- Verify the calendar ID is correct
- Ensure the service account calendar permissions are set correctly

## Alternative: Manual Meet Links

If you prefer not to set up the Google Calendar API, mentors can:
1. Create their own Google Meet links
2. Add them manually to sessions through the dashboard (future feature)
3. Or include them in confirmation emails manually
