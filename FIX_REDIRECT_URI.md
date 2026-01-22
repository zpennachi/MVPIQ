# Fix: redirect_uri_mismatch Error

## The Problem

Google is rejecting the OAuth request because the redirect URI `http://localhost:3000/api/calendar/oauth/callback` is not registered in your Google Cloud Console.

## Quick Fix (2 minutes)

### Step 1: Go to Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**

### Step 2: Edit Your OAuth Client

1. Find your OAuth 2.0 Client ID (the one starting with `286479882579-...`)
2. **Click on it** to edit

### Step 3: Add Redirect URI

1. Scroll down to **"Authorized redirect URIs"**
2. Click **"+ ADD URI"**
3. Add this **exact** URI:
   ```
   http://localhost:3000/api/calendar/oauth/callback
   ```
4. **Important**: 
   - No trailing slash
   - Must be exactly: `http://localhost:3000/api/calendar/oauth/callback`
   - Case sensitive
5. Click **"SAVE"** at the bottom

### Step 4: Try Again

1. Go back to your app: `/dashboard/settings`
2. Click "Connect Google Calendar" again
3. It should work now!

## For Production (Vercel)

When you deploy to production, you'll also need to add your production redirect URI:

```
https://your-domain.vercel.app/api/calendar/oauth/callback
```

Add this to the same "Authorized redirect URIs" list in Google Cloud Console.

## Common Mistakes

❌ **Wrong**: `http://localhost:3000/api/calendar/oauth/callback/` (trailing slash)  
✅ **Correct**: `http://localhost:3000/api/calendar/oauth/callback`

❌ **Wrong**: `https://localhost:3000/api/calendar/oauth/callback` (https instead of http)  
✅ **Correct**: `http://localhost:3000/api/calendar/oauth/callback`

❌ **Wrong**: `localhost:3000/api/calendar/oauth/callback` (missing http://)  
✅ **Correct**: `http://localhost:3000/api/calendar/oauth/callback`

## That's It! 🎉

Once you add the redirect URI and save, the OAuth flow will work.
