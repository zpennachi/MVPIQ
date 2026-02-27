# Gmail Migration - Vercel Deployment Checklist

## ✅ Code Status
- [x] Code pushed to GitHub
- [x] Gmail API integration complete
- [x] Removed Resend dependencies

## 🔧 Vercel Deployment

### Automatic Deployment
If Vercel is connected to your GitHub repo, it should automatically deploy when you push to `main`. Check your Vercel dashboard to see the deployment status.

### Environment Variables
**No new environment variables needed!** We're using the existing Google OAuth setup:
- `GOOGLE_CLIENT_ID` ✅ (already set)
- `GOOGLE_CLIENT_SECRET` ✅ (already set)

**You can remove these (optional, won't break anything):**
- `RESEND_API_KEY` (no longer used)
- `RESEND_FROM_EMAIL` (no longer used)

## 🔐 Google Cloud Console Setup

### 1. Add Gmail Scope
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **OAuth consent screen**
3. Click **Edit App**
4. Under **Scopes**, click **Add or Remove Scopes**
5. Add: `https://www.googleapis.com/auth/gmail.send`
6. Click **Update** → **Save and Continue**

### 2. Republish OAuth Consent Screen (if needed)
- If your app is in "Testing" mode, you may need to add test users
- If in "Production" mode, you may need to submit for verification (for Gmail scope)

## 👤 Admin Account Setup

### 1. Admin Must Reconnect Google Account
Since we added the Gmail scope, the admin needs to reconnect:

1. Go to `/dashboard/settings` as an admin user
2. Click **"Connect Google Calendar"** (it now includes Gmail)
3. Complete the OAuth flow
4. Make sure the admin's Google account is `mvpweb@gmail.com` (or the account you want to send from)

### 2. Verify Connection
- Check that `google_calendar_connected = true` in the admin's profile
- The OAuth tokens should now include Gmail permissions

## 🧪 Testing

After deployment:

1. **Test Email Sending:**
   - Trigger any email (e.g., submit a video, book a session)
   - Check that email is sent from `mvpweb@gmail.com`
   - Verify email arrives in recipient's inbox

2. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Logs
   - Look for Gmail API errors or success messages

3. **Common Issues:**
   - **"Gmail OAuth is not configured"** → Admin hasn't reconnected Google account
   - **"Insufficient permissions"** → Gmail scope not added in Google Cloud Console
   - **"Invalid grant"** → OAuth tokens expired, admin needs to reconnect

## 📝 Notes

- All emails are now sent from `mvpweb@gmail.com` using the admin's OAuth tokens
- Rate limit: 500 emails/day (free Gmail) or 2,000/day (Google Workspace)
- No per-mentor email setup needed - everything goes through one account
