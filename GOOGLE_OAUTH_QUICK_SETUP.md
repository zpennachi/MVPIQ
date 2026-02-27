# Google OAuth Quick Setup (for Calendar & Gmail)

## The Error You're Seeing

"Missing required parameter: client_id" means `GOOGLE_CLIENT_ID` is not set in your `.env` file.

## Quick Fix (5 minutes)

### Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure OAuth consent screen:
   - User Type: **External**
   - App name: "MVP-IQ"
   - Support email: your email
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/gmail.send`
   - Add test users: your email (mvpiqweb@gmail.com)
6. Application type: **Web application**
7. Name: "MVP-IQ Local Dev"
8. **Authorized redirect URIs**:
   - `http://localhost:3000/api/calendar/oauth/callback`
   - (Add your production URL too if deploying)
9. Click **Create**
10. **Copy the Client ID and Client Secret**

### Step 2: Add to .env File

Open your `.env` file and add:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/oauth/callback
```

**Important**: Replace `your-client-id-here` and `your-client-secret-here` with the actual values from Google Cloud Console.

### Step 3: Restart Dev Server

1. Stop the dev server (Ctrl+C)
2. Start it again: `npm run dev`
3. Try connecting Google Calendar again

### Step 4: Connect Google Calendar

1. Go to `/dashboard/settings` as admin
2. Click "Connect Google Calendar"
3. Complete OAuth flow
4. Grant permissions for Calendar and Gmail

## Verify It's Working

1. **Test email**: `http://localhost:3000/api/test-email?to=your-email@example.com`
2. **Check inbox** for email from mvpiqweb@gmail.com

## Common Issues

### "Invalid client" error
- Make sure you copied the full Client ID (ends with `.apps.googleusercontent.com`)
- Check for extra spaces in `.env` file

### "Redirect URI mismatch"
- Make sure the redirect URI in Google Cloud Console matches exactly:
  - `http://localhost:3000/api/calendar/oauth/callback`
- No trailing slashes!

### "Access blocked: This app's request is invalid"
- Make sure you added your email as a test user in OAuth consent screen
- Or publish the app (for production)

## That's It! 🎉

Once you add the credentials and restart, the OAuth flow will work and you can connect Google Calendar (which also enables Gmail sending).
