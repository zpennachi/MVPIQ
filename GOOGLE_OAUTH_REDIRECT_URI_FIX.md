# Fix: OAuth Redirect URI Error

## Error Message
```
You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy.
If you're the app developer, register the redirect URI in the Google Cloud Console.
Request details: redirect_uri=https://mvpiq.vercel.app/api/calendar/oauth/callback
```

## Quick Fix

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select your project

2. **Navigate to OAuth Credentials:**
   - Go to **"APIs & Services"** → **"Credentials"**
   - Find your **OAuth 2.0 Client ID** (the one you created for MVPIQ)

3. **Edit the OAuth Client:**
   - Click the **pencil icon** (Edit) next to your OAuth client

4. **Add the Redirect URI:**
   - Scroll down to **"Authorized redirect URIs"**
   - Click **"+ ADD URI"**
   - Add exactly: `https://mvpiq.vercel.app/api/calendar/oauth/callback`
   - **Important:** 
     - Must be exact match (including `https://`, no trailing slash)
     - Case-sensitive
     - No spaces

5. **Save:**
   - Click **"SAVE"** at the bottom
   - Wait 1-2 minutes for changes to propagate

6. **Try Again:**
   - Go back to your app
   - Try connecting Google Calendar again

## Common Issues

### "Redirect URI mismatch" still appears
- **Check the exact URL:** Make sure there's no trailing slash
- **Wait longer:** Google can take 2-5 minutes to update
- **Clear browser cache:** Sometimes cached OAuth config causes issues
- **Check for typos:** The URI must match exactly

### Multiple redirect URIs
You can add multiple redirect URIs:
- `http://localhost:3000/api/calendar/oauth/callback` (for local dev)
- `https://mvpiq.vercel.app/api/calendar/oauth/callback` (for production)
- `https://your-custom-domain.com/api/calendar/oauth/callback` (if you have one)

### Still not working?
1. Double-check the redirect URI in your app matches exactly
2. Make sure you're using the correct OAuth Client ID in your environment variables
3. Verify the OAuth consent screen is configured (Step 3 in setup guide)
4. Check that your app is added as a test user (if in testing mode)
