# Gmail Email Migration Assessment

## Current Setup
- **Service**: Resend API
- **From Email**: Configurable via `RESEND_FROM_EMAIL`
- **Package**: `resend` npm package
- **Files to Update**: 
  - `app/api/notifications/email/route.ts` (main email sending)
  - `lib/email.ts` (email utility)
  - `lib/env.ts` (environment variables)

## Gmail Options & Lift Assessment

### Option 1: Gmail SMTP with App Password ⭐ **EASIEST** (Low-Medium Lift)

**Lift**: **Low-Medium** (~2-3 hours)

**Pros:**
- Simple setup (just need app password)
- Works immediately
- No OAuth complexity
- Can use existing `nodemailer` package

**Cons:**
- Gmail free accounts: **500 emails/day limit**
- Google Workspace: **2000 emails/day limit**
- App passwords are less secure than OAuth
- May hit spam filters more easily

**Implementation:**
1. Install `nodemailer` package
2. Create Gmail app password (Google Account → Security → App Passwords)
3. Replace Resend calls with nodemailer SMTP
4. Update environment variables
5. Test email sending

**Code Changes:**
- Replace `resend.emails.send()` with `nodemailer.sendMail()`
- Update env vars: `GMAIL_USER`, `GMAIL_APP_PASSWORD`
- ~50 lines of code changes

---

### Option 2: Gmail API with OAuth2 ⭐ **RECOMMENDED** (Medium Lift)

**Lift**: **Medium** (~4-6 hours)

**Pros:**
- More reliable than SMTP
- Better deliverability
- Can reuse existing Google OAuth setup (you already have it for Calendar!)
- Same rate limits as SMTP but better handling
- More secure (OAuth tokens)

**Cons:**
- Requires OAuth setup (but you already have this!)
- Slightly more complex than SMTP
- Need to store OAuth tokens

**Implementation:**
1. Extend existing Google OAuth to include Gmail scopes
2. Use `googleapis` package (already installed!)
3. Store Gmail OAuth tokens in database
4. Replace Resend calls with Gmail API calls
5. Update environment variables

**Code Changes:**
- Extend `lib/google-calendar.ts` or create `lib/gmail.ts`
- Add Gmail scopes to OAuth flow
- Replace `resend.emails.send()` with Gmail API
- ~100-150 lines of code changes

**Note**: Since you already have Google OAuth for Calendar, this is actually easier than starting from scratch!

---

### Option 3: Hybrid Approach (SMTP for now, API later)

**Lift**: **Low** (~2 hours)

Start with SMTP (Option 1) for quick migration, then upgrade to Gmail API (Option 2) later when you need better reliability.

---

## Rate Limits Comparison

| Service | Free Tier Limit | Paid Tier |
|---------|----------------|-----------|
| **Resend** | 3,000/month | Custom pricing |
| **Gmail (Free)** | 500/day (15,000/month) | N/A |
| **Gmail (Workspace)** | 2,000/day (60,000/month) | Higher limits available |

**Verdict**: Gmail free account gives you **5x more emails** than Resend free tier!

---

## Recommendation

**Go with Option 2 (Gmail API with OAuth)** because:

1. ✅ You already have Google OAuth infrastructure (Calendar integration)
2. ✅ Better deliverability than SMTP
3. ✅ More secure (OAuth tokens)
4. ✅ Can reuse existing `googleapis` package
5. ✅ Better error handling and rate limit management
6. ✅ 5x more emails than Resend free tier

**Estimated Time**: 4-6 hours total
- OAuth scope extension: 1 hour
- Gmail API integration: 2-3 hours
- Testing & debugging: 1-2 hours

---

## Implementation Steps (Option 2)

### 1. Update OAuth Scopes
Add Gmail scopes to existing OAuth flow:
```typescript
scope: [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.send', // NEW
]
```

### 2. Create Gmail Utility
Create `lib/gmail.ts` similar to `lib/google-calendar.ts`:
- `getGmailClient()` - Get authenticated Gmail client
- `sendEmail()` - Send email via Gmail API

### 3. Update Email Route
Replace Resend calls in `app/api/notifications/email/route.ts`:
```typescript
// OLD
await resend.emails.send({ from, to, subject, html })

// NEW
await sendGmailEmail({ from: 'mvpweb@gmail.com', to, subject, html })
```

### 4. Update Environment Variables
Remove:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Add:
- `GMAIL_FROM_EMAIL=mvpweb@gmail.com` (or hardcode it)

### 5. Update Settings Page
Add Gmail connection status (similar to Calendar connection)

---

## Quick Start (Option 1 - SMTP if you want fastest migration)

If you want the **fastest migration** (2-3 hours), use SMTP:

1. Install: `npm install nodemailer @types/nodemailer`
2. Create Gmail app password
3. Replace Resend with nodemailer
4. Done!

I can implement either option. Which do you prefer?
