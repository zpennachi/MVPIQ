# Email Setup Checklist

## ✅ Current Status

All email code is in place and configured to use **mvpiqweb@gmail.com** via Gmail API.

## Setup Steps

### 1. Connect Admin Google Account (Required)

1. **Log in as admin** on your app
2. **Go to**: `/dashboard/settings`
3. **Click**: "Connect Google Calendar" button
4. **Complete OAuth flow**:
   - You'll be redirected to Google
   - Grant permissions for Calendar and Gmail
   - You'll be redirected back to the app
5. **Verify connection**: The button should show "Connected"

### 2. Verify Gmail API is Enabled

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Library**
4. Search for "Gmail API"
5. Make sure it's **Enabled**

### 3. Verify OAuth Scopes

In Google Cloud Console:
1. Go to **APIs & Services** → **OAuth consent screen**
2. Check that these scopes are added:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/gmail.send` ✅

### 4. Test Email Sending

1. **Visit**: `http://localhost:3000/api/test-email?to=your-email@example.com`
2. **Check your inbox** (and spam folder)
3. **Verify**: Email is from `mvpiqweb@gmail.com`

## Email Triggers (Already Implemented)

### Feedback Submissions
- ✅ Payment confirmation → Player
- ✅ Submission success → Player  
- ✅ New submission → Mentor
- ✅ Feedback ready → Player

### Appointments
- ✅ Session confirmation → User/Player
- ✅ Session booking notification → Mentor
- ✅ Session reminder → Both (via cron)

## Troubleshooting

### "Gmail OAuth is not configured"
- **Fix**: Connect Google Calendar as admin (includes Gmail scope)

### "No admin profile with OAuth tokens found"
- **Fix**: Make sure an admin has completed the OAuth flow

### Emails not sending
- Check Vercel logs for detailed errors
- Verify admin has connected Google account
- Test with `/api/test-email` endpoint first

### Token expired
- System auto-refreshes tokens, but if issues persist:
  - Reconnect Google Calendar in settings
  - This will refresh the tokens

## Production Deployment

1. **Make sure admin connects Google account in production**
2. **Verify environment variables are set in Vercel**:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` (production URL)
3. **Test with real booking/submission**

## All Set! 🎉

Once an admin connects their Google account, all emails will automatically be sent from **mvpiqweb@gmail.com** for:
- Feedback submissions
- Appointment bookings
- Session reminders
- And more!
