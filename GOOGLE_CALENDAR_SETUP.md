# Google Calendar Integration Setup Guide

This guide will walk you through setting up Google Calendar integration to generate Google Meet links for all sessions.

**⚠️ IMPORTANT:** Service accounts **cannot** create Meet links on regular Gmail accounts. You have two options:

1. **Option 1 (Recommended):** Use OAuth with the calendar owner's Google account (works with Gmail, free)
2. **Option 2:** Use a service account with Google Workspace and domain-wide delegation (paid, advanced)

This guide covers **Option 1** - the simpler, free approach that works with regular Gmail accounts.

## Prerequisites

- Google Cloud Console account
- A Google account (e.g., `web@mvpiq.com`) to use as the service account
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

## Step 3: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"Service account"**
3. Fill in:
   - **Service account name**: `mvpiq-calendar-service` (or similar)
   - **Service account ID**: Will auto-generate
   - **Description**: "Service account for generating Google Meet links"
4. Click **"Create and Continue"**
5. Skip the optional steps (grant access, etc.) and click **"Done"**

## Step 4: Create Service Account Key

1. In the **"Credentials"** page, find your service account
2. Click on the service account email
3. Go to the **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Choose **"JSON"** format
6. Click **"Create"** - this will download a JSON file

## Step 5: Share Calendar with Service Account

**IMPORTANT**: You need to share a calendar that supports Google Meet (not the service account's own calendar).

1. Open Google Calendar using the account you want to use (e.g., `web@mvpiq.com`)
2. Go to **Settings** → **Settings for my calendars** → Select your calendar (or create a new one)
3. **Make sure this calendar has Google Meet enabled** (it should by default for regular Google accounts)
4. Scroll to **"Share with specific people"**
5. Click **"Add people"**
6. Enter the service account email (found in the JSON file, looks like `mvpiq-calendar-service@project-id.iam.gserviceaccount.com`)
7. Give it **"Make changes to events"** permission
8. Click **"Send"**
9. **Copy the calendar ID** - this is usually the email address of the calendar owner (e.g., `web@mvpiq.com`) or you can find it in the calendar settings URL

## Step 6: Extract Credentials from JSON

Open the downloaded JSON file and extract:

- **`client_email`**: This is your `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- **`private_key`**: This is your `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (keep the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

## Step 7: Set Environment Variables

Add these to your `.env` file (or Vercel environment variables):

```bash
# Google Calendar Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=web@mvpiq.com
```

**Important Notes:**
- `GOOGLE_CALENDAR_ID` should be the **email address of the calendar owner** (the account whose calendar you shared with the service account)
- This is usually `web@mvpiq.com` or whatever email you used in Step 5
- Do NOT use `primary` - use the actual email address of the calendar owner
- The calendar must be shared with the service account and have Google Meet enabled

**Important Notes:**
- The `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` should include the entire key with newlines (`\n`)
- In Vercel, you may need to escape the newlines or paste the key as-is (Vercel handles it)
- The `GOOGLE_CALENDAR_ID` is usually `primary` for the default calendar, or you can use a specific calendar ID

## Step 8: Verify Setup

1. Book a test session in your app
2. Check that a Google Calendar event is created in the service account's calendar
3. Verify that a Google Meet link is generated and stored with the session
4. Check that both the user and mentor receive emails with the meeting link

## Troubleshooting

### "OAuth client not configured" error
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in environment variables
- Check that the redirect URI in Google Cloud Console matches your app URL

### "Calendar connection failed" error
- Make sure you're logged in as an admin user
- Check that the redirect URI in Google Cloud Console includes your callback URL
- Verify the OAuth consent screen is configured correctly
- Check that you granted all requested permissions

### Events not creating
- Check Google Cloud Console that Calendar API is enabled
- Verify the OAuth credentials are correct
- Check server logs for detailed error messages
- Make sure the calendar owner's account has Google Meet enabled

### Meet links not generating
**⚠️ CRITICAL LIMITATION:** Service accounts **CANNOT** create Meet links on regular Gmail accounts (`@gmail.com`). This is a Google API limitation.

**Why this happens:**
- Service accounts can only create Meet links when using **Domain-Wide Delegation** with **impersonation**
- Domain-Wide Delegation is only available for **Google Workspace** accounts, not regular Gmail
- Regular Gmail accounts (`@gmail.com`) cannot use domain-wide delegation

**Solutions:**

**Option 1: Use Google Workspace Account (Recommended for Production)**
1. Get a Google Workspace account (paid, ~$6/month per user)
2. Set up domain-wide delegation in Google Workspace Admin Console
3. Configure the service account to impersonate a Workspace user
4. This allows Meet links to be created

**Option 2: Use Calendar Owner's OAuth Token (Simpler, Free)**
1. Instead of service account, use the calendar owner's OAuth token
2. The calendar owner (`mvpiqweb@gmail.com`) connects their Google account once
3. Store their OAuth token
4. Use their token to create events with Meet links
5. This works with regular Gmail accounts!

**Option 3: Manual Meet Link Generation**
- Create events without Meet links via service account
- Manually add Meet links later (not ideal for automation)

**If you're using a regular Gmail account:**
- ✅ Events will be created successfully
- ❌ Meet links will NOT be generated
- ✅ You'll need to switch to Option 2 (OAuth) or Option 1 (Workspace)

## Benefits of OAuth Approach

✅ **Works with Gmail accounts** - No need for Google Workspace  
✅ **Free** - No additional costs  
✅ **Simple setup** - Just connect once in admin settings  
✅ **Automatic token refresh** - System handles token expiration  
✅ **Meet links work** - Can generate Meet links on regular Gmail accounts  

## How It Works

1. **Admin connects their Google account** once via OAuth in settings
2. **System stores OAuth tokens** securely in the database
3. **When sessions are booked**, the system uses the admin's OAuth tokens to:
   - Create calendar events
   - Generate Google Meet links
   - Store event IDs for cancellation
4. **Tokens auto-refresh** when they expire (handled automatically)

## Fallback to Service Account

If OAuth is not connected, the system will fall back to using the service account (if configured). However, **service accounts cannot create Meet links on Gmail accounts**, so you'll need OAuth for full functionality.
