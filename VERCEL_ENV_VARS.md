# Vercel Environment Variables - Complete List

## Required Variables (App won't work without these)

### Supabase (REQUIRED)
```
NEXT_PUBLIC_SUPABASE_URL
```
- **Description**: Your Supabase project URL
- **Example**: `https://xxxxx.supabase.co`
- **Where to find**: Supabase Dashboard → Settings → API → Project URL

```
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
- **Description**: Supabase anonymous/public key (safe to expose in client)
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to find**: Supabase Dashboard → Settings → API → anon public key

```
SUPABASE_SERVICE_ROLE_KEY
```
- **Description**: Supabase service role key (KEEP SECRET - server-side only)
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to find**: Supabase Dashboard → Settings → API → service_role key
- **⚠️ WARNING**: Never expose this in client-side code!

### App URL (REQUIRED)
```
NEXT_PUBLIC_APP_URL
```
- **Description**: Your production app URL
- **Example**: `https://mvpiq.vercel.app` or `https://yourdomain.com`
- **Used for**: OAuth redirects, email links, etc.

---

## Optional Variables (App works without these, but features are disabled)

### Stripe (OPTIONAL - for payments)
```
STRIPE_SECRET_KEY
```
- **Description**: Stripe secret key (starts with `sk_`)
- **Example**: `sk_live_...` or `sk_test_...`
- **Where to find**: Stripe Dashboard → Developers → API keys
- **Note**: If not set, app runs in dev mode (payments skipped)

```
STRIPE_WEBHOOK_SECRET
```
- **Description**: Stripe webhook signing secret (starts with `whsec_`)
- **Example**: `whsec_...`
- **Where to find**: Stripe Dashboard → Developers → Webhooks → Your endpoint → Signing secret
- **Note**: Only needed if using Stripe payments

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```
- **Description**: Stripe publishable key (starts with `pk_`)
- **Example**: `pk_live_...` or `pk_test_...`
- **Where to find**: Stripe Dashboard → Developers → API keys
- **Note**: Only needed if using Stripe payments

### Resend (OPTIONAL - for emails)
```
RESEND_API_KEY
```
- **Description**: Resend API key (starts with `re_`)
- **Example**: `re_1234567890abcdef...`
- **Where to find**: Resend Dashboard → API Keys
- **Note**: If not set, emails won't be sent

```
RESEND_FROM_EMAIL
```
- **Description**: Email address to send emails from
- **Example**: `noreply@yourdomain.com` or `onboarding@resend.dev`
- **Default**: `onboarding@resend.dev` (if not set)
- **Note**: Must be verified in Resend if using custom domain

### Google Calendar (OPTIONAL - for Meet links)

#### Option 1: Service Account (Limited - doesn't work with Gmail)
```
GOOGLE_SERVICE_ACCOUNT_EMAIL
```
- **Description**: Google service account email
- **Example**: `mvpiq-calendar-service@project-id.iam.gserviceaccount.com`
- **Where to find**: Google Cloud Console → IAM & Admin → Service Accounts
- **Note**: Cannot create Meet links on regular Gmail accounts

```
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
```
- **Description**: Service account private key (JSON format, keep newlines)
- **Example**: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQ...\n-----END PRIVATE KEY-----\n`
- **Where to find**: Google Cloud Console → Service Accounts → Create Key → JSON
- **Note**: Must include `\n` characters or actual newlines

```
GOOGLE_CALENDAR_ID
```
- **Description**: Calendar ID to use (usually email address or 'primary')
- **Example**: `mvpiqweb@gmail.com` or `primary`
- **Default**: `primary` (if not set)

#### Option 2: OAuth (Recommended - works with Gmail)
```
GOOGLE_CLIENT_ID
```
- **Description**: Google OAuth 2.0 Client ID
- **Example**: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
- **Where to find**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID

```
GOOGLE_CLIENT_SECRET
```
- **Description**: Google OAuth 2.0 Client Secret
- **Example**: `GOCSPX-abcdefghijklmnopqrstuvwxyz`
- **Where to find**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID → Client Secret

```
GOOGLE_REDIRECT_URI
```
- **Description**: OAuth redirect URI (usually auto-detected, but can be set manually)
- **Example**: `https://mvpiq.vercel.app/api/calendar/oauth/callback`
- **Note**: Must match what's configured in Google Cloud Console

### Cron/Background Jobs (OPTIONAL)
```
CRON_SECRET
```
- **Description**: Secret key for cron job authentication
- **Example**: `your-random-secret-key-here`
- **Default**: `your-secret-key` (if not set)
- **Note**: Only needed if using Vercel Cron jobs

---

## Quick Setup Checklist

### Minimum Required (App will run):
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_APP_URL`

### For Payments:
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### For Emails:
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_FROM_EMAIL` (optional, has default)

### For Google Meet Links (Choose ONE):
- **Option A - OAuth (Recommended for Gmail):**
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `GOOGLE_REDIRECT_URI` (optional, auto-detected)

- **Option B - Service Account (Only for Google Workspace):**
  - [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - [ ] `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
  - [ ] `GOOGLE_CALENDAR_ID` (optional, defaults to 'primary')

---

## Important Notes

1. **Never commit `.env` files** - They're in `.gitignore`
2. **`NEXT_PUBLIC_*` variables** are exposed to the browser - don't put secrets there
3. **Service role keys** are server-side only - never expose in client code
4. **Google Service Account** cannot create Meet links on regular Gmail accounts
5. **OAuth is recommended** for Gmail accounts to generate Meet links
6. **All variables are case-sensitive** - copy exactly as shown

---

## Current Issue: No Admin Accounts

Your test shows `totalAdmins: 0`, which means there are **no admin accounts** in your database. 

**To fix:**
1. Go to Supabase SQL Editor
2. Run this SQL (replace `your-admin-email@example.com` with your actual email):

```sql
-- First, make sure you have a user in auth.users
-- If not, create one through Supabase Auth or your app's registration

-- Then update their profile to be admin:
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';

-- Verify it worked:
SELECT id, email, role FROM profiles WHERE role = 'admin';
```

3. Then go to `/dashboard/settings` and connect Google Calendar
4. Run the test endpoint again - should show `totalAdmins: 1`
